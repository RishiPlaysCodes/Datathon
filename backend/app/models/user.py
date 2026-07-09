from enum import Enum
from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship

class UserRole(str, Enum):
    ADMIN = "admin"
    INVESTIGATOR = "investigator"
    OFFICER = "officer"

class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    email: str = Field(unique=True, index=True)
    full_name: str
    hashed_password: str
    role: UserRole = Field(default=UserRole.OFFICER)
    is_active: bool = Field(default=True)
