from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from app.core.permissions import verify_permission
from app.models.user import User

# Services & Schemas
from app.services import relationship_service
from app.schemas.network import CriminalRelationship, RelationshipCreate, RelationshipVerify

router = APIRouter()

@router.post("/relationships", response_model=CriminalRelationship, status_code=status.HTTP_201_CREATED, summary="Establish Suspect Link")
def establish_link(
    relationship_in: RelationshipCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:update"))
):
    """
    Creates a new suspect network relationship connection (edge).
    """
    return relationship_service.establish_suspect_link(
        db=db,
        source_person_id=relationship_in.SourcePersonID,
        target_person_id=relationship_in.TargetPersonID,
        rel_type=relationship_in.RelationshipType,
        current_user=current_user
    )

@router.put("/relationships/{relationship_id}/verify", response_model=CriminalRelationship, summary="Verify Suspect Link")
def verify_link(
    relationship_id: int,
    verification_in: RelationshipVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:update"))
):
    """
    Applies verification status (Confirmed/Disputed/Pending) to a suspect relationship connection.
    """
    return relationship_service.verify_suspect_link(
        db=db,
        relationship_id=relationship_id,
        verify_status=verification_in.Status,
        current_user=current_user
    )
