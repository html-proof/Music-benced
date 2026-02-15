const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');

router.get('/', async (req, res) => {
    const { videoId, quality } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    // Quality: 'low' (64k), 'medium' (128k), 'high' (256k+)
    const qualitySetting = quality || 'high';

    try {
        const streamData = await youtubeService.getStreamUrl(videoId, qualitySetting);

        if (streamData) {
            // Return DIRECT stream URL (not proxy) - much faster for streaming
            res.status(200).json({ 
                ...streamData, 
                url: streamData.url, // Direct URL from Piped
                quality: qualitySetting 
            });
        } else {
            console.error('Stream not found for', videoId);
            res.status(500).json({ error: 'Stream not found' });
        }
    } catch (error) {
        console.error('Stream Error:', error);
        res.status(500).json({ error: 'Failed to fetch stream URL' });
    }
});

module.exports = router;

