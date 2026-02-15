/**
 * Script to populate Firebase with sample songs
 * Run with: node scripts/populate-songs.js
 */

const admin = require('firebase-admin');
require('dotenv').config();

// Initialize Firebase Admin
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
} else {
  console.error('FIREBASE_SERVICE_ACCOUNT not found in environment');
  process.exit(1);
}

const db = admin.database().ref();

// Sample songs data
const sampleSongs = [
  {
    id: 'song-tamil-1',
    title: 'Sarvam',
    movie: 'Maya',
    artist: 'Anirudh Ravichander',
    album: 'Maya',
    language: 'Tamil',
    moods: ['energetic', 'happy'],
    tags: ['dance', 'party', 'upbeat'],
    playCount: 5000,
    createdAt: Date.now(),
    thumbnail: 'https://i.ytimg.com/vi/placeholder/default.jpg',
    duration: '3:45'
  },
  {
    id: 'song-tamil-2',
    title: 'Maya Maya',
    movie: 'Guru',
    artist: 'A.R. Rahman',
    album: 'Guru',
    language: 'Tamil',
    moods: ['romantic', 'calm'],
    tags: ['melody', 'love'],
    playCount: 8000,
    createdAt: Date.now(),
    thumbnail: 'https://i.ytimg.com/vi/placeholder/default.jpg',
    duration: '4:20'
  },
  {
    id: 'song-hindi-1',
    title: 'Tum Hi Ho',
    movie: 'Aashiqui 2',
    artist: 'Arijit Singh',
    album: 'Aashiqui 2',
    language: 'Hindi',
    moods: ['romantic', 'sad'],
    tags: ['love', 'ballad', 'emotional'],
    playCount: 10000,
    createdAt: Date.now(),
    thumbnail: 'https://i.ytimg.com/vi/placeholder/default.jpg',
    duration: '4:22'
  },
  {
    id: 'song-english-1',
    title: 'Shape of You',
    movie: 'None',
    artist: 'Ed Sheeran',
    album: 'Divide',
    language: 'English',
    moods: ['happy', 'energetic'],
    tags: ['pop', 'dance'],
    playCount: 15000,
    createdAt: Date.now(),
    thumbnail: 'https://i.ytimg.com/vi/placeholder/default.jpg',
    duration: '3:53'
  }
];

async function populateSongs() {
  try {
    console.log('Starting to populate songs...');

    // Add songs to /songs path
    for (const song of sampleSongs) {
      const { id, ...songData } = song;
      await db.child('songs').child(id).set(songData);
      console.log(`✓ Added song: ${song.title}`);

      // Add to language index
      await db.child('songsByLanguage').child(song.language).child(id).set(true);
      console.log(`✓ Indexed ${song.title} under ${song.language}`);
    }

    console.log('\n✅ Successfully populated database with sample songs!');
    console.log(`Total songs added: ${sampleSongs.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error populating songs:', error);
    process.exit(1);
  }
}

populateSongs();
