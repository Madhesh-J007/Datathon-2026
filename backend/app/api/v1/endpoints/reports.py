from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.dependencies import get_db
from app.core.permissions import verify_permission
from app.models.user import User
from app.crud import case_crud
from app.schemas.report import ReportSummary

router = APIRouter()

@router.get("/cases/{case_id}/summary", response_model=ReportSummary, summary="Get Case Report Summary")
def get_case_report_summary(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:read"))
):
    """
    Generates a structured analytical case report summary, compiling linked entity counts.
    Enforces row-level geographic scoping checks.
    """
    case = case_crud.get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found or access denied."
        )
        
    return ReportSummary(
        CaseMasterID=case.CaseMasterID,
        CaseNo=case.CaseNo,
        BriefFacts=case.BriefFacts,
        TotalAccused=len(case.accused_list),
        TotalVictims=len(case.victims),
        TotalEvidence=len(case.evidence_items),
        ReportGeneratedAt=datetime.now(timezone.utc)
    )
