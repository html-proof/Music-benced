/**
 * Smart Search and Recommendation System
 * Main entry point
 */

const SearchEngine = require('./SearchEngine');
const RecommendationEngine = require('./RecommendationEngine');
const FeedGenerator = require('./FeedGenerator');
const UserProfileManager = require('./UserProfileManager');
const { Song, UserProfile } = require('./models');
const config = require('./config');

/**
 * SmartSearchSystem - Main API for smart search and recommendations
 */
class SmartSearchSystem {
  /**
   * @param {Object} firebaseRef - Firebase database reference
   * @param {string} userId - Current user ID
   */
  constructor(firebaseRef, userId) {
    this.db = firebaseRef;
    this.userId = userId;

    // Initialize engines
    this.searchEngine = new SearchEngine(firebaseRef, userId);
    this.recommendationEngine = new RecommendationEngine(firebaseRef, userId);
    this.feedGenerator = new FeedGenerator(firebaseRef, userId, this.recommendationEngine);
    this.userProfileManager = new UserProfileManager(firebaseRef, userId);
  }

  /**
   * Search for songs
   * @param {string} query - Search query
   * @param {Object} userPreferences - User preferences (language, mood)
   * @param {Array} recentlyPlayedSongIds - Recently played song IDs (optional)
   * @returns {Promise<Array>} Search results
   */
  async search(query, userPreferences = {}, recentlyPlayedSongIds = []) {
    return await this.searchEngine.search(query, userPreferences, recentlyPlayedSongIds);
  }

  /**
   * Get personalized recommendations
   * @param {Object} userPreferences - User preferences (language, mood)
   * @returns {Promise<Array>} Recommended songs
   */
  async getRecommendations(userPreferences = {}) {
    return await this.recommendationEngine.generateRecommendations(userPreferences);
  }

  /**
   * Get home feed with all sections
   * @param {Object} userPreferences - User preferences (language, mood)
   * @returns {Promise<Object>} Home feed object
   */
  async getHomeFeed(userPreferences = {}) {
    return await this.feedGenerator.generateHomeFeed(userPreferences);
  }

  /**
   * Update user language preference
   * @param {string} language - Language preference
   * @returns {Promise<void>}
   */
  async updateLanguagePreference(language) {
    return await this.userProfileManager.updateLanguagePreference(language);
  }

  /**
   * Update user mood preference
   * @param {string} mood - Mood preference
   * @returns {Promise<void>}
   */
  async updateMoodPreference(mood) {
    return await this.userProfileManager.updateMoodPreference(mood);
  }

  /**
   * Track song play
   * @param {string} songId - Song ID
   * @returns {Promise<void>}
   */
  async trackSongPlay(songId) {
    await Promise.all([
      this.userProfileManager.addToRecentlyPlayed(songId),
      this.userProfileManager.incrementPlayCount(songId)
    ]);
  }

  /**
   * Add song to favorites
   * @param {string} songId - Song ID
   * @returns {Promise<void>}
   */
  async addToFavorites(songId) {
    return await this.userProfileManager.addToFavorites(songId);
  }

  /**
   * Remove song from favorites
   * @param {string} songId - Song ID
   * @returns {Promise<void>}
   */
  async removeFromFavorites(songId) {
    return await this.userProfileManager.removeFromFavorites(songId);
  }

  /**
   * Get user's search history
   * @returns {Promise<Array>}
   */
  async getSearchHistory() {
    return await this.userProfileManager.getSearchHistory();
  }
}

module.exports = {
  SmartSearchSystem,
  SearchEngine,
  RecommendationEngine,
  FeedGenerator,
  UserProfileManager,
  Song,
  UserProfile,
  config
};
