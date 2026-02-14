const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');

router.get('/', async (req, res) => {
    const { videoId } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    try {
        const streamData = await youtubeService.getStreamUrl(videoId);
        res.status(200).json(streamData);
    } catch (error) {
        console.error('Stream Error:', error);
        res.status(500).json({ error: 'Failed to get stream URL' });
    }
});

module.exports = router;
