import asyncio
import logging
import threading
import time

from cachetools import TTLCache
from yt_dlp import YoutubeDL
from yt_dlp.utils import DownloadError

from app.core.config import settings

logger = logging.getLogger(__name__)


class YtDlpService:
    def __init__(self) -> None:
        self._cache: TTLCache = TTLCache(maxsize=4000, ttl=settings.ytdlp_cache_ttl_seconds)
        self._lock = threading.Lock()

    def _get_cache(self, key: str) -> dict | list[dict] | None:
        with self._lock:
            return self._cache.get(key)

    def _set_cache(self, key: str, value: dict | list[dict]) -> None:
        with self._lock:
            self._cache[key] = value

    @staticmethod
    def _song_from_entry(entry: dict) -> dict | None:
        video_id = entry.get("id")
        if not video_id:
            return None
        thumb = entry.get("thumbnail") or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
        return {
            "songId": video_id,
            "title": entry.get("title") or "Unknown Title",
            "artist": entry.get("uploader") or entry.get("channel") or "Unknown Artist",
            "thumb": thumb,
            "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}",
            "duration": entry.get("duration"),
            "lastUpdated": int(time.time()),
        }

    def _search_blocking(self, query: str, limit: int) -> list[dict]:
        options = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "ignoreerrors": True,
            "noplaylist": True,
            "extract_flat": "in_playlist",
            "default_search": f"ytsearch{limit}",
            "cachedir": False,
        }
        with YoutubeDL(options) as ydl:
            data = ydl.extract_info(query, download=False)
        entries = (data or {}).get("entries") or []
        parsed = [self._song_from_entry(entry) for entry in entries if entry]
        return [item for item in parsed if item][:limit]

    async def search(self, query: str, limit: int | None = None) -> list[dict]:
        requested_limit = limit or settings.ytdlp_search_limit
        key = f"search::{query.lower()}::{requested_limit}"
        cached = self._get_cache(key)
        if cached:
            return list(cached)  # defensive copy

        try:
            results = await asyncio.to_thread(self._search_blocking, query, requested_limit)
        except DownloadError as exc:
            logger.warning("yt-dlp search failed for query=%s error=%s", query, exc)
            return []

        self._set_cache(key, results)
        return results

    def _stream_blocking(self, video_id: str) -> dict:
        options = {
            "quiet": True,
            "no_warnings": True,
            "skip_download": True,
            "ignoreerrors": False,
            "noplaylist": True,
            "format": "bestaudio[acodec!=none]/bestaudio/best",
            "cachedir": False,
        }
        url = f"https://www.youtube.com/watch?v={video_id}"
        with YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)

        formats = info.get("formats") or []
        audio_formats = [
            item
            for item in formats
            if item.get("vcodec") == "none" and item.get("acodec") not in (None, "none")
        ]
        audio_formats.sort(key=lambda item: (item.get("abr") or 0, item.get("tbr") or 0), reverse=True)

        stream_url = None
        if audio_formats:
            stream_url = audio_formats[0].get("url")
        if not stream_url:
            stream_url = info.get("url")
        if not stream_url:
            raise DownloadError("No audio stream URL available.")

        thumb = info.get("thumbnail")
        if not thumb:
            thumbnails = info.get("thumbnails") or []
            if thumbnails:
                thumb = thumbnails[-1].get("url")

        return {
            "songId": video_id,
            "title": info.get("title") or "Unknown Title",
            "artist": info.get("uploader") or info.get("channel") or "Unknown Artist",
            "thumb": thumb or f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
            "youtubeUrl": f"https://www.youtube.com/watch?v={video_id}",
            "duration": info.get("duration"),
            "streamUrl": stream_url,
            "expiresAt": int(time.time()) + 300,
        }

    async def get_audio_stream(self, video_id: str) -> dict:
        key = f"stream::{video_id}"
        cached = self._get_cache(key)
        if cached:
            # stream URLs expire quickly; only reuse if still fresh.
            if int(cached.get("expiresAt", 0)) > int(time.time()) + 20:
                return dict(cached)

        result = await asyncio.to_thread(self._stream_blocking, video_id)
        self._set_cache(key, result)
        return result


ytdlp_service = YtDlpService()
