const ytDlp = require('yt-dlp-exec');

// In-memory cache for stream URLs (30 min TTL)
const streamCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const search = async (query) => {
    try {
        const output = await ytDlp(query, {
            dumpSingleJson: true,
            defaultSearch: 'ytsearch5', // Search for 5 results
            flatPlaylist: true,
            noWarnings: true,
            preferFreeFormats: true,
        });

        // If it's a search result (playlist), return the entries
        if (output.entries) {
            return output.entries.map(entry => ({
                id: entry.id,
                title: entry.title,
                uploader: entry.uploader,
                duration: entry.duration,
                view_count: entry.view_count,
                thumbnail: entry.thumbnail || `https://i.ytimg.com/vi/${entry.id}/hqdefault.jpg`
            }));
        }

        // Single result fallback
        return [output];
    } catch (error) {
        console.error('Error searching YouTube:', error);
        throw error;
    }
};

const getStreamUrl = async (videoId) => {
    // Check cache first
    const cached = streamCache.get(videoId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        console.log(`Stream cache HIT for ${videoId}`);
        return cached.data;
    }

    try {
        const output = await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, {
            dumpSingleJson: true,
            noWarnings: true,
            format: 'bestaudio/best',
        });

        const result = {
            url: output.url,
            title: output.title,
            duration: output.duration,
            thumbnail: output.thumbnail
        };

        // Cache the result
        streamCache.set(videoId, { data: result, timestamp: Date.now() });

        return result;
    } catch (error) {
        console.error('Error getting stream URL:', error);
        throw error;
    }
};

// Prefetch stream URLs for a list of video IDs (fire & forget)
const prefetchStreamUrls = (videoIds) => {
    for (const id of videoIds) {
        if (!streamCache.has(id)) {
            getStreamUrl(id).catch(() => { }); // silent fail
        }
    }
};

module.exports = { search, getStreamUrl, prefetchStreamUrls };

