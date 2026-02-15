const express = require('express');
const { db } = require('../config/firebase');
const { SmartSearchSystem } = require('../smart-search');
const youtubeService = require('../services/youtube');

const router = express.Router();

/**
 * GET /api/search
 * Search for songs from YouTube
 * 
 * Query params:
 * - q: Search query (required)
 */
router.get('/', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }
    
    // Search YouTube directly for all songs
    const results = await youtubeService.search(q);
    
    // Return results in the format expected by Flutter
    res.json({
      success: true,
      query: q,
      count: results.length,
      results: results
    });
    
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed',
      message: error.message
    });
  }
});

/**
 * GET /api/search/recommendations
 * Get personalized recommendations
 * 
 * Query params:
 * - languages: Comma-separated list of languages (optional)
 * - language: Single language (optional)
 * - moods: Comma-separated list of moods (optional)
 * - mood: Single mood (optional)
 */
router.get('/recommendations', async (req, res) => {
  try {
    const { languages, language, moods, mood } = req.query;
    
    // Get user ID from authentication
    const userId = req.user?.id || 'anonymous';
    
    // Initialize smart search system
    const smartSearch = new SmartSearchSystem(db, userId);
    
    // User preferences
    const userPreferences = {};
    
    // Handle multiple languages
    if (languages) {
      userPreferences.languages = languages.split(',').map(l => l.trim());
    } else if (language) {
      userPreferences.languages = [language];
    }
    
    // Handle multiple moods
    if (moods) {
      userPreferences.moods = moods.split(',').map(m => m.trim());
    } else if (mood) {
      userPreferences.moods = [mood];
    }
    
    // Get recommendations
    const recommendations = await smartSearch.getRecommendations(userPreferences);
    
    // Return results
    res.json({
      success: true,
      preferences: userPreferences,
      count: recommendations.length,
      recommendations: recommendations
    });
    
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
      message: error.message
    });
  }
});

/**
 * GET /api/search/feed
 * Get personalized home feed
 * 
 * Query params:
 * - languages: Comma-separated list of languages (optional)
 * - language: Single language (optional)
 * - moods: Comma-separated list of moods (optional)
 * - mood: Single mood (optional)
 */
router.get('/feed', async (req, res) => {
  try {
    const { languages, language, moods, mood } = req.query;
    
    // Get user ID from authentication
    const userId = req.user?.id || 'anonymous';
    
    // Initialize smart search system
    const smartSearch = new SmartSearchSystem(db, userId);
    
    // User preferences
    const userPreferences = {};
    
    // Handle multiple languages
    if (languages) {
      userPreferences.languages = languages.split(',').map(l => l.trim());
    } else if (language) {
      userPreferences.languages = [language];
    }
    
    // Handle multiple moods
    if (moods) {
      userPreferences.moods = moods.split(',').map(m => m.trim());
    } else if (mood) {
      userPreferences.moods = [mood];
    }
    
    // Generate home feed
    const feed = await smartSearch.getHomeFeed(userPreferences);
    
    // Return feed
    res.json({
      success: true,
      preferences: userPreferences,
      feed: feed
    });
    
  } catch (error) {
    console.error('Feed generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate home feed',
      message: error.message
    });
  }
});

module.exports = router;
