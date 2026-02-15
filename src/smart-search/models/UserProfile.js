/**
 * UserProfile data model with validation
 * Represents a user profile with preferences, history, favorites, and search history
 */
class UserProfile {
  /**
   * Create a UserProfile instance
   * @param {Object} data - User profile data object
   * @param {string} data.userId - Unique user identifier
   * @param {Object} data.preferences - User preferences
   * @param {string} data.preferences.language - Preferred language
   * @param {string} data.preferences.mood - Preferred mood
   * @param {Array} data.recentlyPlayed - Recently played songs with timestamps
   * @param {Array} data.favorites - Array of favorite song IDs
   * @param {Array} data.searchHistory - Search history with timestamps
   */
  constructor(data) {
    this.userId = data.userId;
    // Preserve preferences as-is for validation, but ensure it's an object if valid
    if (data.preferences && typeof data.preferences === 'object' && !Array.isArray(data.preferences)) {
      this.preferences = {
        language: data.preferences.language || null,
        mood: data.preferences.mood || null
      };
    } else if (!data.preferences) {
      this.preferences = {
        language: null,
        mood: null
      };
    } else {
      // Invalid preferences - store as-is for validation to catch
      this.preferences = data.preferences;
    }
    this.recentlyPlayed = data.recentlyPlayed || [];
    this.favorites = data.favorites || [];
    this.searchHistory = data.searchHistory || [];
  }

  /**
   * Validate user profile data integrity
   * @returns {Object} Validation result with isValid flag and errors array
   */
  validate() {
    const errors = [];

    // Required userId
    if (!this.userId || typeof this.userId !== 'string' || this.userId.trim() === '') {
      errors.push('userId is required and must be a non-empty string');
    }

    // Preferences object
    if (!this.preferences || typeof this.preferences !== 'object') {
      errors.push('preferences must be an object');
    } else {
      // Language can be null or string
      if (this.preferences.language !== null && typeof this.preferences.language !== 'string') {
        errors.push('preferences.language must be null or a string');
      }

      // Mood can be null or string
      if (this.preferences.mood !== null && typeof this.preferences.mood !== 'string') {
        errors.push('preferences.mood must be null or a string');
      }
    }

    // Recently played array
    if (!Array.isArray(this.recentlyPlayed)) {
      errors.push('recentlyPlayed must be an array');
    } else {
      this.recentlyPlayed.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          errors.push(`recentlyPlayed[${index}] must be an object`);
        } else {
          if (!item.songId || typeof item.songId !== 'string') {
            errors.push(`recentlyPlayed[${index}].songId is required and must be a string`);
          }
          if (!item.playedAt || typeof item.playedAt !== 'number') {
            errors.push(`recentlyPlayed[${index}].playedAt is required and must be a number (timestamp)`);
          }
        }
      });
    }

    // Favorites array
    if (!Array.isArray(this.favorites)) {
      errors.push('favorites must be an array');
    } else if (this.favorites.some(id => typeof id !== 'string')) {
      errors.push('all favorites must be strings (song IDs)');
    }

    // Search history array
    if (!Array.isArray(this.searchHistory)) {
      errors.push('searchHistory must be an array');
    } else {
      this.searchHistory.forEach((item, index) => {
        if (!item || typeof item !== 'object') {
          errors.push(`searchHistory[${index}] must be an object`);
        } else {
          if (!item.query || typeof item.query !== 'string') {
            errors.push(`searchHistory[${index}].query is required and must be a string`);
          }
          if (!item.searchedAt || typeof item.searchedAt !== 'number') {
            errors.push(`searchHistory[${index}].searchedAt is required and must be a number (timestamp)`);
          }
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if the user profile data is valid
   * @returns {boolean} True if valid, false otherwise
   */
  isValid() {
    return this.validate().isValid;
  }

  /**
   * Set language preference
   * @param {string} language - Language preference
   */
  setLanguagePreference(language) {
    if (typeof language !== 'string' || language.trim() === '') {
      throw new Error('Language must be a non-empty string');
    }
    this.preferences.language = language;
  }

  /**
   * Set mood preference
   * @param {string} mood - Mood preference
   */
  setMoodPreference(mood) {
    if (typeof mood !== 'string' || mood.trim() === '') {
      throw new Error('Mood must be a non-empty string');
    }
    this.preferences.mood = mood;
  }

  /**
   * Add song to recently played list
   * @param {string} songId - Song ID
   * @param {number} timestamp - Played at timestamp (defaults to now)
   */
  addToRecentlyPlayed(songId, timestamp = Date.now()) {
    if (typeof songId !== 'string' || songId.trim() === '') {
      throw new Error('Song ID must be a non-empty string');
    }
    if (typeof timestamp !== 'number' || timestamp <= 0) {
      throw new Error('Timestamp must be a positive number');
    }

    // Add to beginning (most recent first)
    this.recentlyPlayed.unshift({
      songId,
      playedAt: timestamp
    });

    // Trim to max 50 songs
    if (this.recentlyPlayed.length > 50) {
      this.recentlyPlayed = this.recentlyPlayed.slice(0, 50);
    }
  }

  /**
   * Add song to favorites
   * @param {string} songId - Song ID
   */
  addToFavorites(songId) {
    if (typeof songId !== 'string' || songId.trim() === '') {
      throw new Error('Song ID must be a non-empty string');
    }

    // Idempotent - only add if not already present
    if (!this.favorites.includes(songId)) {
      this.favorites.push(songId);
    }
  }

  /**
   * Remove song from favorites
   * @param {string} songId - Song ID
   */
  removeFromFavorites(songId) {
    if (typeof songId !== 'string' || songId.trim() === '') {
      throw new Error('Song ID must be a non-empty string');
    }

    const index = this.favorites.indexOf(songId);
    if (index !== -1) {
      this.favorites.splice(index, 1);
    }
  }

  /**
   * Add search query to history
   * @param {string} query - Search query
   * @param {number} timestamp - Searched at timestamp (defaults to now)
   */
  addToSearchHistory(query, timestamp = Date.now()) {
    if (typeof query !== 'string' || query.trim() === '') {
      throw new Error('Query must be a non-empty string');
    }
    if (typeof timestamp !== 'number' || timestamp <= 0) {
      throw new Error('Timestamp must be a positive number');
    }

    // Add to beginning (most recent first)
    this.searchHistory.unshift({
      query,
      searchedAt: timestamp
    });
  }

  /**
   * Get search history ordered by timestamp descending
   * @returns {Array} Search history with most recent first
   */
  getSearchHistory() {
    // Already maintained in descending order
    return [...this.searchHistory];
  }

  /**
   * Check if a song is in favorites
   * @param {string} songId - Song ID
   * @returns {boolean} True if song is favorited
   */
  isFavorite(songId) {
    return this.favorites.includes(songId);
  }

  /**
   * Check if a song was recently played
   * @param {string} songId - Song ID
   * @returns {boolean} True if song is in recently played
   */
  wasRecentlyPlayed(songId) {
    return this.recentlyPlayed.some(item => item.songId === songId);
  }

  /**
   * Create a UserProfile instance from Firebase data
   * @param {string} userId - User ID
   * @param {Object} data - Firebase user data
   * @returns {UserProfile} UserProfile instance
   */
  static fromFirebase(userId, data) {
    // Convert Firebase structure to UserProfile structure
    const recentlyPlayed = [];
    if (data.recentlyPlayed) {
      // Firebase stores as object with timestamp keys
      Object.entries(data.recentlyPlayed).forEach(([timestamp, item]) => {
        recentlyPlayed.push({
          songId: item.songId,
          playedAt: item.playedAt || parseInt(timestamp)
        });
      });
      // Sort by timestamp descending (most recent first)
      recentlyPlayed.sort((a, b) => b.playedAt - a.playedAt);
    }

    const favorites = [];
    if (data.favorites) {
      // Firebase stores as object with songId keys
      Object.keys(data.favorites).forEach(songId => {
        favorites.push(songId);
      });
    }

    const searchHistory = [];
    if (data.searchHistory) {
      // Firebase stores as object with timestamp keys
      Object.entries(data.searchHistory).forEach(([timestamp, item]) => {
        searchHistory.push({
          query: item.query,
          searchedAt: item.searchedAt || parseInt(timestamp)
        });
      });
      // Sort by timestamp descending (most recent first)
      searchHistory.sort((a, b) => b.searchedAt - a.searchedAt);
    }

    return new UserProfile({
      userId,
      preferences: data.preferences || {},
      recentlyPlayed,
      favorites,
      searchHistory
    });
  }

  /**
   * Convert UserProfile instance to plain object for Firebase
   * @returns {Object} Plain object representation
   */
  toFirebase() {
    // Convert arrays to Firebase-friendly objects
    const recentlyPlayed = {};
    this.recentlyPlayed.forEach(item => {
      recentlyPlayed[item.playedAt] = {
        songId: item.songId,
        playedAt: item.playedAt
      };
    });

    const favorites = {};
    this.favorites.forEach(songId => {
      favorites[songId] = true;
    });

    const searchHistory = {};
    this.searchHistory.forEach(item => {
      searchHistory[item.searchedAt] = {
        query: item.query,
        searchedAt: item.searchedAt
      };
    });

    return {
      preferences: this.preferences,
      recentlyPlayed,
      favorites,
      searchHistory
    };
  }

  /**
   * Create a copy of the user profile
   * @returns {UserProfile} New UserProfile instance with same data
   */
  clone() {
    return new UserProfile({
      userId: this.userId,
      preferences: { ...this.preferences },
      recentlyPlayed: this.recentlyPlayed.map(item => ({ ...item })),
      favorites: [...this.favorites],
      searchHistory: this.searchHistory.map(item => ({ ...item }))
    });
  }
}

module.exports = UserProfile;
