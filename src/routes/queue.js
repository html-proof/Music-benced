const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');

// Get 10 related songs for auto-play queue
router.get('/', async (req, res) => {
    const { videoId, title } = req.query;

    if (!videoId && !title) {
        return res.status(400).json({ error: 'Missing videoId or title' });
    }

    try {
        // Search for similar songs based on the current song title
        const query = title ? `${title} similar songs` : `youtube mix ${videoId}`;
        const results = await youtubeService.search(query);

        // Filter out the current song and limit to 10
        const queue = results
            .filter(r => r.id !== videoId)
            .slice(0, 10);

        // Prefetch stream URLs for first 3 queue songs
        const topIds = queue.slice(0, 3).map(r => r.id).filter(Boolean);
        youtubeService.prefetchStreamUrls(topIds);

        res.status(200).json(queue);
    } catch (error) {
        console.error('Queue Error:', error);
        res.status(500).json({ error: 'Failed to build queue' });
    }
});

module.exports = router;
