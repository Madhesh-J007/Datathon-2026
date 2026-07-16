# KSP Crime Intelligence & Investigation Platform

**Status:** Scaffold — structure approved, implementation in progress per `docs/architecture/KSP_10Day_Implementation_Roadmap.md`.

This repository implements the platform defined in the approved Software
Architecture Document (SAD). The SAD and Roadmap are the single source of
truth for all design decisions — see `docs/architecture/`.

---

## 1. What this is

A layered, modular-monolith intelligence platform that sits on top of
existing case-record systems and turns historical + live case data into
actionable policing intelligence: crime hotspots, risk scoring, criminal
network analysis, and an AI assistant — all RBAC- and jurisdiction-scoped.

## 2. Repository layout

```
ksp-crime-intelligence/
├── backend/       # Core API - FastAPI + SQLAlchemy + PostgreSQL + JWT + Alembic
├── frontend/      # Web client - React + Vite + TypeScript + Tailwind + React Router + Axios
├── ai-engine/     # AI/ML inference microservice - Python + scikit-learn + NetworkX + pandas
├── database/      # Schema reference, seed data, DB operational scripts
├── docs/          # Architecture, API contracts, setup guide, demo materials
├── infra/         # Shared Docker/CI assets
├── .github/       # CI workflows
├── docker-compose.yml
└── .env.example
```

See `PROJECT_STRUCTURE.md` for the full file-by-file breakdown (purpose,
responsibility, and which module uses each file).

## 3. Tech stack

| Layer | Stack |
|---|---|
| Frontend | React + Vite, TypeScript, Tailwind CSS, React Router, Axios |
| Backend | FastAPI, SQLAlchemy, PostgreSQL (+ PostGIS + pgvector), JWT Auth, Alembic |
| AI Engine | Python, scikit-learn, NetworkX, pandas |

## 4. Getting started (local dev)

```bash
git clone <repo-url>
cd ksp-crime-intelligence
cp .env.example .env        # fill in real secrets
docker-compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000/api/v1
- AI Engine: http://localhost:8100
- Backend API docs (auto-generated): http://localhost:8000/docs

Full setup notes: `docs/setup/LOCAL_DEV_SETUP.md`

## 5. Development workflow

Development follows the milestone sequence in
`docs/architecture/KSP_10Day_Implementation_Roadmap.md` — do not build
modules out of order; later milestones (e.g., the AI Assistant) depend on
APIs built in earlier ones.

## 6. Architecture reference

- `docs/architecture/KSP_Crime_Intelligence_Platform_Architecture.md` — the approved SAD
- `docs/architecture/KSP_10Day_Implementation_Roadmap.md` — the milestone checklist
- `docs/api/API_CONTRACTS.md` — endpoint contracts as they're finalized

Any deviation from the SAD must be proposed as a revision to the SAD
first — it remains the single source of truth throughout development.
