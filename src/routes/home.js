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

        // 0. Context Helpers
        const now = new Date();
        // Use client-provided local hour if available, otherwise server time
        const clientHour = req.query.localHour ? parseInt(req.query.localHour) : null;
        const hour = (clientHour !== null && !isNaN(clientHour)) ? clientHour : now.getHours();

        const year = now.getFullYear();
        let timeContext = 'Late Night';
        if (hour >= 5 && hour < 12) timeContext = 'Morning';
        else if (hour >= 12 && hour < 17) timeContext = 'Afternoon';
        else if (hour >= 17 && hour < 21) timeContext = 'Evening';

        // Build personalized search queries - STRICTLY enforce language if present
        const hasLang = languages.length > 0;
        const hasMood = moods.length > 0;

        const lang = hasLang ? languages[0] : '';
        const mood1 = hasMood ? moods[0] : '';
        const mood2 = (hasMood && moods.length > 1) ? moods[1] : '';

        // 1. Made For You: Context + Mood + Lang
        // "Morning Happy Tamil songs" or "Late Night Chill songs"
        let query1 = `${timeContext} vibe songs`;
        if (hasLang && hasMood) query1 = `${timeContext} ${mood1} ${lang} songs`;
        else if (hasLang) query1 = `${timeContext} ${lang} songs`;
        else if (hasMood) query1 = `${timeContext} ${mood1} songs`;

        // 2. Trending Now: "Top {Lang} songs {Year}"
        // "Top Tamil songs 2024"
        let query2 = hasLang ? `Top ${lang} songs ${year}` : `Top songs ${year}`;

        // 3. New Releases: "New {Lang} music {Year}" or Mood based
        // "New Tamil music 2024"
        let query3 = hasLang ? `New ${lang} music ${year}` : `New music ${year}`;

        // Run searches sequentially to save memory
        const madeForYou = await youtubeService.search(query1);
        const trendingNow = await youtubeService.search(query2);
        const recentlyPlayed = await youtubeService.search(query3);

        // Prefetch stream URLs for top results (reduced count)
        const allIds = [
            ...madeForYou.slice(0, 1),
            ...trendingNow.slice(0, 1),
        ].map(r => r.id).filter(Boolean);
        youtubeService.prefetchStreamUrls(allIds);

        // Titles
        const title1 = hasLang && hasMood ? `${timeContext} ${mood1} ${lang} Vibe` :
            hasLang ? `${timeContext} ${lang} Vibe` :
                hasMood ? `${timeContext} ${mood1} Vibe` :
                    `${timeContext} Vibe`;

        const title2 = hasLang ? `Trending ${lang} Songs` : 'Trending Global';
        const title3 = hasLang ? `New ${lang} Music ${year}` : `New Music ${year}`;

        res.status(200).json({
            madeForYou,
            trendingNow,
            recentlyPlayed, // This is actually "New Releases" in my code logic above (query3), let's fix variable name mapping in next step or here if possible. 
            // Wait, query3 was new releases. But response keys were madeForYou, trendingNow, recentlyPlayed.
            // In original code: const [madeForYou, trendingNow, recentlyPlayed] = await Promise.all(...)
            // query3 was "New Releases". So "recentlyPlayed" variable actually holds "New Releases".
            // Let's keep keys same for now to avoid breaking too much, but enable titles.
            titles: {
                madeForYou: title1,
                trendingNow: title2,
                recentlyPlayed: title3 // This maps to the 3rd section which is New Releases
            }
        });
    } catch (error) {
        console.error('Home Error:', error);
        res.status(500).json({ error: 'Failed to load home' });
    }
});

module.exports = router;
