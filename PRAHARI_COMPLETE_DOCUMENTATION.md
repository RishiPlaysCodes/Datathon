# PRAHARI - Complete Documentation
## Predictive Relational AI for Holistic Analytics & Response Intelligence

---

# TABLE OF CONTENTS
1. Problem Statement
2. Features List
3. Tech Stack & Why
4. Architecture Overview
5. Folder Structure
6. Backend Code Explanation (File by File)
7. Frontend Code Explanation (File by File)
8. Database Schema
9. How to Run
10. API Endpoints
11. Demo Credentials
12. How Each Module Works (Logic)

---

# 1. PROBLEM STATEMENT

Karnataka State Police (KSP) logs 2+ lakh FIRs a year. Investigators spend 60% of their time SEARCHING records, not ANALYZING them. There is no unified system that can:
- Answer natural language queries about crimes
- Show criminal networks and gang connections
- Identify crime hotspots on a map
- Score risk of repeat offenders
- Provide explainable AI-driven insights
- Maintain secure audit trails

PRAHARI solves this by building a Crime Intelligence Operating System where one natural language query triggers a cascade: understanding → retrieval → pattern detection → network analysis → risk scoring → recommendations.

---


# 2. FEATURES LIST

| # | Feature | Module | What It Does |
|---|---------|--------|--------------|
| 1 | AI Chat Interface | Module 1 | Type natural language like "Show chain snatching in Koramangala" and get results |
| 2 | Intent Classification | Module 1 | AI understands WHAT you want (search FIRs? check risk? see network?) |
| 3 | Filter Extraction | Module 1 | AI extracts location, crime type, time period from your sentence |
| 4 | Multi-turn Context | Module 1 | Follow-up questions work ("Now show only female victims") |
| 5 | Smart Suggestions | Module 1 | AI suggests next questions after every answer |
| 6 | Criminal Network Graph | Module 2 | Visual graph showing who is connected to whom |
| 7 | Entity Resolution | Module 2 | "Ravi Kumar" = "R. Kumar" = "Ravi K" detected automatically |
| 8 | Community Detection | Module 2 | Auto-identifies gang clusters using Louvain algorithm |
| 9 | Key Player Detection | Module 2 | Finds most connected person in network (degree centrality) |
| 10 | Crime Hotspot Map | Module 3 | Interactive Leaflet map with crime concentration zones |
| 11 | Trend Analysis | Module 3 | Line charts showing crime over time |
| 12 | District Comparison | Module 3 | Bar charts comparing crime across districts |
| 13 | Crime Type Distribution | Module 3 | Pie charts of which crimes are most common |
| 14 | Risk Scoring (0-100) | Module 5 | Every accused gets a score with breakdown |
| 15 | Explainable Factors | Module 5 | Shows WHY score is high (history 40%, network 25%, MO 20%, recency 15%) |
| 16 | Behavioral Profile | Module 5 | Auto-generated narrative of offender's pattern |
| 17 | Repeat Offender Flagging | Module 5 | Auto-flags anyone with 2+ cases |
| 18 | FIR Search & Filter | Module 6 | Browse all FIRs with search, crime type, status, pagination |
| 19 | JWT Authentication | Module 10 | Secure login with access + refresh tokens |
| 20 | 5-Tier RBAC | Module 10 | Constable → Investigator → Analyst → Supervisor → Policymaker |
| 21 | Hash-Chained Audit Logs | Module 10 | SHA-256 tamper-evident log trail |
| 22 | Supervisor-Only Audit View | Module 10 | Only supervisors can see full audit |
| 23 | Synthetic Data Generator | Infra | 220+ realistic Karnataka FIRs auto-generated |
| 24 | Docker Compose Deploy | Infra | One command starts everything |
| 25 | Modern Dark UI | Frontend | Glass-morphism design, responsive, professional |

---


# 3. TECH STACK & WHY EACH WAS CHOSEN

| Layer | Technology | Why This? |
|-------|-----------|-----------|
| Backend | FastAPI (Python) | Fastest Python framework, auto-generates API docs, async support |
| Database | SQLite (local) / PostgreSQL (Docker) | SQLite = zero setup for testing; PostgreSQL = production-ready |
| ORM | SQLAlchemy 2.0 (async) | Industry standard, supports both SQLite and PostgreSQL |
| Auth | python-jose (JWT) | Creates secure tokens, 15-min expiry access + 7-day refresh |
| Password | passlib + bcrypt | One-way hashing, impossible to reverse |
| Graph Analysis | NetworkX | Pure Python graph library, no external service needed |
| Entity Resolution | RapidFuzz | Fuzzy string matching - finds "Ravi" = "R. Kumar" without ML |
| Frontend | React 18 + TypeScript | Type-safe, component-based, fastest dev experience |
| Styling | Tailwind CSS | Utility-first, no CSS files to manage, dark mode easy |
| Build | Vite | 10x faster than webpack, hot reload in milliseconds |
| Charts | Recharts | React-native charts, simple API, looks great |
| Maps | Leaflet.js | Open-source map, no API key needed, lightweight |
| State | Zustand | Tiny (1KB), simple, no boilerplate like Redux |
| Data Fetching | React Query | Auto-caching, refetch, loading states handled |
| HTTP | Axios | Request/response interceptors for token refresh |
| Deployment | Docker Compose | One file defines all services, one command starts all |

---

# 4. ARCHITECTURE OVERVIEW

```
┌─────────────────────────────────────────────────────────┐
│                    USER (Browser)                         │
│              http://localhost:5174                        │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP requests
┌────────────────────────▼────────────────────────────────┐
│              REACT FRONTEND (Port 5174)                   │
│  Pages: Login | Dashboard | Chat | FIRs | Network |      │
│         Hotspots | Accused | Analytics | Audit           │
│  State: Zustand + React Query                            │
└────────────────────────┬────────────────────────────────┘
                         │ API calls to /api/v1/*
┌────────────────────────▼────────────────────────────────┐
│              FASTAPI BACKEND (Port 8001)                  │
│  Middleware: CORS (allow all) + Request Logging          │
│  Routes: /auth/* | /crime/* | /ai/*                      │
│  Services: Intent | Network | Risk                       │
│  Auth: JWT tokens + Role checking                        │
└────────────────────────┬────────────────────────────────┘
                         │ SQL queries
┌────────────────────────▼────────────────────────────────┐
│              DATABASE (SQLite / PostgreSQL)               │
│  Tables: users | firs | accused | victims |              │
│          fir_accused_links | criminal_networks |         │
│          transactions | audit_logs | conversation_history│
└─────────────────────────────────────────────────────────┘
```

---


# 5. FOLDER STRUCTURE

```
PRAHARI/
├── docker-compose.yml          # One-command deployment (defines all services)
├── setup.sh                    # Local setup script
├── README.md                   # Quick start guide
│
├── backend/
│   ├── Dockerfile              # Container definition for backend
│   ├── requirements.txt        # Python dependencies list
│   ├── seed_runner.py          # Script to seed database manually
│   ├── app/
│   │   ├── main.py             # ★ App entry point - FastAPI app, CORS, middleware
│   │   ├── core/
│   │   │   ├── config.py       # ★ All settings (DB URL, JWT secret, ports)
│   │   │   └── security.py     # ★ Password hashing, JWT create/verify, roles
│   │   ├── models/
│   │   │   ├── user.py         # ★ User, AuditLog, ConversationHistory DB tables
│   │   │   └── crime.py        # ★ FIR, Accused, Victim, Network, Transaction tables
│   │   ├── schemas/
│   │   │   ├── user.py         # Request/Response shapes for auth
│   │   │   └── crime.py        # Request/Response shapes for crime data
│   │   ├── api/
│   │   │   ├── deps.py         # ★ Auth dependency - extracts user from JWT
│   │   │   └── v1/
│   │   │       ├── api.py      # Combines all routers
│   │   │       └── endpoints/
│   │   │           ├── auth.py   # ★ Login, Register, Refresh, Me
│   │   │           ├── crime.py  # ★ FIRs, Accused, Network, Analytics, Audit
│   │   │           └── ai.py    # ★ Chat endpoint - NLU + query execution
│   │   ├── services/
│   │   │   ├── intent.py       # ★ NLU engine - classifies what user wants
│   │   │   ├── network.py      # ★ Graph building + entity resolution
│   │   │   └── risk.py         # ★ Risk score calculation (0-100)
│   │   └── db/
│   │       ├── session.py      # Database connection setup
│   │       ├── seed.py         # ★ Synthetic data generator (220+ FIRs)
│   │       └── init_db.py      # ★ Creates tables + seeds everything
│
└── frontend/
    ├── Dockerfile              # Container for frontend
    ├── package.json            # JS dependencies
    ├── vite.config.ts          # Vite build config (port 5174, proxy)
    ├── tailwind.config.js      # Tailwind colors, fonts
    ├── tsconfig.json           # TypeScript config
    ├── index.html              # HTML entry point
    └── src/
        ├── main.tsx            # React entry + QueryClient setup
        ├── App.tsx             # ★ Router - all page routes defined here
        ├── index.css           # Global styles + Tailwind utilities
        ├── types/index.ts      # ★ All TypeScript interfaces
        ├── stores/authStore.ts # ★ Login state (Zustand)
        ├── lib/
        │   ├── api.ts          # ★ All API calls (auth, crime, ai)
        │   └── utils.ts        # Helper functions (date format, risk color)
        ├── components/
        │   ├── layout/
        │   │   ├── Sidebar.tsx        # Left navigation menu
        │   │   └── DashboardLayout.tsx # Main layout wrapper
        │   └── shared/
        │       └── LoadingSpinner.tsx  # Reusable spinner
        └── pages/
            ├── LoginPage.tsx       # ★ Login form + quick demo access
            ├── DashboardPage.tsx   # ★ Stats cards + charts
            ├── ChatPage.tsx        # ★ AI chat with suggestions
            ├── FIRsPage.tsx        # ★ FIR browser with filters
            ├── NetworkPage.tsx     # ★ Criminal network graph
            ├── HotspotsPage.tsx    # ★ Crime map with Leaflet
            ├── AccusedPage.tsx     # ★ Risk profiles
            ├── AnalyticsPage.tsx   # ★ Detailed charts
            └── AuditPage.tsx       # ★ Hash-chained logs
```

---


# 6. BACKEND CODE EXPLANATION (File by File)

---

## 6.1 `backend/app/main.py` - THE ENTRY POINT

**What it does:** Starts the FastAPI server, sets up CORS, adds logging middleware.

**Logic:**
1. `logging.basicConfig()` - Sets up console logging so every request shows in terminal
2. `lifespan()` - Runs on startup: creates DB tables if missing
3. `CORSMiddleware` with `allow_origins=["*"]` - Allows frontend (any port) to call backend. Without this, browser blocks requests.
4. `log_requests` middleware - Intercepts EVERY request, logs method+path+status code

**Why CORS matters:** Browser security blocks JavaScript from calling a different port. Frontend is on 5174, backend on 8001 = different "origins". CORS headers tell browser "it's ok, allow this."

---

## 6.2 `backend/app/core/config.py` - SETTINGS

**What it does:** Central place for ALL configuration. Uses environment variables with defaults.

**Key settings:**
- `DATABASE_URL` = SQLite by default (no install needed), PostgreSQL in Docker
- `SECRET_KEY` = Used to sign JWT tokens (anyone with this can forge tokens)
- `ACCESS_TOKEN_EXPIRE_MINUTES = 30` = Token dies after 30 min
- `REFRESH_TOKEN_EXPIRE_DAYS = 7` = Can get new token for 7 days without re-login

**Why pydantic-settings:** Auto-reads from `.env` file OR environment variables. In Docker, you pass env vars in docker-compose.yml.

---

## 6.3 `backend/app/core/security.py` - AUTH ENGINE

**What it does:** Handles password hashing and JWT token creation/verification.

**Logic:**
1. `get_password_hash("demo123")` → `$2b$12$...` (one-way, irreversible)
2. `verify_password("demo123", hash)` → True/False (compares without knowing original)
3. `create_access_token({"sub": "demo"})` → JWT string valid for 30 min
4. `decode_token(jwt_string)` → Gets username back from token (or None if expired/tampered)
5. `compute_audit_hash(prev, action, user, time)` → SHA-256 hash for audit chain

**Why bcrypt:** Salted hashing - same password creates different hash each time. Attacker can't use rainbow tables.

**Why JWT:** Stateless auth - server doesn't store sessions. Token contains all info. Backend just verifies signature.

---

## 6.4 `backend/app/models/crime.py` - DATABASE TABLES

**What it does:** Defines the structure of all crime-related database tables using SQLAlchemy.

**Tables created:**
- `FIR` - The core: fir_number, crime_type, description, location (lat/lng), status, severity
- `Accused` - Name, alias, risk_score, is_repeat_offender, gang_id
- `Victim` - Name, age, gender, linked to FIR
- `FIRAccusedLink` - Many-to-many: which accused is in which FIR
- `CriminalNetwork` - Connections between accused (source → target, relationship type)
- `Transaction` - Financial records (from_account, to_account, amount, is_suspicious)

**Why separate link table:** One FIR can have multiple accused, one accused can be in multiple FIRs. This is a "many-to-many" relationship - needs a junction table.

---

## 6.5 `backend/app/services/intent.py` - THE NLU ENGINE

**What it does:** Takes natural language query → outputs structured intent + filters.

**How it works:**
1. User types: "Show chain snatching cases in Koramangala last 6 months"
2. `classify_intent()` scores each intent category using regex patterns:
   - "show" + "cases" → search_firs gets +2 score
   - "chain snatching" → search_firs gets +1 score
   - Total: search_firs wins with highest score
3. `extract_filters()` pulls structured data:
   - "koramangala" → location: "Koramangala"
   - "chain snatching" → crime_type: "chain snatching"
   - "6 months" → days: 180
4. Returns: `{intent: "search_firs", filters: {location, crime_type, days}, confidence: 0.8}`

**Why regex, not LLM:** Regex is deterministic (same input = same output), zero latency, zero cost, works offline. LLMs hallucinate under demo pressure.

**The 6 intents:**
- `search_firs` - Find FIR records
- `accused_info` - Information about a person
- `network_analysis` - Show connections/graph
- `hotspot_analysis` - Crime on map
- `risk_assessment` - Risk score queries
- `statistics` - Counts, trends, summaries

---

## 6.6 `backend/app/services/network.py` - GRAPH ENGINE

**What it does:** Builds criminal relationship graph and resolves name variants.

**Graph Building Logic:**
1. Start from one accused person (by ID)
2. Find all connections in `criminal_networks` table
3. For each connected person, recursively expand (up to `depth` levels)
4. Also attach linked FIRs and locations as nodes
5. Run community detection (greedy_modularity) to find gangs
6. Calculate degree centrality to find key players

**Entity Resolution Logic:**
1. User searches "Ravi"
2. System loads ALL accused from database
3. For each accused, calculates fuzzy similarity score:
   - `fuzz.token_sort_ratio("ravi", "Ravi Kumar")` → 75%
   - `fuzz.token_sort_ratio("ravi", "R. Kumar")` → 60%
4. Returns all matches above 60% threshold, sorted by confidence

**Why NetworkX:** Pure Python, no Neo4j server to install/debug. Has built-in community detection, centrality, shortest path algorithms.

---

## 6.7 `backend/app/services/risk.py` - RISK SCORING ENGINE

**What it does:** Calculates 0-100 risk score with explainable breakdown.

**Formula (4 factors):**
1. **Criminal History (max 40 points):** 5+ cases = 40, 3-4 = 30, 2 = 20, 1 = 8
2. **Network Centrality (max 25 points):** In gang = 20, multiple connections = 12, isolated = 5
3. **MO Escalation (max 20 points):** Murder/robbery = 18, assault = 12, diverse portfolio = 10, petty = 5
4. **Recency (max 15 points):** Active <30 days = 15, <90 days = 12, <180 days = 8, old = 4

**Total = sum of all 4 factors (0-100)**

**Risk Levels:**
- 80-100: CRITICAL (red) - Immediate attention
- 60-79: HIGH (orange) - Enhanced monitoring
- 40-59: MEDIUM (yellow) - Standard monitoring
- 0-39: LOW (green) - Routine tracking

**Why explainable:** Judges WILL ask "why this score?" - every factor has a human-readable reason string.

---


## 6.8 `backend/app/api/v1/endpoints/auth.py` - LOGIN SYSTEM

**Endpoints:**
- `POST /api/v1/auth/login` - Takes username+password, returns JWT tokens
- `POST /api/v1/auth/register` - Creates new user
- `POST /api/v1/auth/refresh` - Gets new access token using refresh token
- `GET /api/v1/auth/me` - Returns current user info

**Login Flow:**
1. Frontend sends `{username: "demo", password: "demo123"}`
2. Backend finds user by username in DB
3. Calls `verify_password("demo123", stored_hash)` → True/False
4. If True: creates access_token (30 min) + refresh_token (7 days)
5. Returns both tokens + user info to frontend
6. Frontend stores tokens in localStorage

---

## 6.9 `backend/app/api/v1/endpoints/ai.py` - CHAT ENGINE

**What it does:** The brain - takes natural language, routes to correct handler, returns formatted response.

**Flow:**
1. User sends message via `POST /api/v1/ai/chat`
2. `classify_intent()` determines what they want
3. Routes to handler: `_handle_fir_search()`, `_handle_accused_query()`, etc.
4. Handler queries database with extracted filters
5. Formats response as Markdown with data
6. Saves message to `conversation_history` table
7. Returns: response text + structured data + sources + suggestions

**Each handler:**
- `_handle_fir_search` - Builds SQLAlchemy query with location/crime_type/date filters
- `_handle_accused_query` - Searches accused by name/alias, shows risk scores
- `_handle_network_query` - Finds accused, builds network graph
- `_handle_hotspot_query` - Groups crimes by lat/lng, returns hotspot data
- `_handle_risk_query` - Calculates and explains risk score
- `_handle_statistics_query` - Counts by crime type, district

---

## 6.10 `backend/app/api/v1/endpoints/crime.py` - DATA ENDPOINTS

**Endpoints:**
- `GET /crime/firs` - List FIRs with search/filter/pagination
- `GET /crime/firs/{id}` - Single FIR details
- `GET /crime/accused` - List accused with search/risk filter
- `GET /crime/accused/{id}/profile` - Full profile with risk breakdown
- `GET /crime/network/{accused_id}` - Criminal network graph
- `GET /crime/network/entity-resolution/{name}` - Find name matches
- `GET /crime/analytics/dashboard` - Full dashboard data
- `GET /crime/analytics/hotspots` - Hotspot coordinates
- `GET /crime/audit-logs` - Audit trail (supervisor only)

---

## 6.11 `backend/app/api/deps.py` - AUTH MIDDLEWARE

**What it does:** Extracts and validates JWT token from every request.

**Logic:**
1. Every protected endpoint has `Depends(get_current_user)`
2. This extracts `Authorization: Bearer <token>` header
3. Decodes token, gets username
4. Fetches user from database
5. If token invalid/expired → returns 401 Unauthorized
6. `require_role("supervisor")` - factory that checks role hierarchy

---

## 6.12 `backend/app/db/seed.py` - DATA GENERATOR

**What it does:** Creates 220+ realistic Karnataka FIRs with linked entities.

**Generated data:**
- 40 accused persons (15 repeat offenders, 4 gangs, name variants)
- 220 FIRs across 12 crime types with real Bangalore locations (lat/lng)
- 53+ network connections (gang links + random co-accused)
- 50 financial transactions (some marked suspicious)
- Victims linked to each FIR

**Why realistic data matters:** Judges test with real queries. If data is random gibberish, nothing works in demo.

---


# 7. FRONTEND CODE EXPLANATION (File by File)

---

## 7.1 `src/App.tsx` - ROUTER

**What it does:** Defines which URL shows which page. Wraps protected routes.

**Logic:** Uses react-router-dom. All pages under `/` require authentication (ProtectedRoute checks Zustand store for token). Unauthenticated users redirect to `/login`.

---

## 7.2 `src/stores/authStore.ts` - AUTH STATE

**What it does:** Global state for login status using Zustand.

**Logic:**
- `login(user, token)` → saves to localStorage + updates state
- `logout()` → clears localStorage + resets state
- On page refresh → reads from localStorage (persists across refreshes)

---

## 7.3 `src/lib/api.ts` - API CLIENT

**What it does:** All HTTP calls to backend. Handles token attachment and refresh.

**Logic:**
1. Creates axios instance with baseURL = `http://localhost:8001/api/v1`
2. Request interceptor: attaches `Authorization: Bearer <token>` to every request
3. Response interceptor: if 401 received, tries refresh token automatically
4. Exports: `authAPI`, `crimeAPI`, `aiAPI` - organized by domain

---

## 7.4 `src/pages/LoginPage.tsx` - LOGIN

**What it does:** Login form + quick demo access buttons.

**Logic:**
1. Form submits username/password to `authAPI.login()`
2. On success: stores tokens via `useAuthStore().login()`
3. Navigates to `/dashboard`
4. Quick access buttons: pre-fill credentials for demo roles

---

## 7.5 `src/pages/DashboardPage.tsx` - COMMAND CENTER

**What it does:** Shows overview stats + charts using Recharts.

**Displays:**
- 4 stat cards: Total FIRs, Active Cases, Closed, Repeat Offenders
- Line chart: Crime trend over last 30 days
- Pie chart: Crime type distribution
- Bar chart: Crime by district
- Active hotspots list

**Data source:** Single API call to `GET /crime/analytics/dashboard`

---

## 7.6 `src/pages/ChatPage.tsx` - AI CHAT

**What it does:** Chat interface where user types queries and gets intelligence.

**Logic:**
1. User types message → adds to local messages array
2. Calls `aiAPI.chat(message, sessionId)` → gets response with data
3. Displays response as Markdown (supports **bold**, lists, etc.)
4. Shows: sources (which FIRs were queried), intent, confidence
5. Renders clickable suggestion chips for follow-up questions
6. Session ID maintained for multi-turn context

---

## 7.7 `src/pages/NetworkPage.tsx` - CRIMINAL NETWORK

**What it does:** Search accused → see their criminal network graph.

**Logic:**
1. User types name → calls entity resolution API (fuzzy match)
2. Shows matches with confidence % (click to select)
3. Calls `GET /crime/network/{id}?depth=2`
4. Renders SVG-based network visualization:
   - Red circles = Accused
   - Blue circles = FIR
   - Green circles = Location
   - Lines = relationships (thickness = strength)
5. Side panel shows: node count, edge count, communities, key players

---

## 7.8 `src/pages/HotspotsPage.tsx` - CRIME MAP

**What it does:** Interactive Leaflet map showing crime concentration zones.

**Logic:**
1. Calls `GET /crime/analytics/hotspots?days=90`
2. Loads Leaflet.js dynamically
3. For each hotspot: draws colored circle (red=5+ cases, orange=3-4, blue=1-2)
4. Circle size proportional to case count
5. Click circle → popup with location name, crime type, count
6. Side list: top 15 hotspots ranked by count

---

## 7.9 `src/pages/AccusedPage.tsx` - OFFENDER PROFILES

**What it does:** Browse accused persons, click for full risk profile.

**Logic:**
1. Left panel: scrollable list with search + repeat-only filter
2. Each card shows name, risk score (color-coded), case count, badges
3. Click → calls `GET /crime/accused/{id}/profile`
4. Right panel shows:
   - Risk score with visual progress bars for each factor
   - Explanation text
   - Behavioral profile (auto-generated narrative)
   - Known associates list
   - Linked FIRs

---

## 7.10 `src/pages/AuditPage.tsx` - AUDIT LOGS

**What it does:** Shows tamper-evident audit trail (supervisor only).

**Logic:**
1. Checks if current user role = "supervisor"
2. If not: shows "Access Restricted" message
3. If yes: calls `GET /crime/audit-logs` → displays table
4. Each row: timestamp, user, action, details, risk level, hash (truncated)
5. Explains hash-chain concept in info box

---


# 8. DATABASE SCHEMA

```sql
-- USERS TABLE (Authentication)
users:
  id            INTEGER PRIMARY KEY
  username      VARCHAR(100) UNIQUE     -- login name
  email         VARCHAR(255) UNIQUE
  hashed_password VARCHAR(255)          -- bcrypt hash
  full_name     VARCHAR(255)
  role          VARCHAR(50)             -- constable/investigator/analyst/supervisor
  station_id    VARCHAR(50)             -- police station code
  badge_number  VARCHAR(50)
  is_active     BOOLEAN DEFAULT TRUE
  created_at    TIMESTAMP

-- FIR TABLE (Core crime records)
firs:
  id                  INTEGER PRIMARY KEY
  fir_number          VARCHAR(50) UNIQUE  -- "KSP/BEN/2026/0001"
  station_id          VARCHAR(50)
  station_name        VARCHAR(255)
  district            VARCHAR(100)        -- "Bengaluru Urban"
  crime_type          VARCHAR(100)        -- "chain snatching", "theft", etc.
  crime_subtype       VARCHAR(100)
  ipc_section         VARCHAR(100)        -- "379/356 IPC"
  bns_section         VARCHAR(100)        -- "303/115(2) BNS" (new law)
  description         TEXT                -- Full FIR narrative
  modus_operandi      TEXT                -- How crime was committed
  date_of_occurrence  TIMESTAMP
  location_name       VARCHAR(255)        -- "Koramangala"
  latitude            FLOAT               -- For map plotting
  longitude           FLOAT
  status              VARCHAR(50)         -- open/investigating/closed/chargesheeted
  severity            VARCHAR(20)         -- low/medium/high/critical
  investigating_officer VARCHAR(255)

-- ACCUSED TABLE
accused:
  id                  INTEGER PRIMARY KEY
  name                VARCHAR(255)        -- "Ravi Kumar"
  alias               VARCHAR(255)        -- "R. Kumar" (for entity resolution)
  age                 INTEGER
  gender              VARCHAR(20)
  phone               VARCHAR(20)
  risk_score          FLOAT               -- 0-100 calculated score
  is_repeat_offender  BOOLEAN
  total_cases         INTEGER
  gang_id             VARCHAR(50)         -- "GANG_001" if in a gang

-- FIR-ACCUSED LINK (Many-to-Many)
fir_accused_links:
  fir_id              INTEGER FK → firs.id
  accused_id          INTEGER FK → accused.id
  role                VARCHAR(50)         -- primary/accomplice/abettor

-- CRIMINAL NETWORK (Graph edges)
criminal_networks:
  source_accused_id   INTEGER FK → accused.id
  target_accused_id   INTEGER FK → accused.id
  relationship_type   VARCHAR(100)        -- co-accused/associate/gang_member
  strength            FLOAT               -- 0.0 to 1.0

-- AUDIT LOGS (Tamper-evident)
audit_logs:
  id                  INTEGER PRIMARY KEY
  user_id             INTEGER
  username            VARCHAR(100)
  action              VARCHAR(255)        -- "LOGIN", "QUERY_ACCUSED", etc.
  details             TEXT
  risk_level          VARCHAR(20)         -- low/medium/high
  timestamp           TIMESTAMP
  previous_hash       VARCHAR(64)         -- SHA-256 of previous entry
  entry_hash          VARCHAR(64)         -- SHA-256 of this entry
```

---

# 9. HOW TO RUN

## Option A: Fresh Setup (First Time)

**Step 1 - Clone:**
```
cd C:\Users\gurud\Desktop
git clone -b prahari-rebuild https://github.com/RishiPlaysCodes/Datathon.git PRAHARI_FINAL
```

**Step 2 - Backend Setup + Seed (one time):**
```
cd C:\Users\gurud\Desktop\PRAHARI_FINAL\backend
pip install fastapi uvicorn sqlalchemy aiosqlite pydantic pydantic-settings python-jose passlib bcrypt python-multipart rapidfuzz networkx faker
python -c "import asyncio,sys;sys.path.insert(0,'.');from app.db.init_db import init_database;asyncio.run(init_database())"
```

**Step 3 - Frontend Setup (one time):**
```
cd C:\Users\gurud\Desktop\PRAHARI_FINAL\frontend
npm install
```

## Option B: Run Every Time

**Terminal 1 - Kill old + Start Backend:**
```
taskkill /F /IM python.exe 2>$null; Start-Sleep 2; cd C:\Users\gurud\Desktop\PRAHARI_FINAL\backend; uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Start Frontend:**
```
cd C:\Users\gurud\Desktop\PRAHARI_FINAL\frontend; npm run dev
```

**Browser:**
- App: http://localhost:5174
- API Docs: http://localhost:8001/docs

## Option C: Docker (One Command)
```
cd PRAHARI_FINAL
docker-compose up --build
```

---

# 10. API ENDPOINTS REFERENCE

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/v1/auth/login | No | Login, get tokens |
| POST | /api/v1/auth/register | No | Create account |
| POST | /api/v1/auth/refresh | No | Refresh access token |
| GET | /api/v1/auth/me | Yes | Current user info |
| GET | /api/v1/crime/firs | Yes | List FIRs (filterable) |
| GET | /api/v1/crime/firs/{id} | Yes | Single FIR |
| GET | /api/v1/crime/accused | Yes | List accused |
| GET | /api/v1/crime/accused/{id}/profile | Yes | Full profile + risk |
| GET | /api/v1/crime/network/{id} | Yes | Criminal network graph |
| GET | /api/v1/crime/network/entity-resolution/{name} | Yes | Fuzzy name match |
| GET | /api/v1/crime/analytics/dashboard | Yes | Dashboard stats |
| GET | /api/v1/crime/analytics/hotspots | Yes | Map hotspot data |
| GET | /api/v1/crime/audit-logs | Supervisor | Audit trail |
| POST | /api/v1/ai/chat | Yes | Natural language query |
| GET | /api/v1/ai/chat/history/{session} | Yes | Chat history |

---

# 11. DEMO CREDENTIALS

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Supervisor | admin | admin123 | Everything + Audit Logs |
| Investigator | demo | demo123 | Full case + AI access |
| Investigator | inspector | inspector123 | Full case + AI access |
| Analyst | analyst | analyst123 | Stats + Analytics (no PII) |
| Constable | constable | constable123 | Assigned cases only |

---

# 12. HOW EACH MODULE WORKS (Logic Deep Dive)

## Module 1: AI Chat - How "Show chain snatching in Koramangala" Works

```
USER INPUT: "Show chain snatching cases in Koramangala last 6 months"
                    │
                    ▼
        ┌─── Intent Classification ───┐
        │ Regex scoring:               │
        │ "show"+"cases" → search_firs │
        │ "chain snatching" → +1       │
        │ WINNER: search_firs (score:3)│
        └──────────────┬───────────────┘
                       │
                    ▼
        ┌─── Filter Extraction ────────┐
        │ "koramangala" → location     │
        │ "chain snatching" → crime    │
        │ "6 months" → days: 180       │
        └──────────────┬───────────────┘
                       │
                    ▼
        ┌─── Database Query ───────────┐
        │ SELECT * FROM firs WHERE     │
        │   crime_type LIKE '%chain%'  │
        │   AND location LIKE '%Kora%' │
        │   AND date >= 180 days ago   │
        └──────────────┬───────────────┘
                       │
                    ▼
        ┌─── Response Formatting ──────┐
        │ "Found 8 FIRs matching..."   │
        │ + crime type breakdown       │
        │ + date range                 │
        │ + locations list             │
        │ + source FIR numbers         │
        │ + follow-up suggestions      │
        └──────────────────────────────┘
```

## Module 2: Network - How Entity Resolution Works

```
USER SEARCHES: "Ravi"
        │
        ▼
    Load ALL accused from DB (40 records)
        │
        ▼
    For each accused:
      RapidFuzz.token_sort_ratio("ravi", "Ravi Kumar") = 75%
      RapidFuzz.token_sort_ratio("ravi", "R. Kumar")   = 62%  ← alias match!
      RapidFuzz.token_sort_ratio("ravi", "Suresh Gowda") = 20% ← below 60%, skip
        │
        ▼
    Return matches above 60% threshold:
      ┌────────────────────────────────────────┐
      │ Ravi Kumar (75% confidence) - name     │
      │ R. Kumar (62% confidence) - alias      │
      │ → These might be the SAME PERSON!      │
      └────────────────────────────────────────┘
```

## Module 5: Risk Score Calculation Example

```
ACCUSED: Ravi Kumar (5 cases, GANG_001, chain snatching + robbery, last crime 20 days ago)

Factor 1 - History:    5 cases = 40/40 points
Factor 2 - Network:    In gang = 20/25 points  
Factor 3 - MO:         Robbery (severity 8) = 18/20 points
Factor 4 - Recency:    20 days ago = 15/15 points

TOTAL: 40 + 20 + 18 + 15 = 93/100 → CRITICAL RISK

Explanation: "CRITICAL RISK - Immediate attention required. Ravi Kumar shows
extensive criminal history, strong network ties, and recent activity suggesting
high probability of re-offending."
```

## Module 10: Hash-Chained Audit - How Tamper Detection Works

```
Entry 1: hash = SHA256("GENESIS|SYSTEM_INIT|system|2026-07-09")
         = "a3f2b1..."

Entry 2: hash = SHA256("a3f2b1...|LOGIN|demo|2026-07-09T14:30:00")
         = "7c4e9d..."

Entry 3: hash = SHA256("7c4e9d...|QUERY_FIR|demo|2026-07-09T14:31:00")
         = "b8f1a2..."

If someone EDITS Entry 2, its hash changes → Entry 3's previous_hash
no longer matches → CHAIN BROKEN → TAMPERING DETECTED!
```

---

# END OF DOCUMENTATION

GitHub: https://github.com/RishiPlaysCodes/Datathon/tree/prahari-rebuild
PR: https://github.com/RishiPlaysCodes/Datathon/pull/2
