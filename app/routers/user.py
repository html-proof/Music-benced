from fastapi import APIRouter, Depends

from app.deps.auth import get_current_user
from app.models.common import AuthUser
from app.models.user import BasicStatusResponse, HistoryRequest, LikeSongRequest, PreferenceUpdateRequest
from app.services.firebase_service import firebase_service

router = APIRouter(prefix="/user", tags=["user"])


@router.post("/update-preferences", response_model=BasicStatusResponse)
@router.post("/preferences", response_model=BasicStatusResponse)
async def update_preferences(
    payload: PreferenceUpdateRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> BasicStatusResponse:
    firebase_service.update_preferences(
        uid=current_user.uid,
        language=payload.language,
        moods=payload.moods,
    )
    return BasicStatusResponse(message="Preferences updated.")


@router.post("/like-song", response_model=BasicStatusResponse)
@router.post("/like", response_model=BasicStatusResponse)
async def like_song(
    payload: LikeSongRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> BasicStatusResponse:
    firebase_service.set_liked_song(
        uid=current_user.uid,
        song_id=payload.song_id,
        liked=payload.liked,
    )
    if payload.song:
        firebase_service.cache_song(payload.song.model_dump(by_alias=True))
    message = "Song liked." if payload.liked else "Song unliked."
    return BasicStatusResponse(message=message)


@router.post("/history", response_model=BasicStatusResponse)
async def add_history(
    payload: HistoryRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> BasicStatusResponse:
    firebase_service.record_history(
        uid=current_user.uid,
        song_id=payload.song_id,
        played_at=payload.played_at,
    )
    if payload.song:
        firebase_service.cache_song(payload.song.model_dump(by_alias=True))
    return BasicStatusResponse(message="Playback history recorded.")


@router.get("/profile")
async def profile(current_user: AuthUser = Depends(get_current_user)) -> dict:
    return {"uid": current_user.uid, **firebase_service.get_user(current_user.uid)}
