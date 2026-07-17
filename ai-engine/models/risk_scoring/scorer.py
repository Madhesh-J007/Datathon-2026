"""Dataset-trained, explainable risk scoring for the Phase 4 API."""

from functools import lru_cache
from pathlib import Path

import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from config import settings

FEATURES = [
    "GravityOffenceID", "ReportingDelayHours", "CaseAgeDays",
    "NumberOfAccused", "NumberOfEvidenceItems",
]


def _priority(value: str) -> int:
    return int(value.strip().lower() == "high")


@lru_cache(maxsize=1)
def _model() -> RandomForestClassifier:
    path = Path(settings.TRAINING_DATA_PATH)
    if not path.exists():
        raise RuntimeError("Risk training dataset is unavailable to the AI engine.")
    data = pd.read_csv(path)
    frame = pd.DataFrame({
        "GravityOffenceID": data["GravityOffenceName"].fillna("").eq("Heinous").astype(int),
        "ReportingDelayHours": pd.to_numeric(data["ReportingDelayHours"], errors="coerce").fillna(0),
        "CaseAgeDays": pd.to_numeric(data["CaseAgeDays"], errors="coerce").fillna(0),
        "NumberOfAccused": pd.to_numeric(data["NumberOfAccused"], errors="coerce").fillna(0),
        "NumberOfEvidenceItems": pd.to_numeric(data["NumberOfEvidenceItems"], errors="coerce").fillna(0),
    })
    target = data["RiskLabel"].fillna("Medium").map({"Low": 0, "Medium": 1, "High": 2}).fillna(1).astype(int)
    model = RandomForestClassifier(n_estimators=160, max_depth=8, min_samples_leaf=3, random_state=42, class_weight="balanced")
    model.fit(frame[FEATURES], target)
    return model


def predict_risk(payload: dict) -> dict:
    model = _model()
    features = pd.DataFrame([{
        "GravityOffenceID": int(payload.get("gravity_offence_id", 0) == 1),
        "ReportingDelayHours": max(0.0, float(payload.get("reporting_delay_hours", 0))),
        "CaseAgeDays": max(0.0, float(payload.get("case_age_days", 0))),
        "NumberOfAccused": max(0, int(payload.get("number_of_accused", 0))),
        "NumberOfEvidenceItems": max(0, int(payload.get("number_of_evidence_items", 0))),
    }])
    probabilities = model.predict_proba(features[FEATURES])[0]
    score = float(probabilities[2] + (0.35 * probabilities[1]))
    level = "High" if score >= 0.70 else "Medium" if score >= 0.40 else "Low"
    descriptions = {
        "GravityOffenceID": "Serious offence classification increases operational risk.",
        "ReportingDelayHours": "A longer reporting delay can reduce evidentiary reliability.",
        "CaseAgeDays": "Older unresolved cases need heightened investigation attention.",
        "NumberOfAccused": "Multiple accused increase investigation complexity.",
        "NumberOfEvidenceItems": "Available evidence affects case progression and urgency.",
    }
    factors = sorted(zip(FEATURES, model.feature_importances_), key=lambda item: item[1], reverse=True)[:3]
    return {
        "score": round(score, 4), "risk_level": level, "model_version": "phase4-risk-rf-v1",
        "top_factors": [
            {"feature_name": name, "impact_score": round(float(weight), 4), "description": descriptions[name]}
            for name, weight in factors
        ],
    }
