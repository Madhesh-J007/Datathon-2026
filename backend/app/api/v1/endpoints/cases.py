from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.crud import case_crud
from app.schemas.case_master import CaseMaster, PaginatedCaseResponse

router = APIRouter()

@router.get("", response_model=PaginatedCaseResponse)
def read_cases(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, alias="pageSize", description="Page size"),
    db: Session = Depends(get_db)
):
    """
    Retrieve a paginated list of cases.
    Returns a standardized envelope: { data, meta, appliedScope }
    """
    skip = (page - 1) * page_size
    db_cases = case_crud.get_cases(db, skip=skip, limit=page_size)
    total_count = case_crud.count_cases(db)
    
    return {
        "data": db_cases,
        "meta": {
            "total": total_count,
            "page": page,
            "pageSize": page_size
        },
        "appliedScope": "Statewide (Unscoped - Dev Mode)"
    }

@router.get("/{case_id}", response_model=CaseMaster)
def read_case(case_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a single case by ID.
    """
    db_case = case_crud.get_case(db, case_id=case_id)
    if db_case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return db_case
