const express = require('express');
const router = express.Router();
const youtubeService = require('../services/youtube');
const { db } = require('../config/firebase');

router.get('/', async (req, res) => {
    const { uid } = req.query;

    try {
        let query = 'popular music';
        let userContext = {};

        if (uid) {
            // 1. Read language, moods, and last played song in parallel
            const [langSnap, moodSnap, playedSnap] = await Promise.all([
                db.child(`users/${uid}/language`).once('value'),
                db.child(`users/${uid}/moods`).once('value'),
                db.child(`users/${uid}/played_song`).limitToLast(1).once('value'),
            ]);

            const langVal = langSnap.val();
            const moodVal = moodSnap.val();
            const languages = langVal ? (Array.isArray(langVal) ? langVal : [langVal]) : [];
            const moods = moodVal ? (Array.isArray(moodVal) ? moodVal : [moodVal]) : [];

            const lang = languages.length > 0 ? languages[0] : '';
            const mood = moods.length > 0 ? moods[0] : '';
            const playedHistory = playedSnap.val();

            userContext = { language: lang, mood: mood };

            if (playedHistory) {
                // 2. Base recommendations on last played song + language
                const lastSong = Object.values(playedHistory)[0];
                if (lastSong && lastSong.title) {
                    query = lang
                        ? `${lang} songs like ${lastSong.title}`
                        : `songs like ${lastSong.title}`;
                }
            } else if (lang && mood) {
                // 3. Fallback: combine language + mood
                query = `${mood} ${lang} songs`;
            } else if (lang) {
                query = `best ${lang} songs`;
            } else if (mood) {
                query = `${mood} songs`;
            }
        }

        const results = await youtubeService.search(query, userContext);
        res.status(200).json(results);
    } catch (error) {
        console.error('Recommendation Error:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

module.exports = router;
