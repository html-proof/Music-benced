const SearchEngine = require('../SearchEngine');
const Song = require('../models/Song');

describe('SearchEngine - Personalization Boosts', () => {
  let searchEngine;

  beforeEach(() => {
    // Mock Firebase reference and userId
    const mockFirebaseRef = {};
    const mockUserId = 'test-user-123';
    searchEngine = new SearchEngine(mockFirebaseRef, mockUserId);
  });

  describe('language preference boost (Req 2.1)', () => {
    test('should add 30 points when song language matches user preference', () => {
      const song = new Song({
        id: '1',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love'],
        playCount: 1000,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'Hindi',
        mood: null
      };

      // Base score: title exact match (100) + language boost (30) = 130
      const score = searchEngine.scoreSong(song, 'tum hi ho', userPreferences);
      expect(score).toBe(130);
    });

    test('should be case-insensitive for language matching', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'HINDI',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'hindi',
        mood: null
      };

      // Base score: title exact match (100) + language boost (30) = 130
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(130);
    });

    test('should not add boost when language does not match', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'Tamil',
        mood: null
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });

    test('should not add boost when user has no language preference', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: null
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });

    test('should handle missing song language field', () => {
      const song = {
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      };

      const userPreferences = {
        language: 'Hindi',
        mood: null
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });
  });

  describe('mood preference boost (Req 2.2)', () => {
    test('should add 25 points when song mood matches user preference', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['romantic', 'sad'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: 'romantic'
      };

      // Base score: title exact match (100) + mood boost (25) = 125
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(125);
    });

    test('should be case-insensitive for mood matching', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['ROMANTIC'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: 'romantic'
      };

      // Base score: title exact match (100) + mood boost (25) = 125
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(125);
    });

    test('should match mood in array of multiple moods', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['happy', 'energetic', 'romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: 'energetic'
      };

      // Base score: title exact match (100) + mood boost (25) = 125
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(125);
    });

    test('should not add boost when mood does not match', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: 'happy'
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });

    test('should not add boost when user has no mood preference', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: null
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });

    test('should handle empty moods array', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: 'romantic'
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });

    test('should handle missing moods field', () => {
      const song = {
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      };

      const userPreferences = {
        language: null,
        mood: 'romantic'
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });
  });

  describe('previously played boost (Req 2.3)', () => {
    test('should add 20 points when song was previously played', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: null
      };

      const recentlyPlayedSongIds = ['song-123', 'song-456', 'song-789'];

      // Base score: title exact match (100) + previously played boost (20) = 120
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(120);
    });

    test('should not add boost when song was not previously played', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: null
      };

      const recentlyPlayedSongIds = ['song-456', 'song-789'];

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(100);
    });

    test('should handle empty recently played list', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: null
      };

      const recentlyPlayedSongIds = [];

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(100);
    });

    test('should work when recently played parameter is omitted', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: null,
        mood: null
      };

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });
  });

  describe('combined personalization boosts (Req 2.1, 2.2, 2.3)', () => {
    test('should add all boosts when all criteria match', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'Hindi',
        mood: 'romantic'
      };

      const recentlyPlayedSongIds = ['song-123'];

      // Base score: title exact match (100)
      // + language boost (30)
      // + mood boost (25)
      // + previously played boost (20)
      // = 175
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(175);
    });

    test('should add language and mood boosts only', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'Hindi',
        mood: 'romantic'
      };

      const recentlyPlayedSongIds = [];

      // Base score: title exact match (100)
      // + language boost (30)
      // + mood boost (25)
      // = 155
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(155);
    });

    test('should add language and previously played boosts only', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['sad'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'Hindi',
        mood: 'romantic'
      };

      const recentlyPlayedSongIds = ['song-123'];

      // Base score: title exact match (100)
      // + language boost (30)
      // + previously played boost (20)
      // = 150
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(150);
    });

    test('should add mood and previously played boosts only', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Tamil',
        moods: ['romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'Hindi',
        mood: 'romantic'
      };

      const recentlyPlayedSongIds = ['song-123'];

      // Base score: title exact match (100)
      // + mood boost (25)
      // + previously played boost (20)
      // = 145
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(145);
    });

    test('should work with base field scores and personalization boosts', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love'],
        playCount: 1000,
        createdAt: Date.now()
      });

      const userPreferences = {
        language: 'Hindi',
        mood: 'romantic'
      };

      const recentlyPlayedSongIds = ['song-123'];

      // Base score: movie contains (50) + album exact (30) = 80
      // + language boost (30)
      // + mood boost (25)
      // + previously played boost (20)
      // = 155
      const score = searchEngine.scoreSong(song, 'aashiqui', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(155);
    });
  });

  describe('edge cases', () => {
    test('should handle empty user preferences object', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      const userPreferences = {};

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song', userPreferences);
      expect(score).toBe(100);
    });

    test('should handle undefined user preferences', () => {
      const song = new Song({
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: ['romantic'],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      });

      // Base score only: title exact match (100)
      const score = searchEngine.scoreSong(song, 'song');
      expect(score).toBe(100);
    });

    test('should handle song with all personalization fields missing', () => {
      const song = {
        id: 'song-123',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        playCount: 0,
        createdAt: Date.now()
      };

      const userPreferences = {
        language: 'Hindi',
        mood: 'romantic'
      };

      const recentlyPlayedSongIds = ['song-123'];

      // Base score: title exact match (100) + previously played boost (20) = 120
      const score = searchEngine.scoreSong(song, 'song', userPreferences, recentlyPlayedSongIds);
      expect(score).toBe(120);
    });
  });
});
