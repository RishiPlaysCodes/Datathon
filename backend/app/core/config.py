"""Application configuration using pydantic-settings."""
import os
from pathlib import Path
from typing import List

# Load .env explicitly BEFORE reading os.environ, so GEMINI_API_KEY and other
# secrets are picked up reliably no matter which directory uvicorn is run from.
# python-dotenv ships with pydantic-settings, so it is always available.
try:
    from dotenv import load_dotenv
    # backend/.env  (config.py is at backend/app/core/config.py -> up 2 dirs = backend/)
    _backend_dir = Path(__file__).resolve().parent.parent.parent
    load_dotenv(_backend_dir / ".env")
    load_dotenv()  # also try current working directory as a fallback
except Exception:
    pass

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings  # type: ignore


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PRAHARI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # Database - defaults to SQLite for local dev, PostgreSQL for Docker
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./prahari.db"
    )
    DATABASE_URL_SYNC: str = os.environ.get(
        "DATABASE_URL_SYNC",
        "sqlite:///./prahari.db"
    )

    # Redis (optional - works without it)
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT - reads from environment; falls back to a dev default (change in prod via .env)
    SECRET_KEY: str = os.environ.get(
        "SECRET_KEY",
        "prahari-dev-secret-change-me-via-env-file"
    )
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    REFRESH_TOKEN_EXPIRE_DAYS: int = int(os.environ.get("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://frontend:5174",
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # Gemini AI (optional - reads from env)
    GEMINI_API_KEY: str = os.environ.get("GEMINI_API_KEY", "")

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
