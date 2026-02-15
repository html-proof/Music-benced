const SearchEngine = require('../SearchEngine');
const Song = require('../models/Song');

describe('SearchEngine - Trending Boost (Req 2.4)', () => {
  let searchEngine;

  beforeEach(() => {
    // Mock Firebase reference and userId
    const mockFirebaseRef = {};
    const mockUserId = 'test-user-123';
    searchEngine = new SearchEngine(mockFirebaseRef, mockUserId);
  });

  describe('calculateTrendingBoost', () => {
    test('should return 0 points for song at 0th percentile (lowest play count)', () => {
      const allSongs = [
        { playCount: 100 },
        { playCount: 200 },
        { playCount: 300 },
        { playCount: 400 },
        { playCount: 500 }
      ];

      const boost = searchEngine.calculateTrendingBoost(100, allSongs);
      expect(boost).toBe(0);
    });

    test('should return 20 points for song at 100th percentile (highest play count)', () => {
      const allSongs = [
        { playCount: 100 },
        { playCount: 200 },
        { playCount: 300 },
        { playCount: 400 },
        { playCount: 500 }
      ];

      const boost = searchEngine.calculateTrendingBoost(500, allSongs);
      expect(boost).toBe(20);
    });

    test('should return approximately 10 points for song at 50th percentile', () => {
      const allSongs = [
        { playCount: 100 },
        { playCount: 200 },
        { playCount: 300 },
        { playCount: 400 },
        { playCount: 500 }
      ];

      const boost = searchEngine.calculateTrendingBoost(300, allSongs);
      expect(boost).toBeGreaterThanOrEqual(8);
      expect(boost).toBeLessThanOrEqual(12);
    });

    test('should handle songs with zero play count', () => {
      const allSongs = [
        { playCount: 0 },
        { playCount: 100 },
        { playCount: 200 },
        { playCount: 300 }
      ];

      const boost = searchEngine.calculateTrendingBoost(0, allSongs);
      expect(boost).toBe(0);
    });

    test('should handle all songs with same play count', () => {
      const allSongs = [
        { playCount: 100 },
        { playCount: 100 },
        { playCount: 100 }
      ];

      const boost = searchEngine.calculateTrendingBoost(100, allSongs);
      expect(boost).toBe(0);
    });

    test('should handle empty allSongs array', () => {
      const boost = searchEngine.calculateTrendingBoost(100, []);
      expect(boost).toBe(0);
    });

    test('should handle null allSongs parameter', () => {
      const boost = searchEngine.calculateTrendingBoost(100, null);
      expect(boost).toBe(0);
    });

    test('should handle undefined allSongs parameter', () => {
      const boost = searchEngine.calculateTrendingBoost(100, undefined);
      expect(boost).toBe(0);
    });

    test('should handle songs with missing playCount field', () => {
      const allSongs = [
        { playCount: 100 },
        { playCount: 200 },
        {},  // Missing playCount
        { playCount: 400 }
      ];

      const boost = searchEngine.calculateTrendingBoost(200, allSongs);
      expect(boost).toBeGreaterThanOrEqual(0);
      expect(boost).toBeLessThanOrEqual(20);
    });

    test('should calculate correct percentile for large dataset', () => {
      // Create 100 songs with play counts from 0 to 99
      const allSongs = Array.from({ length: 100 }, (_, i) => ({ playCount: i }));

      // Song with playCount 90 should be at 90th percentile
      const boost = searchEngine.calculateTrendingBoost(90, allSongs);
      expect(boost).toBeGreaterThanOrEqual(17);
      expect(boost).toBeLessThanOrEqual(19);
    });

    test('should return value between 0 and 20 for any valid input', () => {
      const allSongs = [
        { playCount: 50 },
        { playCount: 150 },
        { playCount: 250 },
        { playCount: 350 },
        { playCount: 450 }
      ];

      for (let playCount = 0; playCount <= 500; playCount += 50) {
        const boost = searchEngine.calculateTrendingBoost(playCount, allSongs);
        expect(boost).toBeGreaterThanOrEqual(0);
        expect(boost).toBeLessThanOrEqual(20);
      }
    });
  });

  describe('scoreSong with trending boost', () => {
    test('should add trending boost to base score', () => {
      const allSongs = [
        new Song({
          id: '1',
          title: 'Song 1',
          movie: 'Movie',
          artist: 'Artist',
          album: 'Album',
          language: 'Hindi',
          moods: [],
          tags: [],
          playCount: 100,
          createdAt: Date.now()
        }),
        new Song({
          id: '2',
          title: 'Song 2',
          movie: 'Movie',
          artist: 'Artist',
          album: 'Album',
          language: 'Hindi',
          moods: [],
          tags: [],
          playCount: 200,
          createdAt: Date.now()
        }),
        new Song({
          id: '3',
          title: 'Song 3',
          movie: 'Movie',
          artist: 'Artist',
          album: 'Album',
          language: 'Hindi',
          moods: [],
          tags: [],
          playCount: 300,
          createdAt: Date.now()
        }),
        new Song({
          id: '4',
          title: 'Song 4',
          movie: 'Movie',
          artist: 'Artist',
          album: 'Album',
          language: 'Hindi',
          moods: [],
          tags: [],
          playCount: 400,
          createdAt: Date.now()
        }),
        new Song({
          id: '5',
          title: 'Song 5',
          movie: 'Movie',
          artist: 'Artist',
          album: 'Album',
          language: 'Hindi',
          moods: [],
          tags: [],
          playCount: 500,
          createdAt: Date.now()
        })
      ];

      // Test song with highest play count (500)
      const highPlayCountSong = allSongs[4];
      const scoreHigh = searchEngine.scoreSong(highPlayCountSong, 'song', {}, [], allSongs);
      
      // Test song with lowest play count (100)
      const lowPlayCountSong = allSongs[0];
      const scoreLow = searchEngine.scoreSong(lowPlayCountSong, 'song', {}, [], allSongs);

      // High play count song should have higher score due to trending boost
      expect(scoreHigh).toBeGreaterThan(scoreLow);
      
      // The difference should be approximately 20 points (trending boost difference)
      expect(scoreHigh - scoreLow).toBeGreaterThanOrEqual(18);
      expect(scoreHigh - scoreLow).toBeLessThanOrEqual(20);
    });

    test('should work without allSongs parameter (backward compatibility)', () => {
      const song = new Song({
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: [],
        playCount: 1000,
        createdAt: Date.now()
      });

      // Should not throw error and should return base score only
      const score = searchEngine.scoreSong(song, 'song', {});
      expect(score).toBe(100); // Title exact match only
    });

    test('should combine trending boost with other personalization boosts', () => {
      const allSongs = [
        new Song({
          id: '1',
          title: 'Song',
          movie: 'Movie',
          artist: 'Artist',
          album: 'Album',
          language: 'Hindi',
          moods: ['romantic'],
          tags: [],
          playCount: 100,
          createdAt: Date.now()
        }),
        new Song({
          id: '2',
          title: 'Song',
          movie: 'Movie',
          artist: 'Artist',
          album: 'Album',
          language: 'Hindi',
          moods: ['romantic'],
          tags: [],
          playCount: 500,
          createdAt: Date.now()
        })
      ];

      const userPreferences = {
        language: 'Hindi',
        mood: 'romantic'
      };

      const recentlyPlayedSongIds = ['2'];

      // High play count song with all boosts
      const highPlayCountSong = allSongs[1];
      const scoreHigh = searchEngine.scoreSong(
        highPlayCountSong,
        'song',
        userPreferences,
        recentlyPlayedSongIds,
        allSongs
      );

      // Base score: 100 (title exact)
      // + 30 (language boost)
      // + 25 (mood boost)
      // + 20 (previously played boost)
      // + 20 (trending boost at 100th percentile)
      // = 195
      expect(scoreHigh).toBe(195);

      // Low play count song with all boosts except trending
      const lowPlayCountSong = allSongs[0];
      const scoreLow = searchEngine.scoreSong(
        lowPlayCountSong,
        'song',
        userPreferences,
        [],
        allSongs
      );

      // Base score: 100 (title exact)
      // + 30 (language boost)
      // + 25 (mood boost)
      // + 0 (trending boost at 0th percentile)
      // = 155
      expect(scoreLow).toBe(155);
    });
  });

  describe('edge cases', () => {
    test('should handle song with undefined playCount', () => {
      const allSongs = [
        { playCount: 100 },
        { playCount: 200 },
        { playCount: 300 }
      ];

      const song = {
        id: '1',
        title: 'Song',
        movie: 'Movie',
        artist: 'Artist',
        album: 'Album',
        language: 'Hindi',
        moods: [],
        tags: []
        // playCount is undefined
      };

      const score = searchEngine.scoreSong(song, 'song', {}, [], allSongs);
      
      // Should handle gracefully and return base score + 0 trending boost
      expect(score).toBe(100);
    });

    test('should handle negative play counts gracefully', () => {
      const allSongs = [
        { playCount: -10 },
        { playCount: 0 },
        { playCount: 100 },
        { playCount: 200 }
      ];

      const boost = searchEngine.calculateTrendingBoost(-10, allSongs);
      expect(boost).toBeGreaterThanOrEqual(0);
      expect(boost).toBeLessThanOrEqual(20);
    });
  });
});
