const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const { db, auth } = require('../config/firebase');

// Optional auth — works for both logged-in and anonymous users
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split('Bearer ')[1];
        try {
            const decodedToken = await auth.verifyIdToken(token);
            req.user = decodedToken;
        } catch (e) {
            console.log('Optional auth failed:', e.message);
        }
    }
    next();
};

// Single endpoint that returns all 3 home sections personalized
router.get('/', optionalAuth, async (req, res) => {
    try {
        let languages = [];
        let moods = [];

        // Read user's preferences from Firebase
        if (req.user && req.user.uid) {
            const [langSnap, moodSnap] = await Promise.all([
                db.ref(`users/${req.user.uid}/language`).once('value'),
                db.ref(`users/${req.user.uid}/moods`).once('value'),
            ]);
            languages = langSnap.val() || [];
            moods = moodSnap.val() || [];
            if (!Array.isArray(languages)) languages = [languages];
            if (!Array.isArray(moods)) moods = [moods];
        }

        // Build personalized search queries
        const lang = languages.length > 0 ? languages[0] : 'English';
        const mood1 = moods.length > 0 ? moods[0] : 'popular';
        const mood2 = moods.length > 1 ? moods[1] : 'trending';

        const query1 = `${lang} ${mood1} songs`;
        const query2 = `${lang} ${mood2} music`;
        const query3 = `${lang} latest hits`;

        // Run all 3 searches in parallel
        const [madeForYou, trendingNow, recentlyPlayed] = await Promise.all([
            youtubeService.search(query1),
            youtubeService.search(query2),
            youtubeService.search(query3),
        ]);

        // Prefetch stream URLs for top results
        const allIds = [
            ...madeForYou.slice(0, 2),
            ...trendingNow.slice(0, 2),
            ...recentlyPlayed.slice(0, 1),
        ].map(r => r.id).filter(Boolean);
        youtubeService.prefetchStreamUrls(allIds);

        res.status(200).json({
            madeForYou,
            trendingNow,
            recentlyPlayed,
        });
    } catch (error) {
        console.error('Home Error:', error);
        res.status(500).json({ error: 'Failed to load home' });
    }
});

module.exports = router;
