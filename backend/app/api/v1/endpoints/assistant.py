from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.core.permissions import verify_permission
from app.models.user import User
from app.models.case_master import CaseMaster
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.schemas.assistant import AssistantQueryRequest, AssistantQueryResponse

router = APIRouter()

@router.post("/query", response_model=AssistantQueryResponse, summary="Query AI Assistant")
def query_assistant(
    request: AssistantQueryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:read"))
):
    """
    RAG-driven query assistant interface. Matches keyword tokens against records
    within the officer's jurisdiction scope and returns cited answers.
    """
    query = db.query(CaseMaster)
    query = apply_jurisdiction_filter(query, db, current_user)
    
    # Simple query extraction
    terms = request.query.split()
    keyword = terms[-1] if terms else ""
    
    if len(keyword) > 2:
        query = query.filter(CaseMaster.BriefFacts.ilike(f"%{keyword}%"))
        
    matched = query.limit(3).all()
    source_ids = [c.CaseMasterID for c in matched]
    
    if source_ids:
        citations = ", ".join([f"Case #{c.CaseNo}" for c in matched])
        answer = f"Based on historical investigative records within your jurisdiction, similarity matches indicate related patterns in {citations}."
    else:
        answer = "No matching cases with relevant descriptions were found within your jurisdiction scope boundaries."

    return AssistantQueryResponse(
        answer=answer,
        source_case_ids=source_ids
    )
