from pydantic import BaseModel
from typing import List, Optional

class HotspotPoint(BaseModel):
    latitude: float
    longitude: float
    weight: Optional[float] = 1.0
    BriefFacts: Optional[str] = None
    CaseNo: Optional[str] = None

class HotspotResponse(BaseModel):
    points: List[HotspotPoint]
    total_points: int


class PredictedHotspot(BaseModel):
    latitude: float
    longitude: float
    confidence: float
    top_factors: List[str]


class PredictedHotspotResponse(BaseModel):
    model_version: str
    hotspots: List[PredictedHotspot]
