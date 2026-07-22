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
from app.api.deps import require_role
from app.services.intent import classify_intent, extract_filters
from app.services.risk import calculate_risk_score
from app.services.audit import record_audit_event

router = APIRouter(prefix="/ai", tags=["AI Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    message: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
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

    # Route to appropriate handler
    response_data = None
    sources = []
    suggestions = []

    if intent == "search_firs":
        response_text, response_data, sources = await _handle_fir_search(db, filters, message.message)
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
    elif intent in ("help", "general"):
        response_text, response_data, sources = await _handle_help_query(db)
        suggestions = [
            "Show recent theft cases",
            "List repeat offenders",
            "Crime statistics this month",
            "Crime hotspots in Bangalore",
        ]
    elif intent == "greeting":
        response_text = (
            "Namaste! Main **PRAHARI** hoon - aapka Crime Intelligence Assistant. "
            "Aap mujhse English ya Hinglish dono mein baat kar sakte ho. "
            "Type 'help' ya 'features' to see everything I can do."
        )
        suggestions = [
            "What can you do?",
            "Show recent FIRs",
            "Crime statistics this month",
            "List repeat offenders",
        ]

    # Save assistant response
    assistant_msg = ConversationHistory(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=response_text,
        metadata_json=json.dumps({"intent": intent, "filters": filters}) if intent else None,
    )
    db.add(assistant_msg)
    await record_audit_event(
        db,
        current_user,
        "AI_QUERY",
        details=f"Classified intent: {intent}",
        query_text=message.message,
        risk_level="medium" if intent in {"network_analysis", "risk_assessment"} else "low",
    )

    return ChatResponse(
        response=response_text,
        session_id=session_id,
        intent=intent,
        confidence=intent_result.get("confidence", 0.8),
        data=response_data,
        sources=sources,
        suggestions=suggestions,
    )


async def _handle_fir_search(db: AsyncSession, filters: dict, query: str):
    """Handle FIR search queries."""
    conditions = []
    date_from = datetime.now() - timedelta(days=filters.get("days", 180))
    conditions.append(FIR.date_of_occurrence >= date_from)

    if filters.get("crime_type"):
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
    conditions = [FIR.date_of_occurrence >= date_from]
    if filters.get("crime_type"):
        conditions.append(FIR.crime_type.ilike(f"%{filters['crime_type']}%"))
    if filters.get("location"):
        conditions.append(
            (FIR.location_name.ilike(f"%{filters['location']}%"))
            | (FIR.district.ilike(f"%{filters['location']}%"))
        )

    # Total FIRs
    total_result = await db.execute(
        select(func.count(FIR.id)).where(and_(*conditions))
    )
    total = total_result.scalar() or 0

    # By crime type
    type_result = await db.execute(
        select(FIR.crime_type, func.count(FIR.id))
        .where(and_(*conditions))
        .group_by(FIR.crime_type)
        .order_by(func.count(FIR.id).desc())
        .limit(10)
    )
    by_type = type_result.all()

    # By district
    district_result = await db.execute(
        select(FIR.district, func.count(FIR.id))
        .where(and_(*conditions))
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


async def _handle_help_query(db: AsyncSession):
    """Explain capabilities, grounded with live database counts.

    This is the graceful fallback for any query we can't map to a specific
    intent, so the assistant never dead-ends with 'please rephrase'.
    """
    total_firs = (await db.execute(select(func.count(FIR.id)))).scalar() or 0
    total_accused = (await db.execute(select(func.count(Accused.id)))).scalar() or 0
    repeat = (
        await db.execute(select(func.count(Accused.id)).where(Accused.is_repeat_offender == True))
    ).scalar() or 0

    response = (
        "I'm **PRAHARI**, your Crime Intelligence Assistant. I can answer questions in "
        "**English or Hinglish**. Here's what I can do right now over "
        f"**{total_firs} FIRs**, **{total_accused} accused** ({repeat} repeat offenders):\n\n"
        "**1. Search FIRs** — _\"Show chain snatching cases in Koramangala last 6 months\"_ / _\"chori ke case dikhao\"_\n"
        "**2. Accused Info** — _\"Tell me about Ravi Kumar\"_ / _\"aaropi ki jaankari do\"_\n"
        "**3. Criminal Network** — _\"Show network for Ravi Kumar\"_ / _\"gang dikhao\"_\n"
        "**4. Crime Hotspots** — _\"Crime hotspots in Bangalore\"_ / _\"khatarnak ilaka batao\"_\n"
        "**5. Risk Assessment** — _\"Risk score for the top offender\"_ / _\"kitna khatarnak hai\"_\n"
        "**6. Statistics & Trends** — _\"Crime statistics this month\"_ / _\"kitne case hue\"_\n\n"
        "Just type (or **speak** using the mic) your question naturally."
    )
    data = {
        "capabilities": [
            "search_firs", "accused_info", "network_analysis",
            "hotspot_analysis", "risk_assessment", "statistics",
        ],
        "totals": {"firs": total_firs, "accused": total_accused, "repeat_offenders": repeat},
    }
    return response, data, ["PRAHARI Capability Guide"]


@router.get("/chat/history/{session_id}")
async def get_chat_history(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("constable")),
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
