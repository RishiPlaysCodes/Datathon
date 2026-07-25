"""Deterministic legal / police knowledge base.

This module answers *general* (non-crime-database) questions that a police user
might ask PRAHARI — e.g. "what is the punishment for theft under BNS?",
"how do I file a Zero FIR?", "cyber crime helpline number".

WHY THIS EXISTS
---------------
The conversational assistant classifies crime-database queries with a
deterministic keyword NLU (zero hallucination). Anything that does NOT map to a
crime-database intent is labelled "general" and was previously routed only to
Google Gemini. When Gemini is unavailable (no key / rate-limited / offline),
those general questions dead-ended at a generic capability menu.

This knowledge base gives PRAHARI a reliable, offline, *curated* answer for the
most common law/procedure questions, so the assistant stays useful even without
any external LLM. It is deterministic (same input -> same output) and contains
only well-established facts, each with a source note. It is NOT a substitute for
the official bare act — every answer reminds the user to verify against the
authoritative text.

MATCHING
--------
Each entry has a list of trigger keywords (English + Hinglish + a little
Kannada). A query is scored by how many of an entry's keywords it contains; the
highest-scoring entry above a small threshold wins. This mirrors the existing
intent.py approach so behaviour is predictable and explainable.

SOURCES (verified July 2026):
  - Bharatiya Nyaya Sanhita (BNS) 2023 came into force 1 July 2024, replacing IPC 1860.
    (NCRB / official police BNS handbooks.)
  - National cyber crime helpline 1930; portal https://cybercrime.gov.in
  - National emergency number 112; women helpline 1091.
  IPC->BNS section mappings below are the commonly-cited mappings; the exact
  sub-section can vary, so answers always advise confirming with the bare act.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

_VERIFY_NOTE = (
    "\n\n_Note: PRAHARI provides this from a curated reference. Always confirm the "
    "exact section and current text against the official bare act / SP office before "
    "acting on it._"
)


@dataclass
class KnowledgeEntry:
    key: str
    keywords: List[str]
    answer: str
    source: str
    # keywords that MUST be present for this entry to be eligible (optional)
    require_any: List[str] = field(default_factory=list)


# NOTE: keep keywords lowercase. Matching is done on a lowercased query.
KNOWLEDGE_BASE: List[KnowledgeEntry] = [
    KnowledgeEntry(
        key="bns_vs_ipc",
        keywords=[
            "bns", "bharatiya nyaya", "nyaya sanhita", "new criminal law",
            "naya kanoon", "naye kanoon", "ipc replaced", "ipc khatam",
            "difference between ipc and bns", "ipc vs bns", "ipc aur bns",
        ],
        answer=(
            "**IPC → BNS transition**\n"
            "The **Bharatiya Nyaya Sanhita (BNS), 2023** came into force on **1 July 2024** "
            "and replaced the Indian Penal Code, 1860. Two companion laws also changed:\n"
            "- **BNSS (Bharatiya Nagarik Suraksha Sanhita)** replaced the CrPC.\n"
            "- **BSA (Bharatiya Sakshya Adhiniyam)** replaced the Indian Evidence Act.\n\n"
            "FIRs for offences on/after 1 July 2024 are registered under BNS sections; "
            "offences before that date continue under the IPC."
        ),
        source="BNS 2023 (in force 01-07-2024)",
    ),
    KnowledgeEntry(
        key="theft",
        keywords=[
            "theft", "steal", "stealing", "chori", "punishment for theft",
            "theft punishment", "theft section", "chori ki saza", "kallatana",
        ],
        require_any=["punish", "saza", "section", "dhara", "law", "kanoon", "what is", "kya hai"],
        answer=(
            "**Theft (chori)**\n"
            "- **BNS 2023:** Section **303** defines theft; punishment up to **3 years** "
            "imprisonment, or fine, or both (repeat/aggravated theft attracts more).\n"
            "- **Earlier IPC:** Sections 378 (definition) / 379 (punishment).\n"
            "Theft = dishonestly taking movable property out of someone's possession "
            "without consent."
        ),
        source="BNS s.303 (formerly IPC 378/379)",
    ),
    KnowledgeEntry(
        key="robbery",
        keywords=[
            "robbery", "dacoity", "loot", "daketi", "robbery punishment",
            "robbery section", "darode",
        ],
        answer=(
            "**Robbery & Dacoity (loot / daketi)**\n"
            "- **Robbery** = theft or extortion with force or fear of instant harm.\n"
            "- **Dacoity** = robbery committed by five or more persons together.\n"
            "- **BNS 2023:** robbery/dacoity are covered around Sections **309–310** "
            "(formerly **IPC 390–395**). Dacoity carries much heavier punishment, "
            "including rigorous imprisonment up to life."
        ),
        source="BNS s.309-310 (formerly IPC 390-395)",
    ),
    KnowledgeEntry(
        key="murder",
        keywords=[
            "murder", "homicide", "hatya", "khoon", "katal", "murder section",
            "murder punishment", "302", "kole",
        ],
        answer=(
            "**Murder (hatya)**\n"
            "- **BNS 2023:** Section **103** — punishment is **death or life imprisonment**, "
            "plus fine.\n"
            "- **Earlier IPC:** Section **302**.\n"
            "- **Culpable homicide not amounting to murder:** BNS Section **105** "
            "(formerly IPC 304)."
        ),
        source="BNS s.103 (formerly IPC 302)",
    ),
    KnowledgeEntry(
        key="cheating_fraud",
        keywords=[
            "cheating", "fraud", "420", "dhokha", "thagi", "cheating section",
            "fraud punishment", "cheating punishment", "vanchane", "scam",
        ],
        answer=(
            "**Cheating / Fraud (dhokha, thagi)**\n"
            "- **BNS 2023:** Section **318** covers cheating; cheating + dishonestly "
            "inducing delivery of property can attract up to **7 years** and fine.\n"
            "- **Earlier IPC:** the well-known Section **420**.\n"
            "For **online** financial fraud, also report to the cyber helpline **1930** "
            "within 24 hours to improve chances of freezing the money."
        ),
        source="BNS s.318 (formerly IPC 420)",
    ),
    KnowledgeEntry(
        key="women_offences",
        keywords=[
            "dowry", "dahej", "498a", "domestic violence", "cruelty", "ghareloo hinsa",
            "wife", "husband cruelty", "vara dakshine",
        ],
        answer=(
            "**Offences against women (dowry / cruelty)**\n"
            "- **Cruelty by husband or relatives:** BNS Section **85/86** "
            "(formerly IPC 498A).\n"
            "- **Dowry death:** BNS Section **80** (formerly IPC 304B).\n"
            "- The **Protection of Women from Domestic Violence Act, 2005** additionally "
            "gives civil remedies (protection orders, residence, maintenance).\n"
            "- **Women helpline: 1091.** Emergency: **112.**"
        ),
        source="BNS s.85/86, s.80; DV Act 2005",
    ),
    KnowledgeEntry(
        key="pocso",
        keywords=[
            "pocso", "child abuse", "child sexual", "minor victim", "bachche ke saath",
            "protection of children",
        ],
        answer=(
            "**POCSO Act, 2012 (children)**\n"
            "The **Protection of Children from Sexual Offences (POCSO) Act** protects anyone "
            "**below 18 years** from sexual assault, harassment and pornography. Key points:\n"
            "- Reporting suspected offences is **mandatory**; failure to report is itself an offence.\n"
            "- Cases are heard by **Special Courts**; child-friendly procedure is required.\n"
            "- Statements are recorded sensitively, ideally by a woman officer, at the child's home or a place of choice.\n"
            "- **Childline helpline: 1098.**"
        ),
        source="POCSO Act 2012",
    ),
    KnowledgeEntry(
        key="it_act_cyber",
        keywords=[
            "it act", "information technology act", "66c", "66d", "67", "hacking",
            "identity theft", "phishing", "cyber law", "cyber section",
        ],
        answer=(
            "**IT Act, 2000 — common cyber sections**\n"
            "- **s.66** — computer-related offences (hacking/damage).\n"
            "- **s.66C** — identity theft (misuse of password, digital signature, etc.).\n"
            "- **s.66D** — cheating by personation using a computer resource (online fraud).\n"
            "- **s.67 / 67A / 67B** — publishing obscene / sexually explicit material; 67B covers child material.\n"
            "Cyber offences are often charged **together with BNS cheating/forgery sections**.\n"
            "Report at **cybercrime.gov.in** or call **1930**."
        ),
        source="Information Technology Act 2000",
    ),
    KnowledgeEntry(
        key="how_to_file_fir",
        keywords=[
            "file a fir", "file fir", "how to file", "fir kaise", "register fir",
            "fir darj", "lodge complaint", "complaint kaise", "fir process",
        ],
        answer=(
            "**How to file an FIR**\n"
            "1. Go to the police station having jurisdiction over where the offence happened.\n"
            "2. Give the information orally or in writing for a **cognizable offence**; the "
            "officer must reduce it to writing and read it back to you.\n"
            "3. **Sign** the recorded FIR and take a **free copy** — it is your right.\n"
            "4. Legal basis: **Section 173 BNSS** (formerly **Section 154 CrPC**).\n\n"
            "**Zero FIR:** if the crime falls outside that station's area, they must still "
            "register a **Zero FIR** and transfer it to the correct station — they cannot refuse "
            "on jurisdiction grounds. You can also file many complaints online via the state "
            "police / e-FIR portal for specific offences."
        ),
        source="BNSS s.173 (formerly CrPC s.154)",
    ),
    KnowledgeEntry(
        key="zero_fir",
        keywords=["zero fir", "jurisdiction fir", "outside area fir"],
        answer=(
            "**Zero FIR**\n"
            "A **Zero FIR** can be registered at **any** police station regardless of where the "
            "offence occurred; it is given serial number '0' and then transferred to the station "
            "with proper jurisdiction for investigation. Police **cannot refuse** to register it "
            "citing jurisdiction — this protects victims in time-critical cases (e.g. assault, "
            "sexual offences)."
        ),
        source="Zero FIR (BNSS/CrPC practice)",
    ),
    KnowledgeEntry(
        key="cyber_helpline",
        keywords=[
            "cyber crime helpline", "cyber helpline", "1930", "cybercrime.gov.in",
            "report cyber", "cyber fraud report", "online fraud report", "report online fraud",
        ],
        answer=(
            "**Report cyber crime / online fraud**\n"
            "- **Call 1930** — national cyber crime helpline (report financial fraud within "
            "24 hours for the best chance of freezing the transaction).\n"
            "- **Portal:** https://cybercrime.gov.in\n"
            "- Or visit the nearest **cyber police station / cyber cell**.\n"
            "Keep transaction IDs, screenshots, phone numbers and UPI/bank details ready."
        ),
        source="MHA cyber helpline 1930 / cybercrime.gov.in",
    ),
    KnowledgeEntry(
        key="emergency_numbers",
        keywords=[
            "emergency number", "helpline number", "police number", "helpline",
            "100", "112", "1091", "1098", "women helpline", "ambulance number",
            "emergency contact",
        ],
        answer=(
            "**Important emergency & helpline numbers (India)**\n"
            "- **112** — single national emergency number (police/fire/medical).\n"
            "- **100** — police.\n"
            "- **1091** — women helpline.\n"
            "- **1098** — child helpline (Childline).\n"
            "- **1930** — cyber crime / financial fraud.\n"
            "- **108 / 102** — ambulance."
        ),
        source="National emergency response numbers",
    ),
    KnowledgeEntry(
        key="ndps",
        keywords=[
            "ndps", "drug law", "narcotic", "ganja", "drugs punishment", "nasha",
            "madaka", "drug section",
        ],
        answer=(
            "**NDPS Act, 1985 (drugs)**\n"
            "The **Narcotic Drugs and Psychotropic Substances Act** governs drug offences. "
            "Punishment scales with the **quantity** seized:\n"
            "- **Small quantity** — lighter punishment (up to ~1 year / fine).\n"
            "- **Commercial quantity** — rigorous imprisonment 10–20 years and heavy fine.\n"
            "Strict procedures for search, seizure and sampling (e.g. s.42, s.50) must be "
            "followed or the case can fail in court."
        ),
        source="NDPS Act 1985",
    ),
    KnowledgeEntry(
        key="bail_basics",
        keywords=[
            "bail", "zamanat", "anticipatory bail", "bailable", "non bailable",
            "bail kya", "bail process",
        ],
        answer=(
            "**Bail — basics**\n"
            "- **Bailable offence:** bail is a right and can be granted by the police/court.\n"
            "- **Non-bailable offence:** bail is at the **court's discretion**.\n"
            "- **Anticipatory bail:** applied for *before* arrest when a person fears arrest "
            "in a non-bailable case (granted by Sessions Court / High Court).\n"
            "Bail conditions (sureties, reporting, no contact with witnesses) are set by the court."
        ),
        source="BNSS bail provisions (formerly CrPC)",
    ),
    KnowledgeEntry(
        key="what_is_prahari",
        keywords=[
            "what is prahari", "about prahari", "prahari kya", "who are you",
            "what can you do", "tum kaun", "prahari kaun",
        ],
        answer=(
            "**About PRAHARI**\n"
            "PRAHARI is a Crime Intelligence assistant for Karnataka State Police. I can search "
            "FIRs, profile accused, map crime hotspots, build criminal networks, score offender "
            "risk, and give crime statistics — all from the connected database using a "
            "**deterministic (zero-hallucination) NLU**. I also answer general law & procedure "
            "questions like this one. Type **'help'** to see every command."
        ),
        source="PRAHARI capability guide",
    ),
]


# Tokens that signal the user is asking an *informational* question (about law,
# procedure, definitions, helplines) rather than searching the crime database.
_INFO_TOKENS = [
    "what", "how", "why", "when", "which", "who", "explain", "meaning", "means",
    "define", "definition", "punish", "punishment", "sentence", "section",
    "difference", "differ", "process", "procedure", "file", "register", "report",
    "helpline", "number", "act", "law", "legal", "rights", "right", "valid", "vs",
    "under bns", "under ipc", "about",
    # Hinglish / Kannada
    "kya", "kaise", "kyun", "kaunsa", "kaun", "saza", "dhara", "kanoon", "kanun",
    "matlab", "tarika", "darj", "jaankari", "jankari", "bataye",
]

# Tokens that signal a crime-DATABASE action (search/list/aggregate). If present,
# the message is a DB query, NOT a knowledge question — the KB stays out of it.
_DB_ACTION_TOKENS = [
    "show", "list", "display", "find case", "search", "dikhao", "dikha do",
    "dikha", "batao", "how many", "kitne", "kitna", "hotspot", "heatmap",
    "network", "trend", "statistics", "count", "recent", "top ",
]


def is_informational(query: str) -> bool:
    """True if the query looks like a law/procedure *question*, not a DB search.

    Used to decide whether a message that the crime NLU greedily grabbed (because
    it shares a keyword like "theft" or "fir") should instead be answered from the
    curated knowledge base.
    """
    if not query:
        return False
    q = query.lower()
    if any(tok in q for tok in _DB_ACTION_TOKENS):
        return False
    return any(tok in q for tok in _INFO_TOKENS)


def _score(query_lower: str, entry: KnowledgeEntry) -> int:
    """Specificity score for an entry against the query.

    Each matched keyword contributes its own word-count, so a specific
    multi-word phrase (e.g. "cyber crime helpline") outweighs several generic
    single words (e.g. "helpline"). This keeps matches precise and predictable.
    """
    matched = [kw for kw in entry.keywords if kw in query_lower]
    if not matched:
        return 0
    if entry.require_any and not any(req in query_lower for req in entry.require_any):
        return 0
    return sum(len(kw.split()) for kw in matched)


def lookup(query: str) -> Optional[dict]:
    """Return a knowledge answer for a general query, or None if nothing matches.

    Deterministic: the same query always yields the same result. Returns a dict
    with the answer text, a human-readable source, the matched entry key, and the
    keywords that triggered the match (for explainability).
    """
    if not query or not query.strip():
        return None
    q = query.lower()

    best: Optional[KnowledgeEntry] = None
    best_score = 0
    for entry in KNOWLEDGE_BASE:
        s = _score(q, entry)
        if s > best_score:
            best_score = s
            best = entry

    if not best or best_score == 0:
        return None

    matched = [kw for kw in best.keywords if kw in q][:5]
    return {
        "answer": best.answer + _VERIFY_NOTE,
        "source": best.source,
        "key": best.key,
        "matched_keywords": matched,
    }
