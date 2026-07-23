from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_active_user
from app.schemas.auth import LoginRequest, TokenResponse, TokenRefreshRequest, UserOut
from app.services import auth_service
from app.models.user import User

router = APIRouter()

@router.post("/login", response_model=TokenResponse, summary="User Login")
def login(request: LoginRequest, db: Session = Depends(get_db)):
    """
    Authenticates a user/officer and returns JWT access and refresh tokens.
    """
    return auth_service.authenticate_user(db, request)

@router.post("/refresh", response_model=TokenResponse, summary="Refresh Access Token")
def refresh(request: TokenRefreshRequest, db: Session = Depends(get_db)):
    """
    Validates a refresh token and returns a new access and refresh token pair.
    """
    return auth_service.refresh_access_token(db, request)

@router.post("/logout", status_code=204, summary="User Logout")
def logout(request: TokenRefreshRequest):
    """
    Revokes the provided refresh token, invalidating the session in Redis.
    """
    auth_service.logout_user(request.refresh_token)

@router.get("/me", response_model=UserOut, summary="Get Current User Profile")
def get_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_active_user)
):
    """
    Retrieves the profile details of the currently logged-in active user.
    """
    if current_user.OfficerID:
        from app.models.officer import Officer
        officer = db.query(Officer).filter(Officer.OfficerID == current_user.OfficerID).first()
        if officer:
            setattr(current_user, "Rank", officer.Rank)
    return current_user
