from pydantic import BaseModel, Field


class EmbeddingRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=128)


class EmbeddingResponse(BaseModel):
    vectors: list[list[float]]
    model_name: str
    model_version: str
    dimensions: int


class RiskPredictionRequest(BaseModel):
    gravity_offence_id: int = 0
    reporting_delay_hours: float = 0.0
    case_age_days: float = 0.0
    number_of_accused: int = 0
    number_of_evidence_items: int = 0
    investigation_priority: str = "Medium"


class RiskFactor(BaseModel):
    feature_name: str
    impact_score: float
    description: str


class RiskPredictionResponse(BaseModel):
    score: float
    risk_level: str
    model_version: str
    top_factors: list[RiskFactor]


class HotspotCase(BaseModel):
    latitude: float
    longitude: float
    crime_major_head_id: int | None = None


class HotspotPredictionRequest(BaseModel):
    cases: list[HotspotCase] = Field(min_length=1, max_length=5000)


class HotspotPrediction(BaseModel):
    latitude: float
    longitude: float
    confidence: float
    top_factors: list[str]


class HotspotPredictionResponse(BaseModel):
    model_version: str
    hotspots: list[HotspotPrediction]


class ForecastRequest(BaseModel):
    registration_dates: list[str] = Field(min_length=1, max_length=10000)
    horizon_days: int = Field(default=7, ge=1, le=90)


class ForecastPoint(BaseModel):
    date: str
    predicted_count: float


class ForecastResponse(BaseModel):
    model_version: str
    trend: str
    points: list[ForecastPoint]


class OffenderProfile(BaseModel):
    accused_master_id: int
    name: str | None = None
    age: int | None = None
    gender_id: int | None = None
    person_id: int | None = None
    case_count: int = 1


class RepeatOffenderRequest(BaseModel):
    source: OffenderProfile
    candidates: list[OffenderProfile] = Field(max_length=1000)


class RepeatOffenderMatch(BaseModel):
    accused_master_id: int
    confidence: float
    factors: list[str]


class RepeatOffenderResponse(BaseModel):
    model_version: str
    matches: list[RepeatOffenderMatch]


class AnomalyCase(BaseModel):
    case_master_id: int
    reporting_delay_hours: float = 0.0
    number_of_accused: int = 0
    number_of_evidence_items: int = 0


class AnomalyRequest(BaseModel):
    cases: list[AnomalyCase] = Field(min_length=3, max_length=5000)


class AnomalyFinding(BaseModel):
    case_master_id: int
    anomaly_score: float
    factors: list[str]


class AnomalyResponse(BaseModel):
    model_version: str
    findings: list[AnomalyFinding]


class NetworkEdge(BaseModel):
    source_person_id: int
    target_person_id: int
    relationship_type: str
    confidence: float = 1.0


class NetworkCommunityRequest(BaseModel):
    edges: list[NetworkEdge]


class NetworkCommunity(BaseModel):
    member_person_ids: list[int]
    confidence: float
    explanation: str


class NetworkCommunityResponse(BaseModel):
    model_version: str
    communities: list[NetworkCommunity]
