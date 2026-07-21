"""
LLM Service - Real conversational AI using Google Gemini.

Provides free-form, multilingual (English / Hindi / Kannada / any language)
answers that are GROUNDED in the crime database (RAG-style context injection)
so the model does not hallucinate.

If no GEMINI_API_KEY is configured, callers fall back to the rule-based engine.
"""
import logging
from typing import List, Dict, Any, Optional

from app.core.config import settings

logger = logging.getLogger("prahari")

_GENAI_READY = False
_MODEL = None

try:
    if settings.GEMINI_API_KEY:
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        _MODEL = genai.GenerativeModel("gemini-1.5-flash")
        _GENAI_READY = True
        logger.info("LLM: Gemini 1.5 Flash ready (conversational AI enabled)")
    else:
        logger.info("LLM: No GEMINI_API_KEY set - using rule-based fallback")
except Exception as e:  # pragma: no cover
    logger.warning(f"LLM: Gemini init failed ({e}) - using rule-based fallback")


def is_llm_available() -> bool:
    return _GENAI_READY and _MODEL is not None


SYSTEM_PROMPT = """You are PRAHARI, an AI Crime Intelligence Assistant for the Karnataka State Police (KSP).

RULES:
1. Answer in the SAME language the user writes in. If they write in Hindi, reply in Hindi. If Kannada, reply in Kannada. If English, reply in English. Mixed language is fine.
2. Ground every factual claim in the DATA CONTEXT provided below. If the data does not contain the answer, say so honestly - do not invent FIR numbers, names, or statistics.
3. Be concise, professional, and helpful - like an experienced police intelligence officer.
4. You may explain crime concepts, investigation techniques, and give general guidance even without specific data.
5. Use markdown formatting (bold, bullet points) for clarity.
6. Never fabricate case data. If asked about something not in the data, guide the user on how to find it in the PRAHARI system.
"""


def build_grounding_context(stats: Dict[str, Any], query_data: Optional[Dict[str, Any]],
                             rag_snippets: Optional[List[str]]) -> str:
    """Assemble a compact grounding context string from DB data."""
    lines = ["=== LIVE CRIME DATABASE CONTEXT ==="]

    if stats:
        lines.append(f"Total FIRs (last 6 months): {stats.get('total_firs', 'N/A')}")
        lines.append(f"Active cases: {stats.get('active_cases', 'N/A')} | Closed: {stats.get('closed_cases', 'N/A')}")
        lines.append(f"Repeat offenders flagged: {stats.get('repeat_offenders', 'N/A')}")
        if stats.get("top_crime_types"):
            tops = ", ".join(f"{c['crime_type']} ({c['count']})" for c in stats["top_crime_types"][:6])
            lines.append(f"Top crime types: {tops}")
        if stats.get("district_stats"):
            ds = ", ".join(f"{d['district']} ({d['count']})" for d in stats["district_stats"][:5])
            lines.append(f"Crime by district: {ds}")

    if query_data:
        if query_data.get("firs"):
            lines.append("\nMatching FIRs for this query:")
            for f in query_data["firs"][:8]:
                lines.append(f"- {f.get('fir_number')}: {f.get('crime_type')} at {f.get('location_name','?')} "
                             f"[{f.get('status')}] - {(f.get('description') or '')[:90]}")
        if query_data.get("accused"):
            lines.append("\nMatching accused persons:")
            for a in query_data["accused"][:8]:
                lines.append(f"- {a.get('name')} (risk {a.get('risk_score',0):.0f}/100, "
                             f"{a.get('total_cases')} cases{', REPEAT' if a.get('is_repeat_offender') else ''})")
        if query_data.get("hotspots"):
            lines.append("\nCrime hotspots:")
            for h in query_data["hotspots"][:8]:
                lines.append(f"- {h.get('location')}: {h.get('crime_type')} ({h.get('count')} cases)")
        if query_data.get("by_type"):
            lines.append("\nStatistics by crime type:")
            for t in query_data["by_type"][:8]:
                lines.append(f"- {t.get('type')}: {t.get('count')}")

    if rag_snippets:
        lines.append("\nSemantically related cases (RAG):")
        for s in rag_snippets[:5]:
            lines.append(f"- {s}")

    return "\n".join(lines)


def generate_answer(user_query: str, context: str,
                    history: Optional[List[Dict[str, str]]] = None) -> Optional[str]:
    """
    Generate a grounded, multilingual answer via Gemini.
    Returns None if the LLM is unavailable or errors (caller falls back).
    """
    if not is_llm_available():
        return None

    try:
        convo = SYSTEM_PROMPT + "\n\n" + context + "\n\n"
        if history:
            convo += "=== RECENT CONVERSATION ===\n"
            for h in history[-6:]:
                role = "User" if h.get("role") == "user" else "PRAHARI"
                convo += f"{role}: {h.get('content','')[:300]}\n"
            convo += "\n"
        convo += f"=== CURRENT USER QUESTION ===\n{user_query}\n\nPRAHARI's answer (same language as the question):"

        response = _MODEL.generate_content(
            convo,
            generation_config={"temperature": 0.4, "max_output_tokens": 800},
        )
        return (response.text or "").strip() or None
    except Exception as e:
        logger.error(f"LLM generation error: {e}")
        return None


def suggest_followups(user_query: str, answer: str) -> List[str]:
    """Generate 3 dynamic follow-up suggestions in the user's language."""
    if not is_llm_available():
        return []
    try:
        prompt = (
            f"User asked: {user_query}\nAssistant answered: {answer[:400]}\n\n"
            "Suggest exactly 3 short, relevant follow-up questions the user might ask next. "
            "Reply in the SAME language as the user. Return ONLY the 3 questions, one per line, no numbering."
        )
        response = _MODEL.generate_content(prompt, generation_config={"temperature": 0.6, "max_output_tokens": 150})
        lines = [l.strip("-•* ").strip() for l in (response.text or "").split("\n") if l.strip()]
        return lines[:3]
    except Exception:
        return []
