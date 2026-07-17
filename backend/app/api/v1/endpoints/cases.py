from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_permission
from app.models.user import User

# CRUD and Services
from app.crud import case_crud
from app.services import case_service, witness_service, annotation_service, assignment_service

# Pydantic Schemas
from app.schemas.case_master import CaseMaster, CaseMasterCreate, PaginatedCaseResponse
from app.schemas.witness import Witness, WitnessCreate
from app.schemas.case import CaseAnnotation, AnnotationCreate
from app.schemas.officer import CaseAssignment, AssignmentCreate

router = APIRouter()

@router.get("", response_model=PaginatedCaseResponse, summary="List Cases")
def read_cases(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=100, alias="pageSize", description="Page size"),
    search: Optional[str] = Query(None, description="Fuzzy search by CaseNo or BriefFacts"),
    station_id: Optional[int] = Query(None, alias="stationId", description="Filter by Police Station ID"),
    status_id: Optional[int] = Query(None, alias="statusId", description="Filter by Case Status ID"),
    sort_by: Optional[str] = Query(None, alias="sortBy", description="Sorting criterion (date_desc, date_asc, priority_desc, risk_desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:read"))
):
    """
    Retrieves a paginated list of crime cases.
    Automatically restricts rows to the active officer's jurisdiction bounds.
    """
    skip = (page - 1) * page_size
    db_cases, total_count = case_crud.get_cases_paginated(
        db=db,
        user=current_user,
        skip=skip,
        limit=page_size,
        search=search,
        station_id=station_id,
        status_id=status_id,
        sort_by=sort_by
    )
    
    # Extract roles to display dynamic scopes (Statewide vs station-bounded)
    applied_scope = "Statewide"
    if current_user.role and current_user.role.RoleName not in ["Admin", "SCRB_Officer"]:
        applied_scope = "Jurisdiction Bounded"

    return {
        "data": db_cases,
        "meta": {
            "total": total_count,
            "page": page,
            "pageSize": page_size
        },
        "appliedScope": applied_scope
    }

@router.get("/{case_id}", response_model=CaseMaster, summary="Get Case Details")
def read_case(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:read"))
):
    """
    Retrieves complete case file metadata, including accused, victims, witnesses,
    evidence items, and assignments. Enforces active jurisdiction scopes.
    """
    db_case = case_crud.get_case_by_id(db, case_id=case_id, user=current_user)
    if db_case is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found or access denied."
        )
    return db_case

@router.post("", response_model=CaseMaster, status_code=status.HTTP_201_CREATED, summary="Register Case")
def create_new_case(
    case_in: CaseMasterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:create"))
):
    """
    Registers a new crime case file registry entry.
    Verifies that latitude and longitude coordinates fall within geographical state limits.
    """
    return case_service.register_new_case(db, case_in.model_dump(), current_user)

@router.put("/{case_id}/status", response_model=CaseMaster, summary="Transition Case Status")
def update_case_status(
    case_id: int,
    status_id: int = Query(..., alias="statusId", description="Target case status master ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:update"))
):
    """
    Transitions the operational workflow lifecycle state of a case.
    """
    return case_service.transition_case_status(db, case_id, status_id, current_user)

@router.put("/{case_id}/priority", response_model=CaseMaster, summary="Update Case Priority")
def update_case_priority(
    case_id: int,
    priority: str = Query(..., description="Target priority (e.g. High, Medium, Low)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:update"))
):
    """
    Updates the investigation urgency priority classification.
    """
    return case_service.set_case_priority(db, case_id, priority, current_user)

@router.post("/{case_id}/witnesses", response_model=Witness, status_code=status.HTTP_201_CREATED, summary="Record Witness Statement")
def add_witness_statement(
    case_id: int,
    witness_in: WitnessCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:annotate"))
):
    """
    Records a witness statement linked to a case.
    """
    stmt_data = witness_in.model_dump()
    stmt_data["CaseMasterID"] = case_id
    return witness_service.record_witness_statement(db, stmt_data, current_user)

@router.post("/{case_id}/annotations", response_model=CaseAnnotation, status_code=status.HTTP_201_CREATED, summary="Add Case Annotation Notes")
def add_annotation(
    case_id: int,
    annotation_in: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:annotate"))
):
    """
    Appends investigator annotations and case notes logs.
    """
    return annotation_service.add_case_annotation(
        db=db,
        case_id=case_id,
        notes_text=annotation_in.NotesText,
        category=annotation_in.Category,
        current_user=current_user
    )

@router.delete("/annotations/{annotation_id}", summary="Delete Case Annotation Notes")
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:annotate"))
):
    """
    Soft-deletes a case annotation note entry.
    """
    success = annotation_service.remove_case_annotation(db, annotation_id, current_user)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found or deletion failed."
        )
    return {"status": "success", "message": "Annotation successfully soft-deleted."}

@router.post("/{case_id}/assignments", response_model=CaseAssignment, status_code=status.HTTP_201_CREATED, summary="Assign Investigator")
def assign_investigator(
    case_id: int,
    assignment_in: AssignmentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:update"))
):
    """
    Assigns an officer investigator to a case, incrementing active caseloads.
    """
    return assignment_service.assign_officer_to_case(
        db=db,
        case_id=case_id,
        officer_id=assignment_in.OfficerID,
        role=assignment_in.AssignmentRole,
        current_user=current_user
    )

@router.delete("/assignments/{assignment_id}", summary="Release Investigator")
def release_investigator(
    assignment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:update"))
):
    """
    Releases an investigator from a case, decrementing active caseload counts.
    """
    assignment_service.release_officer_from_case(db, assignment_id, current_user)
    return {"status": "success", "message": "Investigator released from case."}
