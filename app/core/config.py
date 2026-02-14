import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Music Hub API"
    app_env: str = "development"
    debug: bool = False
    log_level: str = "INFO"

    jwt_secret_key: str = "change-this-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7

    firebase_db_url: str = ""
    firebase_service_account_json: str | None = None
    firebase_service_account_file: str = "api.json"

    allowed_origins: str = "*"
    ytdlp_search_limit: int = 20
    ytdlp_cache_ttl_seconds: int = 60 * 60 * 6

    @property
    def allowed_origins_list(self) -> list[str]:
        if self.allowed_origins.strip() == "*":
            return ["*"]
        return [value.strip() for value in self.allowed_origins.split(",") if value.strip()]

    def get_firebase_credentials(self) -> str | None:
        if self.firebase_service_account_json:
            return self.firebase_service_account_json
        if os.path.exists(self.firebase_service_account_file):
            with open(self.firebase_service_account_file, "r") as f:
                return f.read()
        return None


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
