from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import setup_logging
from app.routers.auth import router as auth_router
from app.routers.health import router as health_router
from app.routers.playlists import router as playlist_router
from app.routers.recommendations import router as recommendation_router
from app.routers.songs import router as songs_router
from app.routers.user import router as user_router

setup_logging(settings.log_level)

app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(songs_router)
app.include_router(user_router)
app.include_router(playlist_router)
app.include_router(recommendation_router)
