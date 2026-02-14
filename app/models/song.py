from pydantic import BaseModel, ConfigDict, Field


class SongItem(BaseModel):
    song_id: str = Field(..., alias="songId")
    title: str
    artist: str | None = None
    thumb: str | None = None
    youtube_url: str = Field(..., alias="youtubeUrl")
    duration: int | None = None
    last_updated: int | None = Field(default=None, alias="lastUpdated")

    model_config = ConfigDict(populate_by_name=True)


class SearchResponse(BaseModel):
    query: str
    count: int
    results: list[SongItem]


class StreamResponse(BaseModel):
    song_id: str = Field(..., alias="songId")
    title: str
    artist: str | None = None
    thumb: str | None = None
    youtube_url: str = Field(..., alias="youtubeUrl")
    duration: int | None = None
    stream_url: str = Field(..., alias="streamUrl")
    expires_at: int = Field(..., alias="expiresAt")

    model_config = ConfigDict(populate_by_name=True)


class RecommendationResponse(BaseModel):
    uid: str
    count: int
    results: list[SongItem]
