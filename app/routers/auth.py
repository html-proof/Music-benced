from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.security import create_access_token
from app.models.auth import AuthResponse, GoogleAuthRequest, UserProfile
from app.services.firebase_service import firebase_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=AuthResponse)
async def auth_google(payload: GoogleAuthRequest) -> AuthResponse:
    try:
        decoded = firebase_service.verify_google_id_token(payload.id_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google/Firebase ID token.",
        ) from exc

    uid = decoded.get("uid") or decoded.get("sub")
    if not uid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification succeeded but UID was not found.",
        )

    email = decoded.get("email")
    name = decoded.get("name")
    photo_url = decoded.get("picture")

    user = firebase_service.upsert_user(uid=uid, email=email, name=name, photo_url=photo_url)
    access_token = create_access_token(subject=uid, email=email)

    return AuthResponse(
        accessToken=access_token,
        expiresIn=settings.jwt_expire_minutes * 60,
        user=UserProfile(
            uid=uid,
            email=user.get("email"),
            name=user.get("name"),
            photoUrl=user.get("photoUrl"),
        ),
    )
