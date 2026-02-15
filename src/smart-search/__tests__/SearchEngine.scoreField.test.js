const SearchEngine = require('../SearchEngine');

describe('SearchEngine - scoreField', () => {
  let searchEngine;

  beforeEach(() => {
    // Mock Firebase reference and userId
    const mockFirebaseRef = {};
    const mockUserId = 'test-user-123';
    searchEngine = new SearchEngine(mockFirebaseRef, mockUserId);
  });

  describe('exact match scoring', () => {
    test('should return exact points for exact match', () => {
      const score = searchEngine.scoreField('Hello World', 'hello world', 100, 80, 60);
      expect(score).toBe(100);
    });

    test('should be case-insensitive', () => {
      const score = searchEngine.scoreField('HELLO', 'hello', 100, 80, 60);
      expect(score).toBe(100);
    });
  });

  describe('starts with match scoring', () => {
    test('should return starts with points when string starts with query', () => {
      const score = searchEngine.scoreField('Hello World', 'hello', 100, 80, 60);
      expect(score).toBe(80);
    });

    test('should be case-insensitive', () => {
      const score = searchEngine.scoreField('HELLO WORLD', 'hello', 100, 80, 60);
      expect(score).toBe(80);
    });

    test('should prioritize exact match over starts with', () => {
      const score = searchEngine.scoreField('hello', 'hello', 100, 80, 60);
      expect(score).toBe(100); // Exact match, not starts with
    });
  });

  describe('contains match scoring', () => {
    test('should return contains points when string contains query', () => {
      const score = searchEngine.scoreField('The Hello World', 'hello', 100, 80, 60);
      expect(score).toBe(60);
    });

    test('should be case-insensitive', () => {
      const score = searchEngine.scoreField('THE HELLO WORLD', 'hello', 100, 80, 60);
      expect(score).toBe(60);
    });

    test('should prioritize starts with over contains', () => {
      const score = searchEngine.scoreField('Hello World', 'hello', 100, 80, 60);
      expect(score).toBe(80); // Starts with, not just contains
    });
  });

  describe('no match scoring', () => {
    test('should return 0 when no match', () => {
      const score = searchEngine.scoreField('Hello World', 'xyz', 100, 80, 60);
      expect(score).toBe(0);
    });
  });

  describe('edge cases', () => {
    test('should return 0 for empty field value', () => {
      const score = searchEngine.scoreField('', 'hello', 100, 80, 60);
      expect(score).toBe(0);
    });

    test('should return 0 for empty query', () => {
      const score = searchEngine.scoreField('Hello World', '', 100, 80, 60);
      expect(score).toBe(0);
    });

    test('should return 0 for null field value', () => {
      const score = searchEngine.scoreField(null, 'hello', 100, 80, 60);
      expect(score).toBe(0);
    });

    test('should return 0 for null query', () => {
      const score = searchEngine.scoreField('Hello World', null, 100, 80, 60);
      expect(score).toBe(0);
    });

    test('should return 0 for undefined field value', () => {
      const score = searchEngine.scoreField(undefined, 'hello', 100, 80, 60);
      expect(score).toBe(0);
    });

    test('should return 0 for undefined query', () => {
      const score = searchEngine.scoreField('Hello World', undefined, 100, 80, 60);
      expect(score).toBe(0);
    });
  });

  describe('scoring with different point values', () => {
    test('should use custom exact match points', () => {
      const score = searchEngine.scoreField('hello', 'hello', 70, 50, 30);
      expect(score).toBe(70);
    });

    test('should use custom starts with points', () => {
      const score = searchEngine.scoreField('hello world', 'hello', 70, 50, 30);
      expect(score).toBe(50);
    });

    test('should use custom contains points', () => {
      const score = searchEngine.scoreField('the hello world', 'hello', 70, 50, 30);
      expect(score).toBe(30);
    });
  });

  describe('requirements validation', () => {
    test('should match requirement 1.2 - title exact match (100 points)', () => {
      const score = searchEngine.scoreField('Tum Hi Ho', 'tum hi ho', 100, 80, 60);
      expect(score).toBe(100);
    });

    test('should match requirement 1.3 - title starts with (80 points)', () => {
      const score = searchEngine.scoreField('Tum Hi Ho', 'tum', 100, 80, 60);
      expect(score).toBe(80);
    });

    test('should match requirement 1.4 - title contains (60 points)', () => {
      const score = searchEngine.scoreField('Tum Hi Ho', 'hi ho', 100, 80, 60);
      expect(score).toBe(60);
    });

    test('should match requirement 1.5 - movie exact match (70 points)', () => {
      const score = searchEngine.scoreField('Aashiqui 2', 'aashiqui 2', 70, 0, 50);
      expect(score).toBe(70);
    });

    test('should match requirement 1.6 - movie contains (50 points)', () => {
      const score = searchEngine.scoreField('Aashiqui 2', 'aashiqui', 70, 0, 50);
      expect(score).toBe(50);
    });

    test('should match requirement 1.7 - artist exact match (65 points)', () => {
      const score = searchEngine.scoreField('Arijit Singh', 'arijit singh', 65, 0, 45);
      expect(score).toBe(65);
    });

    test('should match requirement 1.8 - artist contains (45 points)', () => {
      const score = searchEngine.scoreField('Arijit Singh', 'arijit', 65, 0, 45);
      expect(score).toBe(45);
    });
  });
});
