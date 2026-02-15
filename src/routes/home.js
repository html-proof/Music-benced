const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const { db, auth } = require('../config/firebase');

// Cache for home feed (10 min TTL)
const homeCache = new Map();
const HOME_CACHE_TTL = 10 * 60 * 1000;

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

// Helper to extract values from Firebase structure {id: {value: 'x', createdAt: y}}
const extractValues = (data) => {
    if (!data || typeof data !== 'object') return [];
    const values = [];
    Object.values(data).forEach(item => {
        if (item && item.value) {
            values.push(item.value);
        }
    });
    return values;
};

// Get user preferences from Firebase (language and moods from unique ID structure)
const getUserPrefs = async (uid) => {
    if (!uid) return { languages: [], moods: [], cacheKey: 'anonymous' };
    try {
        const [langSnap, moodSnap] = await Promise.all([
            db.child(`users/${uid}/language`).once('value'),
            db.child(`users/${uid}/moods`).once('value'),
        ]);
        
        const languages = extractValues(langSnap.val());
        const moods = extractValues(moodSnap.val());
        
        return { 
            languages, 
            moods, 
            cacheKey: `${uid}_${languages.join(',')}_${moods.join(',')}` 
        };
    } catch (e) {
        console.error('Error fetching user prefs:', e);
        return { languages: [], moods: [], cacheKey: uid || 'anonymous' };
    }
};

// Build personalized queries based on language and mood
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

    // Build queries based on user preferences
    const queries = [];
    
    if (hasLang && hasMood) {
        // Both language and mood available
        queries.push(`${timeContext} ${mood} ${lang} songs`);
        queries.push(`Top ${lang} songs ${year}`);
    } else if (hasLang) {
        // Only language
        queries.push(`${timeContext} ${lang} songs`);
        queries.push(`New ${lang} music ${year}`);
    } else if (hasMood) {
        // Only mood
        queries.push(`${mood} ${timeContext} songs`);
        queries.push(`${mood} music playlist`);
    } else {
        // No preferences - generic trending
        queries.push('Top trending songs 2026');
        queries.push('Viral songs 2026');
    }

    return { queries, timeContext, lang, mood, hasLang, hasMood };
};

// Search with short timeout
const searchWithTimeout = async (query, userContext, timeoutMs = 5000) => {
    return Promise.race([
        youtubeService.search(query, userContext),
        new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Search timeout')), timeoutMs)
        )
    ]);
};

// Fallback songs when all searches fail
const FALLBACK_SONGS = [
    { id: 'dQw4w9WgXcQ', title: 'Never Gonna Give You Up', artist: 'Rick Astley', movie: '', uploader: 'Rick Astley', duration: 213, view_count: 1000000000, thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg', type: 'song', score: 100 },
    { id: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi', movie: '', uploader: 'Luis Fonsi', duration: 282, view_count: 8000000000, thumbnail: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg', type: 'song', score: 95 },
    { id: '9bZkp7q19f0', title: 'Gangnam Style', artist: 'PSY', movie: '', uploader: 'PSY', duration: 252, view_count: 4000000000, thumbnail: 'https://i.ytimg.com/vi/9bZkp7q19f0/hqdefault.jpg', type: 'song', score: 90 },
    { id: 'JGwWNGJdvx8', title: 'Shape of You', artist: 'Ed Sheeran', movie: '', uploader: 'Ed Sheeran', duration: 263, view_count: 5800000000, thumbnail: 'https://i.ytimg.com/vi/JGwWNGJdvx8/hqdefault.jpg', type: 'song', score: 90 },
    { id: 'RgKAFK5djSk', title: 'See You Again', artist: 'Wiz Khalifa', movie: '', uploader: 'Wiz Khalifa', duration: 229, view_count: 5500000000, thumbnail: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg', type: 'song', score: 85 },
    { id: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson', movie: '', uploader: 'Mark Ronson', duration: 270, view_count: 4700000000, thumbnail: 'https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg', type: 'song', score: 85 },
    { id: 'pRpeEdMmmQ0', title: 'Sugar', artist: 'Maroon 5', movie: '', uploader: 'Maroon 5', duration: 235, view_count: 3900000000, thumbnail: 'https://i.ytimg.com/vi/pRpeEdMmmQ0/hqdefault.jpg', type: 'song', score: 80 },
    { id: 'hT_nvWreIhg', title: 'Counting Stars', artist: 'OneRepublic', movie: '', uploader: 'OneRepublic', duration: 257, view_count: 3700000000, thumbnail: 'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg', type: 'song', score: 80 },
];

// Main endpoint - ALWAYS based on real-time database preferences
router.get('/', optionalAuth, async (req, res) => {
    const startTime = Date.now();
    
    try {
        // 1. Get user preferences from Firebase (ALWAYS - no defaults)
        const { languages, moods, cacheKey } = await getUserPrefs(req.user?.uid);
        
        console.log(`User ${req.user?.uid || 'anonymous'} - Languages: ${languages.join(', ')}, Moods: ${moods.join(', ')}`);
        
        // 2. Check cache
        const cached = homeCache.get(cacheKey);
        const hasValidCache = cached && (Date.now() - cached.timestamp < HOME_CACHE_TTL);
        
        if (hasValidCache) {
            console.log(`Home served from cache in ${Date.now() - startTime}ms`);
            return res.status(200).json(cached.data);
        }
        
        // 3. Build personalized queries based on REAL database values
        const hour = req.query.localHour ? parseInt(req.query.localHour) : new Date().getHours();
        const { queries, timeContext, lang, mood, hasLang, hasMood } = buildQueries(languages, moods, hour);
        
        console.log(`Searching: ${queries.join(' | ')}`);
        
        // 4. Parallel searches with timeout
        let results1 = [], results2 = [];
        try {
            [results1, results2] = await Promise.all([
                searchWithTimeout(queries[0], { language: lang, mood: mood }, 10000),
                searchWithTimeout(queries[1], { language: lang, mood: mood }, 10000)
            ]);
        } catch (e) {
            console.error('Search error:', e.message);
            // On error, keep whatever results we got
            results1 = results1 || [];
            results2 = results2 || [];
        }
        
        // 5. Use fallback if no results
        if (!results1 || results1.length === 0) {
            console.log('No results from search1, using fallback');
            results1 = FALLBACK_SONGS.slice(0, 5);
        }
        if (!results2 || results2.length === 0) {
            console.log('No results from search2, using fallback');
            results2 = FALLBACK_SONGS.slice(5, 10);
        }
        
        // 6. Build response
        const response = {
            madeForYou: results1.slice(0, 10),
            trendingNow: results2.slice(0, 10),
            recentlyPlayed: results1.slice(0, 10),
            titles: {
                madeForYou: hasLang && hasMood ? `${timeContext} ${mood} ${lang}` :
                    hasLang ? `${timeContext} ${lang}` : 
                    hasMood ? `${mood} Vibes` : 
                    'Made For You',
                trendingNow: hasLang ? `Trending ${lang}` : 'Trending Now',
                recentlyPlayed: 'Recently Played'
            },
            userPrefs: {
                languages,
                moods,
                hasPreferences: hasLang || hasMood
            }
        };
        
        // 7. Cache response
        homeCache.set(cacheKey, { data: response, timestamp: Date.now() });
        
        console.log(`Home generated in ${Date.now() - startTime}ms with ${response.madeForYou.length} + ${response.trendingNow.length} songs`);
        res.status(200).json(response);
        
        // 8. Background prefetch
        const idsToPrefetch = [
            ...response.madeForYou.slice(0, 3),
            ...response.trendingNow.slice(0, 3)
        ].map(r => r.id).filter(Boolean);
        
        if (idsToPrefetch.length > 0) {
            youtubeService.prefetchStreamUrls([...new Set(idsToPrefetch)]).catch(() => {});
        }
        
    } catch (error) {
        console.error('Home Error:', error);
        // Return fallback on error
        res.status(200).json({
            madeForYou: FALLBACK_SONGS.slice(0, 5),
            trendingNow: FALLBACK_SONGS.slice(5, 10),
            recentlyPlayed: FALLBACK_SONGS.slice(0, 5),
            titles: {
                madeForYou: 'Made For You',
                trendingNow: 'Trending Now',
                recentlyPlayed: 'Recently Played'
            },
            userPrefs: {
                languages: [],
                moods: [],
                hasPreferences: false
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
