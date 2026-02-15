const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const { db, auth } = require('../config/firebase');

// Cache for home feed (10 min TTL)
const homeCache = new Map();
const HOME_CACHE_TTL = 10 * 60 * 1000;

// Default/fallback data
const DEFAULT_SONGS = [
    { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', duration: 213, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', type: 'song' },
    { id: '9bZkp7q19f0', title: 'Gangnam Style', artist: 'PSY', duration: 252, thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg', type: 'song' },
    { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi', duration: 282, thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg', type: 'song' },
];

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

// FAST: Get user prefs from Firebase
const getUserPrefs = async (uid) => {
    if (!uid) return { languages: [], moods: [] };
    try {
        const [langSnap, moodSnap] = await Promise.all([
            db.child(`users/${uid}/language`).once('value'),
            db.child(`users/${uid}/moods`).once('value'),
        ]);
        let languages = langSnap.val() || [];
        let moods = moodSnap.val() || [];
        if (!Array.isArray(languages)) languages = [languages];
        if (!Array.isArray(moods)) moods = [moods];
        return { languages, moods };
    } catch (e) {
        return { languages: [], moods: [] };
    }
};

// FAST: Get cache key
const getCacheKey = (languages, moods) => `${languages.join(',')}_${moods.join(',')}`;

// FAST: Build queries
const buildQueries = (languages, moods, hour) => {
    const year = new Date().getFullYear();
    let timeContext = 'Night';
    if (hour >= 5 && hour < 12) timeContext = 'Morning';
    else if (hour >= 12 && hour < 17) timeContext = 'Afternoon';
    else if (hour >= 17 && hour < 21) timeContext = 'Evening';

    const hasLang = languages.length > 0;
    const hasMood = moods.length > 0;
    const lang = hasLang ? languages[0] : '';
    const mood = hasMood ? moods[0] : '';

    // Build just 2 queries max
    const queries = [];
    
    // Query 1: Personalized
    if (hasLang && hasMood) {
        queries.push(`${timeContext} ${mood} ${lang} songs`);
    } else if (hasLang) {
        queries.push(`Top ${lang} songs`);
    } else if (hasMood) {
        queries.push(`${mood} songs`);
    } else {
        queries.push('Top trending songs');
    }
    
    // Query 2: Trending
    queries.push(hasLang ? `New ${lang} music ${year}` : `Top songs ${year}`);

    return { queries, timeContext, lang, mood, hasLang, hasMood };
};

// FAST: Search with timeout
const searchWithTimeout = async (query, userContext, timeoutMs = 3000) => {
    return Promise.race([
        youtubeService.search(query, userContext),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Search timeout')), timeoutMs)
        )
    ]);
};

// Single endpoint - OPTIMIZED for speed
router.get('/', optionalAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        // 1. Get user prefs (fast)
        const { languages, moods } = await getUserPrefs(req.user?.uid);
        
        // 2. Check cache IMMEDIATELY (very fast)
        const cacheKey = getCacheKey(languages, moods);
        const cached = homeCache.get(cacheKey);
        const hasValidCache = cached && (Date.now() - cached.timestamp < HOME_CACHE_TTL);
        
        // If cache exists, return it immediately (under 100ms)
        if (hasValidCache) {
            console.log(`Home served from cache in ${Date.now() - startTime}ms`);
            return res.status(200).json(cached.data);
        }
        
        // 3. If no cache, build response quickly
        const hour = req.query.localHour ? parseInt(req.query.localHour) : new Date().getHours();
        const { queries, timeContext, lang, mood, hasLang, hasMood } = buildQueries(languages, moods, hour);
        
        // 4. Search with 3 second timeout (parallel)
        let results1, results2;
        try {
            [results1, results2] = await Promise.all([
                searchWithTimeout(queries[0], { language: lang, mood: mood }, 3000),
                searchWithTimeout(queries[1], { language: lang, mood: mood }, 3000)
            ]);
        } catch (e) {
            console.log('Search timeout or error, using defaults');
            results1 = DEFAULT_SONGS;
            results2 = DEFAULT_SONGS;
        }
        
        // 5. Build response (limit to 8 items for speed)
        const response = {
            madeForYou: (results1 || []).slice(0, 8),
            trendingNow: (results2 || []).slice(0, 8),
            recentlyPlayed: (results1 || []).slice(0, 8), // Reuse results1
            titles: {
                madeForYou: hasLang && hasMood ? `${timeContext} ${mood} ${lang}` :
                    hasLang ? `Top ${lang}` : hasMood ? `${mood} Vibes` : 'Made For You',
                trendingNow: hasLang ? `Trending ${lang}` : 'Trending Now',
                recentlyPlayed: 'Recently Played'
            }
        };
        
        // 6. Cache for next time
        homeCache.set(cacheKey, { data: response, timestamp: Date.now() });
        
        console.log(`Home generated in ${Date.now() - startTime}ms`);
        res.status(200).json(response);
        
        // 7. Background: Prefetch streams (don't await)
        const idsToPrefetch = [
            ...response.madeForYou.slice(0, 2),
            ...response.trendingNow.slice(0, 2)
        ].map(r => r.id).filter(Boolean);
        
        if (idsToPrefetch.length > 0) {
            youtubeService.prefetchStreamUrls([...new Set(idsToPrefetch)]).catch(() => {});
        }
        
    } catch (error) {
        console.error('Home Error:', error);
        // Return default data on error (fast fallback)
        res.status(200).json({
            madeForYou: DEFAULT_SONGS,
            trendingNow: DEFAULT_SONGS,
            recentlyPlayed: DEFAULT_SONGS,
            titles: {
                madeForYou: 'Made For You',
                trendingNow: 'Trending Now',
                recentlyPlayed: 'Recently Played'
            }
        });
    }
});

// Clear cache endpoint
router.post('/clear-cache', (req, res) => {
    homeCache.clear();
    res.json({ message: 'Cache cleared' });
});

module.exports = router;
