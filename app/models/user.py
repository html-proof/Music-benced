from pydantic import BaseModel, ConfigDict, Field

from app.models.song import SongItem


class PreferenceUpdateRequest(BaseModel):
    language: list[str] = Field(default_factory=list)
    moods: list[str] = Field(default_factory=list)


class LikeSongRequest(BaseModel):
    song_id: str = Field(..., alias="songId")
    liked: bool = True
    song: SongItem | None = None

    model_config = ConfigDict(populate_by_name=True)


class HistoryRequest(BaseModel):
    song_id: str = Field(..., alias="songId")
    played_at: int | None = Field(default=None, alias="playedAt")
    song: SongItem | None = None

    model_config = ConfigDict(populate_by_name=True)


class BasicStatusResponse(BaseModel):
    success: bool = True
    message: str
