"""Gemini AI service — fallback for general knowledge queries.

Used when the deterministic NLU cannot map a user query to a specific
crime-intelligence intent. Routes general questions (about Indian law,
investigation procedures, criminology concepts) to Google Gemini.
"""
import httpx
import logging
from app.core.config import settings

logger = logging.getLogger("prahari.gemini")

GEMINI_SYSTEM_PROMPT = (
    "You are PRAHARI AI — a law enforcement intelligence assistant for Karnataka State Police. "
    "Answer concisely in the same language the user asks (English, Hindi, Hinglish, or Kannada). "
    "Focus on: Indian Penal Code (IPC), Bharatiya Nyaya Sanhita (BNS), IT Act, POCSO, CrPC/BNSS, "
    "investigation procedures, criminology concepts, and Karnataka-specific policing. "
    "If unsure, say so honestly. Never fabricate law sections or case numbers."
)


async def ask_gemini(user_query: str, context: str = "") -> str | None:
    """Call Gemini 2.0 Flash and return the response text, or None on failure."""
    import os
    api_key = os.environ.get("GEMINI_API_KEY", "") or settings.GEMINI_API_KEY
    if not api_key:
        logger.info("GEMINI_API_KEY not configured — skipping Gemini call")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"

    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{GEMINI_SYSTEM_PROMPT}\n\nContext: {context}\n\nUser: {user_query}"}],
            }
        ],
        "generationConfig": {
            "temperature": 0.3,
            "maxOutputTokens": 1024,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                logger.warning(f"Gemini returned {resp.status_code}: {resp.text[:200]}")
                return None
            data = resp.json()
            candidates = data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts:
                    return parts[0].get("text", "").strip()
            logger.warning(f"Gemini returned no candidates: {data}")
    except httpx.TimeoutException:
        logger.warning("Gemini request timed out (15s)")
    except Exception as e:
        logger.error(f"Gemini error: {e}")

    return None
