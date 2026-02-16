require('dotenv').config();
const { db } = require('../src/config/firebase');

async function checkSongs() {
    try {
        const snapshot = await db.child('songs').limitToFirst(5).once('value');
        const songs = snapshot.val();
        console.log('Sample songs from Firebase:');
        console.log(JSON.stringify(songs, null, 2));
    } catch (error) {
        console.error('Error fetching songs:', error);
    } finally {
        process.exit();
    }
}

checkSongs();
