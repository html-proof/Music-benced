from fastapi import APIRouter, BackgroundTasks, HTTPException, Query

from app.core.config import settings
from app.models.song import SearchResponse, StreamResponse
from app.services.firebase_service import firebase_service
from app.services.ytdlp_service import ytdlp_service

router = APIRouter(tags=["songs"])


@router.get("/search", response_model=SearchResponse)
async def search_songs(
    background_tasks: BackgroundTasks,
    q: str = Query(..., min_length=2),
    limit: int = Query(default=settings.ytdlp_search_limit, ge=1, le=50),
) -> SearchResponse:
    results = await ytdlp_service.search(query=q, limit=limit)
    for item in results:
        background_tasks.add_task(firebase_service.cache_song, item)
    return SearchResponse(query=q, count=len(results), results=results)


@router.get("/stream", response_model=StreamResponse)
async def stream_song(
    background_tasks: BackgroundTasks,
    video_id: str = Query(..., alias="videoId"),
) -> StreamResponse:
    try:
        stream = await ytdlp_service.get_audio_stream(video_id)
    except Exception as exc:
        raise HTTPException(status_code=404, detail=f"Unable to load stream for {video_id}.") from exc

    background_tasks.add_task(firebase_service.cache_song, stream)
    return StreamResponse(**stream)
