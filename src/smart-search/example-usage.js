/**
 * Example Usage of Smart Search and Recommendation System
 * 
 * This file demonstrates how to use the smart search system in your application
 */

const { db } = require('../config/firebase');
const { SmartSearchSystem } = require('./index');

// Example: Initialize the system for a user
async function exampleUsage() {
  const userId = 'user-123';
  const smartSearch = new SmartSearchSystem(db, userId);

  // Example 1: Get personalized home feed based on user preferences
  // Supports multiple languages and moods
  console.log('=== Example 1: Get Home Feed ===');
  const userPreferences = {
    languages: ['Hindi', 'Tamil'],  // Multiple languages
    moods: ['romantic', 'energetic'] // Multiple moods
  };

  const homeFeed = await smartSearch.getHomeFeed(userPreferences);
  console.log('Home Feed Sections:');
  console.log('- Continue Playing:', homeFeed.continuePlaying?.length || 0, 'songs');
  console.log('- Based on Mood:', homeFeed.basedOnMood?.length || 0, 'songs');
  console.log('- Trending in Language:', homeFeed.trendingInLanguage?.length || 0, 'songs');
  console.log('- Recommended For You:', homeFeed.recommendedForYou?.length || 0, 'songs');
  console.log('- Recently Played:', homeFeed.recentlyPlayed?.length || 0, 'songs');
  console.log('- New Releases:', homeFeed.newReleases?.length || 0, 'songs');

  // Example 2: Search for songs
  console.log('\n=== Example 2: Search Songs ===');
  const searchResults = await smartSearch.search('love', userPreferences);
  console.log(`Found ${searchResults.length} songs matching "love"`);
  if (searchResults.length > 0) {
    console.log('Top result:', searchResults[0].title, 'by', searchResults[0].artist);
  }

  // Example 3: Get personalized recommendations
  console.log('\n=== Example 3: Get Recommendations ===');
  const recommendations = await smartSearch.getRecommendations(userPreferences);
  console.log(`Got ${recommendations.length} personalized recommendations`);
  if (recommendations.length > 0) {
    console.log('Top recommendation:', recommendations[0].title, 'by', recommendations[0].artist);
  }

  // Example 4: Track song play
  console.log('\n=== Example 4: Track Song Play ===');
  if (searchResults.length > 0) {
    const songId = searchResults[0].id;
    await smartSearch.trackSongPlay(songId);
    console.log('Tracked play for song:', searchResults[0].title);
  }

  // Example 5: Update user preferences
  console.log('\n=== Example 5: Update Preferences ===');
  await smartSearch.updateLanguagePreference('Tamil');
  await smartSearch.updateMoodPreference('energetic');
  console.log('Updated user preferences to Tamil/energetic');

  // Example 6: Manage favorites
  console.log('\n=== Example 6: Manage Favorites ===');
  if (searchResults.length > 0) {
    const songId = searchResults[0].id;
    await smartSearch.addToFavorites(songId);
    console.log('Added song to favorites:', searchResults[0].title);
  }
}

// Example: Direct usage of individual engines
async function advancedUsage() {
  const userId = 'user-456';
  const smartSearch = new SmartSearchSystem(db, userId);

  // Access individual engines for more control
  const { searchEngine, feedGenerator } = smartSearch;

  // Custom search with recently played IDs (supports multiple languages/moods)
  const recentlyPlayedIds = ['song-1', 'song-2', 'song-3'];
  const searchResults = await searchEngine.search(
    'arijit',
    { languages: ['Hindi', 'Tamil'], moods: ['romantic', 'energetic'] },
    recentlyPlayedIds
  );

  // Get specific feed sections (supports multiple languages/moods)
  const trendingSongs = await feedGenerator.getTrendingInLanguage(['Hindi', 'Tamil']);
  const moodSongs = await feedGenerator.getBasedOnMood(['happy', 'romantic'], ['Hindi', 'Tamil']);
  const newReleases = await feedGenerator.getNewReleases(['Hindi', 'Tamil']);

  console.log('Search results:', searchResults.length);
  console.log('Trending songs:', trendingSongs.length);
  console.log('Mood-based songs:', moodSongs.length);
  console.log('New releases:', newReleases.length);
}

// Export for use in your application
module.exports = {
  exampleUsage,
  advancedUsage
};

// Uncomment to run examples:
// exampleUsage().catch(console.error);
// advancedUsage().catch(console.error);
