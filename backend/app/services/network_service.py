"""AI network-community orchestration with jurisdiction-safe relationship edges."""

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.accused import Accused
from app.models.case_master import CaseMaster
from app.models.criminal_relationship import CriminalRelationship
from app.models.user import User
from app.services import ai_audit_service


def get_gang_communities(db: Session, current_user: User) -> dict:
    people_query = db.query(Accused.PersonID).join(CaseMaster).filter(Accused.PersonID.isnot(None))
    visible_people = {row[0] for row in apply_jurisdiction_filter(people_query, db, current_user, model_class=CaseMaster).all()}
    if not visible_people:
        return {"ModelVersion": "phase4-network-community-v1", "Communities": []}
    relationships = db.query(CriminalRelationship).filter(
        CriminalRelationship.Active.is_(True),
        CriminalRelationship.SourcePersonID.in_(visible_people),
        CriminalRelationship.TargetPersonID.in_(visible_people),
    ).all()
    if not relationships:
        return {"ModelVersion": "phase4-network-community-v1", "Communities": []}
    edges = [{"source_person_id": item.SourcePersonID, "target_person_id": item.TargetPersonID,
              "relationship_type": item.RelationshipType, "confidence": item.ConfidenceScore} for item in relationships]
    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/network/communities", json={"edges": edges})
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="AI network service is unavailable.") from exc
    result = response.json()
    response_payload = {"ModelVersion": result["model_version"], "Communities": [
        {"MemberPersonIDs": item["member_person_ids"], "Confidence": item["confidence"], "Explanation": item["explanation"]}
        for item in result["communities"]
    ]}
    ai_audit_service.log_ai_run(db, current_user.UserID, "network_community", "greedy_modularity", result["model_version"], None, {"community_count": len(result["communities"])})
    return response_payload
