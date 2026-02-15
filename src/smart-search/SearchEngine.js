const { exactMatch, startsWithMatch, containsMatch } = require('./utils/stringMatching');
const Song = require('./models/Song');
const config = require('./config');

/**
 * SearchEngine - Multi-field search with personalized ranking
 * 
 * Provides Spotify-level search capabilities with intelligent ranking based on:
 * - Multi-field matching (title, movie, artist, album, tags)
 * - Personalization boosts (language, mood, history)
 * - Trending boost based on play count
 */
class SearchEngine {
  /**
   * @param {Object} firebaseRef - Firebase database reference
   * @param {string} userId - Current user ID
   */
  constructor(firebaseRef, userId) {
    this.db = firebaseRef;
    this.userId = userId;
    this.userProfile = null;
  }

  /**
   * Load songs from Firebase based on language preference
   * @param {string|null} preferredLanguage - User's preferred language (null to load all songs)
   * @returns {Promise<Array<Song>>} Array of Song objects
   * @private
   */
  async _loadSongs(preferredLanguage) {
    try {
      let songs = [];

      if (preferredLanguage) {
        // Use songsByLanguage index for filtered query (Req 5.1)
        const languageIndexRef = this.db.child(config.firebasePaths.songsByLanguage)
          .child(preferredLanguage);
        const languageSnapshot = await languageIndexRef.once('value');
        const songIds = languageSnapshot.val() || {};

        // Load full song data for each song ID
        const songsRef = this.db.child(config.firebasePaths.songs);
        const songPromises = Object.keys(songIds).map(async (songId) => {
          const songSnapshot = await songsRef.child(songId).once('value');
          const songData = songSnapshot.val();
          if (songData) {
            return Song.fromFirebase(songId, songData);
          }
          return null;
        });

        const loadedSongs = await Promise.all(songPromises);
        songs = loadedSongs.filter(song => song !== null);
      } else {
        // Load all songs when no language preference (Req 5.2)
        const songsRef = this.db.child(config.firebasePaths.songs);
        const songsSnapshot = await songsRef.once('value');
        const songsData = songsSnapshot.val() || {};

        songs = Object.entries(songsData).map(([songId, songData]) => {
          return Song.fromFirebase(songId, songData);
        });
      }

      return songs;
    } catch (error) {
      throw new Error(`Failed to load songs from Firebase: ${error.message}`);
    }
  }

  /**
   * Execute search with personalized ranking
   * @param {string} query - Search query
   * @param {Object} userPreferences - User preferences (language, mood) - optional, used only for boosting
   * @param {Array} recentlyPlayedSongIds - Array of recently played song IDs (optional)
   * @returns {Promise<Array>} Top 30 ranked search results
   */
  async search(query, userPreferences = {}, recentlyPlayedSongIds = []) {
    // Handle empty query
    if (!query || typeof query !== 'string' || query.trim() === '') {
      return [];
    }

    try {
      // IMPORTANT: Always load ALL songs for search, don't filter by language
      // This allows users to search for songs in any language
      // Language preference is only used for BOOSTING scores, not filtering
      const allSongs = await this._loadSongs(null);

      if (allSongs.length === 0) {
        return [];
      }

      // Score all songs
      const scoredSongs = allSongs.map(song => ({
        song,
        score: this.scoreSong(song, query, userPreferences, recentlyPlayedSongIds, allSongs)
      }));

      // Filter out songs with NO match (score = 0)
      // Keep songs with any match, even if score is low
      const filteredSongs = scoredSongs.filter(item => item.score > 0);

      // Sort by score descending
      filteredSongs.sort((a, b) => b.score - a.score);

      // Return top 30 results
      const topResults = filteredSongs.slice(0, config.search.maxResults);

      // Save search history
      if (this.userId) {
        await this.saveSearchHistory(query).catch(err => {
          console.warn('Failed to save search history:', err.message);
        });
      }

      // Return just the songs (without scores)
      return topResults.map(item => item.song);
    } catch (error) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Score a single song against the query
   * @param {Object} song - Song object
   * @param {string} query - Search query
   * @param {Object} userPreferences - User preferences (languages: array, moods: array)
   * @param {Array} recentlyPlayedSongIds - Array of recently played song IDs (optional)
   * @param {Array} allSongs - All songs for trending boost calculation (optional)
   * @returns {number} Total score
   */
  scoreSong(song, query, userPreferences = {}, recentlyPlayedSongIds = [], allSongs = []) {
    let score = 0;

    // Normalize query for better matching
    const normalizedQuery = query.toLowerCase().trim();
    
    // Split query into words for multi-word matching
    const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
    
    // Score title field (Req 1.2, 1.3, 1.4)
    const titleScore = this.scoreField(song.title, normalizedQuery, 100, 80, 60);
    score += titleScore;
    
    // Bonus: Check if title contains multiple query words (only if query has 2+ words AND no exact/starts-with match)
    if (queryWords.length > 1 && titleScore < 80) {
      const titleLower = (song.title || '').toLowerCase();
      const matchedWords = queryWords.filter(word => titleLower.includes(word));
      if (matchedWords.length > 1) {
        score += matchedWords.length * 10; // Bonus for multi-word match
      }
    }

    // Score movie field (Req 1.5, 1.6)
    const movieScore = this.scoreField(song.movie, normalizedQuery, 70, 0, 50);
    score += movieScore;
    
    // Bonus: Check if movie contains multiple query words (only if query has 2+ words AND no exact match)
    if (queryWords.length > 1 && movieScore < 70) {
      const movieLower = (song.movie || '').toLowerCase();
      const matchedWords = queryWords.filter(word => movieLower.includes(word));
      if (matchedWords.length > 1) {
        score += matchedWords.length * 8; // Bonus for multi-word match
      }
    }

    // Score artist field (Req 1.7, 1.8)
    score += this.scoreField(song.artist, normalizedQuery, 65, 0, 45);

    // Score album field (Req 1.9)
    score += this.scoreField(song.album, normalizedQuery, 30, 0, 30);

    // Score tags field (Req 1.10)
    if (song.tags && Array.isArray(song.tags)) {
      for (const tag of song.tags) {
        const tagScore = this.scoreField(tag, normalizedQuery, 25, 0, 25);
        if (tagScore > 0) {
          score += tagScore;
          break; // Only count first matching tag
        }
      }
    }

    // Apply personalization boosts (optional - only if preferences provided)
    
    // Language preference boost: +30 points (supports multiple languages)
    if (userPreferences.languages && Array.isArray(userPreferences.languages) && song.language) {
      const languageMatch = userPreferences.languages.some(lang => 
        lang.toLowerCase() === song.language.toLowerCase()
      );
      if (languageMatch) {
        score += 30;
      }
    } else if (userPreferences.language && song.language) {
      // Backward compatibility: single language
      if (song.language.toLowerCase() === userPreferences.language.toLowerCase()) {
        score += 30;
      }
    }

    // Mood preference boost: +25 points (supports multiple moods)
    if (userPreferences.moods && Array.isArray(userPreferences.moods) && song.moods && Array.isArray(song.moods)) {
      const moodMatch = userPreferences.moods.some(userMood =>
        song.moods.some(songMood => 
          songMood.toLowerCase() === userMood.toLowerCase()
        )
      );
      if (moodMatch) {
        score += 25;
      }
    } else if (userPreferences.mood && song.moods && Array.isArray(song.moods)) {
      // Backward compatibility: single mood
      const moodMatch = song.moods.some(mood => 
        mood.toLowerCase() === userPreferences.mood.toLowerCase()
      );
      if (moodMatch) {
        score += 25;
      }
    }

    // Previously played boost: +20 points (Req 2.3)
    if (recentlyPlayedSongIds.includes(song.id)) {
      score += 20;
    }

    // Trending boost: 0-20 points based on play count percentile (Req 2.4)
    if (allSongs && allSongs.length > 0) {
      score += this.calculateTrendingBoost(song.playCount || 0, allSongs);
    }

    return score;
  }

  /**
   * Calculate score for a specific field
   * @param {string} fieldValue - Field value to match against
   * @param {string} query - Search query
   * @param {number} exactPoints - Points for exact match
   * @param {number} startsWithPoints - Points for starts with match
   * @param {number} containsPoints - Points for contains match
   * @returns {number} Field score
   */
  scoreField(fieldValue, query, exactPoints, startsWithPoints, containsPoints) {
    if (!fieldValue || !query) {
      return 0;
    }

    if (exactMatch(fieldValue, query)) {
      return exactPoints;
    }

    if (startsWithPoints > 0 && startsWithMatch(fieldValue, query)) {
      return startsWithPoints;
    }

    if (containsMatch(fieldValue, query)) {
      return containsPoints;
    }

    return 0;
  }

  /**
   * Calculate trending boost based on play count percentile
   * @param {number} playCount - Song's play count
   * @param {Array<Object>} allSongs - All songs to calculate percentile against
   * @returns {number} Trending boost (0-20 points)
   */
  calculateTrendingBoost(playCount, allSongs) {
    if (!allSongs || allSongs.length === 0) {
      return 0;
    }

    if (allSongs.length === 1) {
      return 10; // Middle value for single song
    }

    // Extract play counts and sort them
    const playCounts = allSongs.map(song => song.playCount || 0).sort((a, b) => a - b);
    
    // Count how many songs have strictly lower play count
    const lowerCount = playCounts.filter(count => count < playCount).length;
    
    // Calculate percentile using the formula that ensures:
    // - Lowest value gets 0th percentile
    // - Highest value gets 100th percentile
    // - Values in between are distributed linearly
    const percentile = (lowerCount / (playCounts.length - 1)) * 100;
    
    // Map percentile to 0-20 points
    const boost = Math.round((percentile / 100) * 20);
    
    // Ensure boost is within valid range
    return Math.max(0, Math.min(20, boost));
  }

  /**
   * Save search query to user history
   * @param {string} query - Search query
   * @returns {Promise<void>}
   */
  async saveSearchHistory(query) {
    if (!query || !this.userId) {
      return;
    }

    try {
      const timestamp = Date.now();
      const historyRef = this.db.child(config.firebasePaths.users)
        .child(this.userId)
        .child(config.firebasePaths.searchHistory)
        .child(timestamp.toString());

      await historyRef.set({
        query,
        searchedAt: timestamp
      });
    } catch (error) {
      throw new Error(`Failed to save search history: ${error.message}`);
    }
  }
}

module.exports = SearchEngine;
