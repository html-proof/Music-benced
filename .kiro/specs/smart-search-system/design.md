# Design Document: Smart Search and Recommendation System

## Overview

The Smart Search and Recommendation System provides Spotify-level search capabilities with intelligent ranking, personalized recommendations, and curated home feed sections for the Music Hub app. The system is built on Firebase Realtime Database with client-side processing in JavaScript for optimal performance and scalability.

The architecture follows a three-engine approach:
- **Search Engine**: Multi-field search with personalized ranking
- **Recommendation Engine**: Personalized song suggestions based on user behavior
- **Feed Generator**: Curated home feed with multiple sections

All scoring and ranking operations are performed client-side after fetching indexed data from Firebase, enabling the system to handle 50,000+ songs efficiently.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Application                       │
│  (Flutter/React Native/Web with JavaScript)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ├─────────────────────────────────┐
                            │                                 │
                            ▼                                 ▼
┌──────────────────────────────────┐    ┌──────────────────────────────────┐
│       Search Engine              │    │    Recommendation Engine         │
│  - Multi-field matching          │    │  - User preference analysis      │
│  - Personalized scoring          │    │  - Favorite artist detection     │
│  - Result ranking                │    │  - Trending boost                │
└──────────────────────────────────┘    └──────────────────────────────────┘
                            │                                 │
                            └─────────────┬───────────────────┘
                                          │
                                          ▼
                            ┌──────────────────────────────┐
                            │      Feed Generator          │
                            │  - Continue Playing          │
                            │  - Based on Mood             │
                            │  - Trending in Language      │
                            │  - Recommended For You       │
                            │  - Recently Played           │
                            │  - New Releases              │
                            └──────────────────────────────┘
                                          │
                                          ▼
                            ┌──────────────────────────────┐
                            │   Firebase Realtime Database │
                            │  - songs/                    │
                            │  - songsByLanguage/          │
                            │  - users/                    │
                            └──────────────────────────────┘
```

### Data Flow

1. **Search Flow**: User query → Search Engine → Firebase (indexed query) → Client-side scoring → Ranked results
2. **Recommendation Flow**: User profile → Recommendation Engine → Firebase (indexed query) → Client-side scoring → Ranked recommendations
3. **Feed Flow**: User profile → Feed Generator → Multiple parallel queries → Section assembly → Home feed

### Performance Strategy

- **Indexed Queries**: Use `songsByLanguage` index to reduce data transfer
- **Client-Side Processing**: All scoring and ranking happens on the device
- **Progressive Loading**: Feed sections load independently
- **Caching**: User profile and recently played data cached locally
- **Lazy Loading**: Load song metadata only when needed

## Components and Interfaces

### 1. Search Engine

**Purpose**: Execute multi-field searches with personalized ranking

**Core Functions**:

```javascript
class SearchEngine {
  constructor(firebaseRef, userId) {
    this.db = firebaseRef;
    this.userId = userId;
    this.userProfile = null;
  }

  // Main search function
  async search(query, userPreferences) {
    // 1. Load user profile if not cached
    // 2. Determine if language filter should be applied
    // 3. Query Firebase (all songs or filtered by language)
    // 4. Score each song using multi-field matching
    // 5. Apply personalization boosts
    // 6. Filter low scores (≤20)
    // 7. Sort by score descending
    // 8. Return top 30 results
    // 9. Save query to search history
  }

  // Score a single song against the query
  scoreSong(song, query, userPreferences) {
    // Calculate base score from field matching
    // Add personalization boosts
    // Add trending boost
    // Return total score
  }

  // Calculate score for each field
  scoreField(fieldValue, query, exactPoints, startsWithPoints, containsPoints) {
    // Exact match: return exactPoints
    // Starts with: return startsWithPoints
    // Contains: return containsPoints
    // No match: return 0
  }

  // Save search query to user history
  async saveSearchHistory(query) {
    // Save to users/{userId}/searchHistory with timestamp
  }
}
```

**Scoring Algorithm**:

```
Base Score Calculation:
- Title exact match: 100 points
- Title starts with: 80 points
- Title contains: 60 points
- Movie exact match: 70 points
- Movie contains: 50 points
- Artist exact match: 65 points
- Artist contains: 45 points
- Album match: 30 points
- Tag match: 25 points

Personalization Boosts:
- Preferred language match: +30 points
- Preferred mood match: +25 points
- Previously played: +20 points
- Trending boost: +0 to +20 points (based on play count percentile)

Filtering:
- Remove songs with score ≤ 20
- Return top 30 songs
```

### 2. Recommendation Engine

**Purpose**: Generate personalized song recommendations

**Core Functions**:

```javascript
class RecommendationEngine {
  constructor(firebaseRef, userId) {
    this.db = firebaseRef;
    this.userId = userId;
    this.userProfile = null;
  }

  // Main recommendation function
  async generateRecommendations(userPreferences) {
    // 1. Load user profile and listening history
    // 2. Identify top 3 favorite artists
    // 3. Query Firebase (filtered by preferred language)
    // 4. Score each song using preference matching
    // 5. Apply penalties for recently played
    // 6. Filter low scores (≤30)
    // 7. Sort by score descending
    // 8. Return top 40 results
  }

  // Score a song for recommendations
  scoreSongForRecommendation(song, userPreferences, favoriteArtists, recentlyPlayed) {
    // Language match: +50 points
    // Mood match: +40 points
    // Favorite artist: +30 points
    // Trending boost: +0 to +20 points
    // Recently played: -25 points
    // Return total score
  }

  // Identify user's top 3 favorite artists
  identifyFavoriteArtists(listeningHistory) {
    // Count artist occurrences in history
    // Return top 3 most frequent artists
  }

  // Calculate trending boost based on play count
  calculateTrendingBoost(playCount, maxPlayCount) {
    // Return 0-20 points based on percentile
  }
}
```

**Scoring Algorithm**:

```
Preference Matching:
- Language match: +50 points
- Mood match: +40 points
- Favorite artist (top 3): +30 points
- Trending boost: +0 to +20 points (based on play count percentile)

Penalties:
- Recently played: -25 points

Filtering:
- Remove songs with score ≤ 30
- Return top 40 songs
```

### 3. Feed Generator

**Purpose**: Create curated home feed sections

**Core Functions**:

```javascript
class FeedGenerator {
  constructor(firebaseRef, userId, recommendationEngine) {
    this.db = firebaseRef;
    this.userId = userId;
    this.recommendationEngine = recommendationEngine;
  }

  // Generate complete home feed
  async generateHomeFeed(userPreferences) {
    // Load sections in parallel:
    // 1. Continue Playing (if recently played exists)
    // 2. Based on Mood
    // 3. Trending in Language
    // 4. Recommended For You
    // 5. Recently Played
    // 6. New Releases
    // Return feed object with all sections
  }

  // Generate Continue Playing section
  async getContinuePlaying(recentlyPlayed) {
    // Return last 5 songs from recently played
  }

  // Generate Based on Mood section
  async getBasedOnMood(mood, language) {
    // Query songs matching mood and language
    // Return top 20 by play count
  }

  // Generate Trending in Language section
  async getTrendingInLanguage(language) {
    // Query songs by language
    // Sort by play count descending
    // Return top 20
  }

  // Generate Recommended For You section
  async getRecommendedForYou(userPreferences) {
    // Use RecommendationEngine
    // Return top 20 recommendations
  }

  // Generate Recently Played section
  async getRecentlyPlayed() {
    // Load user's recently played list
    // Return up to 20 songs
  }

  // Generate New Releases section
  async getNewReleases(language) {
    // Query songs by language
    // Sort by creation timestamp descending
    // Return top 20
  }
}
```

**Feed Structure**:

```javascript
{
  continuePlaying: [...],      // Optional, only if recently played exists
  basedOnMood: [...],          // Songs matching user's mood
  trendingInLanguage: [...],   // Popular songs in user's language
  recommendedForYou: [...],    // Personalized recommendations
  recentlyPlayed: [...],       // User's listening history
  newReleases: [...]           // Recently added songs
}
```

### 4. User Profile Manager

**Purpose**: Manage user preferences, history, and favorites

**Core Functions**:

```javascript
class UserProfileManager {
  constructor(firebaseRef, userId) {
    this.db = firebaseRef;
    this.userId = userId;
  }

  // Load complete user profile
  async loadUserProfile() {
    // Load from users/{userId}
    // Return { preferences, recentlyPlayed, favorites, searchHistory }
  }

  // Update language preference
  async updateLanguagePreference(language) {
    // Save to users/{userId}/preferences/language
  }

  // Update mood preference
  async updateMoodPreference(mood) {
    // Save to users/{userId}/preferences/mood
  }

  // Add song to recently played
  async addToRecentlyPlayed(songId) {
    // Add to users/{userId}/recentlyPlayed with timestamp
    // Maintain max 50 songs
    // Keep most recent first
  }

  // Increment song play count
  async incrementPlayCount(songId) {
    // Increment songs/{songId}/playCount
  }

  // Add song to favorites
  async addToFavorites(songId) {
    // Add to users/{userId}/favorites
  }

  // Remove song from favorites
  async removeFromFavorites(songId) {
    // Remove from users/{userId}/favorites
  }

  // Get search history
  async getSearchHistory() {
    // Load from users/{userId}/searchHistory
    // Return ordered by timestamp descending
  }
}
```

## Data Models

### Firebase Database Structure

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
│   │   ├── createdAt: timestamp
│   │   └── ... (other metadata)
│
├── songsByLanguage/
│   ├── {language}/
│   │   └── {songId}: true
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

### JavaScript Data Models

**Song Object**:
```javascript
{
  id: string,
  title: string,
  movie: string,
  artist: string,
  album: string,
  language: string,
  moods: string[],
  tags: string[],
  playCount: number,
  createdAt: number,
  // ... other metadata
}
```

**User Profile Object**:
```javascript
{
  userId: string,
  preferences: {
    language: string,
    mood: string
  },
  recentlyPlayed: [
    {
      songId: string,
      playedAt: number
    }
  ],
  favorites: string[],  // Array of song IDs
  searchHistory: [
    {
      query: string,
      searchedAt: number
    }
  ]
}
```

**Search Result Object**:
```javascript
{
  song: Song,
  score: number,
  matchedFields: string[]  // For debugging/display
}
```

**Feed Section Object**:
```javascript
{
  title: string,
  songs: Song[],
  sectionType: string  // 'continuePlaying', 'basedOnMood', etc.
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Search score monotonicity for exact matches

*For any* search query and song collection, if song A has an exact title match and song B has only a partial match, then song A's score should be greater than song B's score (assuming no other scoring factors).

**Validates: Requirements 1.2, 1.4**

### Property 2: Search result ordering consistency

*For any* search query and result set, the returned songs should be ordered by score in descending order, with no song having a higher score appearing after a song with a lower score.

**Validates: Requirements 2.6**

### Property 3: Personalization boost additivity

*For any* song and user preferences, if a song matches multiple preference criteria (language, mood, previously played), the total score should equal the base score plus all applicable boost values.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: Low score filtering

*For any* search result set, no song with a score of 20 or less should appear in the final results.

**Validates: Requirements 2.5**

### Property 5: Search result limit

*For any* search query, the number of returned results should not exceed 30 songs.

**Validates: Requirements 2.6**

### Property 6: Recommendation score calculation

*For any* song being scored for recommendations, the final score should equal the sum of language match points (50 if matched), mood match points (40 if matched), favorite artist points (30 if matched), trending boost (0-20), minus recently played penalty (25 if applicable).

**Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**

### Property 7: Recommendation result filtering

*For any* recommendation result set, no song with a score of 30 or less should appear in the final results.

**Validates: Requirements 3.7**

### Property 8: Recommendation result limit

*For any* recommendation generation, the number of returned recommendations should not exceed 40 songs.

**Validates: Requirements 3.8**

### Property 9: Favorite artist identification

*For any* listening history, the identified top 3 favorite artists should be the three artists with the highest occurrence count in the history.

**Validates: Requirements 3.1**

### Property 10: Recently played penalty application

*For any* song in the recently played list, when scored for recommendations, it should receive a -25 point penalty.

**Validates: Requirements 3.6**

### Property 11: Feed section presence

*For any* generated home feed, it should contain all required sections (Based on Mood, Trending in Language, Recommended For You, Recently Played, New Releases) and optionally Continue Playing if recently played data exists.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7**

### Property 12: Trending section ordering

*For any* Trending in Language section, songs should be ordered by play count in descending order.

**Validates: Requirements 4.8**

### Property 13: Language index usage

*For any* search or recommendation operation where the user has a preferred language set, the system should query the songsByLanguage index rather than loading all songs.

**Validates: Requirements 5.1, 5.3**

### Property 14: Search history persistence

*For any* search query submitted by a user, the query should be saved to the user's search history with a timestamp.

**Validates: Requirements 6.1, 6.2**

### Property 15: Search history ordering

*For any* user's search history, queries should be ordered by timestamp in descending order (most recent first).

**Validates: Requirements 6.3**

### Property 16: Preference persistence

*For any* user preference update (language or mood), the new value should be persisted to Firebase at the correct path and be retrievable in subsequent queries.

**Validates: Requirements 7.3, 7.4**

### Property 17: Recently played list maintenance

*For any* user's recently played list, it should contain at most 50 songs ordered chronologically with the most recent first.

**Validates: Requirements 8.4, 8.5**

### Property 18: Play count increment

*For any* song that is played, the song's play count in Firebase should increase by exactly 1.

**Validates: Requirements 8.2**

### Property 19: Favorites management consistency

*For any* song added to favorites then removed from favorites, the song should not appear in the user's favorites list.

**Validates: Requirements 9.1, 9.2**

## Error Handling

### Search Engine Errors

1. **Empty Query**: Return empty result set
2. **Firebase Connection Error**: Return cached results if available, otherwise throw error with retry suggestion
3. **Invalid User ID**: Throw authentication error
4. **Malformed Song Data**: Skip song and log warning, continue processing other songs
5. **Scoring Overflow**: Cap individual field scores at defined maximums

### Recommendation Engine Errors

1. **No User History**: Generate recommendations based only on preferences (language/mood)
2. **Empty Favorite Artists**: Skip favorite artist boost, continue with other scoring factors
3. **Firebase Connection Error**: Return cached recommendations if available, otherwise throw error
4. **Invalid Preference Data**: Use default values (no language/mood filtering)

### Feed Generator Errors

1. **Section Load Failure**: Skip failed section, continue loading other sections
2. **Empty Section Data**: Return empty array for that section, don't fail entire feed
3. **Parallel Load Timeout**: Return sections that completed successfully
4. **Firebase Connection Error**: Return cached feed if available, otherwise throw error

### User Profile Manager Errors

1. **Profile Not Found**: Create new profile with default values
2. **Invalid Preference Value**: Reject update and return validation error
3. **Recently Played Limit Exceeded**: Automatically trim to 50 most recent
4. **Duplicate Favorite**: Silently ignore (idempotent operation)
5. **Firebase Write Failure**: Retry up to 3 times, then throw error

### General Error Handling Principles

- **Graceful Degradation**: System should continue functioning with reduced features if non-critical components fail
- **User Feedback**: Provide clear error messages for user-facing errors
- **Logging**: Log all errors with context for debugging
- **Retry Logic**: Implement exponential backoff for transient Firebase errors
- **Validation**: Validate all user inputs before processing

## Testing Strategy

### Unit Testing

Unit tests will verify specific examples, edge cases, and error conditions for individual functions:

**Search Engine Tests**:
- Test exact match scoring (title, movie, artist)
- Test partial match scoring (starts with, contains)
- Test empty query handling
- Test malformed song data handling
- Test score filtering (≤20 threshold)
- Test result limit (30 songs max)

**Recommendation Engine Tests**:
- Test favorite artist identification with various history sizes
- Test empty history handling
- Test recently played penalty application
- Test score filtering (≤30 threshold)
- Test result limit (40 songs max)

**Feed Generator Tests**:
- Test section generation with valid data
- Test Continue Playing omission when no recently played
- Test section load failure handling
- Test parallel loading

**User Profile Manager Tests**:
- Test preference updates
- Test recently played list trimming (50 max)
- Test duplicate favorite handling
- Test search history ordering

### Property-Based Testing

Property tests will verify universal properties across randomized inputs using a JavaScript property-based testing library (fast-check):

**Configuration**: Each property test should run a minimum of 100 iterations to ensure comprehensive coverage through randomization.

**Test Tagging**: Each property test must include a comment tag referencing the design document property:
```javascript
// Feature: smart-search-system, Property 1: Search score monotonicity for exact matches
```

**Property Test Suite**:

1. **Property 1 Test**: Generate random queries and song collections, verify exact matches always score higher than partial matches
   - Tag: `Feature: smart-search-system, Property 1: Search score monotonicity for exact matches`

2. **Property 2 Test**: Generate random search results, verify ordering is always descending by score
   - Tag: `Feature: smart-search-system, Property 2: Search result ordering consistency`

3. **Property 3 Test**: Generate random songs and preferences, verify boost additivity
   - Tag: `Feature: smart-search-system, Property 3: Personalization boost additivity`

4. **Property 4 Test**: Generate random search results, verify no song with score ≤20 appears
   - Tag: `Feature: smart-search-system, Property 4: Low score filtering`

5. **Property 5 Test**: Generate random queries, verify result count never exceeds 30
   - Tag: `Feature: smart-search-system, Property 5: Search result limit`

6. **Property 6 Test**: Generate random songs and user data, verify recommendation score calculation
   - Tag: `Feature: smart-search-system, Property 6: Recommendation score calculation`

7. **Property 7 Test**: Generate random recommendations, verify no song with score ≤30 appears
   - Tag: `Feature: smart-search-system, Property 7: Recommendation result filtering`

8. **Property 8 Test**: Generate random user data, verify recommendation count never exceeds 40
   - Tag: `Feature: smart-search-system, Property 8: Recommendation result limit`

9. **Property 9 Test**: Generate random listening histories, verify top 3 artists are correctly identified
   - Tag: `Feature: smart-search-system, Property 9: Favorite artist identification`

10. **Property 10 Test**: Generate random recently played lists, verify -25 penalty applied
    - Tag: `Feature: smart-search-system, Property 10: Recently played penalty application`

11. **Property 11 Test**: Generate random user data, verify all required feed sections present
    - Tag: `Feature: smart-search-system, Property 11: Feed section presence`

12. **Property 12 Test**: Generate random song collections, verify trending section ordering
    - Tag: `Feature: smart-search-system, Property 12: Trending section ordering`

13. **Property 17 Test**: Generate random play events, verify recently played list never exceeds 50
    - Tag: `Feature: smart-search-system, Property 17: Recently played list maintenance`

14. **Property 18 Test**: Generate random play events, verify play count increments by exactly 1
    - Tag: `Feature: smart-search-system, Property 18: Play count increment`

15. **Property 19 Test**: Generate random favorite operations, verify add/remove consistency
    - Tag: `Feature: smart-search-system, Property 19: Favorites management consistency`

### Integration Testing

- Test complete search flow from query to results
- Test complete recommendation flow from user profile to recommendations
- Test complete feed generation with all sections
- Test Firebase read/write operations
- Test caching behavior
- Test performance with large datasets (50,000+ songs)

### Performance Testing

- Verify search completes within 2 seconds with 50,000+ songs
- Verify recommendations complete within 1 second
- Verify feed generation completes within 3 seconds
- Test with various network conditions
- Test memory usage with large result sets

### Testing Tools

- **Unit Testing**: Jest or Mocha
- **Property-Based Testing**: fast-check (JavaScript property-based testing library)
- **Integration Testing**: Jest with Firebase emulator
- **Performance Testing**: Lighthouse, custom performance benchmarks
- **Mocking**: Firebase mock library for unit tests

Both unit tests and property tests are necessary for comprehensive coverage. Unit tests catch specific bugs and edge cases, while property tests verify general correctness across all inputs.
