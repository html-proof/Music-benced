/**
 * Smart Search and Recommendation System
 * 
 * Main entry point for the smart search system.
 * Exports all core components.
 */

const SearchEngine = require('./SearchEngine');
const RecommendationEngine = require('./RecommendationEngine');
const FeedGenerator = require('./FeedGenerator');
const UserProfileManager = require('./UserProfileManager');

module.exports = {
  SearchEngine,
  RecommendationEngine,
  FeedGenerator,
  UserProfileManager
};
