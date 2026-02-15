# Smart Search and Recommendation System

A Spotify-level search and recommendation system for the Music Hub app, built on Firebase Realtime Database with client-side processing for optimal performance.

## Overview

The system provides:
- **Smart Search**: Multi-field search with personalized ranking
- **Personalized Recommendations**: Based on listening history and preferences
- **Curated Home Feed**: Multiple sections with different content types

## Architecture

### Components

1. **SearchEngine** (`SearchEngine.js`)
   - Multi-field search across title, movie, artist, album, and tags
   - Personalized ranking based on user preferences
   - Trending boost calculation
   - Search history tracking

2. **RecommendationEngine** (`RecommendationEngine.js`)
   - Personalized song recommendations
   - Favorite artist identification
   - Recently played penalty
   - Preference-based scoring

3. **FeedGenerator** (`FeedGenerator.js`)
   - Continue Playing section
   - Based on Mood section
   - Trending in Language section
   - Recommended For You section
   - Recently Played section
   - New Releases section

4. **UserProfileManager** (`UserProfileManager.js`)
   - User preference management (language, mood)
   - Listening history tracking
   - Favorites management
   - Search history retrieval

### Configuration

All configuration constants are defined in `config.js`:
- Scoring points for each field
- Personalization boost values
- Result limits and thresholds
- Firebase paths

## Usage

```javascript
const { db } = require('../config/firebase');
const { SearchEngine, RecommendationEngine, FeedGenerator, UserProfileManager } = require('./smart-search');

// Initialize components
const userId = 'user123';
const searchEngine = new SearchEngine(db, userId);
const recommendationEngine = new RecommendationEngine(db, userId);
const feedGenerator = new FeedGenerator(db, userId, recommendationEngine);
const profileManager = new UserProfileManager(db, userId);

// Search for songs
const searchResults = await searchEngine.search('love song', { language: 'english', mood: 'romantic' });

// Get recommendations
const recommendations = await recommendationEngine.generateRecommendations({ language: 'english', mood: 'happy' });

// Generate home feed
const homeFeed = await feedGenerator.generateHomeFeed({ language: 'english', mood: 'energetic' });

// Update user preferences
await profileManager.updateLanguagePreference('hindi');
await profileManager.updateMoodPreference('calm');
```

## Testing

The system uses Jest for unit testing and fast-check for property-based testing.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Firebase Database Structure

```
firebase-root/
├── songs/
│   ├── {songId}/
│   │   ├── title: string
│   │   ├── movie: string
│   │   ├── artist: string
│   │   ├── album: string
│   │   ├── language: string
│   │   ├── moods: string[]
│   │   ├── tags: string[]
│   │   ├── playCount: number
│   │   └── createdAt: timestamp
│
├── songsByLanguage/
│   └── {language}/
│       └── {songId}: true
│
└── users/
    └── {userId}/
        ├── preferences/
        │   ├── language: string
        │   └── mood: string
        ├── recentlyPlayed/
        │   └── {timestamp}/
        │       ├── songId: string
        │       └── playedAt: timestamp
        ├── favorites/
        │   └── {songId}: true
        └── searchHistory/
            └── {timestamp}/
                ├── query: string
                └── searchedAt: timestamp
```

## Performance

The system is designed to handle 50,000+ songs efficiently:
- Search completes within 2 seconds
- Recommendations complete within 1 second
- Feed generation completes within 3 seconds
- Uses Firebase indexes for optimal query performance
- Client-side scoring and ranking

## Requirements

See `.kiro/specs/smart-search-system/requirements.md` for detailed requirements.

## Design

See `.kiro/specs/smart-search-system/design.md` for detailed design documentation.
