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

# Preferred models in priority order (newest/fastest first). Model names change
# over time, so we auto-detect what's actually available for this API key.
_PREFERRED_MODELS = [
    "gemini-2.0-flash", "gemini-2.5-flash", "gemini-flash-latest",
    "gemini-2.0-flash-001", "gemini-1.5-flash-latest", "gemini-1.5-flash",
    "gemini-2.5-pro", "gemini-pro-latest", "gemini-pro",
]
_MODEL_NAME = None


def _pick_available_model(genai):
    """Query the API for models that support generateContent and pick the best."""
    try:
        available = []
        for m in genai.list_models():
            methods = getattr(m, "supported_generation_methods", []) or []
            if "generateContent" in methods:
                available.append(m.name.replace("models/", ""))
        # Prefer our priority list
        for pref in _PREFERRED_MODELS:
            for av in available:
                if pref == av or pref in av:
                    return av
        # Otherwise first available flash model, else first available
        for av in available:
            if "flash" in av:
                return av
        if available:
            return available[0]
    except Exception as e:
        logger.warning(f"LLM: could not list models ({e}); trying default")
    return "gemini-2.0-flash"


def _ordered_candidates(genai):
    """Return candidate models that support generateContent, best first."""
    available = []
    try:
        for m in genai.list_models():
            methods = getattr(m, "supported_generation_methods", []) or []
            if "generateContent" in methods:
                available.append(m.name.replace("models/", ""))
    except Exception as e:
        logger.warning(f"LLM: list_models failed ({e})")
    # Order: preferred names first (that are available), then any flash, then rest
    ordered = []
    for pref in _PREFERRED_MODELS:
        for av in available:
            if (pref == av or pref in av) and av not in ordered:
                ordered.append(av)
    for av in available:
        if "flash" in av and av not in ordered:
            ordered.append(av)
    for av in available:
        if av not in ordered:
            ordered.append(av)
    # If list_models returned nothing, fall back to hardcoded guesses
    return ordered or _PREFERRED_MODELS


if not settings.GEMINI_API_KEY:
    logger.warning("LLM: No GEMINI_API_KEY found (.env not loaded or key blank) - using rule-based fallback")
else:
    try:
        import google.generativeai as genai
    except ImportError:
        logger.warning("LLM: GEMINI_API_KEY is set BUT 'google-generativeai' is NOT installed. "
                       "Run: pip install google-generativeai  -- then restart. Using rule-based fallback for now.")
        genai = None
    if genai is not None:
        try:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            # Try each candidate with a REAL test call - only lock in one that actually works.
            # (Creating GenerativeModel doesn't validate; only generate_content does.)
            for cand in _ordered_candidates(genai):
                try:
                    test_model = genai.GenerativeModel(cand)
                    test_model.generate_content("ping")
                    _MODEL = test_model
                    _MODEL_NAME = cand
                    _GENAI_READY = True
                    logger.info(f"LLM: Gemini READY - verified working model '{cand}'")
                    break
                except Exception as ce:
                    logger.info(f"LLM: model '{cand}' not usable ({str(ce)[:80]}); trying next")
            if not _GENAI_READY:
                logger.warning("LLM: No usable Gemini model for this key - using rule-based fallback")
        except Exception as e:
            logger.warning(f"LLM: Gemini init failed ({e}) - using rule-based fallback")


def is_llm_available() -> bool:
    return _GENAI_READY and _MODEL is not None


PLATFORM_KNOWLEDGE = """
=== ABOUT PRAHARI (know yourself) ===
PRAHARI = "Predictive Relational AI for Holistic Analytics & Response Intelligence".
You are a Crime Intelligence Operating System built for Karnataka State Police (KSP).
You are NOT just a chatbot - you are the AI brain of a full platform.

HOW YOU WORK (your own architecture):
- Hybrid NLU: intent classification + entity/filter extraction on every query.
- NL2SQL engine: converts natural language into safe, parameterized SQL (shown to the user for transparency).
- RAG pipeline: FAISS/Sentence-BERT (or TF-IDF) semantic search over all FIRs so answers are grounded, not hallucinated.
- Risk scoring engine: 0-100 score = 40% criminal history + 25% network centrality + 20% MO escalation + 15% recency.
- Graph analysis (NetworkX): community detection (gangs) + degree centrality (key players) + entity resolution (RapidFuzz).
- You (this LLM) generate the final natural-language answer, grounded in the live database context provided each turn.

PLATFORM FEATURES & HOW TO ACCESS THEM (guide users here when relevant):
- Command Center (/command-center): single-screen live view - chat, crime map, network graph, alerts, stats.
- AI Chat (/chat): this conversation - natural language crime queries in English/Hindi/Kannada + voice + PDF export.
- FIR Records (/firs): browse/search/filter all First Information Reports.
- FIR Validator (/fir-validator): checks a complaint against BNS 2023 / IPC / IT Act, flags wrong sections.
- Network Graph (/network): interactive criminal network - zoom, drag, entity resolution.
- Hotspot Map (/hotspots): Leaflet crime density heatmap by area.
- Accused / Profiling (/accused): offender profiles with explainable risk scores and behavioural analysis.
- Analytics (/analytics): crime trends, pie/bar charts, district comparison.
- Forecast & Alerts (/forecast): predictions, early-warning alerts, patrol suggestions.
- Patrol AI (/patrol): intelligent area-wise patrol deployment plan.
- CCTV / IoT (/cctv): camera network with AI detections (vehicle/face/anomaly).
- Dark Web Intel (/darkweb): dark web threat monitoring feed.
- Deepfake Detection (/deepfake): analyse audio/video for manipulation.
- OSINT Engine (/osint): open-source intelligence lookup on a suspect.
- Cyber Forensics (/cyber-forensics): detects attack method (phishing/SIM swap/UPI/ransomware) + forensic steps.
- Sociological (/sociological): crime vs socio-economic correlations.
- Decision Support (/investigator): auto case summary, timeline, leads, similar past cases.
- Financial Crime (/financial): money-trail & suspicious transaction analysis.
- Audit Logs (/audit): hash-chained tamper-evident logs (Supervisor role only).
- Citizen Portal (/citizen): public - file/track complaints, area safety, community watch, SOS. No login needed.

ROLES: Constable, Investigator, Analyst, Supervisor, Policymaker (5-tier RBAC).

WHAT YOU CAN ANALYSE: any registered case/FIR, any accused, criminal networks, hotspots,
risk levels, trends, financial links, socio-economic patterns, investigator leads, citizen complaints.
"""

SYSTEM_PROMPT = """You are PRAHARI, the AI Crime Intelligence Assistant for the Karnataka State Police (KSP).

CORE RULES:
1. LANGUAGE: Detect the user's language and reply in the SAME language. Hindi -> Hindi, Kannada -> Kannada, English -> English, Hinglish -> Hinglish. Understand all three fluently.
2. GROUNDING: Base every factual claim (numbers, FIR IDs, names) on the DATA CONTEXT provided each turn. If the data lacks the answer, say so honestly and tell the user which PRAHARI page/feature to open to find it. NEVER invent case data.
3. SELF-AWARENESS: You know what PRAHARI is, how you work, your features, and how to navigate the platform (see PLATFORM KNOWLEDGE). If a user asks "what can you do", "how are you built", "how do I see X", "which factors do you use for risk", etc. - answer confidently and guide them to the right feature/page.
4. ANALYSIS: You can analyse anything in the system - cases, accused, networks, trends, finances, complaints. Give insights, not just raw data. Explain the "why".
5. STYLE: Concise, professional, like a senior police intelligence officer. Use markdown (bold, bullets). Offer a helpful next step.
""" + PLATFORM_KNOWLEDGE


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
