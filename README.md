# Music Hub Backend (FastAPI + Firebase Realtime DB + yt-dlp)

Production-style backend for a Spotify-like music app.

## Features

- Google Sign-In verification via Firebase Auth (`/auth/google`)
- Backend JWT session tokens
- YouTube search + audio stream URL extraction via `yt-dlp`
- Firebase Realtime DB user/library/history/playlists
- Recommendations based on preferences + history + likes
- Railway-ready Docker deployment

## API Endpoints

- `POST /auth/google`
- `GET /search?q=...`
- `GET /stream?videoId=...`
- `GET /recommendations?uid=...`
- `POST /user/update-preferences`
- `POST /user/like-song`
- `POST /user/history`
- `POST /playlist/create`
- `POST /playlist/add`
- `POST /playlist/remove`
- `GET /playlist/get`

Compatibility aliases:
- `POST /user/preferences`
- `POST /user/like`
- `GET /playlist/list`

## Local Run

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Configure environment:

```bash
copy .env.example .env
```

3. Start server:

```bash
uvicorn app.main:app --reload --port 8000
```

Open docs at `http://localhost:8000/docs`.

## Railway Deployment

1. Create a Railway project and connect this repo.
2. Add environment variables from `.env.example`.
3. Deploy; Railway will build from `Dockerfile`.

## Firebase Realtime DB

Expected root collections:

- `/users/{uid}`
- `/songsCache/{songId}`
