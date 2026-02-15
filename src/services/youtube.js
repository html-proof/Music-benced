// build
const ytDlp = require('yt-dlp-exec');

// In-memory cache for stream URLs (30 min TTL)
const streamCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

const PIPED_INSTANCES = [
    'https://pipedapi.kavin.rocks',
    'https://pipedapi.r4fo.com',
    'https://pipedapi.adminforge.de',
];

// In-memory cache for search results (10 min TTL)
const searchCache = new Map();
const SEARCH_CACHE_TTL = 10 * 60 * 1000;

const searchFromPiped = async (query) => {
    for (const instance of PIPED_INSTANCES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(`${instance}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) continue;
            const data = await res.json();

            if (!data.items) continue;

            // Map Piped items to our format
            return data.items
                .filter(item => item.type === 'stream')
                .map(item => ({
                    id: item.url.split('/watch?v=')[1],
                    title: item.title,
                    uploader: item.uploaderName,
                    duration: item.duration,
                    view_count: item.views,
                    thumbnail: item.thumbnail
                }));
        } catch (e) {
            continue;
        }
    }
    return null;
};

// Helper to write cookies file from env
const fs = require('fs');
const path = require('path');
const os = require('os');

const writeCookiesFile = () => {
    const b64 = process.env.YT_COOKIES_BASE64;
    if (!b64) return null;

    try {
        const cookies = Buffer.from(b64, 'base64').toString('utf-8');
        const cookiePath = path.join(os.tmpdir(), 'cookies.txt');
        fs.writeFileSync(cookiePath, cookies);
        return cookiePath;
    } catch (e) {
        console.error('Error writing cookies file:', e);
        return null;
    }
};

// --- Constants & Configuration ---

// 1. Block Lists (Reject these)
const BLOCK_KEYWORDS = [
    "status", "shorts", "8d", "16d", "32d",
    "slowed", "reverb", "sped up", "mashup", "fanmade",
    "reupload", "karaoke", "instrumental", "bgm", "trailer", "teaser",
    "reaction", "tiktok", "clip", "highlights", "short",
    "promo", "news", "debate", "politics", "speech", "election", "bjp",
    "congress", "modi", "rahul", "parliament", "breaking", "live news",
    "sex", "nude", "nudity", "porn", "xxx", "hot scenes", "bed scene",
    "18+", "onlyfans", "adult", "reel",
    "bass boosted", "nightcore", "whatsapp status"
];

const BLOCK_CHANNELS = [
    "status", "edit", "fan", "reupload", "reaction", "news", "politics",
    "clip", "shorts", "reel", "tiktok", "scene", "movie"
];

// 2. Allow Lists (Keep these)
const SONG_ALLOW_KEYWORDS = [
    "audio", "song", "music", "official audio", "full song", "original",
    "video", "mv" // Added video/mv as they often contain the song
];

const PODCAST_ALLOW_KEYWORDS = [
    "podcast", "episode", "ep", "interview", "talk", "conversation"
];

const SAFE_CHANNELS = [
    " - Topic", "VEVO", "Official", "Records", "Music", "Studio", "Podcast", "Studios"
];

// --- Helper Functions ---

const isBlocked = (title, channel) => {
    const t = title.toLowerCase();
    const c = channel.toLowerCase();

    // Check blocked keywords in title
    if (BLOCK_KEYWORDS.some(k => t.includes(k))) return true;

    // Check blocked keywords in channel
    if (BLOCK_CHANNELS.some(k => c.includes(k))) return true;

    return false;
};

const classifyVideo = (video) => {
    const t = video.title.toLowerCase();
    const c = video.uploader.toLowerCase(); // uploader = channel
    const d = video.duration;

    // 1. Song Classification
    // Duration: 90s (1:30) to 8m (480s)
    if (d >= 90 && d <= 480) {
        // Must contain at least one song keyword OR be from a safe channel
        const hasKeyword = SONG_ALLOW_KEYWORDS.some(k => t.includes(k));
        const isSafeChannel = SAFE_CHANNELS.some(k => c.includes(k));

        if (hasKeyword || isSafeChannel) {
            return 'song';
        }
    }

    // 2. Podcast Classification
    // Duration: 15m (900s) to 4h (14400s)
    if (d >= 900 && d <= 14400) {
        const hasKeyword = PODCAST_ALLOW_KEYWORDS.some(k => t.includes(k));
        const isSafeChannel = c.includes('podcast') || c.includes('studios') || c.includes('official');

        if (hasKeyword || isSafeChannel) {
            return 'podcast';
        }
    }

    return null; // Rejected
};

// --- SMART SEARCH & RANKING LOGIC ---

// Regex patterns to extract metadata: "Song - Movie | Artist"
const METADATA_PATTERNS = [
    // "Song - Movie | Artist" (e.g. "Badass - Leo | Anirudh")
    /(?<title>[^-]+)\s*-\s*(?<movie>[^|]+)\s*\|\s*(?<artist>.+)/,
    // "Song | Movie | Artist"
    /(?<title>[^|]+)\s*\|\s*(?<movie>[^|]+)\s*\|\s*(?<artist>.+)/,
    // "Movie - Song" (Common in Indian channels, e.g. "Leo - Badass")
    /(?<movie>[^-]+)\s*-\s*(?<title>.+)/,
];

const parseMetadata = (title, channel) => {
    let metadata = { title: title.trim(), movie: '', artist: '' };

    // 1. Try Regex Patterns
    for (const pattern of METADATA_PATTERNS) {
        const match = title.match(pattern);
        if (match && match.groups) {
            if (match.groups.title) metadata.title = match.groups.title.trim();
            if (match.groups.movie) metadata.movie = match.groups.movie.trim();
            if (match.groups.artist) metadata.artist = match.groups.artist.trim();
            break;
        }
    }

    // 2. Fallback Artist from Channel
    if (!metadata.artist) {
        if (channel.includes(' - Topic')) {
            metadata.artist = channel.replace(' - Topic', '').trim();
        } else if (channel.includes('Official')) {
            metadata.artist = channel.replace('Official', '').replace('Channel', '').trim();
        } else {
            metadata.artist = channel; // Default to channel name
        }
    }

    // 3. Cleanup
    // Remove "Official Video", "Lyrical", "4K" noise from title if regex failed to catch it nicely
    metadata.title = metadata.title
        .replace(/\(Official.*?\)/gi, '')
        .replace(/\[Official.*?\]/gi, '')
        .replace(/\(Lyrical.*?\)/gi, '')
        .replace(/\|.*/, '') // Remove trailing pipe garbage if missed
        .trim();

    return metadata;
};

const calculateScore = (video, classification, userContext = {}, query = '') => {
    let score = 0;
    const t = video.title.toLowerCase();
    const c = video.uploader.toLowerCase();
    const q = query.toLowerCase();

    // --- BASE SCORING ---

    // Channel Bonus
    if (c.includes(' - topic')) score += 50;
    else if (SAFE_CHANNELS.some(k => c.includes(k.toLowerCase()))) score += 30;

    // Title Bonus
    if (t.includes('official audio') || t.includes('official music video')) score += 30;
    if (t.includes('official video')) score += 20;
    if (t.includes('lyric video')) score -= 20; // Prefer audio/official over lyrics

    // View Count Bonus (cap at 20)
    if (video.view_count > 1000000) score += 20;
    else if (video.view_count > 100000) score += 10;

    // --- SMART CONTEXT SCORING ---

    // 1. User Language Boost
    if (userContext.language) {
        const lang = userContext.language.toLowerCase();
        // Check exact language match in title/channel
        if (t.includes(lang) || c.includes(lang)) {
            score += 50;
        }
    }

    // 2. User Mood Boost
    if (userContext.mood) {
        const mood = userContext.mood.toLowerCase();
        if (t.includes(mood)) {
            score += 30;
        }
    }

    // 3. Query Relevance (Fuzzy-ish)
    if (q) {
        // Exact title match
        if (t === q) score += 100;
        // Contains query strictly
        else if (t.includes(q)) score += 40;

        // If parsed metadata exists, check against Movie/Artist (handled here implicitly via raw strings)
        if (video.movie && video.movie.toLowerCase().includes(q)) score += 40;
        if (video.artist && video.artist.toLowerCase().includes(q)) score += 30;
    }

    return score;
};

const search = async (query, userContext = {}) => {
    // Check search cache (Cache key should include lang/mood if we strictly filter, 
    // but for now we append lang to cache key to be safe)
    const contextKey = userContext.language ? `_${userContext.language}` : '';
    const cacheKey = `${query.toLowerCase().trim()}${contextKey}`;

    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        return cached.data;
    }

    try {
        // Intelligent Query Boosting
        let searchQuery = query;
        const qLower = query.toLowerCase();

        // Pass 1: If user has language, append it if not present
        if (userContext.language && !qLower.includes(userContext.language.toLowerCase())) {
            // Only append if query is short (likely a movie/song name)
            if (query.split(' ').length < 4) {
                searchQuery += ` ${userContext.language}`;
            }
        }

        // Pass 2: Add "song" to help YouTube find music (don't be too specific)
        if (!qLower.includes('song') && !qLower.includes('audio') && !qLower.includes('music')) {
            searchQuery += " song";
        }

        console.log(`Searching with boosted query: "${searchQuery}"`);

        // 1. Try Piped API (Fast)
        let rawResults = await searchFromPiped(searchQuery);

        // 2. Fallback to yt-dlp (Slow but reliable)
        if (!rawResults || rawResults.length === 0) {
            console.log('Piped search failed, falling back to yt-dlp');

            const cookiePath = writeCookiesFile();
            const args = {
                dumpSingleJson: true,
                defaultSearch: 'ytsearch20',
                flatPlaylist: true,
                noWarnings: true,
                preferFreeFormats: true,
                skipDownload: true,
                format: 'bestaudio[ext=m4a]/bestaudio[ext=opus]/bestaudio',
                noCheckCertificate: true,
                noPlaylist: true,
                extractorArgs: 'youtube:player_client=android',
            };

            if (cookiePath) args.cookies = cookiePath;

            const output = await ytDlp(searchQuery, args);

            if (output.entries) {
                rawResults = output.entries.map(entry => ({
                    id: entry.id,
                    title: entry.title,
                    uploader: entry.uploader,
                    duration: entry.duration,
                    view_count: entry.view_count,
                    thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`
                }));
            } else {
                rawResults = [output];
            }
        }

        // --- FILTERING & SCORING ---
        let processedResults = [];

        if (rawResults && rawResults.length > 0) {
            for (const video of rawResults) {
                // 1. Hard Block
                if (isBlocked(video.title, video.uploader)) continue;

                // 2. Classify
                const classification = classifyVideo(video);
                if (!classification) continue;

                // 3. Extract Metadata (Smart Parse)
                const metadata = parseMetadata(video.title, video.uploader);

                // 4. Score
                // We pass the *original* video ref to calculateScore, but modify it with metadata
                video.movie = metadata.movie;
                video.artist = metadata.artist;

                const score = calculateScore(video, classification, userContext, query);

                processedResults.push({
                    ...video,
                    type: classification,
                    score: score,
                    title: metadata.title, // clean title
                    language: userContext.language || '',
                });
            }
        }

        // 5. Sort by Score Descending
        processedResults.sort((a, b) => b.score - a.score);

        // 6. Cleanup
        const finalResults = processedResults.map(r => ({
            id: r.id,
            title: r.title,
            movie: r.movie, // New Field
            artist: r.artist, // New Field
            uploader: r.uploader,
            duration: r.duration,
            view_count: r.view_count,
            thumbnail: r.thumbnail,
            type: r.type,
            score: r.score,
            language: r.language
        }));

        // Cache
        if (finalResults && finalResults.length > 0) {
            searchCache.set(cacheKey, { data: finalResults, timestamp: Date.now() });
        }

        return finalResults;

    } catch (error) {
        console.error('Error searching YouTube:', error);
        throw error;
    }
};

// Fast: Piped API (~500ms, non-IP-locked URLs)
const getStreamUrlFromPiped = async (videoId) => {
    for (const instance of PIPED_INSTANCES) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            const res = await fetch(`${instance}/streams/${videoId}`, {
                signal: controller.signal,
            });
            clearTimeout(timeout);

            if (!res.ok) continue;

            const data = await res.json();
            const audioStreams = data.audioStreams || [];

            // Pick best audio stream (sort by bitrate)
            const best = audioStreams
                .filter(s => s.mimeType && s.mimeType.startsWith('audio/'))
                .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

            if (best && best.url) {
                return {
                    url: best.url,
                    title: data.title,
                    duration: data.duration,
                    thumbnail: data.thumbnailUrl,
                };
            }
        } catch (e) {
            // Try next instance
            continue;
        }
    }
    return null;
};

// Slow fallback: yt-dlp (2-5s)
const getStreamUrlFromYtDlp = async (videoId) => {
    const cookiePath = writeCookiesFile();
    const args = {
        dumpSingleJson: true,
        noWarnings: true,
        format: 'bestaudio[ext=m4a]/bestaudio[ext=opus]/bestaudio',
        noCheckCertificates: true,
        extractorArgs: 'youtube:player_client=android',
    };

    if (cookiePath) {
        args.cookies = cookiePath;
    }

    const output = await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, args);

    return {
        url: output.url,
        title: output.title,
        duration: output.duration,
        thumbnail: output.thumbnail,
    };
};

const getStreamUrl = async (videoId) => {
    // 1. Check cache
    const cached = streamCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }

    // 2. Try Piped (fast)
    let result = await getStreamUrlFromPiped(videoId);

    // 3. Fallback to yt-dlp
    if (!result) {
        result = await getStreamUrlFromYtDlp(videoId);
    }

    // Cache result
    if (result) {
        streamCache.set(videoId, { data: result, timestamp: Date.now() });
    }

    return result;
};

const prefetchStreamUrls = async (videoIds) => {
    await Promise.all(videoIds.map(async (id) => {
        if (!streamCache.has(id)) {
            try {
                await getStreamUrl(id);
            } catch (e) {
                // ignore
            }
        }
    }));
};

module.exports = { search, getStreamUrl, prefetchStreamUrls };
