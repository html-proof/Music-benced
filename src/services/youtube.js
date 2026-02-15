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
    "lyrics", "lyrical", "status", "shorts", "8d", "16d", "32d", "3d",
    "slowed", "reverb", "sped up", "remix", "mashup", "cover", "fanmade",
    "edit", "reupload", "karaoke", "instrumental", "bgm", "trailer", "teaser",
    "reaction", "live", "dance", "tiktok", "clip", "highlights", "short",
    "promo", "news", "debate", "politics", "speech", "election", "bjp",
    "congress", "modi", "rahul", "parliament", "breaking", "live news",
    "sex", "nude", "nudity", "porn", "xxx", "hot", "kiss", "romance scene",
    "bed scene", "18+", "onlyfans", "adult", "reel", "scene", "scenes",
    "movie scene", "film scene", "short scene", "short scenes", "dialogue",
    "dialog", "glimpse", "making", "behind the scenes", "bts", "cut",
    "bass boosted", "nightcore"
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

const calculateScore = (video, classification) => {
    let score = 0;
    const t = video.title.toLowerCase();
    const c = video.uploader.toLowerCase();

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

    // Duration Logic
    // For songs, punish very short or very long within the allowed range slightly?
    // Actually, strict duration filtering is already done.

    // Exact Match Bonus (Heuristic)
    // if (t === query.toLowerCase()) score += 100; // Hard to do without passing query

    return score;
};

const search = async (query) => {
    // Check search cache
    const cacheKey = query.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        return cached.data;
    }

    try {
        // Intelligent Query Boosting
        let searchQuery = query;
        const qLower = query.toLowerCase();

        // If it looks like a podcast search, boost podcast terms
        if (qLower.includes('podcast') || qLower.includes('episode') || qLower.includes('talk')) {
            searchQuery += " podcast full episode";
        } else {
            // Default to song boosting
            // Don't add if already present
            if (!qLower.includes('audio') && !qLower.includes('song') && !qLower.includes('official')) {
                searchQuery += " audio official";
            }
        }

        console.log(`Searching with boosted query: "${searchQuery}"`);

        // 1. Try Piped API (Fast)
        // Fetch MORE results to allow for filtering
        // Piped doesn't support limit param in this endpoint generally, implies default. 
        // We might need to handle pagination if default is too small, but usually it returns enough.
        let rawResults = await searchFromPiped(searchQuery);

        // 2. Fallback to yt-dlp (Slow but reliable)
        if (!rawResults || rawResults.length === 0) {
            console.log('Piped search failed, falling back to yt-dlp');

            const cookiePath = writeCookiesFile();
            const args = {
                dumpSingleJson: true,
                defaultSearch: 'ytsearch20', // Fetch 20 results
                flatPlaylist: true,
                noWarnings: true,
                preferFreeFormats: true,
                skipDownload: true,
                format: 'bestaudio/best',
                noCheckCertificate: true,
                noPlaylist: true,
                extractorArgs: 'youtube:player_client=android',
            };

            if (cookiePath) {
                args.cookies = cookiePath;
            }

            const output = await ytDlp(searchQuery, args); // Use boosted query

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
                if (isBlocked(video.title, video.uploader)) {
                    continue;
                }

                // 2. Classify
                const classification = classifyVideo(video);
                if (!classification) {
                    continue; // Not a song or podcast
                }

                // 3. Score
                const score = calculateScore(video, classification);

                processedResults.push({
                    ...video,
                    type: classification,
                    score: score
                });
            }
        }

        // 4. Sort by Score Descending
        processedResults.sort((a, b) => b.score - a.score);

        // 5. Cleanup (remove score before returning if not needed, but useful for debug)
        const finalResults = processedResults.map(r => ({
            id: r.id,
            title: r.title,
            uploader: r.uploader, // channel
            duration: r.duration,
            view_count: r.view_count,
            thumbnail: r.thumbnail,
            type: r.type,
            // score: r.score // Optional: keep for debugging
        }));

        // Cache the results
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
        format: 'bestaudio/best',
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


