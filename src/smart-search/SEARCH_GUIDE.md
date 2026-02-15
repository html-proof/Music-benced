# Search Implementation Guide

## How Search Works

The search system is **context-aware** and **language-agnostic**:

1. **Searches ALL songs** - Not limited by language
2. **Matches across multiple fields** - Title, movie, artist, album, tags
3. **Handles multi-word queries** - "saravam maya movie song"
4. **Language/mood preferences** - Only used for BOOSTING scores, not filtering

## Key Principle

> **Language and mood preferences DO NOT filter results - they only BOOST matching songs**

This means:
- User can search for songs in ANY language
- Tamil song will appear even if user prefers Hindi
- Search query determines what's found, not user preferences

## API Endpoints

### 1. Search Songs

```
GET /api/search?q=saravam+maya+movie+song
```

**Query Parameters:**
- `q` (required) - Search query
- `language` (optional) - User's preferred language (for boosting only)
- `mood` (optional) - User's mood (for boosting only)

**Example:**
```bash
# Search without preferences (finds songs in any language)
curl "http://localhost:3000/api/search?q=saravam+maya"

# Search with Hindi preference (boosts Hindi songs but still finds Tamil songs)
curl "http://localhost:3000/api/search?q=saravam+maya&language=Hindi"
```

**Response:**
```json
{
  "success": true,
  "query": "saravam maya movie song",
  "preferences": {
    "language": "Hindi"
  },
  "count": 5,
  "results": [
    {
      "id": "song-1",
      "title": "Saravam",
      "movie": "Maya",
      "artist": "Anirudh Ravichander",
      "language": "Tamil",
      ...
    }
  ]
}
```

### 2. Get Recommendations

```
GET /api/search/recommendations?language=Hindi&mood=romantic
```

**Query Parameters:**
- `language` (optional) - Filters recommendations by language
- `mood` (optional) - Filters recommendations by mood

**Example:**
```bash
curl "http://localhost:3000/api/search/recommendations?language=Hindi&mood=romantic"
```

### 3. Get Home Feed

```
GET /api/search/feed?language=Hindi&mood=romantic
```

**Query Parameters:**
- `language` (optional) - Filters feed sections by language
- `mood` (optional) - Filters feed sections by mood

**Example:**
```bash
curl "http://localhost:3000/api/search/feed?language=Hindi&mood=romantic"
```

## Scoring System

### Base Scoring (Field Matching)

| Field | Exact Match | Starts With | Contains |
|-------|-------------|-------------|----------|
| Title | 100 points | 80 points | 60 points |
| Movie | 70 points | - | 50 points |
| Artist | 65 points | - | 45 points |
| Album | 30 points | - | 30 points |
| Tag | 25 points | - | 25 points |

### Multi-Word Bonus

When query has multiple words (e.g., "saravam maya movie"):
- **Title**: +10 points per matched word
- **Movie**: +8 points per matched word

Example: "saravam maya movie song"
- If title contains "saravam" AND movie contains "maya"
- Base score: 60 (title contains) + 50 (movie contains) = 110
- Multi-word bonus: 10 (title) + 8 (movie) = 18
- **Total: 128 points**

### Personalization Boosts (Optional)

Only applied if user provides preferences:

| Boost | Points | When Applied |
|-------|--------|--------------|
| Language Match | +30 | Song language matches user preference |
| Mood Match | +25 | Song mood matches user preference |
| Previously Played | +20 | User has played this song before |
| Trending | 0-20 | Based on song popularity percentile |

## Search Examples

### Example 1: Basic Search

```javascript
// User searches: "saravam"
const results = await smartSearch.search('saravam');

// Finds:
// 1. "Saravam" from Maya movie (Tamil) - 100 points (exact title match)
// 2. Any other songs with "saravam" in title/movie/artist
```

### Example 2: Multi-Word Search

```javascript
// User searches: "saravam maya movie song"
const results = await smartSearch.search('saravam maya movie song');

// Scoring for "Saravam" from "Maya":
// - Title contains "saravam": 60 points
// - Movie exact match "maya": 70 points
// - Multi-word bonus (2 words matched): 18 points
// Total: 148 points (top result!)
```

### Example 3: Search with Language Preference

```javascript
// User searches: "maya" with Hindi preference
const results = await smartSearch.search('maya', { language: 'Hindi' });

// Results (sorted by score):
// 1. "Maya Maya" (Hindi) - 100 (exact) + 30 (language boost) = 130 points
// 2. "Saravam" from Maya (Tamil) - 70 (movie exact) = 70 points
//
// Hindi song ranks higher due to language boost,
// but Tamil song still appears in results!
```

### Example 4: Artist Search

```javascript
// User searches: "anirudh"
const results = await smartSearch.search('anirudh');

// Finds all songs by Anirudh Ravichander
// Score: 45 points (artist contains match)
```

### Example 5: Partial Match

```javascript
// User searches: "aashiq"
const results = await smartSearch.search('aashiq');

// Finds:
// - "Tum Hi Ho" from "Aashiqui 2" - 50 points (movie contains)
// - Any other songs with "aashiq" in title/movie/artist
```

## Integration in Your App

### Backend (Express.js)

```javascript
// server.js or app.js
const searchRoutes = require('./routes/search');
app.use('/api/search', searchRoutes);
```

### Frontend (React/Flutter)

```javascript
// Search function
async function searchSongs(query, userPreferences = {}) {
  const params = new URLSearchParams({
    q: query,
    ...userPreferences
  });
  
  const response = await fetch(`/api/search?${params}`);
  const data = await response.json();
  
  return data.results;
}

// Usage
const results = await searchSongs('saravam maya movie song');
// Returns songs matching the query, regardless of language

const resultsWithPreference = await searchSongs('maya', { language: 'Hindi' });
// Returns all songs with "maya", but Hindi songs ranked higher
```

## Firebase Database Structure

Your current structure works perfectly:

```
firebase-root/
├── songs/
│   └── {songId}/
│       ├── title: "Saravam"
│       ├── movie: "Maya"
│       ├── artist: "Anirudh Ravichander"
│       ├── album: "Maya"
│       ├── language: "Tamil"
│       ├── moods: ["energetic"]
│       ├── tags: ["dance", "party"]
│       ├── playCount: 5000
│       └── createdAt: 1234567890
│
└── users/
    └── {userId}/
        ├── preferences/
        │   ├── language: "Hindi"
        │   └── mood: "romantic"
        ├── recentlyPlayed/
        ├── favorites/
        └── searchHistory/
```

## Testing the Search

### Test 1: Search for Tamil Song

```bash
curl "http://localhost:3000/api/search?q=saravam"
```

Expected: Finds "Saravam" from Maya movie (Tamil)

### Test 2: Search with Movie Context

```bash
curl "http://localhost:3000/api/search?q=saravam+maya+movie"
```

Expected: "Saravam" from Maya ranks at top due to multi-word match

### Test 3: Search with Language Preference

```bash
curl "http://localhost:3000/api/search?q=maya&language=Hindi"
```

Expected: 
- Hindi songs with "maya" rank higher
- Tamil songs with "maya" still appear

### Test 4: Search Any Language

```bash
curl "http://localhost:3000/api/search?q=shape+of+you"
```

Expected: Finds English song even if user prefers Hindi/Tamil

## Common Issues & Solutions

### Issue 1: "Song not found"

**Problem:** User searches "saravam maya movie song" but song doesn't appear

**Solution:** Check:
1. Song exists in Firebase `songs/` collection
2. Song has correct fields (title, movie, artist, etc.)
3. Field values match search query (case-insensitive)

### Issue 2: "Wrong song ranks first"

**Problem:** Less relevant song appears before the target song

**Solution:**
- Multi-word queries get bonus points
- Exact matches score higher than partial matches
- Check if other song has higher base score or trending boost

### Issue 3: "Language filter not working"

**Problem:** User sets language preference but sees other languages

**Solution:** This is correct behavior!
- Search shows ALL languages
- Language preference only BOOSTS matching songs
- For language-filtered results, use recommendations or feed

## Summary

✅ **Search is context-aware** - Finds songs based on query, not preferences
✅ **Multi-language support** - Searches across all languages simultaneously
✅ **Smart ranking** - Multi-word queries and exact matches rank higher
✅ **Optional boosting** - Language/mood preferences boost scores but don't filter
✅ **Flexible** - Works with or without user preferences

The search will find "saravam maya movie song" correctly because it:
1. Searches ALL songs (not filtered by language)
2. Matches "saravam" in title (60 points)
3. Matches "maya" in movie (70 points)
4. Gets multi-word bonus (18 points)
5. Total: 148 points - ranks at top!
