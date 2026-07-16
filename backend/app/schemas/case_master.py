from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional, List

class CaseMasterBase(BaseModel):
    CrimeNo: int
    CaseNo: str
    CrimeRegisteredDate: date
    PolicePersonID: int
    PoliceStationID: int
    CaseCategoryID: int
    GravityOffenceID: int
    CrimeMajorHeadID: int
    CrimeMinorHeadID: int
    CaseStatusID: int
    CourtID: Optional[int] = None
    IncidentFromDate: datetime
    IncidentToDate: datetime
    InfoReceivedPSDate: datetime
    latitude: float
    longitude: float
    BriefFacts: str

class CaseMasterCreate(CaseMasterBase):
    pass

class CaseMaster(CaseMasterBase):
    CaseMasterID: int

    class Config:
        from_attributes = True  # In Pydantic v2, this replaces orm_mode=True

# --- Standard Paginated Response Envelope (SAD Section 16.3) ---

class PaginatedMeta(BaseModel):
    total: int
    page: int
    pageSize: int

class PaginatedCaseResponse(BaseModel):
    data: List[CaseMaster]
    meta: PaginatedMeta
    appliedScope: str
