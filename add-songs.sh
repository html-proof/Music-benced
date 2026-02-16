#!/bin/bash

# Add sample songs to Firebase via Admin API

BASE_URL="https://data-fetch-production.up.railway.app"

echo "Adding sample songs to database..."

# Add Sarvam (Tamil)
curl -X POST "$BASE_URL/admin/songs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sarvam",
    "movie": "Maya",
    "artist": "Anirudh Ravichander",
    "album": "Maya",
    "language": "Tamil",
    "moods": ["energetic", "happy"],
    "tags": ["dance", "party", "upbeat"],
    "thumbnail": "https://i.ytimg.com/vi/placeholder/default.jpg",
    "duration": "3:45"
  }'

echo -e "\n"

# Add Maya Maya (Tamil)
curl -X POST "$BASE_URL/admin/songs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Maya Maya",
    "movie": "Guru",
    "artist": "A.R. Rahman",
    "album": "Guru",
    "language": "Tamil",
    "moods": ["romantic", "calm"],
    "tags": ["melody", "love"],
    "thumbnail": "https://i.ytimg.com/vi/placeholder/default.jpg",
    "duration": "4:20"
  }'

echo -e "\n"

# Add Tum Hi Ho (Hindi)
curl -X POST "$BASE_URL/admin/songs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Tum Hi Ho",
    "movie": "Aashiqui 2",
    "artist": "Arijit Singh",
    "album": "Aashiqui 2",
    "language": "Hindi",
    "moods": ["romantic", "sad"],
    "tags": ["love", "ballad", "emotional"],
    "thumbnail": "https://i.ytimg.com/vi/placeholder/default.jpg",
    "duration": "4:22"
  }'

echo -e "\n"

# Add Shape of You (English)
curl -X POST "$BASE_URL/admin/songs" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Shape of You",
    "movie": "None",
    "artist": "Ed Sheeran",
    "album": "Divide",
    "language": "English",
    "moods": ["happy", "energetic"],
    "tags": ["pop", "dance"],
    "thumbnail": "https://i.ytimg.com/vi/placeholder/default.jpg",
    "duration": "3:53"
  }'

echo -e "\n\nDone! Check song count:"
curl "$BASE_URL/admin/songs/count"
echo -e "\n"
