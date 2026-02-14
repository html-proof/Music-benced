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

const search = async (query) => {
    // Check search cache
    const cacheKey = query.toLowerCase().trim();
    const cached = searchCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < SEARCH_CACHE_TTL) {
        return cached.data;
    }

    try {
        const output = await ytDlp(query, {
            dumpSingleJson: true,
            defaultSearch: 'ytsearch5',
            flatPlaylist: true,
            noWarnings: true,
            preferFreeFormats: true,
            skipDownload: true, // Ensure no download attempt
            // Add these for speed:
            format: 'bestaudio/best',
            noCheckCertificate: true,
            noPlaylist: true,
        });

        let results;
        if (output.entries) {
            results = output.entries.map(entry => ({
                id: entry.id,
                title: entry.title,
                uploader: entry.uploader,
                duration: entry.duration,
                view_count: entry.view_count,
                thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`
            }));
        } else {
            results = [output];
        }

        // Cache the results
        searchCache.set(cacheKey, { data: results, timestamp: Date.now() });
        return results;
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
    const output = await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, {
        dumpSingleJson: true,
        noWarnings: true,
        format: 'bestaudio/best',
        noCheckCertificates: true,
    });

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

const prefetchStreamUrls = (videoIds) => {
    for (const id of videoIds) {
        if (!streamCache.has(id)) {
            getStreamUrl(id).catch(() => { });
        }
    }
};

module.exports = { search, getStreamUrl, prefetchStreamUrls };


