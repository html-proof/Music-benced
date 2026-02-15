/**
 * Setup verification tests
 * 
 * Verifies that the smart search system is properly set up
 */

const SearchEngine = require('../SearchEngine');
const RecommendationEngine = require('../RecommendationEngine');
const FeedGenerator = require('../FeedGenerator');
const UserProfileManager = require('../UserProfileManager');
const config = require('../config');

describe('Smart Search System Setup', () => {
  describe('Module Imports', () => {
    test('SearchEngine should be defined', () => {
      expect(SearchEngine).toBeDefined();
      expect(typeof SearchEngine).toBe('function');
    });

    test('RecommendationEngine should be defined', () => {
      expect(RecommendationEngine).toBeDefined();
      expect(typeof RecommendationEngine).toBe('function');
    });

    test('FeedGenerator should be defined', () => {
      expect(FeedGenerator).toBeDefined();
      expect(typeof FeedGenerator).toBe('function');
    });

    test('UserProfileManager should be defined', () => {
      expect(UserProfileManager).toBeDefined();
      expect(typeof UserProfileManager).toBe('function');
    });

    test('Config should be defined', () => {
      expect(config).toBeDefined();
      expect(typeof config).toBe('object');
    });
  });

  describe('Component Instantiation', () => {
    const mockDb = {};
    const userId = 'test-user-123';

    test('SearchEngine should instantiate correctly', () => {
      const searchEngine = new SearchEngine(mockDb, userId);
      expect(searchEngine).toBeInstanceOf(SearchEngine);
      expect(searchEngine.db).toBe(mockDb);
      expect(searchEngine.userId).toBe(userId);
      expect(searchEngine.userProfile).toBeNull();
    });

    test('RecommendationEngine should instantiate correctly', () => {
      const recommendationEngine = new RecommendationEngine(mockDb, userId);
      expect(recommendationEngine).toBeInstanceOf(RecommendationEngine);
      expect(recommendationEngine.db).toBe(mockDb);
      expect(recommendationEngine.userId).toBe(userId);
      expect(recommendationEngine.userProfile).toBeNull();
    });

    test('FeedGenerator should instantiate correctly', () => {
      const mockRecommendationEngine = new RecommendationEngine(mockDb, userId);
      const feedGenerator = new FeedGenerator(mockDb, userId, mockRecommendationEngine);
      expect(feedGenerator).toBeInstanceOf(FeedGenerator);
      expect(feedGenerator.db).toBe(mockDb);
      expect(feedGenerator.userId).toBe(userId);
      expect(feedGenerator.recommendationEngine).toBe(mockRecommendationEngine);
    });

    test('UserProfileManager should instantiate correctly', () => {
      const profileManager = new UserProfileManager(mockDb, userId);
      expect(profileManager).toBeInstanceOf(UserProfileManager);
      expect(profileManager.db).toBe(mockDb);
      expect(profileManager.userId).toBe(userId);
    });
  });

  describe('Configuration', () => {
    test('Search configuration should be valid', () => {
      expect(config.search).toBeDefined();
      expect(config.search.maxResults).toBe(30);
      expect(config.search.minScore).toBe(20);
      expect(config.search.scoring).toBeDefined();
      expect(config.search.boosts).toBeDefined();
    });

    test('Recommendation configuration should be valid', () => {
      expect(config.recommendations).toBeDefined();
      expect(config.recommendations.maxResults).toBe(40);
      expect(config.recommendations.minScore).toBe(30);
      expect(config.recommendations.topArtistsCount).toBe(3);
      expect(config.recommendations.scoring).toBeDefined();
    });

    test('Feed configuration should be valid', () => {
      expect(config.feed).toBeDefined();
      expect(config.feed.continuePlaying).toBeDefined();
      expect(config.feed.basedOnMood).toBeDefined();
      expect(config.feed.trendingInLanguage).toBeDefined();
      expect(config.feed.recommendedForYou).toBeDefined();
      expect(config.feed.recentlyPlayed).toBeDefined();
      expect(config.feed.newReleases).toBeDefined();
    });

    test('User profile configuration should be valid', () => {
      expect(config.userProfile).toBeDefined();
      expect(config.userProfile.maxRecentlyPlayed).toBe(50);
      expect(config.userProfile.supportedMoods).toBeInstanceOf(Array);
      expect(config.userProfile.supportedMoods.length).toBeGreaterThan(0);
    });

    test('Firebase paths should be defined', () => {
      expect(config.firebasePaths).toBeDefined();
      expect(config.firebasePaths.songs).toBe('songs');
      expect(config.firebasePaths.songsByLanguage).toBe('songsByLanguage');
      expect(config.firebasePaths.users).toBe('users');
    });
  });
});
