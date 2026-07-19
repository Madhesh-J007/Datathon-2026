from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class LoginRequest(BaseModel):
    Username: str
    Password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class RoleOut(BaseModel):
    RoleID: int
    RoleName: str
    Description: str

    class Config:
        from_attributes = True

class UserOut(BaseModel):
    UserID: int
    Username: str
    Email: str
    OfficerID: Optional[int] = None
    IsActive: bool
    CreatedAt: datetime
    role: Optional[RoleOut] = None

    class Config:
        from_attributes = True
