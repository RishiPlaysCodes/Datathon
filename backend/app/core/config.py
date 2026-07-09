"""Application configuration using pydantic-settings."""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PRAHARI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8001

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://prahari:prahari123@db:5432/prahari"
    DATABASE_URL_SYNC: str = "postgresql://prahari:prahari123@db:5432/prahari"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

    # JWT
    SECRET_KEY: str = "prahari-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://frontend:5174",
        "http://localhost:3000",
        "http://localhost:5173",
    ]

    # Gemini AI
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
