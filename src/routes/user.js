const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const verifyToken = require('../middlewares/auth');

// Apply auth middleware to all user routes
router.use(verifyToken);

// Get user profile (check onboarding status)
router.get('/profile', async (req, res) => {
    const { uid } = req.user;

    try {
        const [langSnap, moodSnap] = await Promise.all([
            db.ref(`users/${uid}/language`).once('value'),
            db.ref(`users/${uid}/moods`).once('value'),
        ]);

        const language = langSnap.val();
        const moods = moodSnap.val();
        const hasCompletedOnboarding = !!(language && moods);

        res.status(200).json({
            hasCompletedOnboarding,
            language: language || null,
            moods: moods || null,
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update preferences (Generic)
router.post('/preferences', async (req, res) => {
    const { uid } = req.user;
    const preferences = req.body;

    try {
        await db.ref(`users/${uid}/preferences`).update(preferences);
        res.status(200).json({ message: 'Preferences updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// --- New Schema Endpoints ---

// Set/Update Language
router.post('/language', async (req, res) => {
    const { uid } = req.user;
    const { language } = req.body; // Expects string or array of strings

    if (!language) {
        return res.status(400).json({ error: 'Missing language data' });
    }

    try {
        await db.ref(`users/${uid}/language`).set(language);
        res.status(200).json({ message: 'Language updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update language' });
    }
});

// Set/Update Moods
router.post('/moods', async (req, res) => {
    const { uid } = req.user;
    const { moods } = req.body; // Expects string or array of strings

    if (!moods) {
        return res.status(400).json({ error: 'Missing moods data' });
    }

    try {
        await db.ref(`users/${uid}/moods`).set(moods);
        res.status(200).json({ message: 'Moods updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update moods' });
    }
});

// Add to Search History (Manual entry if needed, though search route handles it too)
router.post('/search', async (req, res) => {
    const { uid } = req.user;
    const { query } = req.body;

    if (!query) {
        return res.status(400).json({ error: 'Missing query' });
    }

    try {
        const newSearchRef = db.ref(`users/${uid}/search`).push();
        await newSearchRef.set({
            id: newSearchRef.key,
            query,
            timestamp: new Date().toISOString()
        });
        res.status(200).json({ message: 'Search added', id: newSearchRef.key });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add search' });
    }
});

// Get Search History
router.get('/search', async (req, res) => {
    const { uid } = req.user;
    try {
        const snapshot = await db.ref(`users/${uid}/search`).limitToLast(20).once('value');
        const searches = snapshot.val() || {};
        res.status(200).json(Object.values(searches).reverse());
    } catch (error) {
        res.status(500).json({ error: 'Failed to get search history' });
    }
});

// Update Current Song
router.post('/current', async (req, res) => {
    const { uid } = req.user;
    const song = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    try {
        // current_song is a single object, not a list, but user requested unique ID structure.
        // Usually current song is just ONE song.
        // We will replace the node content.
        await db.ref(`users/${uid}/current_song`).set({
            ...song,
            timestamp: new Date().toISOString()
        });
        res.status(200).json({ message: 'Current song updated' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update current song' });
    }
});

// Add to Played Songs (History)
router.post('/played', async (req, res) => {
    const { uid } = req.user;
    const song = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    try {
        const newPlayedRef = db.ref(`users/${uid}/played_song`).push();
        await newPlayedRef.set({
            ...song,
            dbId: newPlayedRef.key, // Unique ID for this specific play instance
            playedAt: new Date().toISOString()
        });
        res.status(200).json({ message: 'Added to played songs', id: newPlayedRef.key });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to played songs' });
    }
});

// Get Played Songs
router.get('/played', async (req, res) => {
    const { uid } = req.user;
    try {
        const snapshot = await db.ref(`users/${uid}/played_song`).limitToLast(50).once('value');
        const history = snapshot.val() || {};
        res.status(200).json(Object.values(history).reverse());
    } catch (error) {
        res.status(500).json({ error: 'Failed to get played songs' });
    }
});

// Add to Next Song (Queue)
router.post('/next', async (req, res) => {
    const { uid } = req.user;
    const song = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    try {
        const newNextRef = db.ref(`users/${uid}/next_song`).push();
        await newNextRef.set({
            ...song,
            dbId: newNextRef.key,
            addedAt: new Date().toISOString()
        });
        res.status(200).json({ message: 'Added to queue', id: newNextRef.key });
    } catch (error) {
        res.status(500).json({ error: 'Failed to add to queue' });
    }
});

// Get Next Songs (Queue)
router.get('/next', async (req, res) => {
    const { uid } = req.user;
    try {
        const snapshot = await db.ref(`users/${uid}/next_song`).once('value');
        const queue = snapshot.val() || {};
        res.status(200).json(Object.values(queue));
    } catch (error) {
        res.status(500).json({ error: 'Failed to get queue' });
    }
});


// Clear Queue
router.delete('/next', async (req, res) => {
    const { uid } = req.user;
    try {
        await db.ref(`users/${uid}/next_song`).remove();
        res.status(200).json({ message: 'Queue cleared' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to clear queue' });
    }
});

// --- Existing functionality maintained/aliased ---

// Like a song
router.post('/like', async (req, res) => {
    const { uid } = req.user;
    const song = req.body;

    if (!song || !song.id) {
        return res.status(400).json({ error: 'Invalid song data' });
    }

    try {
        await db.ref(`users/${uid}/likes/${song.id}`).set(song);
        res.status(200).json({ message: 'Song liked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to like song' });
    }
});

// Unlike a song
router.post('/unlike', async (req, res) => {
    const { uid } = req.user;
    const { songId } = req.body;

    if (!songId) {
        return res.status(400).json({ error: 'Missing songId' });
    }

    try {
        await db.ref(`users/${uid}/likes/${songId}`).remove();
        res.status(200).json({ message: 'Song unliked' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to unlike song' });
    }
});

// Get user likes
router.get('/likes', async (req, res) => {
    const { uid } = req.user;

    try {
        const snapshot = await db.ref(`users/${uid}/likes`).once('value');
        const likes = snapshot.val() || {};
        res.status(200).json(Object.values(likes));
    } catch (error) {
        res.status(500).json({ error: 'Failed to get likes' });
    }
});

module.exports = router;
