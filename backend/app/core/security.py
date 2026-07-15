"""Security utilities: JWT tokens, password hashing, role-based access."""
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger("prahari")

# Role hierarchy: higher number = more access
ROLE_HIERARCHY = {
    "constable": 1,
    "investigator": 2,
    "analyst": 3,
    "supervisor": 4,
    "policymaker": 5,
}

# Try bcrypt (industry standard). Fall back to salted SHA-256 if bcrypt is
# unavailable or incompatible (e.g. Python 3.14 + passlib issues) so the app
# still runs everywhere without a hard dependency failure.
_USE_BCRYPT = False
try:
    import bcrypt as _bcrypt
    # Verify bcrypt actually works on this interpreter
    _test = _bcrypt.hashpw(b"test", _bcrypt.gensalt(rounds=4))
    _bcrypt.checkpw(b"test", _test)
    _USE_BCRYPT = True
    logger.info("Password hashing: bcrypt (secure)")
except Exception as e:  # pragma: no cover
    logger.warning(f"bcrypt unavailable ({e}); using salted SHA-256 fallback")


def get_password_hash(password: str) -> str:
    if _USE_BCRYPT:
        # bcrypt max 72 bytes - truncate safely
        pw = password.encode("utf-8")[:72]
        return "bcrypt$" + _bcrypt.hashpw(pw, _bcrypt.gensalt()).decode("utf-8")
    salted = f"{settings.SECRET_KEY}:{password}"
    return "sha256$" + hashlib.sha256(salted.encode()).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        if hashed_password.startswith("bcrypt$") and _USE_BCRYPT:
            pw = plain_password.encode("utf-8")[:72]
            return _bcrypt.checkpw(pw, hashed_password[7:].encode("utf-8"))
        if hashed_password.startswith("sha256$"):
            salted = f"{settings.SECRET_KEY}:{plain_password}"
            return hashlib.sha256(salted.encode()).hexdigest() == hashed_password[7:]
        # Legacy/no-prefix hashes: try sha256 comparison
        salted = f"{settings.SECRET_KEY}:{plain_password}"
        return hashlib.sha256(salted.encode()).hexdigest() == hashed_password
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


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
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def has_minimum_role(user_role: str, required_role: str) -> bool:
    return ROLE_HIERARCHY.get(user_role, 0) >= ROLE_HIERARCHY.get(required_role, 0)


def compute_audit_hash(previous_hash: str, action: str, user_id: str, timestamp: str) -> str:
    data = f"{previous_hash}|{action}|{user_id}|{timestamp}"
    return hashlib.sha256(data.encode()).hexdigest()
