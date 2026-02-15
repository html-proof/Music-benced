const SearchEngine = require('../SearchEngine');
const Song = require('../models/Song');

describe('SearchEngine - scoreSong', () => {
  let searchEngine;

  beforeEach(() => {
    // Mock Firebase reference and userId
    const mockFirebaseRef = {};
    const mockUserId = 'test-user-123';
    searchEngine = new SearchEngine(mockFirebaseRef, mockUserId);
  });

  describe('multi-field scoring', () => {
    test('should score title field correctly', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Exact title match: 100 points
      const score = searchEngine.scoreSong(song, 'tum hi ho', {});
      expect(score).toBe(100);
    });

    test('should score movie field correctly', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Greatest Hits',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Exact movie match: 70 points
      const score = searchEngine.scoreSong(song, 'aashiqui 2', {});
      expect(score).toBe(70);
    });

    test('should score artist field correctly', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Exact artist match: 65 points
      const score = searchEngine.scoreSong(song, 'arijit singh', {});
      expect(score).toBe(65);
    });

    test('should score album field correctly', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Greatest Hits',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Exact album match: 30 points
      const score = searchEngine.scoreSong(song, 'greatest hits', {});
      expect(score).toBe(30);
    });

    test('should score tags field correctly', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Tag match: 25 points
      const score = searchEngine.scoreSong(song, 'love', {});
      expect(score).toBe(25);
    });
  });

  describe('combined field scoring', () => {
    test('should sum scores from multiple matching fields', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Greatest Hits',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['aashiqui', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Query matches movie (contains: 50) and tag (exact: 25) = 75 points
      const score = searchEngine.scoreSong(song, 'aashiqui', {});
      expect(score).toBe(75);
    });

    test('should handle partial matches across fields', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Query matches title (starts with: 80) and artist (contains: 45) = 125 points
      const score = searchEngine.scoreSong(song, 'tum', {});
      expect(score).toBe(80); // Only title matches
    });
  });

  describe('tag scoring behavior', () => {
    test('should only count first matching tag', () => {
      const song = new Song({
        id: '1',
        title: 'Song Title',
        movie: 'Movie Name',
        artist: 'Artist Name',
        album: 'Album Name',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'lovely', 'lover'],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Query matches all three tags, but should only count first match: 25 points
      const score = searchEngine.scoreSong(song, 'love', {});
      expect(score).toBe(25);
    });

    test('should handle empty tags array', () => {
      const song = new Song({
        id: '1',
        title: 'Song Title',
        movie: 'Movie Name',
        artist: 'Artist Name',
        album: 'Album Name',
        language: 'Hindi',
        moods: ['romantic'],
        tags: [],
        playCount: 1000,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'love', {});
      expect(score).toBe(0);
    });

    test('should handle missing tags field', () => {
      const song = {
        id: '1',
        title: 'Song Title',
        movie: 'Movie Name',
        artist: 'Artist Name',
        album: 'Album Name',
        language: 'Hindi',
        moods: ['romantic'],
        playCount: 1000,
        createdAt: Date.now()
      };

      const score = searchEngine.scoreSong(song, 'love', {});
      expect(score).toBe(0);
    });
  });

  describe('requirements validation', () => {
    test('should validate requirement 1.2 - title exact match (100 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'tum hi ho', {});
      expect(score).toBe(100);
    });

    test('should validate requirement 1.3 - title starts with (80 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'tum', {});
      expect(score).toBe(80);
    });

    test('should validate requirement 1.4 - title contains (60 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'hi ho', {});
      expect(score).toBe(60);
    });

    test('should validate requirement 1.5 - movie exact match (70 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Title',
        movie: 'Aashiqui 2',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'aashiqui 2', {});
      expect(score).toBe(70);
    });

    test('should validate requirement 1.6 - movie contains (50 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Title',
        movie: 'Aashiqui 2',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'aashiqui', {});
      expect(score).toBe(50);
    });

    test('should validate requirement 1.7 - artist exact match (65 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Title',
        movie: 'Movie',
        artist: 'Arijit Singh',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'arijit singh', {});
      expect(score).toBe(65);
    });

    test('should validate requirement 1.8 - artist contains (45 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Title',
        movie: 'Movie',
        artist: 'Arijit Singh',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'arijit', {});
      expect(score).toBe(45);
    });

    test('should validate requirement 1.9 - album match (30 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Title',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Greatest Hits',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'greatest hits', {});
      expect(score).toBe(30);
    });

    test('should validate requirement 1.10 - tag match (25 points)', () => {
      const song = new Song({
        id: '1',
        title: 'Title',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: ['romantic', 'ballad'],
        playCount: 0,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'romantic', {});
      expect(score).toBe(25);
    });
  });

  describe('edge cases', () => {
    test('should return 0 for no matches', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, 'xyz123', {});
      expect(score).toBe(0);
    });

    test('should handle empty query', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 1000,
        createdAt: Date.now()
      });

      const score = searchEngine.scoreSong(song, '', {});
      expect(score).toBe(0);
    });

    test('should be case-insensitive across all fields', () => {
      const song = new Song({
        id: '1',
        title: 'TUM HI HO',
        movie: 'AASHIQUI 2',
        artist: 'ARIJIT SINGH',
        album: 'GREATEST HITS',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['LOVE', 'BALLAD'],
        playCount: 1000,
        createdAt: Date.now()
      });

      const titleScore = searchEngine.scoreSong(song, 'tum hi ho', {});
      expect(titleScore).toBe(100);

      const movieScore = searchEngine.scoreSong(song, 'aashiqui 2', {});
      expect(movieScore).toBe(70);

      const artistScore = searchEngine.scoreSong(song, 'arijit singh', {});
      expect(artistScore).toBe(65);

      const tagScore = searchEngine.scoreSong(song, 'love', {});
      expect(tagScore).toBe(25);
    });
  });
});
