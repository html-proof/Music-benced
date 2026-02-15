const SearchEngine = require('../SearchEngine');
const Song = require('../models/Song');

describe('SearchEngine - Context-Aware Search', () => {
  let searchEngine;
  let mockFirebaseRef;
  let mockSongsData;

  beforeEach(() => {
    // Mock song data with various languages
    mockSongsData = {
      'song-1': {
        title: 'Saravam',
        movie: 'Maya',
        artist: 'Anirudh Ravichander',
        album: 'Maya',
        language: 'Tamil',
        moods: ['energetic'],
        tags: ['dance', 'party'],
        playCount: 5000,
        createdAt: 1234567890
      },
      'song-2': {
        title: 'Tum Hi Ho',
        movie: 'Aashiqui 2',
        artist: 'Arijit Singh',
        album: 'Aashiqui 2',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['love', 'ballad'],
        playCount: 10000,
        createdAt: 1234567891
      },
      'song-3': {
        title: 'Shape of You',
        movie: 'None',
        artist: 'Ed Sheeran',
        album: 'Divide',
        language: 'English',
        moods: ['happy'],
        tags: ['pop'],
        playCount: 15000,
        createdAt: 1234567892
      },
      'song-4': {
        title: 'Maya Maya',
        movie: 'Guru',
        artist: 'A.R. Rahman',
        album: 'Guru',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['melody'],
        playCount: 8000,
        createdAt: 1234567893
      }
    };

    // Create mock Firebase reference
    mockFirebaseRef = {
      child: jest.fn((path) => {
        if (path === 'songs') {
          return {
            once: jest.fn(() => Promise.resolve({
              val: () => mockSongsData
            })),
            child: jest.fn((songId) => ({
              once: jest.fn(() => Promise.resolve({
                val: () => mockSongsData[songId]
              }))
            }))
          };
        } else if (path === 'songsByLanguage') {
          return {
            child: jest.fn(() => ({
              once: jest.fn(() => Promise.resolve({
                val: () => ({})
              }))
            }))
          };
        } else if (path === 'users') {
          return {
            child: jest.fn(() => ({
              child: jest.fn(() => ({
                child: jest.fn(() => ({
                  set: jest.fn(() => Promise.resolve())
                }))
              }))
            }))
          };
        }
        return {
          once: jest.fn(() => Promise.resolve({ val: () => null }))
        };
      })
    };

    searchEngine = new SearchEngine(mockFirebaseRef, 'test-user-123');
  });

  describe('Search without language preference', () => {
    test('should find Tamil song "Saravam" from "Maya" movie when searching "saravam maya movie song"', async () => {
      const results = await searchEngine.search('saravam maya movie song');

      expect(results.length).toBeGreaterThan(0);
      
      // Should find the Saravam song
      const sararamSong = results.find(song => song.title === 'Saravam');
      expect(sararamSong).toBeDefined();
      expect(sararamSong.movie).toBe('Maya');
      expect(sararamSong.language).toBe('Tamil');
    });

    test('should find song by movie name "maya"', async () => {
      const results = await searchEngine.search('maya');

      expect(results.length).toBeGreaterThan(0);
      
      // Should find both songs with "Maya" in title or movie
      const mayaSongs = results.filter(song => 
        song.title.toLowerCase().includes('maya') || 
        song.movie.toLowerCase().includes('maya')
      );
      expect(mayaSongs.length).toBeGreaterThanOrEqual(2);
    });

    test('should find Hindi song even when user has no language preference', async () => {
      const results = await searchEngine.search('tum hi ho');

      expect(results.length).toBeGreaterThan(0);
      
      const hindiSong = results.find(song => song.title === 'Tum Hi Ho');
      expect(hindiSong).toBeDefined();
      expect(hindiSong.language).toBe('Hindi');
    });

    test('should find English song even when user has no language preference', async () => {
      const results = await searchEngine.search('shape of you');

      expect(results.length).toBeGreaterThan(0);
      
      const englishSong = results.find(song => song.title === 'Shape of You');
      expect(englishSong).toBeDefined();
      expect(englishSong.language).toBe('English');
    });

    test('should search across all languages simultaneously', async () => {
      const results = await searchEngine.search('maya');

      // Should find songs from different languages
      const languages = [...new Set(results.map(song => song.language))];
      expect(languages.length).toBeGreaterThan(1);
    });
  });

  describe('Search with language preference (for boosting only)', () => {
    test('should find Tamil song but boost Hindi songs when Hindi is preferred', async () => {
      const userPreferences = { language: 'Hindi' };
      const results = await searchEngine.search('maya', userPreferences);

      expect(results.length).toBeGreaterThan(0);
      
      // Should still find Tamil song
      const tamilSong = results.find(song => song.language === 'Tamil');
      expect(tamilSong).toBeDefined();
      
      // But Hindi songs should rank higher
      const hindiSong = results.find(song => song.language === 'Hindi');
      expect(hindiSong).toBeDefined();
      
      // Hindi song should appear before Tamil song (due to language boost)
      const hindiIndex = results.findIndex(song => song.language === 'Hindi');
      const tamilIndex = results.findIndex(song => song.language === 'Tamil');
      expect(hindiIndex).toBeLessThan(tamilIndex);
    });

    test('should find song in any language regardless of preference', async () => {
      const userPreferences = { language: 'English' };
      const results = await searchEngine.search('saravam');

      expect(results.length).toBeGreaterThan(0);
      
      // Should find Tamil song even though preference is English
      const tamilSong = results.find(song => song.title === 'Saravam');
      expect(tamilSong).toBeDefined();
      expect(tamilSong.language).toBe('Tamil');
    });
  });

  describe('Partial matching', () => {
    test('should find song by partial title match', async () => {
      const results = await searchEngine.search('sara');

      expect(results.length).toBeGreaterThan(0);
      
      const song = results.find(song => song.title.toLowerCase().includes('sara'));
      expect(song).toBeDefined();
    });

    test('should find song by partial movie name', async () => {
      const results = await searchEngine.search('aashiq');

      expect(results.length).toBeGreaterThan(0);
      
      const song = results.find(song => song.movie.toLowerCase().includes('aashiq'));
      expect(song).toBeDefined();
    });

    test('should find song by artist name', async () => {
      const results = await searchEngine.search('anirudh');

      expect(results.length).toBeGreaterThan(0);
      
      const song = results.find(song => song.artist.toLowerCase().includes('anirudh'));
      expect(song).toBeDefined();
    });
  });

  describe('Multi-word search', () => {
    test('should handle multi-word search queries', async () => {
      const results = await searchEngine.search('saravam maya movie');

      expect(results.length).toBeGreaterThan(0);
      
      // Should prioritize songs that match multiple words
      const topResult = results[0];
      expect(
        topResult.title.toLowerCase().includes('saravam') ||
        topResult.movie.toLowerCase().includes('maya')
      ).toBe(true);
    });

    test('should find song with exact phrase in title', async () => {
      const results = await searchEngine.search('shape of you');

      expect(results.length).toBeGreaterThan(0);
      
      const exactMatch = results.find(song => 
        song.title.toLowerCase() === 'shape of you'
      );
      expect(exactMatch).toBeDefined();
      expect(results[0].id).toBe(exactMatch.id); // Should be top result
    });
  });

  describe('Case insensitivity', () => {
    test('should be case insensitive', async () => {
      const results1 = await searchEngine.search('SARAVAM');
      const results2 = await searchEngine.search('saravam');
      const results3 = await searchEngine.search('Saravam');

      expect(results1.length).toBe(results2.length);
      expect(results2.length).toBe(results3.length);
      
      // Should find same songs
      expect(results1[0].id).toBe(results2[0].id);
      expect(results2[0].id).toBe(results3[0].id);
    });
  });

  describe('Empty and invalid queries', () => {
    test('should return empty array for empty query', async () => {
      const results = await searchEngine.search('');
      expect(results).toEqual([]);
    });

    test('should return empty array for whitespace query', async () => {
      const results = await searchEngine.search('   ');
      expect(results).toEqual([]);
    });

    test('should return empty array for query with no matches', async () => {
      const results = await searchEngine.search('xyzabc123notfound');
      expect(results).toEqual([]);
    });
  });

  describe('Real-world search scenarios', () => {
    test('should find song when user searches with movie context', async () => {
      // User searches: "saravam maya movie song"
      const results = await searchEngine.search('saravam maya movie song');

      expect(results.length).toBeGreaterThan(0);
      
      const targetSong = results[0];
      expect(targetSong.title).toBe('Saravam');
      expect(targetSong.movie).toBe('Maya');
    });

    test('should find song when user searches with artist name', async () => {
      // User searches: "arijit singh songs"
      const results = await searchEngine.search('arijit singh');

      expect(results.length).toBeGreaterThan(0);
      
      const arijitSong = results.find(song => song.artist.includes('Arijit'));
      expect(arijitSong).toBeDefined();
    });

    test('should find song when user searches partial title', async () => {
      // User searches: "tum hi"
      const results = await searchEngine.search('tum hi');

      expect(results.length).toBeGreaterThan(0);
      
      const song = results.find(song => song.title.includes('Tum Hi'));
      expect(song).toBeDefined();
    });
  });
});
