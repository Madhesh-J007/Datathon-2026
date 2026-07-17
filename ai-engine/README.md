# ai-engine/ — AI/ML Inference Microservice

**Purpose:** A stateless inference layer (SAD Section 15.1) — it never
writes to the system of record. It receives feature data, returns
scores/labels/explanations, and the Core Backend persists everything.

**Responsibility:** Implement the full model catalogue from SAD Section
15.2 using the approved stack (scikit-learn, NetworkX, pandas), and the
AI Assistant's intent-parsing / tool-routing orchestration. Every scoring
endpoint must return the structured explainability object (SAD Section
15.3) — no bare numbers, ever.

## Structure
- `serving/` — FastAPI app exposing one endpoint group per model
- `models/hotspot/` — KDE + time-decay density + short-term forecast
- `models/risk_scoring/` — gradient-boosted risk classifier + explanation builder
- `models/repeat_offender/` — entity resolution (blocking + classifier)
- `models/network_gang/` — NetworkX graph construction + Louvain community detection
- `models/mo_similarity/` — sentence embeddings + similarity ranking
- `models/anomaly/` — Isolation Forest / statistical anomaly detection
- `models/forecasting/` — district/crime-type time-series forecasting
- `assistant/` — intent parser, tool router, response composer (chatbot orchestrator)
- `pipelines/` — training and scheduled batch-scoring entrypoints

## Run locally
```bash
pip install -r requirements.txt
uvicorn serving.main:app --reload --port 8100
```

Full file-by-file mapping: see `PROJECT_STRUCTURE.md` at the repo root.

## Phase 4: Similar Case Finder

`POST /ai/v1/embeddings` accepts one or more case narratives and returns
L2-normalised LaBSE vectors. The service never receives database credentials
or performs database writes; the Core Backend owns pgvector persistence and
access control.
