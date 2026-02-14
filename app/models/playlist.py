from pydantic import BaseModel, ConfigDict, Field

from app.models.song import SongItem


class PlaylistCreateRequest(BaseModel):
    name: str
    cover_url: str | None = Field(default=None, alias="coverUrl")

    model_config = ConfigDict(populate_by_name=True)


class PlaylistSongMutationRequest(BaseModel):
    playlist_id: str = Field(..., alias="playlistId")
    song_id: str = Field(..., alias="songId")
    song: SongItem | None = None

    model_config = ConfigDict(populate_by_name=True)


class PlaylistItem(BaseModel):
    playlist_id: str = Field(..., alias="playlistId")
    name: str
    cover_url: str | None = Field(default=None, alias="coverUrl")
    created_at: int = Field(..., alias="createdAt")
    song_ids: list[str] = Field(default_factory=list, alias="songIds")

    model_config = ConfigDict(populate_by_name=True)


class PlaylistListResponse(BaseModel):
    count: int
    playlists: list[PlaylistItem]
