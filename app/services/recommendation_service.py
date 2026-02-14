from firebase_admin import db

from app.services.firebase_service import firebase_service
from app.services.ytdlp_service import ytdlp_service


BLOCKED_KEYWORDS = [
    "explicit",
    "censored",
    "banned",
    "fuck",
    "shit",
    "damn",
    "hell",
    "ass",
    "bitch",
    "dick",
    "pussy",
    "sex",
    "porn",
    "nsfw",
    "xxx",
    "18+",
    "adult",
    "drugs",
    "weed",
    "cocaine",
    "marijuana",
    "violence",
    "gore",
    "terrorist",
    "movie",
    "full movie",
    "full film",
    "movies",
    "scene",
    "scenes",
    "news",
    "trailer",
    "teaser",
    "3d song",
    "8d song",
    "3d audio",
    "8d audio",
    "dj song",
    "dj mix",
    "remix",
    "bass boosted",
    "lyrics",
    " karaoke",
    "cover",
    "reaction",
    "vlog",
    "podcast",
    "interview",
    "documentary",
]


class RecommendationService:
    @staticmethod
    def _extract_values_from_dict(data: dict | None) -> list[str]:
        if not data:
            return []
        values = []
        for key, item in data.items():
            if isinstance(item, dict) and "value" in item:
                values.append(item["value"])
        return values

    @staticmethod
    def _is_blocked(title: str, artist: str | None = None) -> bool:
        text = f"{title} {artist or ''}".lower()
        for keyword in BLOCKED_KEYWORDS:
            if keyword in text:
                return True
        return False

    @staticmethod
    def _filter_results(results: list[dict]) -> list[dict]:
        filtered = []
        for item in results:
            title = item.get("title", "")
            artist = item.get("artist", "")
            if not RecommendationService._is_blocked(title, artist):
                filtered.append(item)
        return filtered

    @staticmethod
    def _build_queries(language: list[str], moods: list[str]) -> list[str]:
        queries: list[str] = []

        for lang in language[:2]:
            queries.append(f"{lang} top hits 2026")
            queries.append(f"{lang} trending music")

        for mood in moods[:2]:
            queries.append(f"{mood} music playlist")
            queries.append(f"{mood} songs 2026")

        for lang in language[:2]:
            for mood in moods[:2]:
                queries.append(f"{lang} {mood} songs")

        if not queries:
            queries = ["top music hits 2026", "viral songs 2026", "best music playlist"]
        return queries[:8]

    async def recommend_for_user(self, uid: str, limit: int = 20) -> list[dict]:
        language_data = db.reference(f"users/{uid}/language").get() or {}
        moods_data = db.reference(f"users/{uid}/moods").get() or {}
        history_data = db.reference(f"users/{uid}/playedSongs").get() or {}
        liked_data = db.reference(f"users/{uid}/likedSongs").get() or {}

        language = self._extract_values_from_dict(language_data)
        moods = self._extract_values_from_dict(moods_data)

        results: list[dict] = []
        seen: set[str] = set()

        sorted_history = sorted(
            history_data.items(),
            key=lambda item: int(item[1].get("playedAt", 0) if isinstance(item[1], dict) else 0),
            reverse=True,
        )

        for _history_id, history_item in sorted_history[:10]:
            if len(results) >= limit:
                break
            if not isinstance(history_item, dict):
                continue
            song_id = history_item.get("songId")
            if not song_id or song_id in seen:
                continue
            cached = firebase_service.get_cached_song(song_id)
            if not cached:
                continue
            if self._is_blocked(cached.get("title", ""), cached.get("artist")):
                continue
            seen.add(song_id)
            results.append(cached)

        for song_id, liked in liked_data.items():
            if len(results) >= limit:
                break
            if not liked or song_id in seen:
                continue
            cached = firebase_service.get_cached_song(song_id)
            if not cached:
                continue
            if self._is_blocked(cached.get("title", ""), cached.get("artist")):
                continue
            seen.add(song_id)
            results.append(cached)

        if len(results) >= limit:
            return results[:limit]

        for query in self._build_queries(language, moods):
            if len(results) >= limit:
                break
            songs = await ytdlp_service.search(query=query, limit=10)
            filtered_songs = self._filter_results(songs)
            
            for item in filtered_songs:
                song_id = item.get("songId")
                if not song_id or song_id in seen:
                    continue
                seen.add(song_id)
                results.append(item)
                firebase_service.cache_song(item)
                if len(results) >= limit:
                    break

        return results[:limit]


recommendation_service = RecommendationService()
