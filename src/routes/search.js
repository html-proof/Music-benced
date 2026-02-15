const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const { db, auth } = require('../config/firebase');

// Middleware to optionally get user if token is present, but not enforce it for search
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
            const decodedToken = await auth.verifyIdToken(token);
            req.user = decodedToken;
        } catch (e) {
            // Ignore invalid token for search, just treat as anonymous
            console.log('Optional auth failed:', e.message);
        }
    }
    next();
};

router.get('/', optionalAuth, async (req, res) => {
    const { q } = req.query;

    if (!q) {
        return res.status(400).json({ error: 'Missing search query' });
    }

    let userContext = {};

    // Save search history & Get User Context if authenticated
    if (req.user && req.user.uid) {
        try {
            // 1. Fetch User Preferences (Parallel)
            const [langSnap, moodSnap] = await Promise.all([
                db.ref(`users/${req.user.uid}/language`).once('value'),
                db.ref(`users/${req.user.uid}/moods`).once('value'),
            ]);

            const langVal = langSnap.val();
            const moodVal = moodSnap.val();

            // Handle array or string
            const languages = langVal ? (Array.isArray(langVal) ? langVal : [langVal]) : [];
            const moods = moodVal ? (Array.isArray(moodVal) ? moodVal : [moodVal]) : [];

            userContext = {
                language: languages.length > 0 ? languages[0] : null,
                mood: moods.length > 0 ? moods[0] : null
            };

            // 2. Save History
            const newSearchRef = db.ref(`users/${req.user.uid}/search`).push();
            await newSearchRef.set({
                id: newSearchRef.key,
                query: q,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to handle user data in search:', error);
            // Continue with empty context
        }
    }

    try {
        const results = await youtubeService.search(q, userContext);
        res.status(200).json(results);

        // Pre-warm stream cache for top results (fire & forget)
        const topIds = results.slice(0, 3).map(r => r.id).filter(Boolean);
        if (topIds.length > 0) {
            youtubeService.prefetchStreamUrls(topIds);
        }
    } catch (error) {
        console.error('Search failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
