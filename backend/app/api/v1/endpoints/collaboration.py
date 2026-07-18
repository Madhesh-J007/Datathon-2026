from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db, get_current_active_user
from app.core.permissions import verify_permission
from app.models.user import User
from app.crud import case_crud, case_annotation_crud, case_assignment_crud
from app.schemas.case import CaseAnnotation
from app.schemas.officer import CaseAssignment
from app.schemas.collaboration import CollaborationRequestOut, CollaborationApprovalResponse
from app.services import collaboration_service

router = APIRouter()

@router.get("/cases/{case_id}/annotations", response_model=List[CaseAnnotation], summary="Get Case Annotations")
def read_annotations(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:read"))
):
    """
    Retrieves all collaborative notes and annotations log for a specific case, verifying scope.
    """
    case = case_crud.get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found or access denied."
        )
    return case_annotation_crud.get_annotations_by_case(db, case_id)

@router.get("/cases/{case_id}/assignments", response_model=List[CaseAssignment], summary="Get Case Assignments")
def read_assignments(
    case_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:read"))
):
    """
    Retrieves the historical and active investigator assignments for a specific case, verifying scope.
    """
    case = case_crud.get_case_by_id(db, case_id, current_user)
    if not case:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Case not found or access denied."
        )
    return case_assignment_crud.get_assignments_by_case(db, case_id)

@router.get("/requests", response_model=List[CollaborationRequestOut], summary="List Collaboration Requests")
def list_collab_requests(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Lists all cross-jurisdiction data access requests visible to the active user.
    """
    return collaboration_service.get_collaboration_requests(db, current_user)

@router.post("/requests/{request_id}/approve", response_model=CollaborationApprovalResponse, summary="Approve Collaboration Request")
def approve_collab_request(
    request_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Approves a pending collaboration request, granting a time-boxed data access window.
    """
    collaboration_service.approve_collaboration_request(db, request_id, current_user)
    return CollaborationApprovalResponse(status="success", message="Request approved")
