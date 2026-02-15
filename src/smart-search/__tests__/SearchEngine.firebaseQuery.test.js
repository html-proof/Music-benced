const SearchEngine = require('../SearchEngine');
const Song = require('../models/Song');

describe('SearchEngine - Firebase Query Logic', () => {
  let searchEngine;
  let mockFirebaseRef;
  let mockSongsData;
  let mockLanguageIndexData;

  beforeEach(() => {
    // Mock song data
    mockSongsData = {
      'song-1': {
        title: 'English Song 1',
        movie: 'Movie A',
        artist: 'Artist A',
        album: 'Album A',
        language: 'English',
        moods: ['happy'],
        tags: ['pop'],
        playCount: 100,
        createdAt: 1234567890
      },
      'song-2': {
        title: 'English Song 2',
        movie: 'Movie B',
        artist: 'Artist B',
        album: 'Album B',
        language: 'English',
        moods: ['sad'],
        tags: ['rock'],
        playCount: 200,
        createdAt: 1234567891
      },
      'song-3': {
        title: 'Spanish Song 1',
        movie: 'Movie C',
        artist: 'Artist C',
        album: 'Album C',
        language: 'Spanish',
        moods: ['energetic'],
        tags: ['latin'],
        playCount: 150,
        createdAt: 1234567892
      }
    };

    // Mock language index data
    mockLanguageIndexData = {
      'English': {
        'song-1': true,
        'song-2': true
      },
      'Spanish': {
        'song-3': true
      }
    };

    // Create mock Firebase reference with nested child() calls
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
            child: jest.fn((language) => ({
              once: jest.fn(() => Promise.resolve({
                val: () => mockLanguageIndexData[language] || {}
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

  describe('_loadSongs', () => {
    test('should load all songs when no language preference is provided', async () => {
      const songs = await searchEngine._loadSongs(null);

      expect(songs).toHaveLength(3);
      expect(songs[0]).toBeInstanceOf(Song);
      expect(songs.map(s => s.id).sort()).toEqual(['song-1', 'song-2', 'song-3']);
      
      // Verify Firebase was called correctly
      expect(mockFirebaseRef.child).toHaveBeenCalledWith('songs');
    });

    test('should load only English songs when English language preference is provided', async () => {
      const songs = await searchEngine._loadSongs('English');

      expect(songs).toHaveLength(2);
      expect(songs.every(s => s.language === 'English')).toBe(true);
      expect(songs.map(s => s.id).sort()).toEqual(['song-1', 'song-2']);
      
      // Verify Firebase was called with language index
      expect(mockFirebaseRef.child).toHaveBeenCalledWith('songsByLanguage');
    });

    test('should load only Spanish songs when Spanish language preference is provided', async () => {
      const songs = await searchEngine._loadSongs('Spanish');

      expect(songs).toHaveLength(1);
      expect(songs[0].language).toBe('Spanish');
      expect(songs[0].id).toBe('song-3');
      
      // Verify Firebase was called with language index
      expect(mockFirebaseRef.child).toHaveBeenCalledWith('songsByLanguage');
    });

    test('should return empty array when language has no songs', async () => {
      const songs = await searchEngine._loadSongs('French');

      expect(songs).toHaveLength(0);
    });

    test('should handle Firebase errors gracefully', async () => {
      const errorFirebaseRef = {
        child: jest.fn(() => ({
          once: jest.fn(() => Promise.reject(new Error('Network error')))
        }))
      };

      const errorSearchEngine = new SearchEngine(errorFirebaseRef, 'test-user-123');

      await expect(errorSearchEngine._loadSongs(null))
        .rejects.toThrow('Failed to load songs from Firebase: Network error');
    });

    test('should filter out null songs when song data is missing', async () => {
      // Mock scenario where language index has a song ID but song data is missing
      const partialFirebaseRef = {
        child: jest.fn((path) => {
          if (path === 'songsByLanguage') {
            return {
              child: jest.fn(() => ({
                once: jest.fn(() => Promise.resolve({
                  val: () => ({ 'song-1': true, 'song-missing': true })
                }))
              }))
            };
          } else if (path === 'songs') {
            return {
              child: jest.fn((songId) => ({
                once: jest.fn(() => Promise.resolve({
                  val: () => songId === 'song-1' ? mockSongsData['song-1'] : null
                }))
              }))
            };
          }
        })
      };

      const partialSearchEngine = new SearchEngine(partialFirebaseRef, 'test-user-123');
      const songs = await partialSearchEngine._loadSongs('English');

      expect(songs).toHaveLength(1);
      expect(songs[0].id).toBe('song-1');
    });

    test('should handle empty songs database', async () => {
      const emptyFirebaseRef = {
        child: jest.fn(() => ({
          once: jest.fn(() => Promise.resolve({
            val: () => null
          }))
        }))
      };

      const emptySearchEngine = new SearchEngine(emptyFirebaseRef, 'test-user-123');
      const songs = await emptySearchEngine._loadSongs(null);

      expect(songs).toHaveLength(0);
    });
  });
});
