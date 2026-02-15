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
        console.log(`[Stream] Getting stream for ${videoId} with quality ${qualitySetting}`);
        const streamData = await youtubeService.getStreamUrl(videoId, qualitySetting);

        if (streamData && streamData.url) {
            console.log(`[Stream] Success for ${videoId}: ${streamData.url.substring(0, 50)}...`);
            // Return DIRECT stream URL (not proxy) - much faster for streaming
            res.status(200).json({ 
                ...streamData, 
                url: streamData.url,
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

