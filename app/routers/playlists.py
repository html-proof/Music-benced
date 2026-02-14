from fastapi import APIRouter, Depends, HTTPException

from app.deps.auth import get_current_user
from app.models.common import AuthUser
from app.models.playlist import (
    PlaylistCreateRequest,
    PlaylistListResponse,
    PlaylistSongMutationRequest,
)
from app.models.user import BasicStatusResponse
from app.services.firebase_service import firebase_service

router = APIRouter(prefix="/playlist", tags=["playlist"])


@router.post("/create")
async def create_playlist(
    payload: PlaylistCreateRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> dict:
    playlist_id = firebase_service.create_playlist(
        uid=current_user.uid,
        name=payload.name,
        cover_url=payload.cover_url,
    )
    return {"success": True, "playlistId": playlist_id}


@router.post("/add", response_model=BasicStatusResponse)
async def add_song(
    payload: PlaylistSongMutationRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> BasicStatusResponse:
    playlists = {item["playlistId"] for item in firebase_service.list_playlists(current_user.uid)}
    if payload.playlist_id not in playlists:
        raise HTTPException(status_code=404, detail="Playlist not found.")
    firebase_service.add_song_to_playlist(
        uid=current_user.uid,
        playlist_id=payload.playlist_id,
        song_id=payload.song_id,
    )
    if payload.song:
        firebase_service.cache_song(payload.song.model_dump(by_alias=True))
    return BasicStatusResponse(message="Song added to playlist.")


@router.post("/remove", response_model=BasicStatusResponse)
async def remove_song(
    payload: PlaylistSongMutationRequest,
    current_user: AuthUser = Depends(get_current_user),
) -> BasicStatusResponse:
    firebase_service.remove_song_from_playlist(
        uid=current_user.uid,
        playlist_id=payload.playlist_id,
        song_id=payload.song_id,
    )
    return BasicStatusResponse(message="Song removed from playlist.")


@router.get("/get", response_model=PlaylistListResponse)
@router.get("/list", response_model=PlaylistListResponse)
async def get_playlists(current_user: AuthUser = Depends(get_current_user)) -> PlaylistListResponse:
    playlists = firebase_service.list_playlists(current_user.uid)
    return PlaylistListResponse(count=len(playlists), playlists=playlists)
