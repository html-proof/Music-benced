const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const { db } = require('../config/firebase');

router.get('/', async (req, res) => {
    const { uid } = req.query;

    try {
        let query = 'new music';

        if (uid) {
            // 1. Try to get user's last played song from 'played_song'
            const playedSnapshot = await db.ref(`users/${uid}/played_song`).limitToLast(1).once('value');
            const playedHistory = playedSnapshot.val();

            if (playedHistory) {
                const lastSong = Object.values(playedHistory)[0];
                if (lastSong && lastSong.title) {
                    query = `songs like ${lastSong.title}`;
                }
            } else {
                // 2. Fallback to 'moods' if no history
                const moodSnapshot = await db.ref(`users/${uid}/moods`).once('value');
                const moods = moodSnapshot.val();
                if (moods) {
                    const moodList = Array.isArray(moods) ? moods : [moods];
                    if (moodList.length > 0) {
                        // Pick a random mood
                        const randomMood = moodList[Math.floor(Math.random() * moodList.length)];
                        query = `${randomMood} music`;
                    }
                }
            }
        }

        const results = await youtubeService.search(query);
        res.status(200).json(results);
    } catch (error) {
        console.error('Recommendation Error:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

module.exports = router;
