const Song = require('./models/Song');
const config = require('./config');

/**
 * RecommendationEngine - Personalized song recommendations
 * 
 * Generates personalized recommendations based on:
 * - User listening history and favorite artists
 * - Language and mood preferences
 * - Trending songs
 * - Recently played penalty
 */
class RecommendationEngine {
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
   * Load songs from Firebase based on language preferences
   * @param {Array|string|null} preferredLanguages - User's preferred languages (array or single string)
   * @returns {Promise<Array<Song>>} Array of Song objects
   * @private
   */
  async _loadSongs(preferredLanguages) {
    try {
      let songs = [];

      // Convert single language to array for consistency
      let languageArray = null;
      if (preferredLanguages) {
        if (Array.isArray(preferredLanguages)) {
          languageArray = preferredLanguages;
        } else if (typeof preferredLanguages === 'string') {
          languageArray = [preferredLanguages];
        }
      }

      if (languageArray && languageArray.length > 0) {
        // Load songs for all preferred languages
        const songsByLanguage = {};
        
        for (const language of languageArray) {
          const languageIndexRef = this.db.child(config.firebasePaths.songsByLanguage)
            .child(language);
          const languageSnapshot = await languageIndexRef.once('value');
          const songIds = languageSnapshot.val() || {};
          
          // Collect unique song IDs
          Object.keys(songIds).forEach(songId => {
            songsByLanguage[songId] = true;
          });
        }

        // Load full song data for collected song IDs
        const songsRef = this.db.child(config.firebasePaths.songs);
        const songPromises = Object.keys(songsByLanguage).map(async (songId) => {
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
        // Load all songs when no language preference
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
   * Load user's listening history
   * @returns {Promise<Array>} Array of recently played items
   * @private
   */
  async _loadListeningHistory() {
    try {
      const historyRef = this.db.child(config.firebasePaths.users)
        .child(this.userId)
        .child(config.firebasePaths.recentlyPlayed);
      
      const snapshot = await historyRef.once('value');
      const historyData = snapshot.val() || {};

      // Convert to array and sort by timestamp
      const history = Object.entries(historyData).map(([timestamp, item]) => ({
        songId: item.songId,
        playedAt: item.playedAt || parseInt(timestamp)
      }));

      history.sort((a, b) => b.playedAt - a.playedAt);
      return history;
    } catch (error) {
      console.warn('Failed to load listening history:', error.message);
      return [];
    }
  }

  /**
   * Generate personalized recommendations
   * @param {Object} userPreferences - User preferences (languages: array, moods: array)
   * @returns {Promise<Array>} Top 40 recommended songs
   */
  async generateRecommendations(userPreferences = {}) {
    try {
      // Load listening history to identify favorite artists (Req 3.1)
      const listeningHistory = await this._loadListeningHistory();
      const favoriteArtists = this.identifyFavoriteArtists(listeningHistory);

      // Get recently played song IDs for penalty (Req 3.6)
      const recentlyPlayedIds = listeningHistory.map(item => item.songId);

      // Load songs filtered by language preferences (Req 5.3)
      // Support both single language and multiple languages
      const preferredLanguages = userPreferences.languages || 
                                 (userPreferences.language ? [userPreferences.language] : null);
      const allSongs = await this._loadSongs(preferredLanguages);

      if (allSongs.length === 0) {
        return [];
      }

      // Score all songs for recommendations
      const scoredSongs = allSongs.map(song => ({
        song,
        score: this.scoreSongForRecommendation(
          song,
          userPreferences,
          favoriteArtists,
          recentlyPlayedIds,
          allSongs
        )
      }));

      // Filter out low scores (≤30) (Req 3.7)
      const filteredSongs = scoredSongs.filter(item => item.score > config.recommendations.minScore);

      // Sort by score descending (Req 3.8)
      filteredSongs.sort((a, b) => b.score - a.score);

      // Return top 40 results (Req 3.8)
      const topResults = filteredSongs.slice(0, config.recommendations.maxResults);

      return topResults.map(item => item.song);
    } catch (error) {
      throw new Error(`Recommendation generation failed: ${error.message}`);
    }
  }

  /**
   * Score a song for recommendations
   * @param {Object} song - Song object
   * @param {Object} userPreferences - User preferences (languages: array, moods: array)
   * @param {Array<string>} favoriteArtists - Top 3 favorite artists
   * @param {Array<string>} recentlyPlayedIds - Recently played song IDs
   * @param {Array} allSongs - All songs for trending boost calculation
   * @returns {number} Total score
   */
  scoreSongForRecommendation(song, userPreferences = {}, favoriteArtists = [], recentlyPlayedIds = [], allSongs = []) {
    let score = 0;

    // Language match: +50 points (supports multiple languages)
    if (userPreferences.languages && Array.isArray(userPreferences.languages) && song.language) {
      const languageMatch = userPreferences.languages.some(lang =>
        lang.toLowerCase() === song.language.toLowerCase()
      );
      if (languageMatch) {
        score += config.recommendations.scoring.languageMatch;
      }
    } else if (userPreferences.language && song.language) {
      // Backward compatibility: single language
      if (song.language.toLowerCase() === userPreferences.language.toLowerCase()) {
        score += config.recommendations.scoring.languageMatch;
      }
    }

    // Mood match: +40 points (supports multiple moods)
    if (userPreferences.moods && Array.isArray(userPreferences.moods) && song.moods && Array.isArray(song.moods)) {
      const moodMatch = userPreferences.moods.some(userMood =>
        song.moods.some(songMood =>
          songMood.toLowerCase() === userMood.toLowerCase()
        )
      );
      if (moodMatch) {
        score += config.recommendations.scoring.moodMatch;
      }
    } else if (userPreferences.mood && song.moods && Array.isArray(song.moods)) {
      // Backward compatibility: single mood
      const moodMatch = song.moods.some(mood =>
        mood.toLowerCase() === userPreferences.mood.toLowerCase()
      );
      if (moodMatch) {
        score += config.recommendations.scoring.moodMatch;
      }
    }

    // Favorite artist: +30 points (Req 3.4)
    if (favoriteArtists.length > 0 && song.artist) {
      const isFavoriteArtist = favoriteArtists.some(artist =>
        artist.toLowerCase() === song.artist.toLowerCase()
      );
      if (isFavoriteArtist) {
        score += config.recommendations.scoring.favoriteArtist;
      }
    }

    // Trending boost: 0-20 points (Req 3.5)
    if (allSongs && allSongs.length > 0) {
      score += this.calculateTrendingBoost(song.playCount || 0, allSongs);
    }

    // Recently played penalty: -25 points (Req 3.6)
    if (recentlyPlayedIds.includes(song.id)) {
      score += config.recommendations.scoring.recentlyPlayedPenalty; // This is -25
    }

    return score;
  }

  /**
   * Identify user's top 3 favorite artists
   * @param {Array} listeningHistory - User's listening history
   * @returns {Array<string>} Top 3 artist names
   */
  identifyFavoriteArtists(listeningHistory) {
    if (!listeningHistory || listeningHistory.length === 0) {
      return [];
    }

    // Count artist occurrences
    const artistCounts = {};
    
    listeningHistory.forEach(item => {
      // Note: In real implementation, you'd need to fetch song data to get artist
      // For now, we'll assume the history items have artist info
      if (item.artist) {
        const artist = item.artist;
        artistCounts[artist] = (artistCounts[artist] || 0) + 1;
      }
    });

    // Sort by count and get top 3
    const sortedArtists = Object.entries(artistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, config.recommendations.topArtistsCount)
      .map(([artist]) => artist);

    return sortedArtists;
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
    
    // Calculate percentile
    const percentile = (lowerCount / (playCounts.length - 1)) * 100;
    
    // Map percentile to 0-20 points
    const boost = Math.round((percentile / 100) * config.recommendations.scoring.trendingMax);
    
    // Ensure boost is within valid range
    return Math.max(0, Math.min(config.recommendations.scoring.trendingMax, boost));
  }
}

module.exports = RecommendationEngine;
