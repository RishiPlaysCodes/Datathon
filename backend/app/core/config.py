"""Application configuration using pydantic-settings."""
import os
import tempfile
from typing import List

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings  # type: ignore

# Catalyst AppSail restricts writes to the current directory during execution.
# Use a writable temp directory for the SQLite database so it works both
# locally and on Catalyst (which allows writes only in the OS temp dir).
# Version the ephemeral demo database so deployments created before the citizen
# and OSINT columns cannot be reused with an incompatible SQLite schema.
_DB_PATH = os.path.join(tempfile.gettempdir(), "prahari_v3.db")


class Settings(BaseSettings):
    # App
    APP_NAME: str = "PRAHARI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = int(
        os.environ.get(
            "X_ZOHO_CATALYST_LISTEN_PORT",
            os.environ.get("PORT", "8001"),
        )
    )

    @property
    def listen_port(self) -> int:
        """Return the port actually selected by the AppSail startup command."""
        return int(os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT", self.PORT))

    # Database - defaults to SQLite in a writable temp dir (Catalyst-safe)
    DATABASE_URL: str = os.environ.get(
        "DATABASE_URL",
        f"sqlite+aiosqlite:///{_DB_PATH}"
    )
    DATABASE_URL_SYNC: str = os.environ.get(
        "DATABASE_URL_SYNC",
        f"sqlite:///{_DB_PATH}"
    )

    # Redis (optional - works without it)
    REDIS_URL: str = "redis://localhost:6379/0"

    # JWT
    SECRET_KEY: str = "prahari-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: List[str] = [
        "https://prahari-60079422859.development.catalystserverless.in",
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
