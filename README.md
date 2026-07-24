# PRAHARI — Crime Intelligence Operating System

**Predictive Relational AI for Holistic Analytics & Response Intelligence**

An AI-powered Crime Intelligence Platform for Karnataka State Police (KSP) that enables investigators, analysts, supervisors, and citizens to interact with the state crime database using natural language (English, Hinglish, Kannada), while providing automated crime classification, criminal network analysis, predictive forecasting, media forensics, and investigation support tools.

> **Live Demo**: [https://prahari-60079422859.development.catalystserverless.in/app/index.html#/login](https://prahari-60079422859.development.catalystserverless.in/app/index.html#/login)  
> **Public Portal** (no login): [https://prahari-60079422859.development.catalystserverless.in/app/index.html#/public](https://prahari-60079422859.development.catalystserverless.in/app/index.html#/public)

---

## Demo Credentials

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Supervisor | admin | admin123 | Full access + Audit logs |
| Investigator | demo | demo123 | Cases + AI + Network |
| Analyst | analyst | analyst123 | Analytics + Policy |
| Constable | constable | constable123 | Own station cases |
| Citizen | citizen1 | citizen123 | Own FIRs only |

---

## Features (50+)

### Public Portal (No Login Required)
- Complaint registration with full form (complainant, suspect, financial loss, evidence)
- Pattern-based crime type classification (12 crime categories)
- Indian law section detection (IPC / BNS / IT Act / POCSO / NDPS)
- Manual override: user can select crime type from dropdown (AI suggestion optional)
- POCSO/minor auto-detection from text (age extraction)
- Auto-assignment to nearest police station (50 Karnataka stations)
- Complaint tracking with 5-stage visual timeline
- Scam Detection Engine (10 scam types with advisory)
- 7-day public visibility rule (POCSO cases NEVER public)

### Police Dashboard (Role-Based)
- Zone-based default filtering (My Station / All Stations toggle)
- Dashboard with clickable KPI drill-down, crime trends, location charts
- FIR Records: search, filter, pagination, station toggle, PDF export
- AI Investigation Report: 9-section auto-generated per FIR with PDF export
- Investigation Timeline: 6-stage progress tracking with gap detection
- Investigation Checklist: 10 auto-generated items with check-off
- Evidence Gallery: upload (max 10MB), grid view, chain-of-custody hash
- Officer Notes: timestamped, typed notes per FIR
- Public Complaints Inbox (30-sec auto-refresh, convert to FIR)

### AI Chat (Trilingual + Voice)
- Natural language queries (6 crime intents + general knowledge via Gemini)
- English + Hinglish + Kannada (native script + romanized)
- Multi-turn conversation context (follow-up queries)
- Voice input (speech-to-text) + Voice output (text-to-speech)
- "Explain This" panel: evidence trail, keywords, confidence, method disclosure
- Chat history PDF export
- Smart suggestions after every response

### Intelligence & Analytics
- Criminal Network Graph: draggable force-directed SVG, evidence panel on node click
- Entity Resolution (fuzzy name matching via RapidFuzz)
- Community Detection (Louvain algorithm, NetworkX)
- Crime Hotspot Map (Leaflet.js, interactive, 365-day view)
- Crime Forecast: historical pattern analysis + preventive measures + disclaimer
- Case Similarity Engine
- Unidentified Offender Profiling (infer from similar solved cases)
- Face Similarity Matching (CCTV upload, demo mode, capped 89%)
- Policy & Sociological Insights (real demographics + recommendations)
- Accused Risk Scoring (0-100) with drill-down evidence per factor

### Media Forensics (Deepfake Detection)
- Real byte-level analysis: AI signatures, editor detection, EXIF, pixel-level
- Regional entropy variance, color channel symmetry, high-frequency noise analysis
- Strong vs weak evidence separation (no false positives on real photos)
- Heatmap zones for artifact visualization
- Deterministic + explainable results

### Security & Governance
- JWT Authentication (30-min access + 7-day refresh tokens)
- 6-tier RBAC: Citizen → Constable → Investigator → Analyst → Supervisor → Policymaker
- Zone-based station filtering (50 Karnataka police stations)
- PII Masking by role (constable=masked, supervisor=full)
- SHA-256 hash-chained tamper-evident audit logs
- POCSO auto-escalation + supervisor alert
- Self-registration forced to citizen role (no privilege escalation)

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Backend | FastAPI (Python 3.11) | Async API with auto-docs |
| Database | SQLite (aiosqlite) | Zero-config, auto-seeds on startup |
| ORM | SQLAlchemy 2.0 | 14-table async schema |
| Auth | python-jose (JWT) | Stateless token auth |
| Graph | NetworkX | Community detection, centrality |
| Fuzzy Match | RapidFuzz | Entity resolution |
| AI (Crime) | Custom deterministic NLU | Zero cost, zero hallucination |
| AI (General) | Google Gemini 2.0 Flash | Fallback for general knowledge |
| Frontend | React 18 + TypeScript | Component-based UI |
| Build | Vite | Fast production builds |
| Styling | Tailwind CSS | Dark mode utility-first |
| Charts | Recharts | React-native charts |
| Maps | Leaflet.js | Interactive crime map |
| State | Zustand | Minimal global state |
| Voice | Web Speech API | Browser-native STT/TTS |
| Deployment | Zoho Catalyst | AppSail + Web Client Hosting |

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/   # auth, crime, ai, deepfake, public, investigation
│   │   ├── core/               # config, security
│   │   ├── db/                 # session, init_db, seed, stations (50 stations)
│   │   ├── models/             # 14 SQLAlchemy models
│   │   ├── schemas/            # Pydantic request/response models
│   │   └── services/           # intent, risk, network, audit, pii_mask,
│   │                           # investigation_report, gemini
│   ├── server.py               # Catalyst AppSail entry point
│   ├── smoke_test.py           # 71 automated end-to-end tests
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/              # 21 page components
│   │   ├── components/         # Layout, Sidebar, LoadingSpinner
│   │   ├── lib/                # API client, PDF export utility
│   │   ├── stores/             # Auth state (Zustand)
│   │   └── types/              # TypeScript interfaces
│   └── vite.config.ts
├── deploy-catalyst.ps1         # Automated deploy + smoke test script
├── docker-compose.yml          # Local development (PostgreSQL + Redis)
└── setup.sh                    # Quick local setup (SQLite mode)
```

---

## Setup & Run

### Local Development (SQLite — no Docker needed)

```bash
# Backend
cd backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Backend auto-seeds 220 FIRs, 40 accused, 50 police stations on first startup.

### Docker (PostgreSQL + Redis)

```bash
docker-compose up --build
# Frontend: http://localhost:5174
# Backend: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

### Zoho Catalyst Deployment

```powershell
# One command — builds, packages, deploys, and runs 71 smoke tests
powershell -NoProfile -ExecutionPolicy Bypass -File .\deploy-catalyst.ps1
```

---

## Testing

71 automated end-to-end tests verify:
- Authentication (login, refresh, register, role enforcement)
- FIR CRUD with zone-based filtering
- Citizen privacy (ownership enforcement, PII masking)
- AI Chat (English + Hinglish + Kannada + multi-turn + gender filter)
- Deepfake detection (AI images flagged, genuine photos NOT flagged)
- Public complaint registration + AI classification
- Police inbox + Convert to FIR
- Scam detection, CCTV match, case similarity
- Policy insights, offender profiling, crime forecast
- CORS, audit log integrity, role-based access control

```bash
python backend/smoke_test.py --base-url http://localhost:8001 --frontend-url http://localhost:5174
```

---

## Architecture Decisions

| Decision | Reason |
|----------|--------|
| Deterministic NLU over LLM | Police systems need consistent, reproducible, auditable results. Same query = same answer. No hallucination. |
| Gemini as fallback only | General knowledge queries (law concepts, procedures) route to Gemini. Crime queries stay deterministic. |
| SQLite over PostgreSQL | Zero-config on Catalyst free tier. Production: migrate to managed PostgreSQL. |
| Byte-level deepfake over CNN | No GPU on free tier. Deterministic/auditable. Honest about limitations. |
| HashRouter over BrowserRouter | Catalyst static hosting doesn't support server-side routing. |

---

## Honest Limitations

- **Deepfake**: Metadata-based. Cannot detect AI images with stripped metadata (e.g. from social media). Pixel signals help but not guaranteed without trained CNN.
- **CCTV**: Simulated face features (hash-based). Not real face recognition. Capped 89%. Labeled "demo mode".
- **AI Chat**: Keyword-based NLU for 6 crime intents. General queries fallback to Gemini (if API key configured).
- **Forecast**: Historical pattern analysis, not trained ML model. Honestly disclosed in UI.
- **Database**: Ephemeral SQLite — resets on container restart. Production needs PostgreSQL.

---

## Catalyst Services Used

| Service | Purpose |
|---------|---------|
| AppSail (Managed Runtime) | Python 3.11 backend |
| Web Client Hosting | React production build |
| Environments | Dev + Prod separation |
| Deployments | Console-based promotion |

---

Built for Karnataka State Police Datathon 2026
