from pydantic import BaseModel


class AuthUser(BaseModel):
    uid: str
    email: str | None = None
