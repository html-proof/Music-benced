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

        // Build personalized search queries - STRICTLY enforce language if present
        const hasLang = languages.length > 0;
        const hasMood = moods.length > 0;

        const lang = hasLang ? languages[0] : '';
        const mood1 = hasMood ? moods[0] : '';
        const mood2 = (hasMood && moods.length > 1) ? moods[1] : '';

        // 1. Made For You
        // If lang+mood: "Tamil Happy songs"
        // If only lang: "Tamil songs"
        // If only mood: "Happy songs"
        // If neither: "Trending songs"
        let query1 = 'Trending songs';
        if (hasLang && hasMood) query1 = `${lang} ${mood1} songs`;
        else if (hasLang) query1 = `${lang} songs`;
        else if (hasMood) query1 = `${mood1} songs`;

        // 2. Trending Now
        // If lang: "Trending Tamil songs"
        // Else: "Trending songs"
        let query2 = hasLang ? `Trending ${lang} songs` : 'Trending songs';

        // 3. New Releases
        // If lang: "New Tamil music 2024"
        // Else: "New music 2024"
        const year = new Date().getFullYear();
        let query3 = hasLang ? `New ${lang} music ${year}` : `New music ${year}`;

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
