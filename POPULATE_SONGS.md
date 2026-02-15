# How to Populate Songs in Firebase

The search is showing "Play what you love" because there are no songs in the Firebase database yet. Here are three ways to add songs:

## Option 1: Run the Population Script (Recommended)

```bash
node scripts/populate-songs.js
```

This will add 4 sample songs to your database:
- Sarvam (Tamil)
- Maya Maya (Tamil)
- Tum Hi Ho (Hindi)
- Shape of You (English)

## Option 2: Use the Admin API

### Add a Single Song

```bash
curl -X POST https://data-fetch-production.up.railway.app/admin/songs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sarvam",
    "movie": "Maya",
    "artist": "Anirudh Ravichander",
    "album": "Maya",
    "language": "Tamil",
    "moods": ["energetic", "happy"],
    "tags": ["dance", "party"],
    "thumbnail": "https://i.ytimg.com/vi/placeholder/default.jpg",
    "duration": "3:45"
  }'
```

### Add Multiple Songs at Once

```bash
curl -X POST https://data-fetch-production.up.railway.app/admin/songs/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "songs": [
      {
        "title": "Sarvam",
        "movie": "Maya",
        "artist": "Anirudh Ravichander",
        "album": "Maya",
        "language": "Tamil",
        "moods": ["energetic"],
        "tags": ["dance"],
        "thumbnail": "",
        "duration": "3:45"
      },
      {
        "title": "Maya Maya",
        "movie": "Guru",
        "artist": "A.R. Rahman",
        "album": "Guru",
        "language": "Tamil",
        "moods": ["romantic"],
        "tags": ["melody"],
        "thumbnail": "",
        "duration": "4:20"
      }
    ]
  }'
```

### Check Song Count

```bash
curl https://data-fetch-production.up.railway.app/admin/songs/count
```

## Option 3: Add Manually in Firebase Console

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project
3. Go to Realtime Database
4. Add data with this structure:

```json
{
  "songs": {
    "song-1": {
      "title": "Sarvam",
      "movie": "Maya",
      "artist": "Anirudh Ravichander",
      "album": "Maya",
      "language": "Tamil",
      "moods": ["energetic"],
      "tags": ["dance"],
      "playCount": 0,
      "createdAt": 1234567890,
      "thumbnail": "",
      "duration": "3:45"
    }
  },
  "songsByLanguage": {
    "Tamil": {
      "song-1": true
    }
  }
}
```

## Required Song Fields

- `title` (string) - Song title
- `movie` (string) - Movie name (use "None" if not from a movie)
- `artist` (string) - Artist name
- `album` (string) - Album name
- `language` (string) - Language (Tamil, Hindi, English, etc.)
- `moods` (array) - Mood tags (romantic, energetic, happy, sad, calm)
- `tags` (array) - General tags (dance, party, love, melody, etc.)
- `playCount` (number) - Play count (default: 0)
- `createdAt` (number) - Timestamp
- `thumbnail` (string) - Thumbnail URL (optional)
- `duration` (string) - Duration in format "3:45"

## After Adding Songs

Once songs are added, the search will work:
1. Open the app
2. Go to Search tab
3. Type "Sarvam" or "Maya"
4. Songs will appear!

## Troubleshooting

If search still shows no results:
1. Check Firebase Console to verify songs were added
2. Check the `/admin/songs/count` endpoint
3. Check server logs for errors
4. Verify Firebase database URL is correct in `.env`
