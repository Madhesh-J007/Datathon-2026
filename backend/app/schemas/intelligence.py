from pydantic import BaseModel
from typing import List

class RiskFactor(BaseModel):
    FeatureName: str
    ImpactScore: float
    Description: str

class PredictRiskResponse(BaseModel):
    CaseMasterID: int
    AIRiskScore: float
    RiskLevel: str
    TopRiskFactors: List[RiskFactor]
