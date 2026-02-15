/**
 * Smart Search System Configuration
 * 
 * Configuration constants for the smart search and recommendation system
 */

const config = {
  // Search Engine Configuration
  search: {
    // Maximum number of search results to return
    maxResults: 30,
    // Minimum score threshold for search results
    minScore: 20,
    
    // Field scoring points
    scoring: {
      title: {
        exact: 100,
        startsWith: 80,
        contains: 60
      },
      movie: {
        exact: 70,
        contains: 50
      },
      artist: {
        exact: 65,
        contains: 45
      },
      album: {
        match: 30
      },
      tag: {
        match: 25
      }
    },
    
    // Personalization boosts
    boosts: {
      preferredLanguage: 30,
      preferredMood: 25,
      previouslyPlayed: 20,
      trendingMax: 20
    }
  },

  // Recommendation Engine Configuration
  recommendations: {
    // Maximum number of recommendations to return
    maxResults: 40,
    // Minimum score threshold for recommendations
    minScore: 30,
    // Number of top favorite artists to consider
    topArtistsCount: 3,
    
    // Recommendation scoring points
    scoring: {
      languageMatch: 50,
      moodMatch: 40,
      favoriteArtist: 30,
      trendingMax: 20,
      recentlyPlayedPenalty: -25
    }
  },

  // Feed Generator Configuration
  feed: {
    continuePlaying: {
      maxSongs: 5
    },
    basedOnMood: {
      maxSongs: 20
    },
    trendingInLanguage: {
      maxSongs: 20
    },
    recommendedForYou: {
      maxSongs: 20
    },
    recentlyPlayed: {
      maxSongs: 20
    },
    newReleases: {
      maxSongs: 20
    }
  },

  // User Profile Configuration
  userProfile: {
    // Maximum number of songs in recently played list
    maxRecentlyPlayed: 50,
    
    // Supported moods
    supportedMoods: ['happy', 'sad', 'energetic', 'calm', 'romantic']
  },

  // Firebase paths
  firebasePaths: {
    songs: 'songs',
    songsByLanguage: 'songsByLanguage',
    users: 'users',
    preferences: 'preferences',
    recentlyPlayed: 'recentlyPlayed',
    favorites: 'favorites',
    searchHistory: 'searchHistory'
  }
};

module.exports = config;
