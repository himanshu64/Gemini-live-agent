"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """SightLine backend configuration."""

    GOOGLE_CLOUD_PROJECT: str
    GOOGLE_CLOUD_LOCATION: str = "us-central1"
    GCS_BUCKET: str
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env")


config = Settings()
