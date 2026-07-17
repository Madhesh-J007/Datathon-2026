"""Secure Core Backend orchestration for the AI hotspot predictor."""

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.case_master import CaseMaster
from app.models.user import User
from app.services import ai_audit_service


def get_predicted_hotspots(db: Session, current_user: User) -> dict:
    query = db.query(CaseMaster).filter(CaseMaster.latitude.isnot(None), CaseMaster.longitude.isnot(None))
    query = apply_jurisdiction_filter(query, db, current_user)
    cases = query.limit(5000).all()
    if not cases:
        return {"model_version": "phase4-kde-hotspot-v1", "hotspots": []}
    payload = {
        "cases": [
            {"latitude": case.latitude, "longitude": case.longitude, "crime_major_head_id": case.CrimeMajorHeadID}
            for case in cases
        ]
    }
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/hotspots/predict", json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI hotspot service is unavailable.") from exc
    result = response.json()
    ai_audit_service.log_ai_run(db, current_user.UserID, "hotspot_prediction", "kernel_density", result["model_version"], None, {"hotspot_count": len(result["hotspots"])})
    return result
