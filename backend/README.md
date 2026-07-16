# backend/ — Core Backend (FastAPI)

**Purpose:** The transactional/read API that owns the system of record
(SAD Section 2.2 "Core Backend API"). Handles cases, accused, victims,
officers, RBAC, collaboration, reports, notifications, and audit.
It is the ONLY service that writes to the relational database.

**Responsibility:** Enforce RBAC + jurisdiction scoping on every request,
orchestrate calls into the AI Engine (never re-implement AI logic here),
and persist all AI outputs for audit purposes (`ai_model_runs`).

## Structure
- `app/main.py` — FastAPI entrypoint
- `app/core/` — settings, security (JWT), shared dependencies, RBAC rules
- `app/api/v1/endpoints/` — one file per SAD module (cases, hotspot, network, ...)
- `app/models/` — SQLAlchemy ORM models (mirrors the finalized schema + new platform tables)
- `app/schemas/` — Pydantic request/response contracts
- `app/crud/` — jurisdiction-scoped data access layer
- `app/services/` — business logic + AI Engine orchestration
- `app/middleware/` — auth, jurisdiction-scope injection, audit hook
- `app/tasks/` — Celery background jobs (reports, notifications)
- `alembic/` — database migrations (the live schema source of truth)
- `tests/` — unit + integration tests

## Run locally
```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

Full endpoint-by-file mapping: see `PROJECT_STRUCTURE.md` at the repo root.
