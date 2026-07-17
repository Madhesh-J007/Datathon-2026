from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.dependencies import get_db
from app.core.permissions import verify_permission
from app.models.user import User
from app.models.user_jurisdiction import UserJurisdiction
from app.schemas.admin import UserCreate, UserJurisdictionCreate, UserJurisdictionOut
from app.schemas.auth import UserOut
from app.core.security import hash_password

router = APIRouter()

@router.post("/users", response_model=UserOut, status_code=status.HTTP_201_CREATED, summary="Create Platform User")
def create_user(
    user_in: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("users:manage"))
):
    """
    Registers a new platform user identity, hashes the password using native bcrypt,
    and assigns their organizational role and officer linkages.
    """
    from app.core.security import validate_password_strength
    pw_error = validate_password_strength(user_in.Password)
    if pw_error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=pw_error
        )

    existing = db.query(User).filter(User.Username == user_in.Username).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already registered."
        )
        
    db_user = User(
        Username=user_in.Username,
        PasswordHash=hash_password(user_in.Password),
        Email=user_in.Email,
        OfficerID=user_in.OfficerID,
        RoleID=user_in.RoleID,
        IsActive=True
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@router.get("/users", response_model=List[UserOut], summary="List Platform Users")
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("users:manage"))
):
    """
    Retrieves all user identities registered on the platform.
    """
    return db.query(User).all()

@router.post("/jurisdictions", response_model=UserJurisdictionOut, status_code=status.HTTP_201_CREATED, summary="Assign User Jurisdiction Override")
def assign_jurisdiction(
    jurisdict_in: UserJurisdictionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("users:manage"))
):
    """
    Creates a geographic query scope constraint in the database, overriding default officer scopes.
    """
    db_jurisdict = UserJurisdiction(
        UserID=jurisdict_in.UserID,
        DistrictID=jurisdict_in.DistrictID,
        UnitID=jurisdict_in.UnitID,
        Active=jurisdict_in.Active
    )
    db.add(db_jurisdict)
    db.commit()
    db.refresh(db_jurisdict)
    return db_jurisdict
