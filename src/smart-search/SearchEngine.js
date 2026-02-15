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
   * @param {Object} userPreferences - User preferences (language, mood)
   * @returns {Promise<Array>} Top 30 ranked search results
   */
  async search(query, userPreferences) {
    // TODO: Implement search logic
    throw new Error('Not implemented');
  }

  /**
   * Score a single song against the query
   * @param {Object} song - Song object
   * @param {string} query - Search query
   * @param {Object} userPreferences - User preferences
   * @param {Array} recentlyPlayedSongIds - Array of recently played song IDs (optional)
   * @param {Array} allSongs - All songs for trending boost calculation (optional)
   * @returns {number} Total score
   */
  scoreSong(song, query, userPreferences = {}, recentlyPlayedSongIds = [], allSongs = []) {
    let score = 0;

    // Score title field (Req 1.2, 1.3, 1.4)
    score += this.scoreField(song.title, query, 100, 80, 60);

    // Score movie field (Req 1.5, 1.6)
    score += this.scoreField(song.movie, query, 70, 0, 50);

    // Score artist field (Req 1.7, 1.8)
    score += this.scoreField(song.artist, query, 65, 0, 45);

    // Score album field (Req 1.9)
    score += this.scoreField(song.album, query, 30, 0, 30);

    // Score tags field (Req 1.10)
    if (song.tags && Array.isArray(song.tags)) {
      for (const tag of song.tags) {
        const tagScore = this.scoreField(tag, query, 25, 0, 25);
        if (tagScore > 0) {
          score += tagScore;
          break; // Only count first matching tag
        }
      }
    }

    // Apply personalization boosts (Req 2.1, 2.2, 2.3)
    
    // Language preference boost: +30 points (Req 2.1)
    if (userPreferences.language && song.language && 
        song.language.toLowerCase() === userPreferences.language.toLowerCase()) {
      score += 30;
    }

    // Mood preference boost: +25 points (Req 2.2)
    if (userPreferences.mood && song.moods && Array.isArray(song.moods)) {
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
    // TODO: Implement search history tracking
    throw new Error('Not implemented');
  }
}

module.exports = SearchEngine;
