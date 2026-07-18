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
