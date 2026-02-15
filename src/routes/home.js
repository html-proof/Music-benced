const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const { db, auth } = require('../config/firebase');

// Cache for home feed (5 min TTL)
const homeCache = new Map();
const HOME_CACHE_TTL = 5 * 60 * 1000;

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
                db.child(`users/${req.user.uid}/language`).once('value'),
                db.child(`users/${req.user.uid}/moods`).once('value'),
            ]);
            languages = langSnap.val() || [];
            moods = moodSnap.val() || [];
            if (!Array.isArray(languages)) languages = [languages];
            if (!Array.isArray(moods)) moods = [moods];
        }

        // Check cache (key based on language/mood combo)
        const cacheKey = `${languages.join(',')}_${moods.join(',')}`;
        const cached = homeCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < HOME_CACHE_TTL) {
            return res.status(200).cached ? res.status(200).json(cached.data) : null;
        }

        // 0. Context Helpers
        const now = new Date();
        const clientHour = req.query.localHour ? parseInt(req.query.localHour) : null;
        const hour = (clientHour !== null && !isNaN(clientHour)) ? clientHour : now.getHours();

        const year = now.getFullYear();
        let timeContext = 'Late Night';
        if (hour >= 5 && hour < 12) timeContext = 'Morning';
        else if (hour >= 12 && hour < 17) timeContext = 'Afternoon';
        else if (hour >= 17 && hour < 21) timeContext = 'Evening';

        // Build personalized search queries
        const hasLang = languages.length > 0;
        const hasMood = moods.length > 0;

        const lang = hasLang ? languages[0] : '';
        const mood1 = hasMood ? moods[0] : '';

        const userContext = { language: lang, mood: mood1 };

        // 1. Made For You: Context + Mood + Lang
        let query1 = `${timeContext} vibe songs`;
        if (hasLang && hasMood) query1 = `${timeContext} ${mood1} ${lang} songs`;
        else if (hasLang) query1 = `${timeContext} ${lang} songs`;
        else if (hasMood) query1 = `${timeContext} ${mood1} songs`;

        // 2. Trending Now
        let query2 = hasLang ? `Top ${lang} songs ${year}` : `Top songs ${year}`;

        // 3. New Releases
        let query3 = hasLang ? `New ${lang} music ${year}` : `New music ${year}`;

        // Run all searches IN PARALLEL for speed
        const [madeForYou, trendingNow, recentlyPlayed] = await Promise.all([
            youtubeService.search(query1, userContext),
            youtubeService.search(query2, userContext),
            youtubeService.search(query3, userContext)
        ]);

        // Limit results to 10 each (faster response)
        const limitedResults = {
            madeForYou: madeForYou.slice(0, 10),
            trendingNow: trendingNow.slice(0, 10),
            recentlyPlayed: recentlyPlayed.slice(0, 10)
        };

        // Prefetch stream URLs for first 3 items from each section
        const allIds = [
            ...limitedResults.madeForYou.slice(0, 3),
            ...limitedResults.trendingNow.slice(0, 3),
            ...limitedResults.recentlyPlayed.slice(0, 3),
        ].map(r => r.id).filter(Boolean);
        
        // Fire prefetch in background (don't await)
        youtubeService.prefetchStreamUrls([...new Set(allIds)]);

        // Titles
        const title1 = hasLang && hasMood ? `${timeContext} ${mood1} ${lang} Vibe` :
            hasLang ? `${timeContext} ${lang} Vibe` :
                hasMood ? `${timeContext} ${mood1} Vibe` :
                    `${timeContext} Vibe`;

        const title2 = hasLang ? `Trending ${lang} Songs` : 'Trending Global';
        const title3 = hasLang ? `New ${lang} Music ${year}` : `New Music ${year}`;

        const response = {
            ...limitedResults,
            titles: {
                madeForYou: title1,
                trendingNow: title2,
                recentlyPlayed: title3
            }
        };

        // Cache the response
        homeCache.set(cacheKey, { data: response, timestamp: Date.now() });

        res.status(200).json(response);
    } catch (error) {
        console.error('Home Error:', error);
        res.status(500).json({ error: 'Failed to load home' });
    }
});

// Clear cache endpoint (for testing)
router.post('/clear-cache', (req, res) => {
    homeCache.clear();
    res.json({ message: 'Cache cleared' });
});

module.exports = router;
