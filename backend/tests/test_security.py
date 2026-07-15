"""Tests for security utilities."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.security import (
    get_password_hash, verify_password,
    create_access_token, decode_token, has_minimum_role,
    compute_audit_hash,
)


def test_password_hash_and_verify():
    h = get_password_hash("demo123")
    assert h != "demo123"
    assert verify_password("demo123", h) is True
    assert verify_password("wrong", h) is False


def test_password_hash_unique_per_call_or_deterministic():
    # Either bcrypt (unique salt) or sha256 (deterministic) - both must verify
    h1 = get_password_hash("samepass")
    assert verify_password("samepass", h1)


def test_jwt_token_roundtrip():
    token = create_access_token({"sub": "demo", "role": "investigator"})
    payload = decode_token(token)
    assert payload is not None
    assert payload["sub"] == "demo"
    assert payload["type"] == "access"


def test_invalid_token_returns_none():
    assert decode_token("not-a-real-token") is None


def test_role_hierarchy():
    assert has_minimum_role("supervisor", "investigator") is True
    assert has_minimum_role("constable", "supervisor") is False
    assert has_minimum_role("analyst", "analyst") is True


def test_audit_hash_deterministic():
    h1 = compute_audit_hash("PREV", "LOGIN", "1", "2026-01-01")
    h2 = compute_audit_hash("PREV", "LOGIN", "1", "2026-01-01")
    assert h1 == h2
    assert len(h1) == 64  # SHA-256 hex length
