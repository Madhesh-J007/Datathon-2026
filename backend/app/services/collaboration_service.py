from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import HTTPException, status
from app.models.collaboration_request import CollaborationRequest
from app.models.case_master import CaseMaster
from app.models.user import User
from app.models.officer import Officer
from app.services import notification_service
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter

def get_collaboration_requests(db: Session, current_user: User) -> list[CollaborationRequest]:
    """
    Lists collaboration requests. Admin users see all. Officers see requests they made
    or requests for cases inside their own jurisdiction.
    """
    if current_user.role and current_user.role.RoleName in ["Admin", "SCRB_Officer"]:
        return db.query(CollaborationRequest).order_by(CollaborationRequest.CreatedAt.desc()).all()
    
    # Non-admin: requests requested by the user, OR requests targeting cases within the user's jurisdiction
    case_query = db.query(CaseMaster.CaseMasterID)
    case_query = apply_jurisdiction_filter(case_query, db, current_user)
    jurisdiction_case_ids = [c[0] for c in case_query.all()]

    return db.query(CollaborationRequest).filter(
        or_(
            CollaborationRequest.RequestingOfficerID == current_user.OfficerID,
            CollaborationRequest.CaseMasterID.in_(jurisdiction_case_ids)
        )
    ).order_by(CollaborationRequest.CreatedAt.desc()).all()

def create_collaboration_request(db: Session, case_id: int, justification: str, current_user: User) -> CollaborationRequest:
    """
    Submits a new cross-district access request.
    """
    if not current_user.OfficerID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User must be linked to an officer profile to submit collaboration requests."
        )

    # Check if case exists
    case = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == case_id).first()
    if not case:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Target case not found.")

    # Create the request
    req = CollaborationRequest(
        CaseMasterID=case_id,
        RequestingOfficerID=current_user.OfficerID,
        Justification=justification,
        RequestStatus="Pending"
    )
    db.add(req)
    db.commit()
    db.refresh(req)

    # Notify admins/SHOs of the new request (Simple alert to user 1 or case assigned officers)
    # Find users linked to the station of the case
    station_users = db.query(User).join(Officer).filter(Officer.PoliceStationID == case.PoliceStationID).all()
    for u in station_users:
        notification_service.create_notification(
            db, 
            user_id=u.UserID, 
            title="New Collaboration Request", 
            message=f"Officer ID #{current_user.OfficerID} is requesting access to Case #{case.CaseNo}."
        )

    return req

def approve_collaboration_request(db: Session, request_id: int, current_user: User) -> CollaborationRequest:
    """
    Approves a collaboration request and grants a 7-day access window to the requesting officer.
    """
    req = db.query(CollaborationRequest).filter(CollaborationRequest.CollaborationRequestID == request_id).first()
    if not req:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaboration request not found.")

    # Verify that the current user has access to approve this case's data (case must be within user jurisdiction)
    case_query = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == req.CaseMasterID)
    case_query = apply_jurisdiction_filter(case_query, db, current_user)
    if not case_query.first() and not (current_user.role and current_user.role.RoleName == "Admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. You cannot approve collaboration requests for cases outside your jurisdiction scope."
        )

    req.RequestStatus = "Approved"
    req.ApprovedAt = datetime.now(timezone.utc)
    req.ExpiryAt = datetime.now(timezone.utc) + timedelta(days=7)
    db.commit()

    # Find the UserID corresponding to the requesting officer to send a notification
    req_user = db.query(User).filter(User.OfficerID == req.RequestingOfficerID).first()
    if req_user:
        notification_service.create_notification(
            db,
            user_id=req_user.UserID,
            title="Collaboration Approved",
            message=f"Your access request to Case ID #{req.CaseMasterID} has been approved for 7 days."
        )

    return req

def check_active_collaboration(db: Session, case_id: int, officer_id: int | None) -> bool:
    """
    Checks if a given officer has active, approved, unexpired collaboration access to a case.
    """
    if not officer_id:
        return False
    
    now = datetime.now(timezone.utc)
    collab = db.query(CollaborationRequest).filter(
        CollaborationRequest.CaseMasterID == case_id,
        CollaborationRequest.RequestingOfficerID == officer_id,
        CollaborationRequest.RequestStatus == "Approved",
        or_(CollaborationRequest.ExpiryAt.is_(None), CollaborationRequest.ExpiryAt > now)
    ).first()
    
    return collab is not None
