# 🎵 Music Streaming Backend - Project Overview

## 🏗️ Architecture

This backend is built with **Node.js** and **Express**, designed for high performance and easy deployment on **Railway**.

### Core Components

1.  **Server (`src/server.js`)**: Entry point, handles port binding.
2.  **App (`src/app.js`)**: Express application setup, middleware, and route mounting.
3.  **Config (`src/config/`)**:
    *   `firebase.js`: Initializes Firebase Admin SDK for Auth and Database.
4.  **Services (`src/services/`)**:
    *   `youtube.js`: Wraps `yt-dlp` to search YouTube and extract audio stream URLs.
5.  **Middlewares (`src/middlewares/`)**:
    *   `auth.js`: Verifies Firebase ID tokens attached to requests.
6.  **Routes (`src/routes/`)**:
    *   `auth.js`: User authentication and creation.
    *   `search.js`: Search for songs/videos.
    *   `stream.js`: Get audio stream URLs.
    *   `user.js`: Manage user preferences, history, and likes.
    *   `playlist.js`: Create and manage playlists.
    *   `recommendations.js`: Get personalized music suggestions.

## 🗄️ Database Schema (Firebase Realtime DB)

```json
{
  "users": {
    "uid_123": {
      "displayName": "John Doe",
      "email": "john@example.com",
      "preferences": {
        "theme": "dark",
        "audioQuality": "high"
      },
      "history": { ... },
      "likes": { ... },
      "playlists": {
        "playlist_id_abc": {
          "name": "My Jams",
          "songs": { ... }
        }
      }
    }
  }
}
```

## 🚀 Deployment

The project includes a `Dockerfile` and `railway.json` for seamless deployment on Railway.

### Environment Variables

*   `PORT`: Server port (default: 3000)
*   `FIREBASE_SERVICE_ACCOUNT`: JSON string of your Firebase service account key.
*   `FIREBASE_DATABASE_URL`: URL of your Firebase Realtime Database.
