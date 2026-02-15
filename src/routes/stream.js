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

    // Construct Proxy URL with quality
    const protocol = req.protocol;
    const host = req.get('host');
    const proxyUrl = `${protocol}://${host}/stream/proxy?videoId=${videoId}&quality=${qualitySetting}`;

    try {
        const streamData = await youtubeService.getStreamUrl(videoId, qualitySetting);

        if (streamData) {
            res.status(200).json({ ...streamData, url: proxyUrl, quality: qualitySetting });
        } else {
            console.error('Stream not found for', videoId);
            res.status(500).json({ error: 'Stream not found' });
        }
    } catch (error) {
        console.error('Stream Error:', error);
        res.status(500).json({ error: 'Failed to fetch stream URL' });
    }
});

// Proxy audio stream to avoid YouTube IP-based 403 restrictions
router.get('/proxy', async (req, res) => {
    const { videoId, quality } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    // Quality settings for Piped API
    const qualityMap = {
        'low': { bitrate: 64000 },
        'medium': { bitrate: 128000 },
        'high': { bitrate: 256000 }
    };
    const preferredBitrate = qualityMap[quality]?.bitrate || 256000;

    try {
        const streamData = await youtubeService.getStreamUrl(videoId, quality);
        
        if (!streamData || !streamData.url) {
            return res.status(500).json({ error: 'No audio URL found' });
        }

        const audioUrl = streamData.url;

        // Set timeout for slow connections (cellular)
        req.setTimeout(30000); // 30 seconds

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

