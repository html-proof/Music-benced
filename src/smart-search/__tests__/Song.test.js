/**
 * Unit tests for Song data model
 * Tests song validation with valid and invalid data
 */

const { Song } = require('../models');

describe('Song Data Model', () => {
  describe('Constructor', () => {
    test('should create a Song instance with all required fields', () => {
      const songData = {
        id: 'song-123',
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: ['happy', 'energetic'],
        tags: ['pop', 'dance'],
        playCount: 100,
        createdAt: Date.now()
      };

      const song = new Song(songData);

      expect(song.id).toBe(songData.id);
      expect(song.title).toBe(songData.title);
      expect(song.movie).toBe(songData.movie);
      expect(song.artist).toBe(songData.artist);
      expect(song.album).toBe(songData.album);
      expect(song.language).toBe(songData.language);
      expect(song.moods).toEqual(songData.moods);
      expect(song.tags).toEqual(songData.tags);
      expect(song.playCount).toBe(songData.playCount);
      expect(song.createdAt).toBe(songData.createdAt);
    });

    test('should use default values for optional fields', () => {
      const songData = {
        id: 'song-123',
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        createdAt: Date.now()
      };

      const song = new Song(songData);

      expect(song.moods).toEqual([]);
      expect(song.tags).toEqual([]);
      expect(song.playCount).toBe(0);
    });
  });

  describe('Validation', () => {
    const validSongData = {
      id: 'song-123',
      title: 'Test Song',
      movie: 'Test Movie',
      artist: 'Test Artist',
      album: 'Test Album',
      language: 'English',
      moods: ['happy'],
      tags: ['pop'],
      playCount: 50,
      createdAt: Date.now()
    };

    test('should validate a valid song', () => {
      const song = new Song(validSongData);
      const result = song.validate();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should return true for isValid() with valid data', () => {
      const song = new Song(validSongData);
      expect(song.isValid()).toBe(true);
    });

    test('should fail validation when id is missing', () => {
      const invalidData = { ...validSongData, id: '' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('id is required and must be a non-empty string');
    });

    test('should fail validation when id is not a string', () => {
      const invalidData = { ...validSongData, id: 123 };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('id is required and must be a non-empty string');
    });

    test('should fail validation when title is missing', () => {
      const invalidData = { ...validSongData, title: '' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('title is required and must be a non-empty string');
    });

    test('should fail validation when movie is missing', () => {
      const invalidData = { ...validSongData, movie: '' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('movie is required and must be a non-empty string');
    });

    test('should fail validation when artist is missing', () => {
      const invalidData = { ...validSongData, artist: '' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('artist is required and must be a non-empty string');
    });

    test('should fail validation when album is missing', () => {
      const invalidData = { ...validSongData, album: '' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('album is required and must be a non-empty string');
    });

    test('should fail validation when language is missing', () => {
      const invalidData = { ...validSongData, language: '' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('language is required and must be a non-empty string');
    });

    test('should fail validation when moods is not an array', () => {
      const invalidData = { ...validSongData, moods: 'happy' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('moods must be an array');
    });

    test('should fail validation when moods contains non-string values', () => {
      const invalidData = { ...validSongData, moods: ['happy', 123, 'sad'] };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('all moods must be strings');
    });

    test('should fail validation when tags is not an array', () => {
      const invalidData = { ...validSongData, tags: 'pop' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('tags must be an array');
    });

    test('should fail validation when tags contains non-string values', () => {
      const invalidData = { ...validSongData, tags: ['pop', 456, 'rock'] };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('all tags must be strings');
    });

    test('should fail validation when playCount is negative', () => {
      const invalidData = { ...validSongData, playCount: -10 };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('playCount must be a non-negative number');
    });

    test('should fail validation when playCount is not a number', () => {
      const invalidData = { ...validSongData, playCount: '100' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('playCount must be a non-negative number');
    });

    test('should fail validation when createdAt is missing', () => {
      const invalidData = { ...validSongData, createdAt: null };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('createdAt is required and must be a positive number (timestamp)');
    });

    test('should fail validation when createdAt is not a number', () => {
      const invalidData = { ...validSongData, createdAt: '2024-01-01' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('createdAt is required and must be a positive number (timestamp)');
    });

    test('should fail validation when createdAt is zero or negative', () => {
      const invalidData = { ...validSongData, createdAt: 0 };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('createdAt is required and must be a positive number (timestamp)');
    });

    test('should collect multiple validation errors', () => {
      const invalidData = {
        id: '',
        title: '',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: 'happy',
        tags: ['pop', 123],
        playCount: -5,
        createdAt: 0
      };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('id is required and must be a non-empty string');
      expect(result.errors).toContain('title is required and must be a non-empty string');
      expect(result.errors).toContain('moods must be an array');
      expect(result.errors).toContain('all tags must be strings');
      expect(result.errors).toContain('playCount must be a non-negative number');
      expect(result.errors).toContain('createdAt is required and must be a positive number (timestamp)');
    });

    test('should handle whitespace-only strings as invalid', () => {
      const invalidData = { ...validSongData, title: '   ' };
      const song = new Song(invalidData);
      const result = song.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('title is required and must be a non-empty string');
    });
  });

  describe('Firebase Integration', () => {
    test('should create Song from Firebase data', () => {
      const firebaseData = {
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: ['happy'],
        tags: ['pop'],
        playCount: 75,
        createdAt: Date.now()
      };

      const song = Song.fromFirebase('song-456', firebaseData);

      expect(song.id).toBe('song-456');
      expect(song.title).toBe(firebaseData.title);
      expect(song.movie).toBe(firebaseData.movie);
      expect(song.artist).toBe(firebaseData.artist);
      expect(song.album).toBe(firebaseData.album);
      expect(song.language).toBe(firebaseData.language);
      expect(song.moods).toEqual(firebaseData.moods);
      expect(song.tags).toEqual(firebaseData.tags);
      expect(song.playCount).toBe(firebaseData.playCount);
      expect(song.createdAt).toBe(firebaseData.createdAt);
    });

    test('should convert Song to Firebase format', () => {
      const songData = {
        id: 'song-789',
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: ['calm'],
        tags: ['acoustic'],
        playCount: 25,
        createdAt: Date.now()
      };

      const song = new Song(songData);
      const firebaseData = song.toFirebase();

      expect(firebaseData.id).toBeUndefined(); // ID is stored separately in Firebase
      expect(firebaseData.title).toBe(songData.title);
      expect(firebaseData.movie).toBe(songData.movie);
      expect(firebaseData.artist).toBe(songData.artist);
      expect(firebaseData.album).toBe(songData.album);
      expect(firebaseData.language).toBe(songData.language);
      expect(firebaseData.moods).toEqual(songData.moods);
      expect(firebaseData.tags).toEqual(songData.tags);
      expect(firebaseData.playCount).toBe(songData.playCount);
      expect(firebaseData.createdAt).toBe(songData.createdAt);
    });
  });

  describe('Utility Methods', () => {
    test('should clone a song', () => {
      const songData = {
        id: 'song-clone',
        title: 'Original Song',
        movie: 'Original Movie',
        artist: 'Original Artist',
        album: 'Original Album',
        language: 'English',
        moods: ['happy', 'energetic'],
        tags: ['pop', 'dance'],
        playCount: 150,
        createdAt: Date.now()
      };

      const original = new Song(songData);
      const clone = original.clone();

      expect(clone).not.toBe(original);
      expect(clone.id).toBe(original.id);
      expect(clone.title).toBe(original.title);
      expect(clone.movie).toBe(original.movie);
      expect(clone.artist).toBe(original.artist);
      expect(clone.album).toBe(original.album);
      expect(clone.language).toBe(original.language);
      expect(clone.moods).toEqual(original.moods);
      expect(clone.moods).not.toBe(original.moods); // Different array instance
      expect(clone.tags).toEqual(original.tags);
      expect(clone.tags).not.toBe(original.tags); // Different array instance
      expect(clone.playCount).toBe(original.playCount);
      expect(clone.createdAt).toBe(original.createdAt);
    });

    test('should create independent clone (modifying clone does not affect original)', () => {
      const songData = {
        id: 'song-independent',
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: ['happy'],
        tags: ['pop'],
        playCount: 50,
        createdAt: Date.now()
      };

      const original = new Song(songData);
      const clone = original.clone();

      clone.title = 'Modified Title';
      clone.moods.push('sad');
      clone.tags.push('rock');

      expect(original.title).toBe('Test Song');
      expect(original.moods).toEqual(['happy']);
      expect(original.tags).toEqual(['pop']);
    });
  });

  describe('Edge Cases', () => {
    test('should handle empty arrays for moods and tags', () => {
      const songData = {
        id: 'song-empty-arrays',
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      };

      const song = new Song(songData);
      const result = song.validate();

      expect(result.isValid).toBe(true);
      expect(song.moods).toEqual([]);
      expect(song.tags).toEqual([]);
    });

    test('should handle zero playCount', () => {
      const songData = {
        id: 'song-zero-plays',
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: [],
        tags: [],
        playCount: 0,
        createdAt: Date.now()
      };

      const song = new Song(songData);
      const result = song.validate();

      expect(result.isValid).toBe(true);
      expect(song.playCount).toBe(0);
    });

    test('should handle very large playCount', () => {
      const songData = {
        id: 'song-popular',
        title: 'Test Song',
        movie: 'Test Movie',
        artist: 'Test Artist',
        album: 'Test Album',
        language: 'English',
        moods: [],
        tags: [],
        playCount: 999999999,
        createdAt: Date.now()
      };

      const song = new Song(songData);
      const result = song.validate();

      expect(result.isValid).toBe(true);
      expect(song.playCount).toBe(999999999);
    });

    test('should handle special characters in string fields', () => {
      const songData = {
        id: 'song-special-chars',
        title: 'Test Song! @#$%',
        movie: 'Test Movie (2024)',
        artist: "Test Artist's Name",
        album: 'Test Album: The Beginning',
        language: 'English',
        moods: ['happy'],
        tags: ['pop'],
        playCount: 10,
        createdAt: Date.now()
      };

      const song = new Song(songData);
      const result = song.validate();

      expect(result.isValid).toBe(true);
    });

    test('should handle unicode characters in string fields', () => {
      const songData = {
        id: 'song-unicode',
        title: 'गाना परीक्षण',
        movie: '电影测试',
        artist: 'アーティスト',
        album: '앨범',
        language: 'Hindi',
        moods: ['romantic'],
        tags: ['bollywood'],
        playCount: 20,
        createdAt: Date.now()
      };

      const song = new Song(songData);
      const result = song.validate();

      expect(result.isValid).toBe(true);
    });
  });
});
