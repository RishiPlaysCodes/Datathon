from enum import Enum
from typing import Optional
from datetime import datetime, timezone
from sqlmodel import Field, SQLModel


class UserRole(str, Enum):
    CONSTABLE = "constable"          # Assigned cases only
    INVESTIGATOR = "investigator"    # Full case + AI access
    ANALYST = "analyst"              # Stats + analytics, no PII
    SUPERVISOR = "supervisor"        # Everything + audit
    ADMIN = "admin"                  # System admin
    POLICYMAKER = "policymaker"      # Anonymized trends only


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    hashed_password: str
    role: UserRole = Field(default=UserRole.CONSTABLE)
    is_active: bool = Field(default=True)
    station_id: Optional[int] = Field(default=None, foreign_key="policestation.id")
    phone_number: Optional[str] = None
    badge_number: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_login: Optional[datetime] = None
