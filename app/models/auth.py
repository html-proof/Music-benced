from pydantic import BaseModel, ConfigDict, Field


class UserProfile(BaseModel):
    uid: str
    email: str | None = None
    name: str | None = None
    photo_url: str | None = Field(default=None, alias="photoUrl")

    model_config = ConfigDict(populate_by_name=True)


class GoogleAuthRequest(BaseModel):
    id_token: str = Field(..., alias="idToken")

    model_config = ConfigDict(populate_by_name=True)


class AuthResponse(BaseModel):
    access_token: str = Field(..., alias="accessToken")
    token_type: str = Field(default="bearer", alias="tokenType")
    expires_in: int = Field(..., alias="expiresIn")
    user: UserProfile

    model_config = ConfigDict(populate_by_name=True)
