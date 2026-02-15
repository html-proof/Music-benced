# Smart Search and Recommendation System

A Spotify-level search and recommendation system for the Music Hub app, built on Firebase Realtime Database with client-side processing for optimal performance.

## Features

- **Smart Search**: Multi-field search with personalized ranking based on user preferences
- **Personalized Recommendations**: AI-powered recommendations based on listening history and preferences
- **Curated Home Feed**: Multiple sections with different content types
- **Language & Mood Based**: Filters and recommendations based on user's language and mood preferences

## Quick Start

### Basic Usage

```javascript
const { db } = require('./config/firebase');
const { SmartSearchSystem } = require('./smart-search');

// Initialize for a user
const userId = 'user-123';
const smartSearch = new SmartSearchSystem(db, userId);

// Set user preferences (supports multiple languages and moods)
const userPreferences = {
  languages: ['Hindi', 'Tamil'],  // User's preferred languages (array)
  moods: ['romantic', 'energetic'] // User's current moods (array)
};

// Backward compatible: single values still work
const singlePreferences = {
  language: 'Hindi',  // Single language
  mood: 'romantic'    // Single mood
};

// Get personalized home feed
const homeFeed = await smartSearch.getHomeFeed(userPreferences);
```

### Home Feed Structure

The home feed contains multiple sections based on language and mood:

```javascript
{
  continuePlaying: [...],      // Last 5 songs (if user has played songs)
  basedOnMood: [...],          // Songs matching user's mood and language
  trendingInLanguage: [...],   // Popular songs in user's language
  recommendedForYou: [...],    // Personalized recommendations
  recentlyPlayed: [...],       // User's listening history
  newReleases: [...]           // Recently added songs in user's language
}
```

### Search Songs

```javascript
// Search with personalization
const results = await smartSearch.search('love song', userPreferences);

// Results are ranked by:
// - Field matching (title, artist, movie, album, tags)
// - Language preference (+30 points)
// - Mood preference (+25 points)
// - Previously played (+20 points)
// - Trending boost (0-20 points)
```

### Get Recommendations

```javascript
// Get personalized recommendations based on:
// - Language preference (+50 points)
// - Mood preference (+40 points)
// - Favorite artists (+30 points)
// - Trending boost (0-20 points)
// - Recently played penalty (-25 points)

const recommendations = await smartSearch.getRecommendations(userPreferences);
```

### Track User Activity

```javascript
// Track when user plays a song
await smartSearch.trackSongPlay('song-123');

// Update user preferences
await smartSearch.updateLanguagePreference('Tamil');
await smartSearch.updateMoodPreference('energetic');

// Manage favorites
await smartSearch.addToFavorites('song-456');
await smartSearch.removeFromFavorites('song-789');
```

## API Reference

### SmartSearchSystem

Main class that provides unified access to all features.

#### Constructor
```javascript
new SmartSearchSystem(firebaseRef, userId)
```

#### Methods

**`getHomeFeed(userPreferences)`**
- Returns complete home feed with all sections
- Filters by language and mood preferences
- Sections load in parallel for performance

**`search(query, userPreferences, recentlyPlayedSongIds)`**
- Multi-field search with personalized ranking
- Returns top 30 results
- Filters out low-scoring results (≤20 points)

**`getRecommendations(userPreferences)`**
- Personalized song recommendations
- Returns top 40 results
- Based on listening history and preferences

**`trackSongPlay(songId)`**
- Tracks song play in user history
- Increments song play count
- Updates recently played list (max 50 songs)

**`updateLanguagePreference(language)`**
- Updates user's language preference
- Affects search ranking and recommendations

**`updateMoodPreference(mood)`**
- Updates user's mood preference
- Affects search ranking and recommendations

**`addToFavorites(songId)` / `removeFromFavorites(songId)`**
- Manage user's favorite songs

**`getSearchHistory()`**
- Returns user's search history ordered by timestamp

## How It Works

### Language-Based Filtering

The system uses Firebase's `songsByLanguage` index for efficient filtering:

```javascript
// When user has multiple language preferences
const userPreferences = { languages: ['Hindi', 'Tamil'] };

// System loads songs from ALL selected languages from Firebase
// Then applies scoring and ranking
const feed = await smartSearch.getHomeFeed(userPreferences);

// Single language still works (backward compatible)
const singleLanguage = { language: 'Hindi' };
const feed2 = await smartSearch.getHomeFeed(singleLanguage);
```

### Mood-Based Recommendations

Songs are tagged with moods (happy, sad, romantic, energetic, calm):

```javascript
// Multiple moods - shows songs matching ANY of the selected moods
const userPreferences = {
  languages: ['Hindi', 'Tamil'],
  moods: ['romantic', 'energetic']  // Shows romantic OR energetic songs
};

// Based on Mood section shows songs matching any selected mood
// in any selected language, sorted by popularity (play count)
const feed = await smartSearch.getHomeFeed(userPreferences);

// Single mood still works (backward compatible)
const singleMood = {
  language: 'Hindi',
  mood: 'romantic'
};
```

### Scoring Algorithm

**Search Scoring:**
- Title exact match: 100 points
- Title starts with: 80 points
- Title contains: 60 points
- Movie exact: 70 points, contains: 50 points
- Artist exact: 65 points, contains: 45 points
- Album match: 30 points
- Tag match: 25 points
- Language boost: +30 points
- Mood boost: +25 points
- Previously played: +20 points
- Trending boost: 0-20 points

**Recommendation Scoring:**
- Language match: +50 points
- Mood match: +40 points
- Favorite artist: +30 points
- Trending boost: 0-20 points
- Recently played: -25 points (penalty)

## Performance

- Handles 50,000+ songs efficiently
- Search completes within 2 seconds
- Recommendations complete within 1 second
- Feed generation completes within 3 seconds
- Uses Firebase indexes for optimal query performance
- Client-side scoring and ranking

## Firebase Database Structure

```
firebase-root/
├── songs/
│   └── {songId}/
│       ├── title, movie, artist, album
│       ├── language, moods[], tags[]
│       ├── playCount, createdAt
│
├── songsByLanguage/
│   └── {language}/
│       └── {songId}: true
│
└── users/
    └── {userId}/
        ├── preferences/
        │   ├── language
        │   └── mood
        ├── recentlyPlayed/
        ├── favorites/
        └── searchHistory/
```

## Example Integration

```javascript
// In your Express.js API
const express = require('express');
const { db } = require('./config/firebase');
const { SmartSearchSystem } = require('./smart-search');

const router = express.Router();

// Get home feed (supports multiple languages and moods)
router.get('/feed', async (req, res) => {
  const userId = req.user.id;
  const { languages, language, moods, mood } = req.query;
  
  const smartSearch = new SmartSearchSystem(db, userId);
  
  // Build preferences object
  const userPreferences = {};
  if (languages) {
    userPreferences.languages = languages.split(',').map(l => l.trim());
  } else if (language) {
    userPreferences.languages = [language];
  }
  if (moods) {
    userPreferences.moods = moods.split(',').map(m => m.trim());
  } else if (mood) {
    userPreferences.moods = [mood];
  }
  
  const feed = await smartSearch.getHomeFeed(userPreferences);
  res.json(feed);
});

// Search songs (supports multiple languages and moods)
router.get('/search', async (req, res) => {
  const userId = req.user.id;
  const { q, languages, language, moods, mood } = req.query;
  
  const smartSearch = new SmartSearchSystem(db, userId);
  
  // Build preferences object
  const userPreferences = {};
  if (languages) {
    userPreferences.languages = languages.split(',').map(l => l.trim());
  } else if (language) {
    userPreferences.languages = [language];
  }
  if (moods) {
    userPreferences.moods = moods.split(',').map(m => m.trim());
  } else if (mood) {
    userPreferences.moods = [mood];
  }
  
  const results = await smartSearch.search(q, userPreferences);
  res.json(results);
});

// Get recommendations (supports multiple languages and moods)
router.get('/recommendations', async (req, res) => {
  const userId = req.user.id;
  const { languages, language, moods, mood } = req.query;
  
  const smartSearch = new SmartSearchSystem(db, userId);
  
  // Build preferences object
  const userPreferences = {};
  if (languages) {
    userPreferences.languages = languages.split(',').map(l => l.trim());
  } else if (language) {
    userPreferences.languages = [language];
  }
  if (moods) {
    userPreferences.moods = moods.split(',').map(m => m.trim());
  } else if (mood) {
    userPreferences.moods = [mood];
  }
  
  const recommendations = await smartSearch.getRecommendations(userPreferences);
  res.json(recommendations);
});

module.exports = router;
```

## Testing

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- SearchEngine
npm test -- RecommendationEngine
npm test -- FeedGenerator

# Run with coverage
npm run test:coverage
```

## Configuration

All configuration is in `src/smart-search/config.js`:

```javascript
{
  search: {
    maxResults: 30,
    minScore: 20,
    scoring: { /* point values */ }
  },
  recommendations: {
    maxResults: 40,
    minScore: 30,
    topArtistsCount: 3,
    scoring: { /* point values */ }
  },
  feed: {
    continuePlaying: { maxSongs: 5 },
    basedOnMood: { maxSongs: 20 },
    trendingInLanguage: { maxSongs: 20 },
    recommendedForYou: { maxSongs: 20 },
    recentlyPlayed: { maxSongs: 20 },
    newReleases: { maxSongs: 20 }
  }
}
```

## Requirements

See `.kiro/specs/smart-search-system/requirements.md` for detailed requirements.

## Design

See `.kiro/specs/smart-search-system/design.md` for detailed design documentation.

