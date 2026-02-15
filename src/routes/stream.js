const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');

const ALLOWED_QUALITIES = new Set(['extreme', 'low', 'medium', 'high']);

const normalizeQuality = (quality) => {
    const q = String(quality || 'high').toLowerCase();
    if (ALLOWED_QUALITIES.has(q)) {
        return q;
    }
    return 'high';
};

router.get('/', async (req, res) => {
    const { videoId, quality, useProxy } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    // Quality: 'extreme' (<=64k), 'low' (<=96k), 'medium' (<=128k), 'high' (best available)
    const qualitySetting = normalizeQuality(quality);

    try {
        console.log(`[Stream] Getting stream for ${videoId} with quality ${qualitySetting}`);
        const streamData = await youtubeService.getStreamUrl(videoId, qualitySetting);

        if (streamData && streamData.url) {
            console.log(`[Stream] Success for ${videoId}: ${streamData.url.substring(0, 50)}...`);
            
            // Always use proxy URL because direct YouTube URLs are IP-specific and expire
            // The mobile phone has a different IP than Railway server, so direct URLs won't work
            const protocol = req.protocol;
            const host = req.get('host');
            const proxyUrl = `${protocol}://${host}/stream/proxy?videoId=${videoId}&quality=${qualitySetting}`;
            
            console.log(`[Stream] Returning proxy URL for ${videoId}`);
            return res.status(200).json({ 
                ...streamData, 
                url: proxyUrl,
                quality: qualitySetting 
            });
        } else {
            console.error(`[Stream] No stream URL found for ${videoId}`);
            res.status(500).json({ error: 'Stream URL not available. Video may be restricted or blocked.' });
        }
    } catch (error) {
        console.error(`[Stream] Error for ${videoId}:`, error.message);
        res.status(500).json({ error: 'Failed to fetch stream URL: ' + error.message });
    }
});

// Proxy endpoint for cases where direct URLs fail
router.get('/proxy', async (req, res) => {
    const { videoId, quality } = req.query;

    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }

    try {
        console.log(`[Proxy] Proxying stream for ${videoId}`);
        const streamData = await youtubeService.getStreamUrl(videoId, normalizeQuality(quality || 'low'));
        
        if (!streamData || !streamData.url) {
            return res.status(500).json({ error: 'No audio URL found' });
        }

        const audioUrl = streamData.url;
        console.log(`[Proxy] Fetching from: ${audioUrl.substring(0, 50)}...`);

        // Set timeout for slow connections
        req.setTimeout(60000);

        const fetch = (await import('node-fetch')).default;
        const audioResponse = await fetch(audioUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'audio/webm,audio/ogg,audio/mp4,audio/*;q=0.9,*/*;q=0.8',
                'Range': req.headers.range || 'bytes=0-',
            },
        });

        if (!audioResponse.ok) {
            console.error(`[Proxy] Upstream error: ${audioResponse.status}`);
            return res.status(502).json({ error: 'Upstream stream error' });
        }

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

        console.log(`[Proxy] Piping audio stream for ${videoId}`);
        
        // Pipe the audio stream
        audioResponse.body.pipe(res);
        
        audioResponse.body.on('error', (err) => {
            console.error(`[Proxy] Stream error for ${videoId}:`, err.message);
            if (!res.headersSent) {
                res.status(500).end();
            }
        });
        
    } catch (error) {
        console.error(`[Proxy] Error for ${videoId}:`, error.message);
        res.status(500).json({ error: 'Failed to proxy stream: ' + error.message });
    }
});

// Test endpoint to verify a stream URL works
router.get('/test', async (req, res) => {
    const { videoId } = req.query;
    
    if (!videoId) {
        return res.status(400).json({ error: 'Missing videoId' });
    }
    
    try {
        const streamData = await youtubeService.getStreamUrl(videoId, 'low');
        
        if (!streamData || !streamData.url) {
            return res.status(500).json({ 
                success: false, 
                error: 'No stream URL found',
                videoId 
            });
        }
        
        // Try to fetch the first few bytes to verify URL works
        const fetch = (await import('node-fetch')).default;
        const testRes = await fetch(streamData.url, {
            method: 'HEAD',
            timeout: 5000
        });
        
        res.json({
            success: testRes.ok,
            status: testRes.status,
            url: streamData.url.substring(0, 100) + '...',
            title: streamData.title,
            videoId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            videoId
        });
    }
});

module.exports = router;

