const ytDlp = require('yt-dlp-exec');

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
    try {
        const output = await ytDlp(`https://www.youtube.com/watch?v=${videoId}`, {
            dumpSingleJson: true,
            noWarnings: true,
            format: 'bestaudio/best',
        });

        return {
            url: output.url,
            title: output.title,
            duration: output.duration,
            thumbnail: output.thumbnail
        };
    } catch (error) {
        console.error('Error getting stream URL:', error);
        throw error;
    }
};

module.exports = { search, getStreamUrl };
