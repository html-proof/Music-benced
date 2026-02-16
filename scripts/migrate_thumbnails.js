require('dotenv').config();
const { db } = require('../src/config/firebase');

async function migrateThumbnails() {
    console.log('--- Starting Thumbnail Migration ---');

    try {
        const snapshot = await db.child('songs').once('value');
        const songs = snapshot.val();

        if (!songs) {
            console.log('No songs found in database.');
            return;
        }

        const songIds = Object.keys(songs);
        console.log(`Found ${songIds.length} songs. Checking for missing thumbnails...`);

        let updateCount = 0;
        let skippedCount = 0;

        for (const id of songIds) {
            const song = songs[id];

            // Check if thumbnail is missing, empty, or just a placeholder
            if (!song.thumbnail || song.thumbnail.trim() === '') {
                // Construct a default YouTube thumbnail URL from the ID
                // Note: We assume the ID is a valid YouTube ID or contains one
                // Songs in our DB typically have IDs like 'dQw4w9WgXcQ'
                const fallbackUrl = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

                await db.child('songs').child(id).update({
                    thumbnail: fallbackUrl
                });

                console.log(`Updated [${id}]: ${song.title} -> Added Thumbnail`);
                updateCount++;
            } else {
                skippedCount++;
            }
        }

        console.log('--- Migration Completed ---');
        console.log(`Updated: ${updateCount}`);
        console.log(`Skipped: ${skippedCount}`);

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        // Exit process
        process.exit();
    }
}

migrateThumbnails();
