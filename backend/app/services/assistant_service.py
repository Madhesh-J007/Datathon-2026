import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.case_master import CaseMaster
from app.models.user import User
from app.services import ai_audit_service

def query_assistant(db: Session, query: str, current_user: User) -> dict:
    """
    RAG-driven query assistant service. Compiles all visible cases inside the user's
    jurisdiction scope, forwards them to the AI Engine serving endpoint, and audits the run.
    """
    # 1. Gather all case records visible to current user
    case_query = db.query(CaseMaster)
    case_query = apply_jurisdiction_filter(case_query, db, current_user)
    cases = case_query.limit(20).all()

    # 2. Build textual context for RAG grounding
    context_lines = []
    for c in cases:
        accused_names = ", ".join([a.AccusedName for a in c.accused_list if a.AccusedName])
        context_lines.append(
            f"CaseID: {c.CaseMasterID} | CaseNo: {c.CaseNo} | Accused: {accused_names} | Facts: {c.BriefFacts or 'N/A'}"
        )
    context_str = "\n".join(context_lines)

    # 3. Call stateless AI inference engine
    payload = {
        "query": query,
        "context": context_str
    }
    
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/assistant/query", json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Assistant inference service is offline or unreachable."
        ) from exc

    result = response.json()

    # 4. Log AI Audit run
    ai_audit_service.log_ai_run(
        db,
        user_id=current_user.UserID,
        capability="assistant_chat",
        model_name="claude-sonnet-4-6",
        model_version=result.get("model_version", "v1"),
        resource_id=None,
        summary={"query": query, "source_cases": len(result.get("source_case_ids", []))}
    )

    return result
