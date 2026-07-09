from typing import Optional
from pydantic import BaseModel, EmailStr
from app.models.user import UserRole

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None

class UserCreate(UserBase):
    email: EmailStr
    username: str
    password: str
    full_name: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserOut(UserBase):
    id: int
    is_active: bool

    class Config:
        from_attributes = True
