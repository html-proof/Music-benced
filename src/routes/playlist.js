const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const verifyToken = require('../middlewares/auth');

router.use(verifyToken);

// Create playlist
router.post('/create', async (req, res) => {
    const { uid } = req.user;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Missing playlist name' });
    }

    try {
        const newPlaylistRef = db.child(`users/${uid}/playlists`).push();
        await newPlaylistRef.set({
            id: newPlaylistRef.key,
            name,
            description: description || '',
            createdAt: new Date().toISOString(),
            songs: {}
        });
        res.status(200).json({ message: 'Playlist created', id: newPlaylistRef.key });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create playlist' });
    }
});

// Add song to playlist
router.post('/add', async (req, res) => {
    const { uid } = req.user;
    const { playlistId, song } = req.body;

    if (!playlistId || !song || !song.id) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    try {
        await db.child(`users/${uid}/playlists/${playlistId}/songs/${song.id}`).set(song);
        res.status(200).json({ message: 'Song added to playlist' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add song' });
    }
});

// Remove song from playlist
router.post('/remove', async (req, res) => {
    const { uid } = req.user;
    const { playlistId, songId } = req.body;

    if (!playlistId || !songId) {
        return res.status(400).json({ error: 'Invalid data' });
    }

    try {
        await db.child(`users/${uid}/playlists/${playlistId}/songs/${songId}`).remove();
        res.status(200).json({ message: 'Song removed from playlist' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to remove song' });
    }
});

// Get playlists
router.get('/list', async (req, res) => {
    const { uid } = req.user;

    try {
        const snapshot = await db.child(`users/${uid}/playlists`).once('value');
        const playlists = snapshot.val() || {};
        const playlistsList = Object.values(playlists).map(p => ({
            ...p,
            songCount: p.songs ? Object.keys(p.songs).length : 0
        }));
        res.status(200).json(playlistsList);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get playlists' });
    }
});

// Get specific playlist
router.get('/:id', async (req, res) => {
    const { uid } = req.user;
    const { id } = req.params;

    try {
        const snapshot = await db.child(`users/${uid}/playlists/${id}`).once('value');
        const playlist = snapshot.val();

        if (!playlist) {
            return res.status(404).json({ error: 'Playlist not found' });
        }

        // Convert songs object to array
        if (playlist.songs) {
            playlist.songs = Object.values(playlist.songs);
        } else {
            playlist.songs = [];
        }

        res.status(200).json(playlist);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get playlist' });
    }
});

module.exports = router;
