"""Security utilities: JWT tokens, password hashing, role-based access."""
import hashlib
import time
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger("prahari")

# Try passlib+bcrypt first, fallback to hashlib for compatibility
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception as e:
            logger.error(f"Password verify error: {e}")
            # Fallback: direct comparison for sha256 hashes
            import hashlib
            return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

    def get_password_hash(password: str) -> str:
        try:
            return pwd_context.hash(password)
        except Exception as e:
            logger.error(f"Password hash error (falling back to sha256): {e}")
            return hashlib.sha256(password.encode()).hexdigest()

except ImportError:
    # If passlib not available, use simple sha256
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

    def get_password_hash(password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

# Role hierarchy: higher number = more access
ROLE_HIERARCHY = {
    "citizen": 0,
    "constable": 1,
    "investigator": 2,
    "analyst": 3,
    "supervisor": 4,
    "policymaker": 5,
}


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        return None


def has_minimum_role(user_role: str, required_role: str) -> bool:
    """Check if user has at least the required role level."""
    return ROLE_HIERARCHY.get(user_role, 0) >= ROLE_HIERARCHY.get(required_role, 0)


def compute_audit_hash(previous_hash: str, action: str, user_id: str, timestamp: str) -> str:
    """Compute SHA-256 hash for tamper-evident audit trail."""
    data = f"{previous_hash}|{action}|{user_id}|{timestamp}"
    return hashlib.sha256(data.encode()).hexdigest()
