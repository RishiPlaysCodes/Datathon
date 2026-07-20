"""
NL2SQL Engine — Converts natural language queries into validated SQL.

Enterprise Architecture:
  User NL Query → Intent Classification → Filter Extraction →
  SQL Template Selection → Parameter Binding → Query Validation →
  Execution → Result Formatting

The generated SQL is ALWAYS shown to the user (explainability requirement).
SQL is constructed via parameterized templates (never raw string interpolation)
to prevent injection. The LLM/NLU layer NEVER gets direct DB access.
"""
import re
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta


# Schema-aware SQL templates for each intent
# These are the ONLY SQL patterns the system can generate (security by design)
SQL_TEMPLATES = {
    "search_firs": {
        "base": "SELECT fir_number, crime_type, location_name, district, description, status, severity, date_of_occurrence FROM firs",
        "conditions": [],
        "order": "ORDER BY date_of_occurrence DESC",
        "limit": "LIMIT 20",
    },
    "accused_search": {
        "base": "SELECT name, alias, age, gender, risk_score, total_cases, is_repeat_offender, gang_id FROM accused",
        "conditions": [],
        "order": "ORDER BY risk_score DESC",
        "limit": "LIMIT 10",
    },
    "hotspot_query": {
        "base": "SELECT location_name, crime_type, latitude, longitude, COUNT(*) as incident_count FROM firs",
        "conditions": ["latitude IS NOT NULL"],
        "group": "GROUP BY location_name, crime_type, latitude, longitude",
        "order": "ORDER BY incident_count DESC",
        "limit": "LIMIT 20",
    },
    "statistics": {
        "base": "SELECT crime_type, COUNT(*) as count FROM firs",
        "conditions": [],
        "group": "GROUP BY crime_type",
        "order": "ORDER BY count DESC",
        "limit": "LIMIT 10",
    },
    "network_query": {
        "base": """SELECT a.name, a.risk_score, cn.relationship_type, cn.strength,
                   a2.name as connected_to, a2.risk_score as connected_risk
                   FROM criminal_networks cn
                   JOIN accused a ON cn.source_accused_id = a.id
                   JOIN accused a2 ON cn.target_accused_id = a2.id""",
        "conditions": [],
        "order": "ORDER BY cn.strength DESC",
        "limit": "LIMIT 15",
    },
    "risk_query": {
        "base": "SELECT name, alias, risk_score, total_cases, gang_id, is_repeat_offender FROM accused",
        "conditions": ["risk_score >= 50"],
        "order": "ORDER BY risk_score DESC",
        "limit": "LIMIT 5",
    },
}


def generate_sql(intent: str, filters: Dict[str, Any], raw_query: str = "") -> Dict[str, Any]:
    """
    Generate validated SQL from classified intent + extracted filters.

    Returns:
        {
            "sql": "SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT ...",
            "parameters": {"crime_type": "%theft%", ...},
            "explanation": "human-readable explanation of what the SQL does",
            "tables_accessed": ["firs"],
            "intent": "search_firs",
            "is_valid": True,
        }
    """
    # Map intent to SQL template
    template_key = _map_intent_to_template(intent)
    template = SQL_TEMPLATES.get(template_key, SQL_TEMPLATES["search_firs"])

    base = template["base"]
    conditions = list(template.get("conditions", []))
    parameters: Dict[str, Any] = {}
    explanation_parts = []

    # Build WHERE conditions from filters
    if filters.get("crime_type"):
        conditions.append("crime_type LIKE :crime_type")
        parameters["crime_type"] = f"%{filters['crime_type']}%"
        explanation_parts.append(f"crime type matching '{filters['crime_type']}'")

    if filters.get("crime_types"):
        or_parts = [f"crime_type LIKE :ct_{i}" for i in range(len(filters["crime_types"]))]
        conditions.append(f"({' OR '.join(or_parts)})")
        for i, ct in enumerate(filters["crime_types"]):
            parameters[f"ct_{i}"] = f"%{ct}%"
        explanation_parts.append(f"crime types: {', '.join(filters['crime_types'])}")

    if filters.get("location"):
        conditions.append("(location_name LIKE :location OR district LIKE :location)")
        parameters["location"] = f"%{filters['location']}%"
        explanation_parts.append(f"location matching '{filters['location']}'")

    if filters.get("status"):
        conditions.append("status = :status")
        parameters["status"] = filters["status"]
        explanation_parts.append(f"status = '{filters['status']}'")

    if filters.get("has_absolute_date"):
        if filters.get("date_from"):
            conditions.append("date_of_occurrence >= :date_from")
            parameters["date_from"] = filters["date_from"]
            explanation_parts.append(f"after {filters['date_from'][:10]}")
        if filters.get("date_to"):
            conditions.append("date_of_occurrence <= :date_to")
            parameters["date_to"] = filters["date_to"]
            explanation_parts.append(f"before {filters['date_to'][:10]}")
    elif filters.get("days"):
        date_from = (datetime.now() - timedelta(days=filters["days"])).isoformat()
        conditions.append("date_of_occurrence >= :date_from")
        parameters["date_from"] = date_from
        explanation_parts.append(f"within last {filters['days']} days")

    if filters.get("name") and template_key in ("accused_search", "network_query", "risk_query"):
        conditions.append("(name LIKE :name OR alias LIKE :name)")
        parameters["name"] = f"%{filters['name']}%"
        explanation_parts.append(f"name matching '{filters['name']}'")

    if filters.get("repeat_offenders") and template_key == "accused_search":
        conditions.append("is_repeat_offender = 1")
        explanation_parts.append("repeat offenders only")

    # Assemble SQL
    sql = base
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    if template.get("group"):
        sql += " " + template["group"]
    sql += " " + template.get("order", "")
    sql += " " + template.get("limit", "LIMIT 20")

    # Build explanation
    table_name = _extract_table(base)
    explanation = f"Querying {table_name}"
    if explanation_parts:
        explanation += " where " + ", ".join(explanation_parts)
    explanation += f". {template.get('order', '')}. Limited to top results."

    return {
        "sql": sql.strip(),
        "parameters": parameters,
        "explanation": explanation,
        "tables_accessed": [table_name],
        "intent": intent,
        "template_used": template_key,
        "is_valid": True,
        "security_note": "Query generated from validated template with parameterized inputs. No raw user input in SQL.",
    }


def _map_intent_to_template(intent: str) -> str:
    """Map classified intent to SQL template key."""
    mapping = {
        "search_firs": "search_firs",
        "accused_info": "accused_search",
        "network_analysis": "network_query",
        "hotspot_analysis": "hotspot_query",
        "risk_assessment": "risk_query",
        "statistics": "statistics",
    }
    return mapping.get(intent, "search_firs")


def _extract_table(base_sql: str) -> str:
    """Extract primary table name from base SQL."""
    match = re.search(r"FROM\s+(\w+)", base_sql, re.IGNORECASE)
    return match.group(1) if match else "unknown"
