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

    // Save search history if user is authenticated
    if (req.user && req.user.uid) {
        try {
            const newSearchRef = db.ref(`users/${req.user.uid}/search`).push();
            await newSearchRef.set({
                id: newSearchRef.key,
                query: q,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error('Failed to save search history:', error);
            // Don't block search results on history error
        }
    }

    try {
        const results = await youtubeService.search(q);
        res.status(200).json(results);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

module.exports = router;
