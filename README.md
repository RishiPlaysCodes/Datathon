# PRAHARI - Crime Intelligence Operating System

**Predictive Relational AI for Holistic Analytics & Response Intelligence**

A unified Crime Intelligence OS for Karnataka State Police that transforms natural language queries into actionable intelligence: grounded FIR results, criminal network graphs, live hotspot heatmaps, explainable risk scores, and proactive investigation leads.

## Quick Start

```bash
# Start all services
docker-compose up --build

# Access the application
# Frontend: http://localhost:5174
# Backend API: http://localhost:8001
# API Docs: http://localhost:8001/docs
```

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Supervisor | admin | admin123 |
| Investigator | demo | demo123 |
| Analyst | analyst | analyst123 |
| Constable | constable | constable123 |

## Architecture

```
Frontend (React 18 + TypeScript + Tailwind) → Port 5174
    ↓
Backend (FastAPI + Python) → Port 8001
    ↓
PostgreSQL 15 | Redis 7 | NetworkX
```

## Key Modules

1. **Conversational AI Interface** - Natural language queries with intent classification
2. **Criminal Network Analysis** - Graph-based relationship discovery with entity resolution
3. **Crime Pattern Analytics** - Hotspot mapping, trend analysis, MO clustering
4. **Risk Scoring** - Explainable 0-100 risk scores with factor breakdown
5. **RBAC & Audit** - 5-tier role hierarchy with hash-chained (SHA-256) audit logs

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite, Recharts, Leaflet.js
- **Backend**: FastAPI, SQLAlchemy, PostgreSQL, NetworkX, RapidFuzz
- **AI**: Hybrid NLU (intent templates + pattern matching), RAG-ready architecture
- **Security**: JWT + refresh tokens, 5-tier RBAC, field-level masking
- **Infrastructure**: Docker Compose, single-command deployment

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/    # Auth, Crime, AI chat endpoints
│   │   ├── core/                # Config, security utilities
│   │   ├── db/                  # Session, seed data, init
│   │   ├── models/              # SQLAlchemy models
│   │   ├── schemas/             # Pydantic schemas
│   │   └── services/            # Intent, Network, Risk services
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/          # Layout, shared components
│   │   ├── pages/               # Dashboard, Chat, Network, Map, etc.
│   │   ├── lib/                 # API client, utilities
│   │   ├── stores/              # Zustand state management
│   │   └── types/               # TypeScript interfaces
│   ├── Dockerfile
│   └── package.json
└── docker-compose.yml
```

## Features

- 220+ realistic synthetic FIRs with Karnataka-specific data
- Entity resolution using RapidFuzz fuzzy matching
- Criminal network graph with community detection
- Interactive crime hotspot heatmap
- Explainable risk scoring (0-100) with factor breakdown
- Multi-turn conversational AI with context memory
- Hash-chained immutable audit logs (SHA-256)
- Role-based access control (5 tiers)
- Responsive modern dark UI+classy

---

Built for Karnataka State Police | Datathon 2026
