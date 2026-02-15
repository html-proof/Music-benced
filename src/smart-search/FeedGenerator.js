const Song = require('./models/Song');
const config = require('./config');

/**
 * FeedGenerator - Curated home feed sections
 * 
 * Creates personalized home feed with multiple sections:
 * - Continue Playing
 * - Based on Mood
 * - Trending in Language
 * - Recommended For You
 * - Recently Played
 * - New Releases
 */
class FeedGenerator {
  /**
   * @param {Object} firebaseRef - Firebase database reference
   * @param {string} userId - Current user ID
   * @param {Object} recommendationEngine - RecommendationEngine instance
   */
  constructor(firebaseRef, userId, recommendationEngine) {
    this.db = firebaseRef;
    this.userId = userId;
    this.recommendationEngine = recommendationEngine;
  }

  /**
   * Load songs from Firebase based on languages
   * @param {Array|string|null} languages - Language filter (array or single string)
   * @returns {Promise<Array<Song>>} Array of Song objects
   * @private
   */
  async _loadSongsByLanguage(languages) {
    try {
      // Convert single language to array for consistency
      let languageArray = null;
      if (languages) {
        if (Array.isArray(languages)) {
          languageArray = languages;
        } else if (typeof languages === 'string') {
          languageArray = [languages];
        }
      }

      if (!languageArray || languageArray.length === 0) {
        // Load all songs
        const songsRef = this.db.child(config.firebasePaths.songs);
        const songsSnapshot = await songsRef.once('value');
        const songsData = songsSnapshot.val() || {};

        return Object.entries(songsData).map(([songId, songData]) => {
          return Song.fromFirebase(songId, songData);
        });
      }

      // Load songs for all specified languages
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

      // Load full song data
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
      return loadedSongs.filter(song => song !== null);
    } catch (error) {
      console.warn('Failed to load songs by language:', error.message);
      return [];
    }
  }

  /**
   * Load user's recently played songs
   * @returns {Promise<Array>} Array of recently played items
   * @private
   */
  async _loadRecentlyPlayed() {
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
      console.warn('Failed to load recently played:', error.message);
      return [];
    }
  }

  /**
   * Generate complete home feed
   * @param {Object} userPreferences - User preferences (languages: array, moods: array)
   * @returns {Promise<Object>} Feed object with all sections
   */
  async generateHomeFeed(userPreferences = {}) {
    try {
      // Support both single and multiple languages/moods
      const languages = userPreferences.languages || 
                       (userPreferences.language ? [userPreferences.language] : null);
      const moods = userPreferences.moods || 
                   (userPreferences.mood ? [userPreferences.mood] : null);

      // Load sections in parallel for better performance (Req 5.4)
      const [
        continuePlaying,
        basedOnMood,
        trendingInLanguage,
        recommendedForYou,
        recentlyPlayed,
        newReleases
      ] = await Promise.all([
        this.getContinuePlaying().catch(err => {
          console.warn('Continue Playing section failed:', err.message);
          return [];
        }),
        this.getBasedOnMood(moods, languages).catch(err => {
          console.warn('Based on Mood section failed:', err.message);
          return [];
        }),
        this.getTrendingInLanguage(languages).catch(err => {
          console.warn('Trending in Language section failed:', err.message);
          return [];
        }),
        this.getRecommendedForYou(userPreferences).catch(err => {
          console.warn('Recommended For You section failed:', err.message);
          return [];
        }),
        this.getRecentlyPlayed().catch(err => {
          console.warn('Recently Played section failed:', err.message);
          return [];
        }),
        this.getNewReleases(languages).catch(err => {
          console.warn('New Releases section failed:', err.message);
          return [];
        })
      ]);

      // Build feed object (Req 4.1-4.6)
      const feed = {};

      // Only include Continue Playing if there are recently played songs (Req 4.7)
      if (continuePlaying.length > 0) {
        feed.continuePlaying = continuePlaying;
      }

      feed.basedOnMood = basedOnMood;
      feed.trendingInLanguage = trendingInLanguage;
      feed.recommendedForYou = recommendedForYou;
      feed.recentlyPlayed = recentlyPlayed;
      feed.newReleases = newReleases;

      return feed;
    } catch (error) {
      throw new Error(`Feed generation failed: ${error.message}`);
    }
  }

  /**
   * Generate Continue Playing section
   * @returns {Promise<Array>} Last 5 songs from recently played
   */
  async getContinuePlaying() {
    const recentlyPlayed = await this._loadRecentlyPlayed();
    
    if (recentlyPlayed.length === 0) {
      return [];
    }

    // Get last 5 songs (Req 4.1)
    const last5 = recentlyPlayed.slice(0, config.feed.continuePlaying.maxSongs);

    // Load full song data
    const songsRef = this.db.child(config.firebasePaths.songs);
    const songPromises = last5.map(async (item) => {
      const songSnapshot = await songsRef.child(item.songId).once('value');
      const songData = songSnapshot.val();
      if (songData) {
        return Song.fromFirebase(item.songId, songData);
      }
      return null;
    });

    const songs = await Promise.all(songPromises);
    return songs.filter(song => song !== null);
  }

  /**
   * Generate Based on Mood section
   * @param {Array|string} moods - User's mood preferences (array or single string)
   * @param {Array|string} languages - User's language preferences (array or single string)
   * @returns {Promise<Array>} Top 20 songs matching moods and languages
   */
  async getBasedOnMood(moods, languages) {
    // Convert to arrays for consistency
    const moodArray = Array.isArray(moods) ? moods : (moods ? [moods] : []);
    
    if (moodArray.length === 0) {
      return [];
    }

    // Load songs by languages (Req 4.2)
    const allSongs = await this._loadSongsByLanguage(languages);

    // Filter by moods (match any of the user's moods)
    const moodSongs = allSongs.filter(song => {
      if (!song.moods || !Array.isArray(song.moods)) {
        return false;
      }
      return moodArray.some(userMood =>
        song.moods.some(songMood => 
          songMood.toLowerCase() === userMood.toLowerCase()
        )
      );
    });

    // Sort by play count descending (Req 4.2)
    moodSongs.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

    // Return top 20
    return moodSongs.slice(0, config.feed.basedOnMood.maxSongs);
  }

  /**
   * Generate Trending in Language section
   * @param {Array|string} languages - User's language preferences (array or single string)
   * @returns {Promise<Array>} Top 20 trending songs in languages
   */
  async getTrendingInLanguage(languages) {
    // Load songs by languages (Req 4.3)
    const allSongs = await this._loadSongsByLanguage(languages);

    // Sort by play count descending (Req 4.8)
    allSongs.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));

    // Return top 20
    return allSongs.slice(0, config.feed.trendingInLanguage.maxSongs);
  }

  /**
   * Generate Recommended For You section
   * @param {Object} userPreferences - User preferences
   * @returns {Promise<Array>} Top 20 recommendations
   */
  async getRecommendedForYou(userPreferences) {
    // Use RecommendationEngine (Req 4.4)
    const recommendations = await this.recommendationEngine.generateRecommendations(userPreferences);

    // Return top 20
    return recommendations.slice(0, config.feed.recommendedForYou.maxSongs);
  }

  /**
   * Generate Recently Played section
   * @returns {Promise<Array>} Up to 20 recently played songs
   */
  async getRecentlyPlayed() {
    const recentlyPlayed = await this._loadRecentlyPlayed();

    // Get up to 20 songs (Req 4.5)
    const items = recentlyPlayed.slice(0, config.feed.recentlyPlayed.maxSongs);

    // Load full song data
    const songsRef = this.db.child(config.firebasePaths.songs);
    const songPromises = items.map(async (item) => {
      const songSnapshot = await songsRef.child(item.songId).once('value');
      const songData = songSnapshot.val();
      if (songData) {
        return Song.fromFirebase(item.songId, songData);
      }
      return null;
    });

    const songs = await Promise.all(songPromises);
    return songs.filter(song => song !== null);
  }

  /**
   * Generate New Releases section
   * @param {Array|string} languages - User's language preferences (array or single string)
   * @returns {Promise<Array>} Top 20 new releases
   */
  async getNewReleases(languages) {
    // Load songs by languages (Req 4.6)
    const allSongs = await this._loadSongsByLanguage(languages);

    // Sort by createdAt timestamp descending (Req 4.6)
    allSongs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    // Return top 20
    return allSongs.slice(0, config.feed.newReleases.maxSongs);
  }
}

module.exports = FeedGenerator;
