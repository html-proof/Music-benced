const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');

/**
 * POST /api/admin/songs
 * Add a new song to the database
 * 
 * Body:
 * {
 *   "title": "Song Title",
 *   "movie": "Movie Name",
 *   "artist": "Artist Name",
 *   "album": "Album Name",
 *   "language": "Tamil",
 *   "moods": ["romantic", "energetic"],
 *   "tags": ["love", "dance"],
 *   "thumbnail": "https://...",
 *   "duration": "3:45"
 * }
 */
router.post('/songs', async (req, res) => {
  try {
    const songData = req.body;

    // Validate required fields
    const requiredFields = ['title', 'movie', 'artist', 'album', 'language'];
    for (const field of requiredFields) {
      if (!songData[field]) {
        return res.status(400).json({
          success: false,
          error: `Missing required field: ${field}`
        });
      }
    }

    // Generate song ID
    const songId = `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Prepare song data
    const song = {
      title: songData.title,
      movie: songData.movie,
      artist: songData.artist,
      album: songData.album,
      language: songData.language,
      moods: songData.moods || [],
      tags: songData.tags || [],
      playCount: 0,
      createdAt: Date.now(),
      thumbnail: songData.thumbnail || '',
      duration: songData.duration || '0:00'
    };

    // Add to songs collection
    await db.child('songs').child(songId).set(song);

    // Add to language index
    await db.child('songsByLanguage').child(song.language).child(songId).set(true);

    res.json({
      success: true,
      message: 'Song added successfully',
      songId: songId,
      song: song
    });

  } catch (error) {
    console.error('Error adding song:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add song',
      message: error.message
    });
  }
});

/**
 * POST /api/admin/songs/bulk
 * Add multiple songs at once
 */
router.post('/songs/bulk', async (req, res) => {
  try {
    const { songs } = req.body;

    if (!Array.isArray(songs) || songs.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'songs must be a non-empty array'
      });
    }

    const results = [];
    const errors = [];

    for (const songData of songs) {
      try {
        // Generate song ID
        const songId = `song-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Prepare song data
        const song = {
          title: songData.title,
          movie: songData.movie,
          artist: songData.artist,
          album: songData.album,
          language: songData.language,
          moods: songData.moods || [],
          tags: songData.tags || [],
          playCount: 0,
          createdAt: Date.now(),
          thumbnail: songData.thumbnail || '',
          duration: songData.duration || '0:00'
        };

        // Add to songs collection
        await db.child('songs').child(songId).set(song);

        // Add to language index
        await db.child('songsByLanguage').child(song.language).child(songId).set(true);

        results.push({ songId, title: song.title });
      } catch (error) {
        errors.push({ title: songData.title, error: error.message });
      }
    }

    res.json({
      success: true,
      message: `Added ${results.length} songs`,
      results: results,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Error bulk adding songs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to bulk add songs',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/songs/count
 * Get total song count
 */
router.get('/songs/count', async (req, res) => {
  try {
    const snapshot = await db.child('songs').once('value');
    const songs = snapshot.val() || {};
    const count = Object.keys(songs).length;

    res.json({
      success: true,
      count: count
    });
  } catch (error) {
    console.error('Error getting song count:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get song count'
    });
  }
});

module.exports = router;
