"""Core Backend orchestration for Phase 4 intelligence features."""

from collections.abc import Iterable
from datetime import date

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.case_embedding import CaseEmbedding
from app.models.case_master import CaseMaster
from app.models.accused import Accused
from app.models.user import User
from app.services import ai_audit_service


def _embed_texts(texts: list[str]) -> list[list[float]]:
    """Call the isolated AI service and validate its pgvector contract."""
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/embeddings", json={"texts": texts})
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI embedding service is unavailable. Start the ai-engine service and retry.",
        ) from exc

    payload = response.json()
    vectors = payload.get("vectors", [])
    if payload.get("dimensions") != 768 or len(vectors) != len(texts) or any(len(vector) != 768 for vector in vectors):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI embedding service returned an invalid vector payload.",
        )
    return vectors


def predict_case_risk(db: Session, case: CaseMaster, current_user: User) -> dict:
    """Build safe case features and obtain a model-backed, explainable risk score."""
    from datetime import datetime, time
    registration_date = case.CrimeRegisteredDate or date.today()
    reg_dt = datetime.combine(registration_date, time.min)
    if case.IncidentFromDate:
        reporting_delay = max(0.0, (reg_dt - case.IncidentFromDate).total_seconds() / 3600)
    else:
        reporting_delay = 0.0
    payload = {
        "gravity_offence_id": case.GravityOffenceID or 0,
        "reporting_delay_hours": reporting_delay,
        "case_age_days": max(0, (date.today() - registration_date).days),
        "number_of_accused": len(case.accused_list),
        "number_of_evidence_items": len(case.evidence_items),
        "investigation_priority": case.InvestigationPriority or "Medium",
    }
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/risk-score", json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI risk service is unavailable.") from exc

    result = response.json()
    case.AIRiskScore = result["score"]
    db.commit()
    ai_audit_service.log_ai_run(db, current_user.UserID, "risk_score", "random_forest", result["model_version"], str(case.CaseMasterID), {"score": result["score"]})
    return result


def forecast_crime_trend(db: Session, current_user: User, horizon_days: int) -> dict:
    """Send only jurisdiction-scoped registration dates to the forecasting model."""
    query = db.query(CaseMaster).filter(CaseMaster.CrimeRegisteredDate.isnot(None))
    query = apply_jurisdiction_filter(query, db, current_user)
    registration_dates = [case.CrimeRegisteredDate.isoformat() for case in query.all()]
    if not registration_dates:
        return {"model_version": "phase4-trend-regression-v1", "trend": "stable", "points": []}
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(
                f"{settings.AI_ENGINE_BASE_URL}/ai/v1/forecast/crime-trend",
                json={"registration_dates": registration_dates, "horizon_days": horizon_days},
            )
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI forecasting service is unavailable.") from exc
    result = response.json()
    ai_audit_service.log_ai_run(db, current_user.UserID, "crime_forecast", "linear_regression", result["model_version"], None, {"horizon_days": horizon_days, "trend": result["trend"]})
    return result


def resolve_repeat_offenders(db: Session, accused_id: int, current_user: User) -> dict:
    """Find likely matching accused profiles without bypassing case jurisdiction scope."""
    source = db.query(Accused).join(CaseMaster).filter(Accused.AccusedMasterID == accused_id)
    source = apply_jurisdiction_filter(source, db, current_user, model_class=CaseMaster).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Accused profile not found or access denied.")
    visible = db.query(Accused).join(CaseMaster)
    visible = apply_jurisdiction_filter(visible, db, current_user, model_class=CaseMaster).all()
    counts: dict[int, int] = {}
    for profile in visible:
        if profile.PersonID:
            counts[profile.PersonID] = counts.get(profile.PersonID, 0) + 1
    def profile(item: Accused) -> dict:
        return {"accused_master_id": item.AccusedMasterID, "name": item.AccusedName, "age": item.AgeYear,
                "gender_id": item.GenderID, "person_id": item.PersonID, "case_count": counts.get(item.PersonID, 1)}
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/repeat-offenders/resolve", json={
                "source": profile(source), "candidates": [profile(item) for item in visible],
            })
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI entity-resolution service is unavailable.") from exc
    result = response.json()
    response_payload = {"ModelVersion": result["model_version"], "Matches": [
        {"AccusedMasterID": item["accused_master_id"], "Confidence": item["confidence"], "Factors": item["factors"]}
        for item in result["matches"]
    ]}
    ai_audit_service.log_ai_run(db, current_user.UserID, "repeat_offender", "entity_resolution", result["model_version"], str(accused_id), {"match_count": len(result["matches"])})
    return response_payload


def detect_case_anomalies(db: Session, current_user: User) -> dict:
    """Detect unusual investigation signals among cases visible to the caller."""
    query = apply_jurisdiction_filter(db.query(CaseMaster), db, current_user)
    cases = query.all()
    if len(cases) < 3:
        return {"ModelVersion": "phase4-isolation-forest-v1", "Findings": []}
    payload_cases = []
    for case in cases:
        incident_date = case.IncidentFromDate.date() if case.IncidentFromDate else case.CrimeRegisteredDate
        delay = max(0.0, (case.CrimeRegisteredDate - incident_date).total_seconds() / 3600) if incident_date else 0.0
        payload_cases.append({"case_master_id": case.CaseMasterID, "reporting_delay_hours": delay,
                              "number_of_accused": len(case.accused_list), "number_of_evidence_items": len(case.evidence_items)})
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/anomalies/detect", json={"cases": payload_cases})
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI anomaly service is unavailable.") from exc
    result = response.json()
    response_payload = {"ModelVersion": result["model_version"], "Findings": [
        {"CaseMasterID": item["case_master_id"], "AnomalyScore": item["anomaly_score"], "Factors": item["factors"]}
        for item in result["findings"]
    ]}
    ai_audit_service.log_ai_run(db, current_user.UserID, "anomaly_detection", "isolation_forest", result["model_version"], None, {"finding_count": len(result["findings"])})
    return response_payload


def _chunks(items: list[CaseMaster], size: int = 32) -> Iterable[list[CaseMaster]]:
    for start in range(0, len(items), size):
        yield items[start : start + size]


def backfill_embeddings(db: Session, current_user: User, limit: int = 250) -> dict:
    """Embed jurisdiction-visible cases; reruns update vectors for this model version."""
    query = db.query(CaseMaster).filter(CaseMaster.BriefFacts.isnot(None), CaseMaster.BriefFacts != "")
    query = apply_jurisdiction_filter(query, db, current_user)
    cases = query.order_by(CaseMaster.CaseMasterID).limit(limit).all()
    if not cases:
        return {"Processed": 0, "Created": 0, "Updated": 0, "ModelName": settings.EMBEDDING_MODEL_NAME, "ModelVersion": settings.EMBEDDING_MODEL_VERSION}

    ids = [case.CaseMasterID for case in cases]
    existing = {
        record.CaseMasterID: record
        for record in db.query(CaseEmbedding).filter(
            CaseEmbedding.CaseMasterID.in_(ids),
            CaseEmbedding.EmbeddingModel == settings.EMBEDDING_MODEL_NAME,
            CaseEmbedding.Version == settings.EMBEDDING_MODEL_VERSION,
        )
    }
    created = 0
    updated = 0
    for batch in _chunks(cases):
        vectors = _embed_texts([case.BriefFacts for case in batch])
        for case, vector in zip(batch, vectors):
            record = existing.get(case.CaseMasterID)
            if record:
                record.EmbeddingVector = vector
                updated += 1
            else:
                db.add(CaseEmbedding(
                    CaseMasterID=case.CaseMasterID,
                    EmbeddingVector=vector,
                    EmbeddingModel=settings.EMBEDDING_MODEL_NAME,
                    Version=settings.EMBEDDING_MODEL_VERSION,
                ))
                created += 1
    db.commit()
    return {"Processed": len(cases), "Created": created, "Updated": updated, "ModelName": settings.EMBEDDING_MODEL_NAME, "ModelVersion": settings.EMBEDDING_MODEL_VERSION}


def _factors(source: CaseMaster, candidate: CaseMaster) -> list[dict]:
    factors = [{"FeatureName": "Modus Operandi", "Description": "The case narratives are semantically similar."}]
    if source.CrimeMajorHeadID and source.CrimeMajorHeadID == candidate.CrimeMajorHeadID:
        factors.append({"FeatureName": "Crime Type", "Description": "Both cases share the same major crime classification."})
    if source.CrimeMinorHeadID and source.CrimeMinorHeadID == candidate.CrimeMinorHeadID:
        factors.append({"FeatureName": "Crime Subtype", "Description": "Both cases share the same crime subtype."})
    if source.PoliceStationID and source.PoliceStationID == candidate.PoliceStationID:
        factors.append({"FeatureName": "Location", "Description": "Both cases were registered at the same police station."})
    return factors


def find_similar_cases(db: Session, case_id: int, current_user: User, limit: int = 10) -> dict:
    """Retrieve jurisdiction-scoped nearest neighbours from pgvector using cosine distance."""
    source_query = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == case_id)
    source = apply_jurisdiction_filter(source_query, db, current_user).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Case not found or access denied.")
    if not source.BriefFacts or not source.BriefFacts.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="This case has no BriefFacts text to embed.")

    source_record = db.query(CaseEmbedding).filter(
        CaseEmbedding.CaseMasterID == source.CaseMasterID,
        CaseEmbedding.EmbeddingModel == settings.EMBEDDING_MODEL_NAME,
        CaseEmbedding.Version == settings.EMBEDDING_MODEL_VERSION,
    ).order_by(CaseEmbedding.CreatedAt.desc()).first()
    if not source_record:
        vector = _embed_texts([source.BriefFacts])[0]
        source_record = CaseEmbedding(
            CaseMasterID=source.CaseMasterID,
            EmbeddingVector=vector,
            EmbeddingModel=settings.EMBEDDING_MODEL_NAME,
            Version=settings.EMBEDDING_MODEL_VERSION,
        )
        db.add(source_record)
        db.commit()
        db.refresh(source_record)

    distance = CaseEmbedding.EmbeddingVector.cosine_distance(source_record.EmbeddingVector).label("distance")
    query = db.query(CaseMaster, distance).join(CaseEmbedding, CaseEmbedding.CaseMasterID == CaseMaster.CaseMasterID).filter(
        CaseMaster.CaseMasterID != source.CaseMasterID,
        CaseEmbedding.EmbeddingModel == settings.EMBEDDING_MODEL_NAME,
        CaseEmbedding.Version == settings.EMBEDDING_MODEL_VERSION,
    )
    query = apply_jurisdiction_filter(query, db, current_user, model_class=CaseMaster)
    if source.CrimeMajorHeadID:
        query = query.filter(CaseMaster.CrimeMajorHeadID == source.CrimeMajorHeadID)
    rows = query.order_by(distance).limit(limit).all()

    response_payload = {
        "SourceCaseMasterID": source.CaseMasterID,
        "ModelName": settings.EMBEDDING_MODEL_NAME,
        "ModelVersion": settings.EMBEDDING_MODEL_VERSION,
        "Matches": [
            {
                "CaseMasterID": candidate.CaseMasterID,
                "CaseNo": candidate.CaseNo,
                "SimilarityScore": round(max(0.0, min(1.0, 1.0 - float(candidate_distance))), 4),
                "BriefFacts": candidate.BriefFacts,
                "TopFactors": _factors(source, candidate),
            }
            for candidate, candidate_distance in rows
        ],
    }
    ai_audit_service.log_ai_run(db, current_user.UserID, "similar_case", "LaBSE", settings.EMBEDDING_MODEL_VERSION, str(case_id), {"match_count": len(response_payload["Matches"])})
    return response_payload
