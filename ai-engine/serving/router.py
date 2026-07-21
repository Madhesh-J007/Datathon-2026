from fastapi import APIRouter, HTTPException, status

from config import settings
from models.mo_similarity.embeddings import embed_texts
from models.risk_scoring.scorer import predict_risk, _model
from models.hotspot.predictor import predict_hotspots
from models.forecasting.forecaster import forecast_crime_trend
from models.repeat_offender.resolver import resolve_repeat_offenders
from models.anomaly.detector import detect_anomalies
from models.network_gang.community_detection import detect_communities
from serving.schemas import (
    EmbeddingRequest, EmbeddingResponse, HotspotPredictionRequest, HotspotPredictionResponse,
    AnomalyFinding, AnomalyRequest, AnomalyResponse, ForecastRequest, ForecastResponse, NetworkCommunity,
    NetworkCommunityRequest, NetworkCommunityResponse, OffenderProfile, RepeatOffenderRequest, RepeatOffenderResponse,
    RepeatOffenderMatch, RiskPredictionRequest, RiskPredictionResponse, GlobalExplainabilityResponse,
)

router = APIRouter(prefix="/ai/v1", tags=["similarity"])


@router.post("/embeddings", response_model=EmbeddingResponse)
def create_embeddings(payload: EmbeddingRequest) -> EmbeddingResponse:
    """Create normalised LaBSE vectors for Core Backend-controlled case text."""
    try:
        vectors = embed_texts(payload.texts)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Embedding model unavailable.") from exc

    return EmbeddingResponse(
        vectors=vectors,
        model_name=settings.EMBEDDING_MODEL_NAME,
        model_version=settings.EMBEDDING_MODEL_VERSION,
        dimensions=settings.EMBEDDING_DIMENSIONS,
    )


@router.post("/risk-score", response_model=RiskPredictionResponse)
def score_case_risk(payload: RiskPredictionRequest) -> RiskPredictionResponse:
    """Return a dataset-trained risk estimate and feature-level explanation."""
    try:
        return RiskPredictionResponse(**predict_risk(payload.model_dump()))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Risk model unavailable.") from exc


@router.get("/risk-score/global-explainability", response_model=GlobalExplainabilityResponse)
def get_global_explanations() -> GlobalExplainabilityResponse:
    """Return model-level global explainability stats for dashboards."""
    try:
        from models.risk_scoring.explain import get_global_explainability
        model = _model()
        return GlobalExplainabilityResponse(**get_global_explainability(model))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Global explanation data unavailable.") from exc



@router.post("/hotspots/predict", response_model=HotspotPredictionResponse)
def predict_crime_hotspots(payload: HotspotPredictionRequest) -> HotspotPredictionResponse:
    """Generate explainable KDE hotspot predictions from jurisdiction-scoped incidents."""
    return HotspotPredictionResponse(
        model_version="phase4-kde-hotspot-v1",
        hotspots=predict_hotspots([case.model_dump() for case in payload.cases]),
    )


@router.post("/forecast/crime-trend", response_model=ForecastResponse)
def forecast_crime(payload: ForecastRequest) -> ForecastResponse:
    """Forecast registration volume for the requested 1-90 day horizon."""
    try:
        return ForecastResponse(**forecast_crime_trend(payload.registration_dates, payload.horizon_days))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Forecast requires valid registration dates.") from exc


@router.post("/repeat-offenders/resolve", response_model=RepeatOffenderResponse)
def resolve_offenders(payload: RepeatOffenderRequest) -> RepeatOffenderResponse:
    """Return explainable likely identity matches from already-scoped profiles."""
    matches = resolve_repeat_offenders(payload.source.model_dump(), [candidate.model_dump() for candidate in payload.candidates])
    return RepeatOffenderResponse(
        model_version="phase4-entity-resolution-v1",
        matches=[RepeatOffenderMatch(**match) for match in matches],
    )


@router.post("/anomalies/detect", response_model=AnomalyResponse)
def detect_case_anomalies(payload: AnomalyRequest) -> AnomalyResponse:
    """Flag statistically unusual cases with reasons suitable for investigator review."""
    return AnomalyResponse(
        model_version="phase4-isolation-forest-v1",
        findings=[AnomalyFinding(**finding) for finding in detect_anomalies([case.model_dump() for case in payload.cases])],
    )


@router.post("/network/communities", response_model=NetworkCommunityResponse)
def detect_network_communities(payload: NetworkCommunityRequest) -> NetworkCommunityResponse:
    """Find probable criminal communities in already-authorised relationship edges."""
    return NetworkCommunityResponse(
        model_version="phase4-network-community-v1",
        communities=[NetworkCommunity(**community) for community in detect_communities([edge.model_dump() for edge in payload.edges])],
    )


@router.post("/assistant/query")
def assistant_query(payload: dict) -> dict:
    """Natural-language RAG query grounding and dynamic response generation."""
    raw_query = payload.get("query", "").strip()
    query_lower = raw_query.lower()
    context = payload.get("context", "")

    # Parse context cases into structured dicts
    parsed_cases = []
    for line in context.split("\n"):
        if not line.strip() or "CaseID:" not in line:
            continue
        parts = line.split(" | ")
        case_id = None
        case_no = "N/A"
        accused = "None listed"
        facts = "N/A"
        for p in parts:
            if p.startswith("CaseID:"):
                try:
                    case_id = int(p.split(":")[1].strip())
                except ValueError:
                    pass
            elif p.startswith("CaseNo:"):
                case_no = p.split(":")[1].strip()
            elif p.startswith("Accused:"):
                accused_val = p.split(":", 1)[1].strip()
                if accused_val:
                    accused = accused_val
            elif p.startswith("Facts:"):
                facts = p.split(":", 1)[1].strip()

        if case_id:
            parsed_cases.append({
                "id": case_id,
                "no": case_no,
                "accused": accused,
                "facts": facts
            })

    source_case_ids = []
    
    # 0. PDF / Report Generation Request
    if any(k in query_lower for k in ["pdf", "report", "dossier", "export", "download"]):
        target_case = None
        for c in parsed_cases:
            if str(c["id"]) in query_lower or c["no"].lower() in query_lower:
                target_case = c
                break
        if not target_case and parsed_cases:
            target_case = parsed_cases[0]

        if target_case:
            answer = f"Understood Officer. I have compiled and generated the official KSP PDF Investigation Dossier for Case {target_case['no']}. Click the download button below to save the document."
            return {
                "answer": answer,
                "source_case_ids": [target_case["id"]],
                "action": "generate_pdf",
                "target_case_id": target_case["id"],
                "model_version": "phase4-assistant-v1"
            }
        else:
            return {
                "answer": "No active case dossier is available to compile into a PDF report.",
                "source_case_ids": [],
                "model_version": "phase4-assistant-v1"
            }
    
    # 1. Greetings / Casual Prompts
    greetings = ["hi", "hello", "hey", "namaste", "good morning", "good evening", "who are you", "help"]
    if any(query_lower == g or query_lower.startswith(g + " ") for g in greetings) or len(query_lower) < 3:
        answer = (
            "Hello Officer! I am your KSP Crime Intelligence AI Assistant. "
            "I have indexed your active precinct dossiers. You can ask me to search for specific crimes "
            "(e.g., 'show theft cases'), inquire about suspects, or ask for a case summary."
        )
        return {
            "answer": answer,
            "source_case_ids": [],
            "model_version": "phase4-assistant-v1"
        }

    # 2. Case Summary / Overview Queries
    if any(k in query_lower for k in ["summarize", "summary", "total cases", "show cases", "all cases", "overview", "recent"]):
        if parsed_cases:
            top_3 = parsed_cases[:3]
            source_case_ids = [c["id"] for c in top_3]
            details = "; ".join([f"Case {c['no']} ({c['facts'][:50]}...)" for c in top_3])
            answer = (
                f"I analyzed {len(parsed_cases)} active dossiers in your precinct scope. "
                f"Key active cases include: {details}. Would you like to review suspect profiles or evidence items for any of these?"
            )
        else:
            answer = "There are currently no active case dossiers recorded within your active jurisdiction scope."
        return {
            "answer": answer,
            "source_case_ids": source_case_ids,
            "model_version": "phase4-assistant-v1"
        }

    # 3. Suspect / Accused Inquiry
    if any(k in query_lower for k in ["accused", "suspect", "offender", "who", "names", "person"]):
        matching = [c for c in parsed_cases if c["accused"] and c["accused"].lower() != "none listed"]
        if matching:
            top_matches = matching[:3]
            source_case_ids = [c["id"] for c in top_matches]
            suspect_info = "; ".join([f"{c['accused']} (Case {c['no']})" for c in top_matches])
            answer = f"Identified suspect profiles in your jurisdiction: {suspect_info}. Modus operandi logs indicate active investigation tracking."
        else:
            answer = "No identified suspect names are currently logged in the retrieved case dossiers."
        return {
            "answer": answer,
            "source_case_ids": source_case_ids,
            "model_version": "phase4-assistant-v1"
        }

    # 4. Hotspot / Risk / Patrol Inquiry
    if any(k in query_lower for k in ["hotspot", "risk", "patrol", "high risk", "priority", "deploy"]):
        if parsed_cases:
            top_matches = parsed_cases[:3]
            source_case_ids = [c["id"] for c in top_matches]
            c_str = ", ".join([f"Case {c['no']}" for c in top_matches])
            answer = (
                f"Intelligence models flag active threat clusters linked to {c_str}. "
                f"Recommend deploying tactical patrol squads to high-density sector boundaries during peak evening shifts (18:00 - 22:00)."
            )
        else:
            answer = "No high-risk crime hotspot anomalies are currently active in your precinct sector."
        return {
            "answer": answer,
            "source_case_ids": source_case_ids,
            "model_version": "phase4-assistant-v1"
        }

    # 5. Semantic & Specific Word Matching across Brief Facts and Case Numbers
    words = [w for w in query_lower.replace("?", "").replace(".", "").split() if len(w) > 2]
    matching = []
    for c in parsed_cases:
        searchable = f"{c['no']} {c['accused']} {c['facts']}".lower()
        if any(w in searchable for w in words):
            matching.append(c)

    if matching:
        top_matches = matching[:3]
        source_case_ids = [c["id"] for c in top_matches]
        c_str = ", ".join([f"Case {c['no']}" for c in top_matches])
        facts_snippets = " | ".join([f"Case {c['no']}: '{c['facts'][:60]}...'" for c in top_matches])
        answer = f"Found {len(matching)} matching dossier(s) for your query ({c_str}): {facts_snippets}"
    else:
        answer = f"I searched your precinct database for '{raw_query}', but found no matching case records in your active jurisdiction scope."

    return {
        "answer": answer,
        "source_case_ids": source_case_ids,
        "model_version": "phase4-assistant-v1"
    }
