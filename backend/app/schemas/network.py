from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class RelationshipCreate(BaseModel):
    SourcePersonID: int
    TargetPersonID: int
    RelationshipType: str
    EvidenceSource: Optional[str] = None

class RelationshipVerify(BaseModel):
    Status: str

class CriminalRelationship(BaseModel):
    RelationshipID: int
    SourcePersonID: int
    TargetPersonID: int
    RelationshipType: str
    ConfidenceScore: float
    CreatedBy: int
    CreatedAt: datetime
    EvidenceSource: Optional[str] = None
    VerifiedBy: Optional[int] = None
    VerifiedDate: Optional[datetime] = None
    Status: str
    Active: bool

    class Config:
        from_attributes = True
