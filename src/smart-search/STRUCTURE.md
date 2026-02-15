# Smart Search System - Project Structure

## Directory Structure

```
src/smart-search/
├── __tests__/              # Test files
│   └── setup.test.js       # Setup verification tests
├── SearchEngine.js         # Multi-field search with personalized ranking
├── RecommendationEngine.js # Personalized song recommendations
├── FeedGenerator.js        # Curated home feed sections
├── UserProfileManager.js   # User preferences and history management
├── config.js               # System configuration constants
├── index.js                # Main entry point (exports all components)
├── README.md               # System documentation
└── STRUCTURE.md            # This file
```

## Component Overview

### SearchEngine.js
**Purpose**: Execute multi-field searches with personalized ranking

**Key Methods**:
- `search(query, userPreferences)` - Main search function
- `scoreSong(song, query, userPreferences)` - Score individual songs
- `scoreField(fieldValue, query, exactPoints, startsWithPoints, containsPoints)` - Score specific fields
- `saveSearchHistory(query)` - Track search queries

**Requirements Addressed**: 1.1-1.10, 2.1-2.6, 5.1-5.2, 6.1-6.2

### RecommendationEngine.js
**Purpose**: Generate personalized song recommendations

**Key Methods**:
- `generateRecommendations(userPreferences)` - Main recommendation function
- `scoreSongForRecommendation(song, userPreferences, favoriteArtists, recentlyPlayed)` - Score songs for recommendations
- `identifyFavoriteArtists(listeningHistory)` - Find top 3 favorite artists
- `calculateTrendingBoost(playCount, maxPlayCount)` - Calculate trending boost

**Requirements Addressed**: 3.1-3.8, 5.3

### FeedGenerator.js
**Purpose**: Create curated home feed with multiple sections

**Key Methods**:
- `generateHomeFeed(userPreferences)` - Generate complete feed
- `getContinuePlaying(recentlyPlayed)` - Continue Playing section
- `getBasedOnMood(mood, language)` - Based on Mood section
- `getTrendingInLanguage(language)` - Trending in Language section
- `getRecommendedForYou(userPreferences)` - Recommended For You section
- `getRecentlyPlayed()` - Recently Played section
- `getNewReleases(language)` - New Releases section

**Requirements Addressed**: 4.1-4.8, 5.4

### UserProfileManager.js
**Purpose**: Manage user preferences, history, and favorites

**Key Methods**:
- `loadUserProfile()` - Load complete user profile
- `updateLanguagePreference(language)` - Update language preference
- `updateMoodPreference(mood)` - Update mood preference
- `addToRecentlyPlayed(songId)` - Track recently played songs
- `incrementPlayCount(songId)` - Increment song play count
- `addToFavorites(songId)` - Add song to favorites
- `removeFromFavorites(songId)` - Remove song from favorites
- `getSearchHistory()` - Retrieve search history

**Requirements Addressed**: 5.6, 6.3-6.4, 7.1-7.5, 8.1-8.5, 9.1-9.4

### config.js
**Purpose**: Centralized configuration for the entire system

**Configuration Sections**:
- `search` - Search engine settings (max results, scoring points, boosts)
- `recommendations` - Recommendation engine settings (max results, scoring points)
- `feed` - Feed generator settings (section sizes)
- `userProfile` - User profile settings (max recently played, supported moods)
- `firebasePaths` - Firebase database paths

## Testing Structure

### Test Files Location
All test files are located in `__tests__/` directory with `.test.js` extension.

### Test Types
1. **Unit Tests**: Test individual functions and methods
2. **Property-Based Tests**: Test universal properties across randomized inputs (using fast-check)
3. **Integration Tests**: Test complete flows across multiple components

### Running Tests
```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Implementation Status

### Task 1: Set up project structure and Firebase integration ✅
- [x] Directory structure created
- [x] Base classes created (SearchEngine, RecommendationEngine, FeedGenerator, UserProfileManager)
- [x] Configuration file created
- [x] Dependencies installed (Jest, fast-check)
- [x] Test setup verified

### Next Tasks
- Task 2: Implement core data models and utilities
- Task 3: Implement Search Engine scoring algorithm
- Task 4: Implement Search Engine main search function
- And more...

## Dependencies

### Production Dependencies
- `firebase-admin` - Firebase Realtime Database integration (already installed)

### Development Dependencies
- `jest` - Testing framework
- `fast-check` - Property-based testing library
- `@types/jest` - TypeScript definitions for Jest

## Firebase Integration

The system uses the existing Firebase configuration from `src/config/firebase.js`:
- Database reference: `db` from `firebase.js`
- Authentication: `auth` from `firebase.js`

## Next Steps

1. Implement core data models (Song, UserProfile)
2. Implement utility functions for string matching
3. Implement Search Engine scoring algorithm
4. Write property-based tests for scoring
5. Continue with remaining tasks as per the implementation plan

## References

- Requirements: `.kiro/specs/smart-search-system/requirements.md`
- Design: `.kiro/specs/smart-search-system/design.md`
- Tasks: `.kiro/specs/smart-search-system/tasks.md`
