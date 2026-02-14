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

// Proxy audio stream to avoid YouTube IP-based 403 restrictions
router.get('/proxy', async (req, res) => {
    const { videoId } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    try {
        const streamData = await youtubeService.getStreamUrl(videoId);
        const audioUrl = streamData.url;

        if (!audioUrl) {
            return res.status(500).json({ error: 'No audio URL found' });
        }

        // Fetch the audio from YouTube and pipe it to the client
        const fetch = (await import('node-fetch')).default;
        const audioResponse = await fetch(audioUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Range': req.headers.range || 'bytes=0-',
            },
        });

        // Forward relevant headers
        res.setHeader('Content-Type', audioResponse.headers.get('content-type') || 'audio/webm');
        if (audioResponse.headers.get('content-length')) {
            res.setHeader('Content-Length', audioResponse.headers.get('content-length'));
        }
        if (audioResponse.headers.get('content-range')) {
            res.setHeader('Content-Range', audioResponse.headers.get('content-range'));
        }
        res.setHeader('Accept-Ranges', 'bytes');
        res.status(audioResponse.status);

        // Pipe the audio stream to the client
        audioResponse.body.pipe(res);
    } catch (error) {
        console.error('Stream Proxy Error:', error);
        res.status(500).json({ error: 'Failed to proxy stream' });
    }
});

module.exports = router;

