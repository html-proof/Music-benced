from fastapi import APIRouter, Depends, HTTPException, Query

from app.deps.auth import get_current_user
from app.models.common import AuthUser
from app.models.song import RecommendationResponse
from app.services.firebase_service import firebase_service
from app.services.recommendation_service import recommendation_service

router = APIRouter(tags=["recommendation"])


@router.get("/recommendations", response_model=RecommendationResponse)
async def recommendations(
    current_user: AuthUser = Depends(get_current_user),
    uid: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
) -> RecommendationResponse:
    target_uid = uid or current_user.uid
    if target_uid != current_user.uid:
        raise HTTPException(status_code=403, detail="You can only fetch your own recommendations.")

    profile = firebase_service.get_user(target_uid)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found.")

    songs = await recommendation_service.recommend_for_user(target_uid, limit=limit)
    return RecommendationResponse(uid=target_uid, count=len(songs), results=songs)
