"""Gemini AI service — fallback for general knowledge queries.

Used when the deterministic NLU cannot map a user query to a specific
crime-intelligence intent. Routes general questions (about Indian law,
investigation procedures, criminology concepts) to Google Gemini.

SECURITY:
- API key is NEVER exposed in any response (only first 6 chars in diagnostics)
- Rate limited: max 10 Gemini calls per user per hour (prevents abuse/cost explosion)
- Key is server-side only — frontend never sees or sends it
"""
import os
import time
import httpx
import logging
from collections import defaultdict
from app.core.config import settings

logger = logging.getLogger("prahari.gemini")

GEMINI_SYSTEM_PROMPT = (
    "You are PRAHARI AI — a law enforcement intelligence assistant for Karnataka State Police. "
    "Answer concisely in the same language the user asks (English, Hindi, Hinglish, or Kannada). "
    "Focus on: Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), IT Act, POCSO, CrPC/BNSS, "
    "investigation procedures, criminology concepts, and Karnataka-specific policing. "
    "If unsure, say so honestly. Never fabricate law sections or case numbers."
)

# Try these models in order — the first that works is used.
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-001",
    "gemini-1.5-flash",
    "gemini-1.5-flash-latest",
    "gemini-flash-latest",
]

# ═══════════════════════════════════════════════════════════════════════════════
# RATE LIMITER — prevents API key misuse/cost explosion
# ═══════════════════════════════════════════════════════════════════════════════
_MAX_CALLS_PER_HOUR = 10
_rate_store: dict = defaultdict(list)  # user_id -> [timestamps]


def _check_rate_limit(user_id: int) -> bool:
    """Return True if user is within rate limit, False if exceeded."""
    now = time.time()
    window = now - 3600  # 1 hour window
    # Clean old entries
    _rate_store[user_id] = [ts for ts in _rate_store[user_id] if ts > window]
    if len(_rate_store[user_id]) >= _MAX_CALLS_PER_HOUR:
        return False
    _rate_store[user_id].append(now)
    return True


def _get_api_key() -> str:
    return os.environ.get("GEMINI_API_KEY", "") or settings.GEMINI_API_KEY


async def ask_gemini(user_query: str, context: str = "", user_id: int = 0) -> str | None:
    """Call Gemini and return the response text, or None on failure.

    Rate limited: max 10 calls per user per hour. API key never exposed.
    Tries multiple model names and uses the x-goog-api-key header (works with
    both classic AIzaSy... keys and newer AQ.* keys from AI Studio).
    """
    api_key = _get_api_key()
    if not api_key:
        logger.warning("GEMINI: no API key configured — using deterministic fallback")
        return None

    # Rate limit check
    if user_id and not _check_rate_limit(user_id):
        logger.warning(f"GEMINI: rate limit exceeded for user {user_id}")
        return None

    prompt = f"{GEMINI_SYSTEM_PROMPT}\n\nContext: {context}\n\nUser: {user_query}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024},
    }
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

    last_error = ""
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            for model in GEMINI_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                try:
                    resp = await client.post(url, json=payload, headers=headers)
                except Exception as e:
                    last_error = f"{model}: request failed ({e})"
                    continue

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and parts[0].get("text"):
                            logger.info(f"GEMINI: answered using model {model}")
                            return parts[0]["text"].strip()
                    last_error = f"{model}: 200 but no text ({str(data)[:150]})"
                    continue

                # 404 = model not available for this key → try next model.
                # 400/403 = key/auth problem → stop, no point trying others.
                last_error = f"{model}: HTTP {resp.status_code} — {resp.text[:200]}"
                if resp.status_code in (400, 401, 403):
                    break
    except Exception as e:
        last_error = f"client error: {e}"

    logger.warning(f"GEMINI FAILED: {last_error}")
    return None


async def gemini_diagnostic() -> dict:
    """Return a diagnostic dict describing whether Gemini is working.

    Exposed via /api/v1/ai/gemini-status so you can verify the key + model
    without reading server logs.
    """
    api_key = _get_api_key()
    if not api_key:
        return {"configured": False, "working": False, "detail": "No GEMINI_API_KEY set"}

    payload = {"contents": [{"role": "user", "parts": [{"text": "Say OK"}]}]}
    headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}
    results = []
    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            for model in GEMINI_MODELS:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
                try:
                    resp = await client.post(url, json=payload, headers=headers)
                    results.append({"model": model, "status": resp.status_code, "body": resp.text[:150]})
                    if resp.status_code == 200:
                        return {
                            "configured": True,
                            "working": True,
                            "model": model,
                            "key_prefix": api_key[:6] + "...",
                        }
                except Exception as e:
                    results.append({"model": model, "error": str(e)})
    except Exception as e:
        return {"configured": True, "working": False, "detail": str(e)}

    return {"configured": True, "working": False, "key_prefix": api_key[:6] + "...", "attempts": results}
