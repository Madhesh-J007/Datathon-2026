from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class ReportSummary(BaseModel):
    CaseMasterID: int
    CaseNo: str
    BriefFacts: str
    TotalAccused: int
    TotalVictims: int
    TotalEvidence: int
    ReportGeneratedAt: datetime
