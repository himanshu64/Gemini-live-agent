"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """SightLine backend configuration."""

    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    GCS_BUCKET: str
    FRONTEND_ORIGIN: str = "*"

    # Auth (optional — if empty, WebSocket auth is skipped)
    API_TOKEN: str = ""

    # WebSocket limits
    WS_MAX_MESSAGE_BYTES: int = 1_048_576  # 1 MB
    WS_RATE_LIMIT_PER_SEC: int = 30

    model_config = SettingsConfigDict(env_file=".env")


config = Settings()
