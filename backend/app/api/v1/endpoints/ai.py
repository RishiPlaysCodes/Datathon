"""AI Chat endpoint - Conversational Crime Intelligence Interface."""
import uuid
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from typing import Optional
from datetime import datetime, timedelta

from app.db.session import get_db
from app.models.user import User, ConversationHistory
from app.models.crime import FIR, Accused, FIRAccusedLink
from app.schemas.crime import ChatMessage, ChatResponse, FIRResponse
from app.api.deps import get_current_user
from app.services.intent import classify_intent, extract_filters
from app.services.risk import calculate_risk_score

router = APIRouter(prefix="/ai", tags=["AI Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Process natural language query and return intelligence."""
    session_id = message.session_id or str(uuid.uuid4())

    # Save user message to history
    user_msg = ConversationHistory(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=message.message,
    )
    db.add(user_msg)

    # Classify intent
    intent_result = classify_intent(message.message)
    intent = intent_result["intent"]
    filters = intent_result["filters"]

    # Generate SQL (NL2SQL) - shows query transparency
    from app.services.nl2sql import generate_sql
    nl2sql_result = generate_sql(intent, filters, message.message)

    # Route to appropriate handler
    response_data = None
    sources = []
    suggestions = []

    if intent == "search_firs":
        response_text, response_data, sources = await _handle_fir_search(db, filters, message.message)
        # Also run RAG for semantic grounding
        try:
            from app.services.rag_pipeline import rag_query as _rag
            rag_result = _rag(message.message, top_k=3)
            if rag_result["retrieved_count"] > 0:
                response_text += f"\n\n---\n**🔍 RAG Semantic Search** ({rag_result['embedding_model']}):\n"
                for src in rag_result["context_used"][:3]:
                    response_text += f"  {src}\n"
                sources.extend(rag_result["sources"][:3])
        except Exception:
            pass
        suggestions = [
            "Show me the accused in these cases",
            "Display on hotspot map",
            "Filter by repeat offenders only",
        ]
    elif intent == "accused_info":
        response_text, response_data, sources = await _handle_accused_query(db, filters, message.message)
        suggestions = [
            "Show criminal network",
            "Calculate risk score",
            "Find similar offenders",
        ]
    elif intent == "network_analysis":
        response_text, response_data, sources = await _handle_network_query(db, filters, message.message)
        suggestions = [
            "Who is the most connected person?",
            "Show gang affiliations",
            "Expand to 3 degrees",
        ]
    elif intent == "hotspot_analysis":
        response_text, response_data, sources = await _handle_hotspot_query(db, filters, message.message)
        suggestions = [
            "Predict next week's hotspots",
            "Show patrol recommendations",
            "Compare with last month",
        ]
    elif intent == "risk_assessment":
        response_text, response_data, sources = await _handle_risk_query(db, filters, message.message)
        suggestions = [
            "Show risk breakdown",
            "Compare with similar offenders",
            "Show escalation pattern",
        ]
    elif intent == "statistics":
        response_text, response_data, sources = await _handle_statistics_query(db, filters, message.message)
        suggestions = [
            "Show trend over time",
            "Compare districts",
            "Break down by crime type",
        ]
    else:
        response_text = await _handle_general_query(message.message, db)
        suggestions = [
            "Show recent FIRs",
            "List repeat offenders",
            "Show crime hotspots",
            "Search by location",
        ]

    # ===== REAL LLM LAYER (Gemini) - answers anything, any language =====
    # If a Gemini key is configured, use it to generate a natural, multilingual,
    # grounded answer. The rule-based response_text becomes the fallback.
    try:
        from app.services.llm import is_llm_available, build_grounding_context, generate_answer, suggest_followups
        if is_llm_available():
            # Gather DB stats for grounding
            stats = await _gather_stats(db)
            # RAG snippets
            rag_snippets = []
            try:
                from app.services.rag_pipeline import semantic_search
                for r in semantic_search(message.message, top_k=4):
                    rag_snippets.append(f"{r.get('fir_number')}: {r.get('crime_type')} at "
                                        f"{r.get('location_name','?')} - {(r.get('description') or '')[:80]}")
            except Exception:
                pass
            # Conversation history for multi-turn context
            hist_result = await db.execute(
                select(ConversationHistory)
                .where(ConversationHistory.session_id == session_id)
                .order_by(ConversationHistory.timestamp.desc()).limit(6)
            )
            history = [{"role": h.role, "content": h.content} for h in reversed(hist_result.scalars().all())]

            context = build_grounding_context(stats, response_data, rag_snippets)
            llm_answer = generate_answer(message.message, context, history)
            if llm_answer:
                response_text = llm_answer
                llm_suggestions = suggest_followups(message.message, llm_answer)
                if llm_suggestions:
                    suggestions = llm_suggestions
    except Exception as e:
        pass  # Any LLM failure -> keep rule-based response_text

    # Apply Kannada dictionary translation ONLY as a fallback (when LLM is off
    # and user explicitly requested Kannada). Gemini handles language natively.
    if getattr(message, "language", "en") == "kn":
        from app.services.llm import is_llm_available as _llm_on
        if not _llm_on():
            from app.services.kannada import translate_to_kannada
            response_text = translate_to_kannada(response_text)

    # Save assistant response
    assistant_msg = ConversationHistory(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=response_text,
        metadata_json=json.dumps({"intent": intent, "filters": filters}) if intent else None,
    )
    db.add(assistant_msg)

    return ChatResponse(
        response=response_text,
        session_id=session_id,
        intent=intent,
        confidence=intent_result.get("confidence", 0.8),
        data={
            **(response_data or {}),
            "nl2sql": {
                "generated_sql": nl2sql_result["sql"],
                "parameters": nl2sql_result["parameters"],
                "explanation": nl2sql_result["explanation"],
                "tables_accessed": nl2sql_result["tables_accessed"],
                "template_used": nl2sql_result["template_used"],
                "security_note": nl2sql_result["security_note"],
            },
        } if response_data or nl2sql_result else None,
        sources=sources,
        suggestions=suggestions,
    )


async def _gather_stats(db: AsyncSession) -> dict:
    """Gather compact DB stats to ground the LLM (last 180 days)."""
    date_from = datetime.now() - timedelta(days=180)
    total = (await db.execute(select(func.count(FIR.id)).where(FIR.date_of_occurrence >= date_from))).scalar() or 0
    active = (await db.execute(select(func.count(FIR.id)).where(and_(FIR.date_of_occurrence >= date_from, FIR.status.in_(["open", "investigating"]))))).scalar() or 0
    closed = (await db.execute(select(func.count(FIR.id)).where(and_(FIR.date_of_occurrence >= date_from, FIR.status == "closed")))).scalar() or 0
    repeat = (await db.execute(select(func.count(Accused.id)).where(Accused.is_repeat_offender == True))).scalar() or 0
    types = (await db.execute(
        select(FIR.crime_type, func.count(FIR.id)).where(FIR.date_of_occurrence >= date_from)
        .group_by(FIR.crime_type).order_by(func.count(FIR.id).desc()).limit(8)
    )).all()
    districts = (await db.execute(
        select(FIR.district, func.count(FIR.id)).where(FIR.date_of_occurrence >= date_from)
        .group_by(FIR.district).order_by(func.count(FIR.id).desc()).limit(6)
    )).all()
    return {
        "total_firs": total, "active_cases": active, "closed_cases": closed, "repeat_offenders": repeat,
        "top_crime_types": [{"crime_type": t[0], "count": t[1]} for t in types],
        "district_stats": [{"district": d[0], "count": d[1]} for d in districts],
    }


async def _handle_fir_search(db: AsyncSession, filters: dict, query: str):
    """Handle FIR search queries."""
    conditions = []

    # BUG #4 FIX: Check for unknown crime type FIRST
    if filters.get("unknown_crime_type"):
        unknown = filters["unknown_crime_type"]
        from app.services.intent import VALID_CRIME_TYPES
        valid_list = ", ".join(VALID_CRIME_TYPES)
        return (
            f"**Unknown crime type: \"{unknown}\"**\n\n"
            f"I don't recognize \"{unknown}\" as a valid crime category. "
            f"Please use one of these:\n\n"
            f"- {chr(10).join('- ' + ct for ct in VALID_CRIME_TYPES)}\n\n"
            f"Try rephrasing your query with a valid crime type."
        ), None, []

    # BUG #1 FIX: Handle absolute dates (after July 2026, before March 2025)
    if filters.get("has_absolute_date"):
        if filters.get("date_from"):
            date_from = datetime.fromisoformat(filters["date_from"])
            conditions.append(FIR.date_of_occurrence >= date_from)
        if filters.get("date_to"):
            date_to = datetime.fromisoformat(filters["date_to"])
            conditions.append(FIR.date_of_occurrence <= date_to)
    else:
        # Relative date (last X days)
        date_from = datetime.now() - timedelta(days=filters.get("days", 180))
        conditions.append(FIR.date_of_occurrence >= date_from)

    # BUG #3 FIX: Support multiple crime types
    if filters.get("crime_types") and len(filters["crime_types"]) > 1:
        from sqlalchemy import or_
        crime_conditions = [FIR.crime_type.ilike(f"%{ct}%") for ct in filters["crime_types"]]
        conditions.append(or_(*crime_conditions))
    elif filters.get("crime_type"):
        conditions.append(FIR.crime_type.ilike(f"%{filters['crime_type']}%"))

    if filters.get("location"):
        conditions.append(
            (FIR.location_name.ilike(f"%{filters['location']}%"))
            | (FIR.district.ilike(f"%{filters['location']}%"))
        )
    if filters.get("status"):
        conditions.append(FIR.status == filters["status"])

    result = await db.execute(
        select(FIR).where(and_(*conditions)).order_by(FIR.date_of_occurrence.desc()).limit(20)
    )
    firs = result.scalars().all()

    if not firs:
        return "No FIRs found matching your query. Try broadening your search criteria.", None, []

    # Check for repeat offenders filter
    if filters.get("repeat_offenders"):
        fir_ids = [f.id for f in firs]
        link_result = await db.execute(
            select(FIRAccusedLink.fir_id).where(
                FIRAccusedLink.fir_id.in_(fir_ids),
                FIRAccusedLink.accused_id.in_(
                    select(Accused.id).where(Accused.is_repeat_offender == True)
                ),
            )
        )
        repeat_fir_ids = {row[0] for row in link_result.all()}
        firs = [f for f in firs if f.id in repeat_fir_ids]

    fir_data = [FIRResponse.model_validate(f).model_dump() for f in firs]
    sources = [f"FIR #{f.fir_number}" for f in firs[:5]]

    # Build response text
    crime_types = {}
    for f in firs:
        crime_types[f.crime_type] = crime_types.get(f.crime_type, 0) + 1

    response = f"Found **{len(firs)} FIRs** matching your query.\n\n"

    # Show applied filters for transparency
    applied_filters = []
    if filters.get("crime_types"):
        applied_filters.append(f"Crime types: {', '.join(filters['crime_types'])}")
    elif filters.get("crime_type"):
        applied_filters.append(f"Crime type: {filters['crime_type']}")
    if filters.get("location"):
        applied_filters.append(f"Location: {filters['location']}")
    if filters.get("has_absolute_date"):
        if filters.get("date_from"):
            applied_filters.append(f"From: {filters['date_from'][:10]}")
        if filters.get("date_to"):
            applied_filters.append(f"To: {filters['date_to'][:10]}")
    elif filters.get("days"):
        applied_filters.append(f"Period: last {filters['days']} days")

    if applied_filters:
        response += f"**Filters applied:** {' | '.join(applied_filters)}\n\n"

    response += "**Crime Type Breakdown:**\n"
    for ct, count in sorted(crime_types.items(), key=lambda x: -x[1]):
        response += f"- {ct}: {count} cases\n"

    if firs:
        response += f"\n**Date Range:** {firs[-1].date_of_occurrence.strftime('%d %b %Y') if firs[-1].date_of_occurrence else 'N/A'} to {firs[0].date_of_occurrence.strftime('%d %b %Y') if firs[0].date_of_occurrence else 'N/A'}"

    locations = list(set(f.location_name for f in firs if f.location_name))[:5]
    if locations:
        response += f"\n**Locations:** {', '.join(locations)}"

    return response, {"firs": fir_data, "total": len(firs)}, sources


async def _handle_accused_query(db: AsyncSession, filters: dict, query: str):
    """Handle accused-related queries."""
    conditions = []
    if filters.get("name"):
        conditions.append(
            (Accused.name.ilike(f"%{filters['name']}%"))
            | (Accused.alias.ilike(f"%{filters['name']}%"))
        )
    if filters.get("repeat_offenders"):
        conditions.append(Accused.is_repeat_offender == True)

    q = select(Accused).order_by(Accused.risk_score.desc()).limit(10)
    if conditions:
        q = q.where(and_(*conditions))

    result = await db.execute(q)
    accused_list = result.scalars().all()

    if not accused_list:
        return "No accused persons found matching your query.", None, []

    accused_data = []
    for a in accused_list:
        accused_data.append({
            "id": a.id,
            "name": a.name,
            "alias": a.alias,
            "risk_score": a.risk_score,
            "total_cases": a.total_cases,
            "is_repeat_offender": a.is_repeat_offender,
            "gang_id": a.gang_id,
        })

    response = f"Found **{len(accused_list)} accused persons**:\n\n"
    for a in accused_list[:5]:
        risk_label = "HIGH" if a.risk_score >= 70 else "MEDIUM" if a.risk_score >= 40 else "LOW"
        response += f"- **{a.name}** (Risk: {a.risk_score:.0f}/100 - {risk_label}) | {a.total_cases} cases"
        if a.is_repeat_offender:
            response += " | REPEAT OFFENDER"
        response += "\n"

    sources = [f"Accused Profile: {a.name}" for a in accused_list[:5]]
    return response, {"accused": accused_data}, sources


async def _handle_network_query(db: AsyncSession, filters: dict, query: str):
    """Handle network analysis queries."""
    # Try to find accused by name
    name = filters.get("name", "")
    if name:
        result = await db.execute(
            select(Accused).where(
                (Accused.name.ilike(f"%{name}%")) | (Accused.alias.ilike(f"%{name}%"))
            ).limit(1)
        )
        accused = result.scalar_one_or_none()
        if accused:
            from app.services.network import build_network_graph
            graph = await build_network_graph(db, accused.id, depth=2)
            response = f"**Criminal Network for {accused.name}:**\n\n"
            response += f"- Nodes: {len(graph.nodes)}\n"
            response += f"- Connections: {len(graph.edges)}\n"
            if graph.communities:
                response += f"- Communities detected: {len(graph.communities)}\n"
            if graph.key_players:
                response += "\n**Key Players:**\n"
                for kp in graph.key_players[:3]:
                    response += f"- {kp['name']} (centrality: {kp.get('centrality', 0):.2f})\n"
            return response, graph.model_dump(), [f"Network: {accused.name}"]

    return "Please specify an accused person's name to view their network.", None, []


async def _handle_hotspot_query(db: AsyncSession, filters: dict, query: str):
    """Handle hotspot analysis queries."""
    days = filters.get("days", 90)
    date_from = datetime.now() - timedelta(days=days)
    conditions = [FIR.date_of_occurrence >= date_from, FIR.latitude.isnot(None)]

    if filters.get("crime_type"):
        conditions.append(FIR.crime_type.ilike(f"%{filters['crime_type']}%"))

    result = await db.execute(
        select(
            FIR.latitude, FIR.longitude, FIR.crime_type, FIR.location_name,
            func.count(FIR.id).label("count"),
        )
        .where(and_(*conditions))
        .group_by(FIR.latitude, FIR.longitude, FIR.crime_type, FIR.location_name)
        .order_by(func.count(FIR.id).desc())
        .limit(20)
    )
    hotspots = result.all()

    if not hotspots:
        return "No hotspot data available for the specified criteria.", None, []

    hotspot_data = [
        {"lat": h[0], "lng": h[1], "crime_type": h[2], "location": h[3], "count": h[4]}
        for h in hotspots
    ]

    response = f"**Crime Hotspots (last {days} days):**\n\n"
    for h in hotspots[:5]:
        response += f"- **{h[3] or 'Unknown Location'}** ({h[2]}): {h[4]} cases\n"

    total_crimes = sum(h[4] for h in hotspots)
    response += f"\n**Total incidents in hotspots:** {total_crimes}"

    return response, {"hotspots": hotspot_data}, ["Spatial Analysis"]


async def _handle_risk_query(db: AsyncSession, filters: dict, query: str):
    """Handle risk assessment queries."""
    name = filters.get("name", "")
    if name:
        result = await db.execute(
            select(Accused).where(
                (Accused.name.ilike(f"%{name}%")) | (Accused.alias.ilike(f"%{name}%"))
            ).order_by(Accused.risk_score.desc()).limit(1)
        )
        accused = result.scalar_one_or_none()
        if accused:
            # Get linked FIRs
            link_result = await db.execute(
                select(FIRAccusedLink).where(FIRAccusedLink.accused_id == accused.id)
            )
            links = link_result.scalars().all()
            fir_ids = [l.fir_id for l in links]
            firs = []
            if fir_ids:
                fir_result = await db.execute(select(FIR).where(FIR.id.in_(fir_ids)))
                firs = [FIRResponse.model_validate(f) for f in fir_result.scalars().all()]

            risk = calculate_risk_score(accused, firs)
            response = f"**Risk Assessment for {accused.name}:**\n\n"
            response += f"**Overall Risk Score: {risk['total_score']:.0f}/100**\n\n"
            response += "**Breakdown:**\n"
            for factor in risk.get("factors", []):
                response += f"- {factor['name']}: {factor['score']:.0f} ({factor['reason']})\n"
            response += f"\n**Assessment:** {risk['explanation']}"

            return response, {"risk": risk, "accused_id": accused.id}, [f"Risk: {accused.name}"]

    # If no specific person, show top risky offenders
    result = await db.execute(
        select(Accused).where(Accused.risk_score >= 50).order_by(Accused.risk_score.desc()).limit(5)
    )
    top_risky = result.scalars().all()
    if top_risky:
        response = "**Top High-Risk Offenders:**\n\n"
        for a in top_risky:
            response += f"- **{a.name}** - Risk: {a.risk_score:.0f}/100 | Cases: {a.total_cases}\n"
        data = [{"id": a.id, "name": a.name, "risk_score": a.risk_score} for a in top_risky]
        return response, {"top_risky": data}, ["Risk Assessment Engine"]

    return "No high-risk offenders found. Specify a name for individual assessment.", None, []


async def _handle_statistics_query(db: AsyncSession, filters: dict, query: str):
    """Handle statistics queries."""
    days = filters.get("days", 90)
    date_from = datetime.now() - timedelta(days=days)

    # Total FIRs
    total_result = await db.execute(
        select(func.count(FIR.id)).where(FIR.date_of_occurrence >= date_from)
    )
    total = total_result.scalar() or 0

    # By crime type
    type_result = await db.execute(
        select(FIR.crime_type, func.count(FIR.id))
        .where(FIR.date_of_occurrence >= date_from)
        .group_by(FIR.crime_type)
        .order_by(func.count(FIR.id).desc())
        .limit(10)
    )
    by_type = type_result.all()

    # By district
    district_result = await db.execute(
        select(FIR.district, func.count(FIR.id))
        .where(FIR.date_of_occurrence >= date_from)
        .group_by(FIR.district)
        .order_by(func.count(FIR.id).desc())
        .limit(10)
    )
    by_district = district_result.all()

    response = f"**Crime Statistics (last {days} days):**\n\n"
    response += f"**Total FIRs:** {total}\n\n"
    response += "**By Crime Type:**\n"
    for ct, count in by_type[:5]:
        response += f"- {ct}: {count}\n"
    response += "\n**By District:**\n"
    for d, count in by_district[:5]:
        response += f"- {d}: {count}\n"

    data = {
        "total": total,
        "by_type": [{"type": r[0], "count": r[1]} for r in by_type],
        "by_district": [{"district": r[0], "count": r[1]} for r in by_district],
    }
    return response, data, ["Crime Statistics Database"]


async def _handle_general_query(query: str, db: AsyncSession):
    """Handle general/conversational + self-awareness queries (multilingual)."""
    query_lower = query.lower()

    # Capabilities / help / "what can you do" - English + Hindi + Kannada keywords
    help_words = ["help", "what can you do", "capabilities", "features", "kya kar sakte",
                  "kya kar sakta", "madad", "ಸಹಾಯ", "ಏನು ಮಾಡಬಹುದು", "kaam", "kya hai"]
    if any(w in query_lower for w in help_words):
        return (
            "**I'm PRAHARI** - Predictive Relational AI for Holistic Analytics & Response Intelligence, "
            "the crime intelligence brain for Karnataka State Police.\n\n"
            "**What I can do for you:**\n"
            "- 🔍 **Search FIRs** - 'Show chain-snatching cases in Koramangala last 6 months'\n"
            "- 👤 **Accused profiles & risk** - 'Tell me about Ravi Kumar' / 'high risk offenders'\n"
            "- 🔗 **Criminal networks** - 'Show network for Suresh' (Network Graph page)\n"
            "- 🗺️ **Hotspots** - 'Crime hotspots in Bangalore' (Hotspot Map page)\n"
            "- 📊 **Statistics & trends** - 'Crime statistics last quarter' (Analytics page)\n"
            "- ⚖️ **FIR validation, 🕵️ Cyber forensics, 💰 Financial analysis, 🚔 Patrol AI** and more\n\n"
            "**Tip:** Add your Gemini API key to unlock full conversational AI (answers ANY question in English/Hindi/Kannada). "
            "Ask me in any language - I understand all three!"
        )

    # Self-awareness: "how do you work", "how are you built", "which factors"
    how_words = ["how do you work", "how are you built", "how you work", "kaise kaam",
                 "kaise bana", "which factor", "risk factor", "how is risk", "ಹೇಗೆ ಕೆಲಸ"]
    if any(w in query_lower for w in how_words):
        return (
            "**How PRAHARI works:**\n\n"
            "- **Hybrid NLU** classifies your intent and extracts filters (crime type, location, dates).\n"
            "- **NL2SQL** converts it to safe SQL (shown to you for transparency).\n"
            "- **RAG semantic search** (FAISS/Sentence-BERT) finds related FIRs so answers stay grounded.\n"
            "- **Risk scoring** = 40% criminal history + 25% network centrality + 20% MO escalation + 15% recency.\n"
            "- **Graph analysis** (NetworkX) detects gangs (community detection) and key players (centrality).\n\n"
            "Everything is auditable and explainable - no black box. Ask me about any case, accused, or trend!"
        )

    # Navigation: "how do I see / where is X"
    nav_words = ["how do i", "where is", "how to see", "kaise dekhu", "kahan hai", "ಎಲ್ಲಿ"]
    if any(w in query_lower for w in nav_words):
        return (
            "**Navigating PRAHARI** (use the left sidebar):\n\n"
            "- **Command Center** - live overview (map + chat + alerts)\n"
            "- **Network Graph** - criminal connections\n"
            "- **Hotspot Map** - crime density\n"
            "- **Accused** - profiles + risk scores\n"
            "- **Analytics / Forecast / Patrol AI** - trends & predictions\n"
            "- **FIR Validator / Cyber Forensics / Financial / OSINT** - specialised tools\n"
            "- **Citizen Portal** (/citizen) - public complaint filing\n\n"
            "Or just ask me here in plain language and I'll fetch it for you!"
        )

    # Greetings - multilingual
    if any(w in query_lower for w in ["hello", "hi ", "hey", "namaste", "namaskara", "ನಮಸ್ಕಾರ", "नमस्ते"]):
        return (
            "Namaste! 🙏 I'm **PRAHARI**, your Crime Intelligence Assistant. "
            "You can ask me in English, Hindi, or Kannada about any case, accused, network, "
            "hotspot, or trend. How can I help your investigation today?"
        )

    return (
        "I can help you analyse crimes, accused, networks, hotspots, risk scores, and trends. "
        "Try asking (in English, Hindi, or Kannada):\n"
        "- 'Show theft cases in Koramangala'\n"
        "- 'Koramangala mein kitne case hue?'\n"
        "- 'Who are the high-risk offenders?'\n"
        "- 'What can you do?' / 'How do you work?'\n\n"
        "**For full free-form AI in any language, add a Gemini API key** (see setup). "
        "Then I can answer literally anything about the data."
    )


@router.get("/status")
async def ai_status(current_user: User = Depends(get_current_user)):
    """Report which AI engine is active (real LLM vs rule-based)."""
    try:
        from app.services.llm import is_llm_available
        llm_on = is_llm_available()
    except Exception:
        llm_on = False
    try:
        from app.services.rag_pipeline import get_rag_status
        rag = get_rag_status()
    except Exception:
        rag = {"embedding_type": "none", "index_size": 0}
    return {
        "llm_engine": "Gemini 1.5 Flash" if llm_on else "Rule-based NLU (add GEMINI_API_KEY for full AI)",
        "llm_active": llm_on,
        "multilingual": llm_on,  # Gemini handles any language natively
        "rag": rag,
        "capabilities": (
            ["Free-form Q&A", "Any language (English/Hindi/Kannada/...)", "Grounded in DB", "Multi-turn context"]
            if llm_on else
            ["Structured queries", "Intent templates", "Kannada dictionary", "RAG search"]
        ),
    }


@router.get("/chat/history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get conversation history for a session."""
    result = await db.execute(
        select(ConversationHistory)
        .where(
            ConversationHistory.session_id == session_id,
            ConversationHistory.user_id == current_user.id,
        )
        .order_by(ConversationHistory.timestamp)
    )
    messages = result.scalars().all()
    return [
        {
            "role": msg.role,
            "content": msg.content,
            "timestamp": str(msg.timestamp) if msg.timestamp else None,
        }
        for msg in messages
    ]
