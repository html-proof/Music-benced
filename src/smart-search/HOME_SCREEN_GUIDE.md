# Home Screen Implementation Guide

This guide shows how to implement the home screen with personalized recommendations based on user's language and mood preferences.

## Overview

The home screen displays 6 sections of songs, all filtered and ranked based on the user's **languages** and **moods** preferences (supports multiple selections):

1. **Continue Playing** - Last 5 songs user played
2. **Based on Mood** - Songs matching ANY of user's selected moods and languages
3. **Trending in Language** - Popular songs in ANY of user's selected languages
4. **Recommended For You** - AI-powered personalized recommendations
5. **Recently Played** - User's listening history
6. **New Releases** - Recently added songs in ANY of user's selected languages

## Quick Implementation

### Step 1: Initialize the System

```javascript
const { db } = require('./config/firebase');
const { SmartSearchSystem } = require('./smart-search');

// Get user ID from authentication
const userId = req.user.id; // or from session/token

// Initialize smart search system
const smartSearch = new SmartSearchSystem(db, userId);
```

### Step 2: Get User Preferences

```javascript
// Get from user profile or request
// Supports multiple languages and moods
const userPreferences = {
  languages: ['Hindi', 'Tamil'],    // User's preferred languages (array)
  moods: ['romantic', 'energetic']  // User's current moods (array)
};

// Backward compatible: single values still work
const singlePreferences = {
  language: 'Hindi',    // Single language
  mood: 'romantic'      // Single mood
};

// Supported languages: Hindi, English, Tamil, Telugu, etc.
// Supported moods: happy, sad, romantic, energetic, calm
```

### Step 3: Generate Home Feed

```javascript
// Get complete home feed
const homeFeed = await smartSearch.getHomeFeed(userPreferences);

// Response structure:
{
  continuePlaying: [Song, Song, ...],      // 0-5 songs
  basedOnMood: [Song, Song, ...],          // 0-20 songs
  trendingInLanguage: [Song, Song, ...],   // 0-20 songs
  recommendedForYou: [Song, Song, ...],    // 0-20 songs
  recentlyPlayed: [Song, Song, ...],       // 0-20 songs
  newReleases: [Song, Song, ...]           // 0-20 songs
}
```

## Complete API Endpoint Example

```javascript
// routes/feed.js
const express = require('express');
const { db } = require('../config/firebase');
const { SmartSearchSystem } = require('../smart-search');

const router = express.Router();

/**
 * GET /api/feed
 * Get personalized home feed
 * 
 * Query params:
 * - languages: Comma-separated list of languages (optional)
 * - language: Single language (optional, for backward compatibility)
 * - moods: Comma-separated list of moods (optional)
 * - mood: Single mood (optional, for backward compatibility)
 */
router.get('/feed', async (req, res) => {
  try {
    // Get user ID from authentication
    const userId = req.user.id;
    
    // Get preferences from query params or user profile
    const { languages, language, moods, mood } = req.query;
    
    const userPreferences = {};
    
    // Handle multiple languages
    if (languages) {
      userPreferences.languages = languages.split(',').map(l => l.trim());
    } else if (language) {
      userPreferences.languages = [language];
    } else if (req.user.preferredLanguages) {
      userPreferences.languages = req.user.preferredLanguages;
    }
    
    // Handle multiple moods
    if (moods) {
      userPreferences.moods = moods.split(',').map(m => m.trim());
    } else if (mood) {
      userPreferences.moods = [mood];
    } else if (req.user.currentMoods) {
      userPreferences.moods = req.user.currentMoods;
    }
    
    // Initialize smart search system
    const smartSearch = new SmartSearchSystem(db, userId);
    
    // Generate home feed
    const homeFeed = await smartSearch.getHomeFeed(userPreferences);
    
    // Return feed
    res.json({
      success: true,
      preferences: userPreferences,
      feed: homeFeed
    });
    
  } catch (error) {
    console.error('Feed generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate home feed'
    });
  }
});

module.exports = router;
```

## How Each Section Works

### 1. Continue Playing
- Shows last 5 songs user played
- Only appears if user has played songs before
- Helps user resume listening

```javascript
// Manually get this section
const continuePlaying = await smartSearch.feedGenerator.getContinuePlaying();
```

### 2. Based on Mood
- Filters songs by user's **mood** AND **language**
- Sorted by popularity (play count)
- Returns top 20 songs

```javascript
// Manually get this section
const basedOnMood = await smartSearch.feedGenerator.getBasedOnMood(
  'romantic',  // mood
  'Hindi'      // language
);
```

### 3. Trending in Language
- Shows popular songs in user's **language**
- Sorted by play count (most played first)
- Returns top 20 songs

```javascript
// Manually get this section
const trending = await smartSearch.feedGenerator.getTrendingInLanguage('Hindi');
```

### 4. Recommended For You
- AI-powered personalized recommendations
- Based on:
  - Language preference (+50 points)
  - Mood preference (+40 points)
  - Favorite artists (+30 points)
  - Trending boost (0-20 points)
  - Recently played penalty (-25 points)
- Returns top 20 songs

```javascript
// Manually get this section
const recommendations = await smartSearch.getRecommendations({
  language: 'Hindi',
  mood: 'romantic'
});
```

### 5. Recently Played
- User's listening history
- Ordered by most recent first
- Returns up to 20 songs

```javascript
// Manually get this section
const recentlyPlayed = await smartSearch.feedGenerator.getRecentlyPlayed();
```

### 6. New Releases
- Recently added songs in user's **language**
- Sorted by creation date (newest first)
- Returns top 20 songs

```javascript
// Manually get this section
const newReleases = await smartSearch.feedGenerator.getNewReleases('Hindi');
```

## Updating User Preferences

### Update Language Preference

```javascript
// When user changes language in settings
await smartSearch.updateLanguagePreference('Tamil');

// This affects:
// - Based on Mood section (filters by Tamil)
// - Trending in Language section (shows Tamil songs)
// - Recommended For You section (+50 points for Tamil songs)
// - New Releases section (shows Tamil songs)
```

### Update Mood Preference

```javascript
// When user changes mood
await smartSearch.updateMoodPreference('energetic');

// This affects:
// - Based on Mood section (filters by energetic mood)
// - Recommended For You section (+40 points for energetic songs)
```

## Tracking User Activity

### Track Song Play

```javascript
// When user plays a song
await smartSearch.trackSongPlay('song-123');

// This:
// 1. Adds song to recently played list
// 2. Increments song's play count
// 3. Affects future recommendations
```

### Manage Favorites

```javascript
// Add to favorites
await smartSearch.addToFavorites('song-456');

// Remove from favorites
await smartSearch.removeFromFavorites('song-456');
```

## Frontend Integration Example

### React/React Native

```javascript
import { useState, useEffect } from 'react';

function HomeScreen() {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    language: 'Hindi',
    mood: 'romantic'
  });

  useEffect(() => {
    loadHomeFeed();
  }, [preferences]);

  const loadHomeFeed = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/feed?language=${preferences.language}&mood=${preferences.mood}`
      );
      const data = await response.json();
      setFeed(data.feed);
    } catch (error) {
      console.error('Failed to load feed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLanguage = async (language) => {
    setPreferences({ ...preferences, language });
    // Also update in backend
    await fetch('/api/preferences/language', {
      method: 'PUT',
      body: JSON.stringify({ language })
    });
  };

  const updateMood = async (mood) => {
    setPreferences({ ...preferences, mood });
    // Also update in backend
    await fetch('/api/preferences/mood', {
      method: 'PUT',
      body: JSON.stringify({ mood })
    });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView>
      {/* Preference Selectors */}
      <LanguageSelector 
        value={preferences.language} 
        onChange={updateLanguage} 
      />
      <MoodSelector 
        value={preferences.mood} 
        onChange={updateMood} 
      />

      {/* Feed Sections */}
      {feed.continuePlaying?.length > 0 && (
        <Section title="Continue Playing" songs={feed.continuePlaying} />
      )}
      
      <Section title="Based on Your Mood" songs={feed.basedOnMood} />
      <Section title="Trending in Your Language" songs={feed.trendingInLanguage} />
      <Section title="Recommended For You" songs={feed.recommendedForYou} />
      <Section title="Recently Played" songs={feed.recentlyPlayed} />
      <Section title="New Releases" songs={feed.newReleases} />
    </ScrollView>
  );
}
```

### Flutter

```dart
class HomeScreen extends StatefulWidget {
  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? feed;
  bool loading = true;
  String language = 'Hindi';
  String mood = 'romantic';

  @override
  void initState() {
    super.initState();
    loadHomeFeed();
  }

  Future<void> loadHomeFeed() async {
    setState(() => loading = true);
    
    try {
      final response = await http.get(
        Uri.parse('/api/feed?language=$language&mood=$mood')
      );
      final data = json.decode(response.body);
      setState(() => feed = data['feed']);
    } catch (e) {
      print('Failed to load feed: $e');
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> updateLanguage(String newLanguage) async {
    setState(() => language = newLanguage);
    await loadHomeFeed();
    // Also update in backend
    await http.put(
      Uri.parse('/api/preferences/language'),
      body: json.encode({'language': newLanguage})
    );
  }

  Future<void> updateMood(String newMood) async {
    setState(() => mood = newMood);
    await loadHomeFeed();
    // Also update in backend
    await http.put(
      Uri.parse('/api/preferences/mood'),
      body: json.encode({'mood': newMood})
    );
  }

  @override
  Widget build(BuildContext context) {
    if (loading) return LoadingSpinner();

    return ListView(
      children: [
        // Preference Selectors
        LanguageSelector(value: language, onChanged: updateLanguage),
        MoodSelector(value: mood, onChanged: updateMood),
        
        // Feed Sections
        if (feed?['continuePlaying']?.isNotEmpty ?? false)
          SongSection(title: 'Continue Playing', songs: feed!['continuePlaying']),
        
        SongSection(title: 'Based on Your Mood', songs: feed!['basedOnMood']),
        SongSection(title: 'Trending', songs: feed!['trendingInLanguage']),
        SongSection(title: 'Recommended For You', songs: feed!['recommendedForYou']),
        SongSection(title: 'Recently Played', songs: feed!['recentlyPlayed']),
        SongSection(title: 'New Releases', songs: feed!['newReleases']),
      ],
    );
  }
}
```

## Performance Tips

1. **Cache the feed** - Cache for 5-10 minutes to reduce Firebase reads
2. **Load sections independently** - Show sections as they load (progressive rendering)
3. **Prefetch on app start** - Load feed in background when app opens
4. **Update on preference change** - Reload feed when user changes language/mood

## Testing

```javascript
// Test home feed generation
const { SmartSearchSystem } = require('./smart-search');

async function testHomeFeed() {
  const smartSearch = new SmartSearchSystem(db, 'test-user');
  
  const feed = await smartSearch.getHomeFeed({
    language: 'Hindi',
    mood: 'romantic'
  });
  
  console.log('Feed sections:');
  console.log('- Continue Playing:', feed.continuePlaying?.length || 0);
  console.log('- Based on Mood:', feed.basedOnMood?.length || 0);
  console.log('- Trending:', feed.trendingInLanguage?.length || 0);
  console.log('- Recommended:', feed.recommendedForYou?.length || 0);
  console.log('- Recently Played:', feed.recentlyPlayed?.length || 0);
  console.log('- New Releases:', feed.newReleases?.length || 0);
}
```

## Summary

The home screen is powered by language and mood preferences:

- **Language** filters: Based on Mood, Trending, Recommended For You, New Releases
- **Mood** filters: Based on Mood, Recommended For You
- All sections are personalized and ranked for the best user experience
- Easy to implement with a single API call: `getHomeFeed(userPreferences)`
