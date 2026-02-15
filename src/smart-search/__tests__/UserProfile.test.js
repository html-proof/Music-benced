/**
 * Unit tests for UserProfile data model
 * Tests user profile validation and data manipulation
 */

const { UserProfile } = require('../models');

describe('UserProfile Data Model', () => {
  describe('Constructor', () => {
    test('should create a UserProfile instance with all required fields', () => {
      const profileData = {
        userId: 'user-123',
        preferences: {
          language: 'English',
          mood: 'happy'
        },
        recentlyPlayed: [
          { songId: 'song-1', playedAt: Date.now() },
          { songId: 'song-2', playedAt: Date.now() - 1000 }
        ],
        favorites: ['song-3', 'song-4'],
        searchHistory: [
          { query: 'test query', searchedAt: Date.now() }
        ]
      };

      const profile = new UserProfile(profileData);

      expect(profile.userId).toBe(profileData.userId);
      expect(profile.preferences.language).toBe(profileData.preferences.language);
      expect(profile.preferences.mood).toBe(profileData.preferences.mood);
      expect(profile.recentlyPlayed).toEqual(profileData.recentlyPlayed);
      expect(profile.favorites).toEqual(profileData.favorites);
      expect(profile.searchHistory).toEqual(profileData.searchHistory);
    });

    test('should use default values for optional fields', () => {
      const profileData = {
        userId: 'user-456'
      };

      const profile = new UserProfile(profileData);

      expect(profile.userId).toBe('user-456');
      expect(profile.preferences.language).toBeNull();
      expect(profile.preferences.mood).toBeNull();
      expect(profile.recentlyPlayed).toEqual([]);
      expect(profile.favorites).toEqual([]);
      expect(profile.searchHistory).toEqual([]);
    });

    test('should handle null preferences', () => {
      const profileData = {
        userId: 'user-789',
        preferences: {
          language: null,
          mood: null
        }
      };

      const profile = new UserProfile(profileData);

      expect(profile.preferences.language).toBeNull();
      expect(profile.preferences.mood).toBeNull();
    });
  });

  describe('Validation', () => {
    const validProfileData = {
      userId: 'user-valid',
      preferences: {
        language: 'English',
        mood: 'happy'
      },
      recentlyPlayed: [
        { songId: 'song-1', playedAt: 1234567890 }
      ],
      favorites: ['song-2'],
      searchHistory: [
        { query: 'test', searchedAt: 1234567890 }
      ]
    };

    test('should validate a valid user profile', () => {
      const profile = new UserProfile(validProfileData);
      const result = profile.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should return true for isValid() with valid data', () => {
      const profile = new UserProfile(validProfileData);
      expect(profile.isValid()).toBe(true);
    });

    test('should fail validation when userId is missing', () => {
      const invalidData = { ...validProfileData, userId: '' };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('userId is required and must be a non-empty string');
    });

    test('should fail validation when userId is not a string', () => {
      const invalidData = { ...validProfileData, userId: 123 };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('userId is required and must be a non-empty string');
    });

    test('should fail validation when preferences is not an object', () => {
      const invalidData = { ...validProfileData, preferences: 'invalid' };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('preferences must be an object');
    });

    test('should fail validation when language is not null or string', () => {
      const invalidData = {
        ...validProfileData,
        preferences: { language: 123, mood: 'happy' }
      };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('preferences.language must be null or a string');
    });

    test('should fail validation when mood is not null or string', () => {
      const invalidData = {
        ...validProfileData,
        preferences: { language: 'English', mood: 456 }
      };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('preferences.mood must be null or a string');
    });

    test('should fail validation when recentlyPlayed is not an array', () => {
      const invalidData = { ...validProfileData, recentlyPlayed: 'invalid' };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recentlyPlayed must be an array');
    });

    test('should fail validation when recentlyPlayed item is missing songId', () => {
      const invalidData = {
        ...validProfileData,
        recentlyPlayed: [{ playedAt: 1234567890 }]
      };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recentlyPlayed[0].songId is required and must be a string');
    });

    test('should fail validation when recentlyPlayed item is missing playedAt', () => {
      const invalidData = {
        ...validProfileData,
        recentlyPlayed: [{ songId: 'song-1' }]
      };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('recentlyPlayed[0].playedAt is required and must be a number (timestamp)');
    });

    test('should fail validation when favorites is not an array', () => {
      const invalidData = { ...validProfileData, favorites: 'invalid' };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('favorites must be an array');
    });

    test('should fail validation when favorites contains non-string values', () => {
      const invalidData = { ...validProfileData, favorites: ['song-1', 123, 'song-2'] };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('all favorites must be strings (song IDs)');
    });

    test('should fail validation when searchHistory is not an array', () => {
      const invalidData = { ...validProfileData, searchHistory: 'invalid' };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('searchHistory must be an array');
    });

    test('should fail validation when searchHistory item is missing query', () => {
      const invalidData = {
        ...validProfileData,
        searchHistory: [{ searchedAt: 1234567890 }]
      };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('searchHistory[0].query is required and must be a string');
    });

    test('should fail validation when searchHistory item is missing searchedAt', () => {
      const invalidData = {
        ...validProfileData,
        searchHistory: [{ query: 'test' }]
      };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('searchHistory[0].searchedAt is required and must be a number (timestamp)');
    });

    test('should collect multiple validation errors', () => {
      const invalidData = {
        userId: '',
        preferences: 'invalid',
        recentlyPlayed: 'invalid',
        favorites: 'invalid',
        searchHistory: 'invalid'
      };
      const profile = new UserProfile(invalidData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('Preference Management', () => {
    test('should set language preference', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.setLanguagePreference('Spanish');

      expect(profile.preferences.language).toBe('Spanish');
    });

    test('should set mood preference', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.setMoodPreference('energetic');

      expect(profile.preferences.mood).toBe('energetic');
    });

    test('should throw error when setting empty language', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.setLanguagePreference('')).toThrow('Language must be a non-empty string');
    });

    test('should throw error when setting non-string language', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.setLanguagePreference(123)).toThrow('Language must be a non-empty string');
    });

    test('should throw error when setting empty mood', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.setMoodPreference('')).toThrow('Mood must be a non-empty string');
    });

    test('should throw error when setting non-string mood', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.setMoodPreference(456)).toThrow('Mood must be a non-empty string');
    });
  });

  describe('Recently Played Management', () => {
    test('should add song to recently played', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      const timestamp = Date.now();
      profile.addToRecentlyPlayed('song-1', timestamp);

      expect(profile.recentlyPlayed).toHaveLength(1);
      expect(profile.recentlyPlayed[0]).toEqual({ songId: 'song-1', playedAt: timestamp });
    });

    test('should add song to beginning of recently played (most recent first)', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToRecentlyPlayed('song-1', 1000);
      profile.addToRecentlyPlayed('song-2', 2000);

      expect(profile.recentlyPlayed[0].songId).toBe('song-2');
      expect(profile.recentlyPlayed[1].songId).toBe('song-1');
    });

    test('should use current timestamp if not provided', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      const before = Date.now();
      profile.addToRecentlyPlayed('song-1');
      const after = Date.now();

      expect(profile.recentlyPlayed[0].playedAt).toBeGreaterThanOrEqual(before);
      expect(profile.recentlyPlayed[0].playedAt).toBeLessThanOrEqual(after);
    });

    test('should trim recently played to max 50 songs', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      // Add 55 songs
      for (let i = 0; i < 55; i++) {
        profile.addToRecentlyPlayed(`song-${i}`, Date.now() + i);
      }

      expect(profile.recentlyPlayed).toHaveLength(50);
      // Most recent should be song-54
      expect(profile.recentlyPlayed[0].songId).toBe('song-54');
      // Oldest should be song-5 (songs 0-4 were trimmed)
      expect(profile.recentlyPlayed[49].songId).toBe('song-5');
    });

    test('should throw error when adding empty songId', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToRecentlyPlayed('')).toThrow('Song ID must be a non-empty string');
    });

    test('should throw error when adding non-string songId', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToRecentlyPlayed(123)).toThrow('Song ID must be a non-empty string');
    });

    test('should throw error when timestamp is invalid', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToRecentlyPlayed('song-1', -100)).toThrow('Timestamp must be a positive number');
    });

    test('should check if song was recently played', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToRecentlyPlayed('song-1', Date.now());

      expect(profile.wasRecentlyPlayed('song-1')).toBe(true);
      expect(profile.wasRecentlyPlayed('song-2')).toBe(false);
    });
  });

  describe('Favorites Management', () => {
    test('should add song to favorites', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToFavorites('song-1');

      expect(profile.favorites).toContain('song-1');
    });

    test('should be idempotent (adding same song twice)', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToFavorites('song-1');
      profile.addToFavorites('song-1');

      expect(profile.favorites).toHaveLength(1);
      expect(profile.favorites).toContain('song-1');
    });

    test('should remove song from favorites', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToFavorites('song-1');
      profile.removeFromFavorites('song-1');

      expect(profile.favorites).not.toContain('song-1');
      expect(profile.favorites).toHaveLength(0);
    });

    test('should handle removing non-existent favorite gracefully', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.removeFromFavorites('song-1');

      expect(profile.favorites).toHaveLength(0);
    });

    test('should throw error when adding empty songId to favorites', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToFavorites('')).toThrow('Song ID must be a non-empty string');
    });

    test('should throw error when adding non-string songId to favorites', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToFavorites(789)).toThrow('Song ID must be a non-empty string');
    });

    test('should throw error when removing empty songId from favorites', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.removeFromFavorites('')).toThrow('Song ID must be a non-empty string');
    });

    test('should check if song is favorite', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToFavorites('song-1');

      expect(profile.isFavorite('song-1')).toBe(true);
      expect(profile.isFavorite('song-2')).toBe(false);
    });
  });

  describe('Search History Management', () => {
    test('should add query to search history', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      const timestamp = Date.now();
      profile.addToSearchHistory('test query', timestamp);

      expect(profile.searchHistory).toHaveLength(1);
      expect(profile.searchHistory[0]).toEqual({ query: 'test query', searchedAt: timestamp });
    });

    test('should add query to beginning of search history (most recent first)', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToSearchHistory('query 1', 1000);
      profile.addToSearchHistory('query 2', 2000);

      expect(profile.searchHistory[0].query).toBe('query 2');
      expect(profile.searchHistory[1].query).toBe('query 1');
    });

    test('should use current timestamp if not provided', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      const before = Date.now();
      profile.addToSearchHistory('test query');
      const after = Date.now();

      expect(profile.searchHistory[0].searchedAt).toBeGreaterThanOrEqual(before);
      expect(profile.searchHistory[0].searchedAt).toBeLessThanOrEqual(after);
    });

    test('should get search history in descending order', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToSearchHistory('query 1', 1000);
      profile.addToSearchHistory('query 2', 2000);
      profile.addToSearchHistory('query 3', 3000);

      const history = profile.getSearchHistory();

      expect(history[0].query).toBe('query 3');
      expect(history[1].query).toBe('query 2');
      expect(history[2].query).toBe('query 1');
    });

    test('should return copy of search history (not reference)', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToSearchHistory('query 1', 1000);

      const history = profile.getSearchHistory();
      history.push({ query: 'query 2', searchedAt: 2000 });

      expect(profile.searchHistory).toHaveLength(1);
    });

    test('should throw error when adding empty query', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToSearchHistory('')).toThrow('Query must be a non-empty string');
    });

    test('should throw error when adding non-string query', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToSearchHistory(123)).toThrow('Query must be a non-empty string');
    });

    test('should throw error when timestamp is invalid', () => {
      const profile = new UserProfile({ userId: 'user-1' });

      expect(() => profile.addToSearchHistory('test', 0)).toThrow('Timestamp must be a positive number');
    });
  });

  describe('Firebase Integration', () => {
    test('should create UserProfile from Firebase data', () => {
      const firebaseData = {
        preferences: {
          language: 'English',
          mood: 'happy'
        },
        recentlyPlayed: {
          '1234567890': { songId: 'song-1', playedAt: 1234567890 },
          '1234567900': { songId: 'song-2', playedAt: 1234567900 }
        },
        favorites: {
          'song-3': true,
          'song-4': true
        },
        searchHistory: {
          '1234567890': { query: 'test query', searchedAt: 1234567890 }
        }
      };

      const profile = UserProfile.fromFirebase('user-123', firebaseData);

      expect(profile.userId).toBe('user-123');
      expect(profile.preferences.language).toBe('English');
      expect(profile.preferences.mood).toBe('happy');
      expect(profile.recentlyPlayed).toHaveLength(2);
      expect(profile.recentlyPlayed[0].songId).toBe('song-2'); // Most recent first
      expect(profile.favorites).toContain('song-3');
      expect(profile.favorites).toContain('song-4');
      expect(profile.searchHistory).toHaveLength(1);
    });

    test('should handle empty Firebase data', () => {
      const profile = UserProfile.fromFirebase('user-456', {});

      expect(profile.userId).toBe('user-456');
      expect(profile.preferences.language).toBeNull();
      expect(profile.preferences.mood).toBeNull();
      expect(profile.recentlyPlayed).toEqual([]);
      expect(profile.favorites).toEqual([]);
      expect(profile.searchHistory).toEqual([]);
    });

    test('should convert UserProfile to Firebase format', () => {
      const profileData = {
        userId: 'user-789',
        preferences: {
          language: 'Spanish',
          mood: 'calm'
        },
        recentlyPlayed: [
          { songId: 'song-1', playedAt: 1234567890 },
          { songId: 'song-2', playedAt: 1234567900 }
        ],
        favorites: ['song-3', 'song-4'],
        searchHistory: [
          { query: 'test', searchedAt: 1234567890 }
        ]
      };

      const profile = new UserProfile(profileData);
      const firebaseData = profile.toFirebase();

      expect(firebaseData.preferences.language).toBe('Spanish');
      expect(firebaseData.preferences.mood).toBe('calm');
      expect(firebaseData.recentlyPlayed['1234567890']).toEqual({ songId: 'song-1', playedAt: 1234567890 });
      expect(firebaseData.recentlyPlayed['1234567900']).toEqual({ songId: 'song-2', playedAt: 1234567900 });
      expect(firebaseData.favorites['song-3']).toBe(true);
      expect(firebaseData.favorites['song-4']).toBe(true);
      expect(firebaseData.searchHistory['1234567890']).toEqual({ query: 'test', searchedAt: 1234567890 });
    });
  });

  describe('Utility Methods', () => {
    test('should clone a user profile', () => {
      const profileData = {
        userId: 'user-clone',
        preferences: {
          language: 'English',
          mood: 'happy'
        },
        recentlyPlayed: [
          { songId: 'song-1', playedAt: 1234567890 }
        ],
        favorites: ['song-2'],
        searchHistory: [
          { query: 'test', searchedAt: 1234567890 }
        ]
      };

      const original = new UserProfile(profileData);
      const clone = original.clone();

      expect(clone).not.toBe(original);
      expect(clone.userId).toBe(original.userId);
      expect(clone.preferences).toEqual(original.preferences);
      expect(clone.preferences).not.toBe(original.preferences);
      expect(clone.recentlyPlayed).toEqual(original.recentlyPlayed);
      expect(clone.recentlyPlayed).not.toBe(original.recentlyPlayed);
      expect(clone.favorites).toEqual(original.favorites);
      expect(clone.favorites).not.toBe(original.favorites);
      expect(clone.searchHistory).toEqual(original.searchHistory);
      expect(clone.searchHistory).not.toBe(original.searchHistory);
    });

    test('should create independent clone (modifying clone does not affect original)', () => {
      const profileData = {
        userId: 'user-independent',
        preferences: {
          language: 'English',
          mood: 'happy'
        },
        recentlyPlayed: [
          { songId: 'song-1', playedAt: 1234567890 }
        ],
        favorites: ['song-2'],
        searchHistory: [
          { query: 'test', searchedAt: 1234567890 }
        ]
      };

      const original = new UserProfile(profileData);
      const clone = original.clone();

      clone.preferences.language = 'Spanish';
      clone.recentlyPlayed.push({ songId: 'song-3', playedAt: 1234567900 });
      clone.favorites.push('song-4');
      clone.searchHistory.push({ query: 'new query', searchedAt: 1234567900 });

      expect(original.preferences.language).toBe('English');
      expect(original.recentlyPlayed).toHaveLength(1);
      expect(original.favorites).toHaveLength(1);
      expect(original.searchHistory).toHaveLength(1);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty arrays', () => {
      const profileData = {
        userId: 'user-empty',
        preferences: {},
        recentlyPlayed: [],
        favorites: [],
        searchHistory: []
      };

      const profile = new UserProfile(profileData);
      const result = profile.validate();

      expect(result.isValid).toBe(true);
    });

    test('should handle whitespace-only userId as invalid', () => {
      const profileData = {
        userId: '   ',
        preferences: {}
      };

      const profile = new UserProfile(profileData);
      const result = profile.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('userId is required and must be a non-empty string');
    });

    test('should handle special characters in queries', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToSearchHistory('test @#$% query!', Date.now());

      expect(profile.searchHistory[0].query).toBe('test @#$% query!');
    });

    test('should handle unicode characters in queries', () => {
      const profile = new UserProfile({ userId: 'user-1' });
      profile.addToSearchHistory('गाना परीक्षण', Date.now());

      expect(profile.searchHistory[0].query).toBe('गाना परीक्षण');
    });
  });
});
