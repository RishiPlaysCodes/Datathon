"""Security utilities: JWT tokens, password hashing, role-based access."""
import hashlib
import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger("prahari")

# Password hashing - try bcrypt via passlib, fallback to sha256
_USE_BCRYPT = False
try:
    from passlib.context import CryptContext
    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
    # Test it actually works
    _test_hash = pwd_context.hash("test")
    pwd_context.verify("test", _test_hash)
    _USE_BCRYPT = True
    logger.info("Using bcrypt for password hashing")
except Exception:
    logger.warning("bcrypt unavailable, using sha256 fallback")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    if _USE_BCRYPT:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            pass
    # Fallback: sha256
    return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password


def get_password_hash(password: str) -> str:
    """Hash a password."""
    if _USE_BCRYPT:
        try:
            return pwd_context.hash(password)
        except Exception:
            pass
    # Fallback: sha256
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
    """Check that both roles are known and the user meets the required level."""
    if user_role not in ROLE_HIERARCHY or required_role not in ROLE_HIERARCHY:
        return False
    return ROLE_HIERARCHY[user_role] >= ROLE_HIERARCHY[required_role]


def compute_audit_hash(
    previous_hash: str,
    action: str,
    user_id: str,
    timestamp: str,
    *,
    username: str = "",
    details: Optional[str] = None,
    query_text: Optional[str] = None,
    risk_level: str = "low",
) -> str:
    """Hash the complete canonical audit payload and its predecessor."""
    payload = {
        "action": action,
        "details": details,
        "previous_hash": previous_hash,
        "query_text": query_text,
        "risk_level": risk_level,
        "timestamp": timestamp,
        "user_id": str(user_id),
        "username": username,
    }
    canonical = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
