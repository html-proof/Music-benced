import json
import logging
import time
import uuid

import firebase_admin
from firebase_admin import auth as fb_auth
from firebase_admin import credentials, db

from app.core.config import settings

logger = logging.getLogger(__name__)


class FirebaseService:
    def __init__(self) -> None:
        self._initialized = False

    def _initialize(self) -> None:
        if self._initialized:
            return
        if not settings.firebase_db_url:
            logger.warning("FIREBASE_DB_URL not set - Firebase service not initialized")
            return

        if not firebase_admin._apps:
            creds_json = settings.get_firebase_credentials()
            if creds_json:
                service_account = json.loads(creds_json)
                cred = credentials.Certificate(service_account)
            else:
                cred = credentials.ApplicationDefault()

            firebase_admin.initialize_app(cred, {"databaseURL": settings.firebase_db_url})
        self._initialized = True
        logger.info("Firebase Admin initialized.")

    def _ensure_initialized(self) -> None:
        if not self._initialized:
            self._initialize()
        if not firebase_admin._apps:
            raise RuntimeError("Firebase not initialized. Set FIREBASE_DB_URL.")

    @staticmethod
    def _now() -> int:
        return int(time.time())

    def verify_google_id_token(self, id_token: str) -> dict:
        return fb_auth.verify_id_token(id_token)

    def upsert_user(self, uid: str, email: str | None, name: str | None, photo_url: str | None) -> dict:
        now = self._now()
        ref = db.reference(f"users/{uid}")
        existing = ref.get() or {}
        payload = {
            "email": email or existing.get("email"),
            "name": name or existing.get("name"),
            "photoUrl": photo_url or existing.get("photoUrl"),
            "updatedAt": now,
        }
        if not existing:
            payload["createdAt"] = now
        ref.update(payload)
        return {"uid": uid, **existing, **payload}

    def get_user(self, uid: str) -> dict:
        return db.reference(f"users/{uid}").get() or {}

    def update_preferences(self, uid: str, language: list[str], moods: list[str]) -> None:
        lang_ref = db.reference(f"users/{uid}/language")
        moods_ref = db.reference(f"users/{uid}/moods")
        
        for lang in language:
            lang_id = uuid.uuid4().hex[:12]
            lang_ref.child(lang_id).set({"value": lang, "createdAt": self._now()})
        
        for mood in moods:
            mood_id = uuid.uuid4().hex[:12]
            moods_ref.child(mood_id).set({"value": mood, "createdAt": self._now()})
        
        db.reference(f"users/{uid}/updatedAt").set(self._now())

    def set_liked_song(self, uid: str, song_id: str, liked: bool) -> None:
        ref = db.reference(f"users/{uid}/likedSongs/{song_id}")
        if liked:
            ref.set(True)
        else:
            ref.delete()
        db.reference(f"users/{uid}/updatedAt").set(self._now())

    def record_history(self, uid: str, song_id: str, played_at: int | None = None) -> dict:
        timestamp = played_at or self._now()
        
        history_id = uuid.uuid4().hex[:12]
        db.reference(f"users/{uid}/playedSongs/{history_id}").set({
            "songId": song_id,
            "playedAt": timestamp,
            "createdAt": self._now()
        })
        
        db.reference(f"users/{uid}/updatedAt").set(self._now())
        
        db.reference(f"users/{uid}/currentSong").set({
            "songId": song_id,
            "positionMs": 0,
            "updatedAt": timestamp,
        })
        
        return {"historyId": history_id}

    def set_current_song(self, uid: str, song_id: str, position_ms: int = 0) -> None:
        db.reference(f"users/{uid}/currentSong").set({
            "songId": song_id,
            "positionMs": position_ms,
            "updatedAt": self._now(),
        })

    def add_to_queue(self, uid: str, song_id: str) -> str:
        queue_id = uuid.uuid4().hex[:12]
        db.reference(f"users/{uid}/nextSong/{queue_id}").set({
            "songId": song_id,
            "addedAt": self._now(),
        })
        db.reference(f"users/{uid}/updatedAt").set(self._now())
        return queue_id

    def remove_from_queue(self, uid: str, queue_id: str) -> None:
        db.reference(f"users/{uid}/nextSong/{queue_id}").delete()

    def get_queue(self, uid: str) -> list[dict]:
        payload = db.reference(f"users/{uid}/nextSong").get() or {}
        queue = []
        for qid, item in payload.items():
            queue.append({"queueId": qid, **item})
        return queue

    def add_search_history(self, uid: str, query: str) -> str:
        search_id = uuid.uuid4().hex[:12]
        db.reference(f"users/{uid}/search/{search_id}").set({
            "query": query,
            "createdAt": self._now(),
        })
        db.reference(f"users/{uid}/updatedAt").set(self._now())
        return search_id

    def get_search_history(self, uid: str, limit: int = 20) -> list[dict]:
        payload = db.reference(f"users/{uid}/search").get() or {}
        searches = []
        for sid, item in payload.items():
            searches.append({"searchId": sid, **item})
        searches.sort(key=lambda x: x.get("createdAt", 0), reverse=True)
        return searches[:limit]

    def clear_search_history(self, uid: str) -> None:
        db.reference(f"users/{uid}/search").delete()

    def list_liked_song_ids(self, uid: str) -> list[str]:
        payload = db.reference(f"users/{uid}/likedSongs").get() or {}
        return [song_id for song_id, liked in payload.items() if bool(liked)]

    def get_history(self, uid: str) -> list[dict]:
        payload = db.reference(f"users/{uid}/playedSongs").get() or {}
        history = []
        for hid, item in payload.items():
            history.append({"historyId": hid, **item})
        history.sort(key=lambda x: x.get("playedAt", 0), reverse=True)
        return history

    def create_playlist(self, uid: str, name: str, cover_url: str | None = None) -> str:
        playlist_id = uuid.uuid4().hex[:16]
        db.reference(f"users/{uid}/playlists/{playlist_id}").set(
            {
                "name": name,
                "coverUrl": cover_url,
                "createdAt": self._now(),
                "songs": {},
            }
        )
        db.reference(f"users/{uid}/updatedAt").set(self._now())
        return playlist_id

    def add_song_to_playlist(self, uid: str, playlist_id: str, song_id: str) -> None:
        db.reference(f"users/{uid}/playlists/{playlist_id}/songs/{song_id}").set(True)
        db.reference(f"users/{uid}/updatedAt").set(self._now())

    def remove_song_from_playlist(self, uid: str, playlist_id: str, song_id: str) -> None:
        db.reference(f"users/{uid}/playlists/{playlist_id}/songs/{song_id}").delete()
        db.reference(f"users/{uid}/updatedAt").set(self._now())

    def list_playlists(self, uid: str) -> list[dict]:
        payload = db.reference(f"users/{uid}/playlists").get() or {}
        playlists: list[dict] = []
        for playlist_id, item in payload.items():
            songs = item.get("songs") or {}
            playlists.append(
                {
                    "playlistId": playlist_id,
                    "name": item.get("name", "Untitled"),
                    "coverUrl": item.get("coverUrl"),
                    "createdAt": int(item.get("createdAt") or 0),
                    "songIds": list(songs.keys()),
                }
            )
        playlists.sort(key=lambda value: value["createdAt"], reverse=True)
        return playlists

    def cache_song(self, song: dict) -> None:
        song_id = song.get("songId")
        if not song_id:
            return
        payload = {
            "title": song.get("title"),
            "artist": song.get("artist"),
            "thumb": song.get("thumb"),
            "youtubeUrl": song.get("youtubeUrl"),
            "duration": song.get("duration"),
            "lastUpdated": self._now(),
        }
        db.reference(f"songsCache/{song_id}").update(payload)

    def get_cached_song(self, song_id: str) -> dict | None:
        payload = db.reference(f"songsCache/{song_id}").get()
        if not payload:
            return None
        return {"songId": song_id, **payload}


firebase_service = FirebaseService()
