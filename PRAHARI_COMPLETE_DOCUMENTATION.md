# PRAHARI — Complete A-to-Z Technical Documentation
## Predictive Relational AI for Holistic Analytics & Response Intelligence
### Crime Intelligence Operating System for Karnataka State Police

---

# TABLE OF CONTENTS

1. [What is PRAHARI](#1-what-is-prahari)
2. [Problem Statement](#2-problem-statement)
3. [Complete Feature List (27 Police + 7 Citizen = 34 features)](#3-complete-feature-list)
4. [System Architecture](#4-system-architecture)
5. [Tech Stack & Why Each Was Chosen](#5-tech-stack)
6. [RAG Pipeline — How It Works](#6-rag-pipeline)
7. [NL2SQL Engine — How Natural Language Becomes SQL](#7-nl2sql-engine)
8. [Risk Scoring Formula — The Math](#8-risk-scoring)
9. [Criminal Network Analysis — Graph Intelligence](#9-network-analysis)
10. [LLM Integration (Gemini) — Real Conversational AI](#10-llm-integration)
11. [Folder Structure (Every File Explained)](#11-folder-structure)
12. [Backend Code — A to Z Explanation](#12-backend-code)
13. [Frontend Code — A to Z Explanation](#13-frontend-code)
14. [Database Schema](#14-database-schema)
15. [API Endpoints (Complete List — 40+)](#15-api-endpoints)
16. [How to Run (Setup)](#16-how-to-run)
17. [How to Test Every Feature (QA Checklist)](#17-testing-checklist)
18. [Security Architecture](#18-security)
19. [Deployment Guide](#19-deployment)
20. [Demo Credentials](#20-credentials)

---

# 1. WHAT IS PRAHARI

PRAHARI is NOT a chatbot. NOT a dashboard. NOT a graph tool.

It is a **Crime Intelligence Operating System** — where one natural language query
(in English, Hindi, or Kannada) triggers a cascade of intelligence:

```
User Query → Intent Classification → NL2SQL → Database Query → RAG Semantic Search
→ Criminal Network Analysis → Risk Scoring → Explainable Response → Suggestions
```

Think of it as **"ChatGPT + Palantir + Crime Map + Intelligence Agency Command Center"**
built specifically for Indian police departments.

**Two portals:**
- **Police Portal** (login required) — 20 pages of crime intelligence tools
- **Citizen Portal** (public, no login) — 7 pages for transparency + community safety

---

# 2. PROBLEM STATEMENT

Karnataka State Police logs 2+ lakh FIRs a year. Current problems:

| Problem | PRAHARI Solution |
|---------|-----------------|
| Officers spend 60% time SEARCHING, not analyzing | Natural language AI search |
| Criminal connections hidden across FIRs | Graph-based network discovery |
| No prediction of where crime will happen | Forecasting + patrol AI |
| FIR sections incorrectly applied | AI FIR Validator (BNS/IPC/IT Act) |
| Cyber crime methods hard to investigate | Cyber forensics with step-by-step |
| Citizens can't track their complaints | Public transparency portal |
| Police inaction goes unnoticed | Auto-escalation after 7 days |
| Data scattered, no unified intelligence | Single command center view |

---

# 3. COMPLETE FEATURE LIST

## Police Portal (20 pages, login required)

| # | Feature | Page URL | What It Does |
|---|---------|----------|--------------|
| 1 | Command Center | `/command-center` | Single screen: AI chat + live map + network graph + alerts + stats |
| 2 | AI Chat | `/chat` | Natural language queries in English/Hindi/Kannada, voice, PDF export |
| 3 | Dashboard | `/dashboard` | Charts: trends, pie, bar, district comparison |
| 4 | FIR Records | `/firs` | Browse/search/filter all FIRs with pagination |
| 5 | FIR Validator | `/fir-validator` | Validates FIR against BNS 2023/IPC/IT Act, suggests correct sections |
| 6 | Network Graph | `/network` | Interactive criminal network: zoom, pan, drag, entity resolution |
| 7 | Hotspot Map | `/hotspots` | Leaflet crime density map with filters |
| 8 | Accused/Profiling | `/accused` | Risk scores (0-100), behavioral profiles, MO analysis |
| 9 | Analytics | `/analytics` | Detailed trend/pie/bar charts with time filters |
| 10 | Forecast & Alerts | `/forecast` | Crime predictions, early warnings, patrol suggestions |
| 11 | Patrol AI | `/patrol` | Intelligent area-wise deployment plan with AI reasoning |
| 12 | CCTV/IoT | `/cctv` | Camera network + AI detections (vehicle/face/anomaly) |
| 13 | Dark Web Intel | `/darkweb` | Threat intelligence from dark forums/Telegram/leak sites |
| 14 | Deepfake Detection | `/deepfake` | Audio/video manipulation analysis with indicators |
| 15 | OSINT Engine | `/osint` | Open-source intelligence lookup (phone/email/social) |
| 16 | Cyber Forensics | `/cyber-forensics` | Attack method detection + forensic steps |
| 17 | Sociological | `/sociological` | Crime vs demographics/economics correlations |
| 18 | Decision Support | `/investigator` | Case summary + timeline + leads + similar cases |
| 19 | Financial Crime | `/financial` | Money trail + suspicious transaction patterns |
| 20 | Audit Logs | `/audit` | Hash-chained tamper-evident logs (supervisor only) |

## Citizen Portal (7 pages, NO login)

| # | Feature | Page URL | What It Does |
|---|---------|----------|--------------|
| 21 | Citizen Home | `/citizen` | Landing page with feature overview |
| 22 | File Complaint | `/citizen/report` | Online FIR filing with tracking ID |
| 23 | Track Complaint | `/citizen/track` | Transparent status + auto-escalation |
| 24 | Area Safety | `/citizen/safety` | Safety scores (0-10) per area |
| 25 | Community Watch | `/citizen/community` | Report suspicious activity + upvote |
| 26 | Transparency | `/citizen/transparency` | Public accountability dashboard |
| 27 | Emergency SOS | `/citizen/sos` | Panic button with geolocation |

## Cross-Cutting Features

| Feature | Where |
|---------|-------|
| Voice Input (Speech-to-Text) | Chat page, Command Center |
| Voice Output (Text-to-Speech) | Listen button on AI responses |
| PDF Export | Chat page — full investigation report |
| Multilingual (EN/HI/KN) | Chat, voice, toggle button |
| Real-time Alerts | Auto-refresh every 30s |
| PWA (install on phone) | manifest.json + service worker |
| Error Boundary | Global crash recovery |
| RAG Semantic Search | AI chat + similar cases |
| NL2SQL Transparency | Generated SQL shown on every response |
| Explainable AI | Sources + confidence + reasoning on every answer |

---

# 4. SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         USER LAYER                                       │
│  Police (login)  │  Citizen (public)  │  Phone (PWA)  │  Voice          │
└────────────────────────────┬────────────────────────────────────────────┘
                              │
┌────────────────────────────▼────────────────────────────────────────────┐
│                    REACT FRONTEND (Port 5174)                             │
│  Command Center │ 20 Police Pages │ 7 Citizen Pages │ Error Boundary     │
│  State: Zustand │ Data: React Query │ Maps: Leaflet │ Charts: Recharts   │
└────────────────────────────┬────────────────────────────────────────────┘
                              │  HTTP/REST (axios)
┌────────────────────────────▼────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Port 8001)                            │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ AUTH LAYER   │  │ NLU/INTENT   │  │ NL2SQL       │                  │
│  │ JWT + RBAC   │  │ Regex+Scores │  │ Template SQL │                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
│         │                  │                  │                          │
│  ┌──────▼──────────────────▼──────────────────▼───────┐                 │
│  │              SERVICE LAYER                          │                 │
│  │  • RAG Pipeline (FAISS/TF-IDF)                     │                 │
│  │  • LLM (Gemini — multilingual)                     │                 │
│  │  • Risk Scoring Engine (4-factor)                  │                 │
│  │  • Network Graph (NetworkX + RapidFuzz)            │                 │
│  │  • FIR Validator (BNS/IPC/IT Act)                  │                 │
│  │  • Cyber Forensics (attack detection)              │                 │
│  │  • Financial Analysis (patterns)                   │                 │
│  │  • Public Safety (area scores, escalation)         │                 │
│  │  • Kannada Translation                             │                 │
│  └──────────────────────┬─────────────────────────────┘                 │
│                          │                                               │
│  ┌──────────────────────▼─────────────────────────────┐                 │
│  │              DATA LAYER                             │                 │
│  │  SQLite (local) / PostgreSQL (Docker)               │                 │
│  │  Tables: firs, accused, victims, fir_accused_links, │                 │
│  │  criminal_networks, transactions, users, audit_logs,│                 │
│  │  conversation_history, public_complaints,           │                 │
│  │  community_reports, sos_alerts                      │                 │
│  └─────────────────────────────────────────────────────┘                 │
│                                                                          │
│  MIDDLEWARE: CORS │ Request Logging │ Error Handling                      │
└──────────────────────────────────────────────────────────────────────────┘
```

---


# 5. TECH STACK

| Layer | Technology | Why Chosen |
|-------|-----------|------------|
| **Backend** | FastAPI (Python) | Fastest Python framework, auto API docs, async support |
| **Database** | SQLite (local) / PostgreSQL (Docker) | Zero-config locally, production-ready in Docker |
| **ORM** | SQLAlchemy 2.0 (async) | Industry standard, supports multiple DBs |
| **Auth** | python-jose (JWT) | Stateless tokens, no session storage needed |
| **Password** | bcrypt (with SHA256 fallback) | Secure hashing; fallback for Python 3.14 compat |
| **Graph** | NetworkX | Pure Python, no external DB needed, built-in algorithms |
| **Entity Resolution** | RapidFuzz | Fuzzy string matching without ML training |
| **RAG Embeddings** | Sentence-Transformers / TF-IDF | Semantic search; TF-IDF as universal fallback |
| **Vector Index** | FAISS (optional) | Facebook's fast similarity search |
| **LLM** | Google Gemini (auto-detected model) | Free tier, native multilingual, grounded responses |
| **Frontend** | React 18 + TypeScript | Type-safe, component-based |
| **Styling** | Tailwind CSS | Utility-first, dark mode, rapid prototyping |
| **Build** | Vite | 10x faster than webpack |
| **Charts** | Recharts | React-native charts |
| **Maps** | Leaflet.js | Open-source, no API key needed |
| **State** | Zustand | Tiny (1KB), simple, no boilerplate |
| **Data Fetching** | React Query (TanStack) | Auto-caching, loading states, refetch |
| **HTTP** | Axios | Interceptors for auth refresh + error handling |
| **PWA** | Service Worker + Manifest | Installable on phone, offline shell |

---

# 6. RAG PIPELINE — How It Works

## What is RAG?
**Retrieval-Augmented Generation** — instead of the AI hallucinating answers, it FIRST
retrieves relevant documents from the database, then generates answers GROUNDED in those
documents. No fabricated data.

## PRAHARI's RAG Architecture:

```
User: "Show chain snatching near bus stop"
         │
         ▼
┌─── EMBEDDING ────────────────────────────┐
│ Option A: Sentence-BERT (all-MiniLM-L6)  │  ← best quality (needs pip install)
│ Option B: TF-IDF (scikit-learn)          │  ← always works, no heavy deps
│ Option C: None (graceful skip)           │  ← app still runs
└─────────────────┬────────────────────────┘
                  │ query vector (384-dim or sparse)
                  ▼
┌─── FAISS / COSINE SEARCH ────────────────┐
│ Search 220 indexed FIR embeddings        │
│ Return top-K most similar (by meaning)   │
│ "necklace theft on road" matches even    │
│ though keywords are different!           │
└─────────────────┬────────────────────────┘
                  │ top 3-5 FIR snippets
                  ▼
┌─── GROUNDED RESPONSE ────────────────────┐
│ Rule-based: format retrieved FIRs        │
│ OR Gemini LLM: natural language answer   │
│   grounded in the retrieved context      │
│ Sources shown to user (explainability)   │
└──────────────────────────────────────────┘
```

## Code Location: `backend/app/services/rag_pipeline.py`

## Key Functions:
- `index_firs(firs)` — builds the vector index at startup (called from main.py)
- `semantic_search(query, top_k)` — finds similar FIRs by meaning
- `rag_query(query)` — full pipeline: retrieve + format response
- `get_rag_status()` — reports which model/backend is active

## Fallback Chain:
1. Try Sentence-Transformers + FAISS → best semantic quality
2. If unavailable → fall back to TF-IDF + sklearn cosine → still works
3. If sklearn not installed → RAG disabled (app still runs, just no semantic search)

## How to Test RAG:
1. Start backend → check logs for "RAG: TF-IDF index built with 220 FIRs"
2. In chat: "Show theft near bus stop" → should find "phone stolen at bus stop" FIRs
3. API: `GET /api/v1/rag/status` → shows embedding_type + index_size
4. API: `GET /api/v1/rag/search?q=chain+snatching+evening` → returns scored FIRs

---

# 7. NL2SQL ENGINE — How Natural Language Becomes SQL

## The Problem:
User types: "Show robbery cases in Koramangala last 3 months"
System needs to generate: `SELECT ... FROM firs WHERE crime_type LIKE '%robbery%' AND ...`

## PRAHARI's Approach (Secure by Design):
The LLM/NLU **NEVER** writes raw SQL. Instead:

```
User Query → Intent Classification (regex scoring) → Filter Extraction
→ Template Selection → Parameter Binding → SAFE SQL
```

## Security:
- SQL is built from **validated templates only** (6 templates)
- User input goes into **parameterized placeholders** (`:crime_type`, `:location`)
- **SQL injection is IMPOSSIBLE** — tested with `'; DROP TABLE firs;--`

## Code Location: `backend/app/services/nl2sql.py`

## The 6 Templates:
1. `search_firs` — SELECT from firs with WHERE conditions
2. `accused_search` — SELECT from accused
3. `hotspot_query` — GROUP BY location with COUNT
4. `statistics` — GROUP BY crime_type with COUNT
5. `network_query` — JOIN criminal_networks + accused
6. `risk_query` — SELECT high-risk accused

## How to Test NL2SQL:
1. Ask anything in chat → click "View Generated SQL" below the response
2. See the actual SQL, parameters, and security note
3. Run test: `pytest tests/test_nl2sql.py` — includes injection prevention test

---

# 8. RISK SCORING — The Math

## Formula (0-100 score):

| Factor | Weight | Max Points | How Calculated |
|--------|--------|------------|----------------|
| Criminal History | 40% | 40 | 5+ cases=40, 3-4=30, 2=20, 1=8 |
| Network Centrality | 25% | 25 | In gang=20, multiple connections=12, isolated=5 |
| MO Escalation | 20% | 20 | Murder/robbery=18, assault=12, diverse=10, petty=5 |
| Recency | 15% | 15 | <30 days=15, <90=12, <180=8, old=4 |

## Risk Levels:
- 80-100: **CRITICAL** (red) — immediate attention
- 60-79: **HIGH** (orange) — enhanced monitoring
- 40-59: **MEDIUM** (yellow) — standard
- 0-39: **LOW** (green) — routine

## Code Location: `backend/app/services/risk.py`

## Key Design Choice:
Score is **fully explainable** — each factor has a `reason` string shown to the
investigator. No black box. Judge asks "why 87?" → you show the breakdown.

---

# 9. NETWORK ANALYSIS — Graph Intelligence

## What It Does:
- Builds a relationship graph from crime data
- Finds gangs (community detection — Louvain/greedy modularity)
- Identifies key players (degree centrality)
- Resolves "Ravi Kumar" = "R. Kumar" = "Ravi K" (entity resolution)

## Graph Structure:
- **Nodes**: Accused (red), FIR (blue), Location (green)
- **Edges**: co-accused, gang_member, associate, accused_in, occurred_at

## Code Location: `backend/app/services/network.py`

## Key Functions:
- `build_network_graph(db, accused_id, depth)` — recursive graph expansion
- `get_entity_resolution(db, name)` — fuzzy matching all accused names

## Entity Resolution (RapidFuzz):
```python
fuzz.token_sort_ratio("ravi kumar", "r. kumar")  # → 75% match
fuzz.token_sort_ratio("ravi kumar", "suresh gowda")  # → 20% (below threshold)
```
Threshold: 60%. Matches above this are shown as "potential same person".

---

# 10. LLM INTEGRATION (Gemini) — Real Conversational AI

## Architecture:
```
User Query (any language)
    ↓
Intent Classification (rule-based, always runs)
    ↓
Data Retrieval (SQL + RAG — provides grounding context)
    ↓
IF Gemini available:
    Send to Gemini with:
    - System prompt (self-awareness + rules)
    - Live DB stats (grounding context)
    - RAG snippets (relevant FIRs)
    - Conversation history (multi-turn)
    ↓
    Gemini generates natural answer in user's language
ELSE:
    Use rule-based formatted response
```

## Self-Awareness:
The system prompt includes FULL platform knowledge — all features, navigation,
how it works, architecture — so the AI can answer "what can you do?" or
"how do you calculate risk?" from its own knowledge.

## Code Location: `backend/app/services/llm.py`

## Model Auto-Detection:
At startup, PRAHARI:
1. Lists all available models for the API key
2. Tries each with a real "ping" call
3. Locks in the first model that actually responds
4. If none work → graceful fallback to rule-based

## How to Enable:
1. Get free key: https://aistudio.google.com/app/apikey
2. Create `backend/.env`:  `GEMINI_API_KEY=your_key`
3. `pip install google-generativeai`
4. Restart backend → look for "LLM: Gemini READY"

---


# 11. FOLDER STRUCTURE (Every File)

```
PRAHARI/
├── docker-compose.yml              # One-command deployment (all services)
├── setup.sh                        # Local setup script (Linux/Mac)
├── README.md                       # Quick start guide
├── PRAHARI_COMPLETE_DOCUMENTATION.md  # THIS FILE
│
├── backend/                        ─── PYTHON FASTAPI SERVER ───
│   ├── Dockerfile                  # Container definition
│   ├── requirements.txt            # Full deps (Docker/PostgreSQL)
│   ├── requirements-local.txt      # Lean deps (local/SQLite, no compilation)
│   ├── pytest.ini                  # Test configuration
│   ├── diagnose_ai.py             # ★ AI diagnostic tool (run to debug Gemini)
│   ├── seed_runner.py             # Manual seed trigger
│   ├── .env.example               # Template for secrets
│   ├── .env                       # YOUR secrets (gitignored)
│   │
│   ├── app/
│   │   ├── main.py                # ★ App entry: FastAPI, CORS, middleware, RAG init
│   │   │
│   │   ├── core/
│   │   │   ├── config.py          # ★ Settings: DB URL, JWT secret, Gemini key
│   │   │   └── security.py        # ★ bcrypt/SHA256 hashing, JWT tokens, RBAC
│   │   │
│   │   ├── models/
│   │   │   ├── user.py            # User, AuditLog, ConversationHistory tables
│   │   │   └── crime.py           # FIR, Accused, Victim, Network, Transaction,
│   │   │                          #   PublicComplaint, CommunityReport, SOSAlert
│   │   │
│   │   ├── schemas/
│   │   │   ├── user.py            # Pydantic: UserCreate, Login, TokenResponse
│   │   │   └── crime.py           # Pydantic: FIR, Accused, Chat, Network, Analytics
│   │   │
│   │   ├── api/
│   │   │   ├── deps.py            # ★ Auth dependency: JWT extraction + role check
│   │   │   └── v1/
│   │   │       ├── api.py         # Router aggregator (wires all endpoint files)
│   │   │       └── endpoints/
│   │   │           ├── auth.py        # Login, Register, Refresh, Me
│   │   │           ├── crime.py       # FIRs, Accused, Network, Analytics, Audit, Case Summary
│   │   │           ├── ai.py         # ★ AI Chat: intent→SQL→RAG→LLM→response
│   │   │           ├── analysis.py    # Financial, Sociological, Similar Cases, Patrol, FIR Validator, Cyber
│   │   │           ├── alerts.py      # Real-time alert generation
│   │   │           ├── intelligence.py # CCTV/IoT feeds, Dark Web, Deepfake, OSINT
│   │   │           ├── public.py      # Citizen: complaint, track, safety, community, SOS
│   │   │           └── rag.py         # RAG: status, query, search endpoints
│   │   │
│   │   ├── services/
│   │   │   ├── intent.py          # ★ NLU: classify intent + extract filters
│   │   │   ├── nl2sql.py          # ★ NL2SQL: template-based SQL generation
│   │   │   ├── rag_pipeline.py    # ★ RAG: FAISS/TF-IDF semantic search
│   │   │   ├── llm.py            # ★ Gemini LLM: multilingual grounded answers
│   │   │   ├── risk.py           # ★ Risk scoring (4-factor explainable)
│   │   │   ├── network.py        # ★ Graph analysis + entity resolution
│   │   │   ├── analysis.py       # Financial/sociological/similar/patrol logic
│   │   │   ├── fir_validator.py  # FIR validation against Indian law
│   │   │   ├── law_data.py       # BNS/IPC/IT Act reference database
│   │   │   ├── kannada.py        # Kannada translation dictionary
│   │   │   └── public_safety.py  # Area scores, complaint escalation
│   │   │
│   │   └── db/
│   │       ├── session.py         # SQLAlchemy engine + session factory
│   │       ├── seed.py           # Synthetic data generator (220 FIRs, 40 accused)
│   │       └── init_db.py        # Create tables + seed everything
│   │
│   └── tests/
│       ├── test_security.py       # JWT + password tests
│       ├── test_intent.py         # NLU classification tests
│       ├── test_risk.py           # Risk scoring tests
│       ├── test_fir_validator.py  # Law validation tests
│       └── test_nl2sql.py         # SQL generation + injection prevention tests
│
└── frontend/                      ─── REACT TYPESCRIPT APP ───
    ├── Dockerfile                  # Container definition
    ├── package.json               # Dependencies
    ├── vite.config.ts             # Vite: port 5174, proxy, aliases
    ├── tsconfig.json              # TypeScript config
    ├── tailwind.config.js         # Tailwind: custom colors, fonts
    ├── postcss.config.js          # PostCSS for Tailwind
    ├── index.html                 # HTML entry (Leaflet JS + CSS, fonts, PWA manifest)
    │
    ├── public/
    │   ├── favicon.svg            # App icon
    │   ├── manifest.json          # PWA manifest (installable)
    │   └── sw.js                  # Service worker (offline shell)
    │
    └── src/
        ├── main.tsx               # React entry: QueryClient, ErrorBoundary, PWA register
        ├── App.tsx                # ★ Router: all 27+ routes defined here
        ├── index.css              # ★ Global CSS: glassmorphism, 3D cards, animations
        ├── vite-env.d.ts          # Vite type declarations
        │
        ├── types/index.ts         # All TypeScript interfaces (User, FIR, Chat, etc.)
        ├── stores/authStore.ts    # Zustand: login state + localStorage persistence
        │
        ├── lib/
        │   ├── api.ts             # ★ Axios: 5 API objects + interceptors + error handling
        │   └── utils.ts           # Helper functions (date format, risk color)
        │
        ├── components/
        │   ├── layout/
        │   │   ├── DashboardLayout.tsx   # Police layout (sidebar + responsive)
        │   │   ├── Sidebar.tsx           # 20-item navigation + user info
        │   │   └── CitizenLayout.tsx     # Public layout (top navbar)
        │   └── shared/
        │       ├── ErrorBoundary.tsx     # Global crash recovery
        │       └── LoadingSpinner.tsx    # Reusable spinner
        │
        └── pages/
            ├── LoginPage.tsx           # Auth + quick demo buttons + citizen portal link
            ├── CommandCenterPage.tsx   # ★ NASA-style single-screen intelligence
            ├── ChatPage.tsx           # ★ AI chat: voice, PDF, multilingual, NL2SQL panel
            ├── DashboardPage.tsx      # Stats + charts
            ├── FIRsPage.tsx           # FIR browser
            ├── FIRValidatorPage.tsx   # Law validation UI
            ├── NetworkPage.tsx        # ★ Interactive graph (zoom/pan/drag)
            ├── HotspotsPage.tsx       # Leaflet map
            ├── AccusedPage.tsx        # Risk profiles
            ├── AnalyticsPage.tsx      # Detailed charts
            ├── ForecastPage.tsx       # Predictions + alerts
            ├── PatrolPage.tsx         # Patrol deployment
            ├── CCTVPage.tsx           # Camera + detections
            ├── DarkWebPage.tsx        # Threat feed
            ├── DeepfakePage.tsx       # Audio/video analysis
            ├── OSINTPage.tsx          # Intelligence lookup
            ├── CyberForensicsPage.tsx # Attack detection
            ├── SociologicalPage.tsx   # Demographics
            ├── InvestigatorPage.tsx   # Decision support
            ├── FinancialPage.tsx      # Money trail
            ├── AuditPage.tsx          # Hash-chained logs
            └── citizen/
                ├── CitizenHome.tsx         # Public landing
                ├── CitizenReport.tsx       # File complaint
                ├── CitizenTrack.tsx        # Track status
                ├── CitizenSafety.tsx       # Area scores
                ├── CitizenCommunity.tsx    # Community watch
                ├── CitizenTransparency.tsx # Accountability
                └── CitizenSOS.tsx          # Emergency panic
```

---


# 14. DATABASE SCHEMA

```sql
-- Users (Authentication + RBAC)
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(100) UNIQUE,
    email VARCHAR(255) UNIQUE,
    hashed_password VARCHAR(255),    -- bcrypt$... or sha256$...
    full_name VARCHAR(255),
    role VARCHAR(50),                -- constable/investigator/analyst/supervisor/policymaker
    station_id VARCHAR(50),
    badge_number VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE
);

-- FIRs (Core crime records)
CREATE TABLE firs (
    id INTEGER PRIMARY KEY,
    fir_number VARCHAR(50) UNIQUE,   -- "KSP/BEN/2026/0001"
    station_id VARCHAR(50),
    station_name VARCHAR(255),
    district VARCHAR(100),
    crime_type VARCHAR(100),         -- "chain snatching", "theft", etc.
    ipc_section VARCHAR(100),
    bns_section VARCHAR(100),        -- BNS 2023 (new law replacing IPC)
    description TEXT,
    modus_operandi TEXT,
    date_of_occurrence TIMESTAMP,
    location_name VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT,
    status VARCHAR(50),              -- open/investigating/closed/chargesheeted
    severity VARCHAR(20)             -- low/medium/high/critical
);

-- Accused persons
CREATE TABLE accused (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255),
    alias VARCHAR(255),              -- for entity resolution
    age INTEGER,
    gender VARCHAR(20),
    phone VARCHAR(20),
    risk_score FLOAT,                -- 0-100 calculated
    is_repeat_offender BOOLEAN,
    total_cases INTEGER,
    gang_id VARCHAR(50)
);

-- Many-to-Many: FIR ↔ Accused
CREATE TABLE fir_accused_links (
    fir_id INTEGER FK → firs.id,
    accused_id INTEGER FK → accused.id,
    role VARCHAR(50)                 -- primary/accomplice/abettor
);

-- Criminal Network (graph edges)
CREATE TABLE criminal_networks (
    source_accused_id INTEGER,
    target_accused_id INTEGER,
    relationship_type VARCHAR(100),  -- co-accused/associate/gang_member
    strength FLOAT                   -- 0.0 to 1.0
);

-- Transactions (financial crime)
CREATE TABLE transactions (
    accused_id INTEGER,
    from_account VARCHAR(100),
    to_account VARCHAR(100),
    amount FLOAT,
    transaction_type VARCHAR(50),    -- upi/bank/cash/crypto
    is_suspicious BOOLEAN,
    notes TEXT
);

-- Audit logs (tamper-evident via hash chain)
CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY,
    username VARCHAR(100),
    action VARCHAR(255),
    risk_level VARCHAR(20),
    previous_hash VARCHAR(64),       -- SHA-256 of previous entry
    entry_hash VARCHAR(64)           -- SHA-256 of THIS entry (chained)
);

-- Citizen complaints (public)
CREATE TABLE public_complaints (
    tracking_id VARCHAR(20) UNIQUE,  -- "KSP-A1B2C3"
    complainant_name VARCHAR(255),
    crime_type VARCHAR(100),
    description TEXT,
    status VARCHAR(50),              -- submitted/acknowledged/fir_registered/investigating/resolved/escalated
    is_escalated BOOLEAN,            -- auto-escalate after 7 days inaction
    station_assigned VARCHAR(255)
);

-- Community reports (public)
CREATE TABLE community_reports (
    report_type VARCHAR(50),         -- suspicious_activity/safety_hazard/missing_person/help_request
    title VARCHAR(255),
    description TEXT,
    upvotes INTEGER DEFAULT 0,       -- 5+ upvotes = auto-verified
    status VARCHAR(50)               -- pending/verified/resolved
);

-- SOS alerts
CREATE TABLE sos_alerts (
    citizen_name VARCHAR(255),
    latitude FLOAT,
    longitude FLOAT,
    alert_type VARCHAR(50),          -- general/women_safety/medical/accident
    status VARCHAR(50)               -- active/responded/resolved
);
```

---

# 15. API ENDPOINTS (40+)

## Auth (`/api/v1/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /login | No | Login → JWT tokens |
| POST | /register | No | Create account |
| POST | /refresh | No | Refresh access token |
| GET | /me | Yes | Current user info |

## Crime (`/api/v1/crime`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /firs | Yes | List FIRs (search/filter/paginate) |
| GET | /firs/{id} | Yes | Single FIR |
| GET | /accused | Yes | List accused (search/risk filter) |
| GET | /accused/{id}/profile | Yes | Full profile + risk breakdown |
| GET | /network/{id} | Yes | Criminal network graph |
| GET | /network/entity-resolution/{name} | Yes | Fuzzy name match |
| GET | /analytics/dashboard | Yes | Dashboard stats |
| GET | /analytics/hotspots | Yes | Hotspot coordinates |
| GET | /case-summary/{id} | Yes | AI case summary + timeline + leads |
| GET | /audit-logs | Supervisor | Hash-chained audit trail |

## AI Chat (`/api/v1/ai`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /chat | Yes | Natural language query → intelligence |
| GET | /chat/history/{session} | Yes | Conversation history |
| GET | /status | Yes | AI engine status (Gemini/rule-based) |

## Analysis (`/api/v1/analysis`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /financial | Yes | Transaction analysis from DB |
| GET | /sociological | Yes | Crime × socio-economic data |
| GET | /similar-cases/{id} | Yes | RAG-powered similar FIR finder |
| GET | /patrol | Yes | Patrol deployment plan |
| POST | /validate-fir | Yes | Check FIR against Indian law |
| POST | /cyber-forensics | Yes | Attack detection + forensic steps |

## Alerts (`/api/v1/alerts`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /live | Yes | Real-time crime alerts (poll every 30s) |

## Intelligence (`/api/v1/intelligence`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /cctv-feeds | Yes | Camera network + AI detections |
| GET | /darkweb | Yes | Dark web threat feed |
| POST | /deepfake-analysis | Yes | Audio/video manipulation check |
| POST | /osint-lookup | Yes | Open-source intelligence |

## RAG (`/api/v1/rag`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /status | Yes | RAG pipeline status (model + index size) |
| POST | /query | Yes | Semantic search with formatted answer |
| GET | /search | Yes | Raw similarity search |

## Citizen/Public (`/api/v1/public`) — NO AUTH
| Method | Path | Description |
|--------|------|-------------|
| POST | /complaint | File complaint → tracking ID |
| GET | /complaint/{id} | Track + auto-escalate |
| GET | /transparency | Public accountability stats |
| GET | /safety-scores | Area safety 0-10 |
| POST | /community-report | Report suspicious activity |
| GET | /community-reports | Public feed |
| POST | /community-report/{id}/upvote | Upvote report |
| POST | /sos | Emergency alert |

---

# 16. HOW TO RUN

## First-time Setup (Windows PowerShell):
```powershell
cd C:\Users\YOUR_NAME\Desktop
git clone -b final https://github.com/RishiPlaysCodes/Datathon.git PRAHARI
cd PRAHARI\backend
pip install -r requirements-local.txt
pip install google-generativeai   # optional: for real Gemini AI
Set-Content -Path .env -Value "GEMINI_API_KEY=YOUR_KEY_HERE" -Encoding ascii
python -c "import asyncio,sys;sys.path.insert(0,'.');from app.db.init_db import init_database;asyncio.run(init_database())"
```

## Daily Run:
**Terminal 1 (backend):**
```
cd C:\...\PRAHARI\backend
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 (frontend):**
```
cd C:\...\PRAHARI\frontend
npm install   # first time only
npm run dev
```

## URLs:
- Police: http://localhost:5174 (login required)
- Citizen: http://localhost:5174/citizen (public)
- API docs: http://localhost:8001/docs

---

# 17. TESTING CHECKLIST (How to Verify Every Feature)

## Backend Tests (automated):
```
cd backend
pytest                                    # runs all 20 tests
pytest tests/test_nl2sql.py -v           # SQL generation + injection prevention
pytest tests/test_intent.py -v           # intent classification
pytest tests/test_risk.py -v             # risk scoring
pytest tests/test_fir_validator.py -v    # FIR validation against law
```

## AI Diagnostic:
```
cd backend
python diagnose_ai.py                    # checks key + package + model + test call
```

## Manual QA (browser):
- Login: `demo`/`demo123` (Investigator) or `admin`/`admin123` (Supervisor)
- Chat: "Show theft cases in Koramangala" → FIRs + NL2SQL + RAG
- Chat: "ye bata ki how we can reduce crime" (Hindi) → full AI answer (if Gemini active)
- Network: search "Ravi" → entity resolution → interactive graph
- FIR Validator: paste complaint → legal validation score + sections
- Citizen: file complaint → get tracking ID → track it

---

# 18. SECURITY ARCHITECTURE

| Layer | Implementation |
|-------|---------------|
| **Authentication** | JWT access token (30 min) + refresh token (7 days) |
| **Password** | bcrypt (with SHA-256 salted fallback for Py3.14) |
| **RBAC** | 5 tiers: Constable < Investigator < Analyst < Supervisor < Policymaker |
| **Audit** | Hash-chained (SHA-256): each log entry hashes previous → tamper-detectable |
| **SQL Injection** | Impossible: NL2SQL uses parameterized templates only |
| **CORS** | Allows localhost origins in dev; configure per-domain in prod |
| **Secrets** | `.env` file (gitignored), loaded via python-dotenv |
| **Error Boundary** | React ErrorBoundary prevents white-screen crashes |
| **API Errors** | Global axios interceptor: debounced toasts for 5xx/network/403 |

---

# 19. DEPLOYMENT GUIDE

## Option A: Local (development)
As described in section 16.

## Option B: Docker Compose (production-like)
```bash
docker-compose up --build
# PostgreSQL + Redis + Backend + Frontend + Auto-seeder
```

## Option C: Cloud Deployment
1. Push to GitHub
2. Deploy backend to Railway/Render/AWS (set env vars on platform)
3. Deploy frontend to Vercel/Netlify
4. Set `VITE_API_URL` on frontend to point to deployed backend
5. Set `GEMINI_API_KEY` + `SECRET_KEY` + `DATABASE_URL` on backend

---

# 20. DEMO CREDENTIALS

| Role | Username | Password | Access |
|------|----------|----------|--------|
| Supervisor | admin | admin123 | Everything + audit logs |
| Investigator | demo | demo123 | Full case + AI + network |
| Investigator | inspector | inspector123 | Same as demo |
| Analyst | analyst | analyst123 | Stats + analytics (no PII) |
| Constable | constable | constable123 | Assigned cases only |
| Citizen | — | — | No login needed (/citizen) |

---

# END OF DOCUMENTATION

**Total: 27 pages (20 police + 7 citizen) | 40+ API endpoints | 20 automated tests**
**RAG Pipeline | NL2SQL | Gemini LLM | Graph Analysis | Risk Scoring | PWA**

GitHub: https://github.com/RishiPlaysCodes/Datathon (branch: final)
