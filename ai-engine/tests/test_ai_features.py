import pytest
from models.mo_similarity.similarity_search import search_similar_cases
from models.risk_scoring.scorer import predict_risk
from models.forecasting.forecaster import forecast_crime_trend
from models.hotspot.predictor import predict_hotspots
from models.repeat_offender.resolver import resolve_repeat_offenders
from models.network_gang.community_detection import detect_communities
from models.anomaly.detector import detect_anomalies


def test_similarity_search():
    query_vector = [0.1, 0.2, 0.3]
    candidates = [
        {"case_master_id": 1, "vector": [0.1, 0.2, 0.3], "district": "District A", "crime_type": "Theft", "year": 2025},
        {"case_master_id": 2, "vector": [-0.1, -0.2, -0.3], "district": "District B", "crime_type": "Assault", "year": 2024}
    ]

    results = search_similar_cases(query_vector, candidates, district="District A")
    assert len(results) == 1
    assert results[0]["case_master_id"] == 1
    assert results[0]["similarity_score"] > 0.9
    assert results[0]["confidence_score"] > 0.9


def test_risk_scoring():
    payload = {
        "gravity_offence_id": 1,
        "reporting_delay_hours": 12.5,
        "case_age_days": 90,
        "number_of_accused": 3,
        "number_of_evidence_items": 4,
        "investigation_priority": "High"
    }
    res = predict_risk(payload)
    assert "score" in res
    assert "risk_level" in res
    assert "confidence" in res
    assert "confidence_meaning" in res
    assert "summary" in res
    assert "top_factors" in res
    assert len(res["top_factors"]) > 0
    factor = res["top_factors"][0]
    assert "feature" in factor
    assert "contribution" in factor
    assert "percentage" in factor
    assert "direction" in factor
    assert "description" in factor


def test_global_explainability():
    from models.risk_scoring.scorer import _model
    from models.risk_scoring.explain import get_global_explainability
    model = _model()
    res = get_global_explainability(model)
    assert res["model_type"] == "RandomForestClassifier"
    assert len(res["ranking"]) > 0
    assert "global_importance" in res["ranking"][0]



def test_forecasting():
    dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-05"]
    res = forecast_crime_trend(dates, 5)
    assert res["model_version"] == "phase4-trend-regression-v2"
    assert len(res["points"]) == 5


def test_hotspots():
    cases = [
        {"latitude": 12.97, "longitude": 77.59},
        {"latitude": 12.98, "longitude": 77.60},
        {"latitude": 12.99, "longitude": 77.61}
    ]
    res = predict_hotspots(cases)
    assert len(res) > 0
    assert "confidence" in res[0]


def test_repeat_offender():
    source = {"accused_master_id": 1, "name": "Ramesh Kumar", "age": 30, "gender_id": 1, "person_id": 100, "case_count": 1}
    candidates = [
        {"accused_master_id": 2, "name": "Ramesh Kumar", "age": 31, "gender_id": 1, "person_id": 100, "case_count": 2},
        {"accused_master_id": 3, "name": "Suresh Singh", "age": 45, "gender_id": 1, "person_id": 200, "case_count": 1}
    ]
    res = resolve_repeat_offenders(source, candidates)
    assert len(res) == 1
    assert res[0]["accused_master_id"] == 2


def test_network_gang():
    edges = [
        {"source_person_id": 1, "target_person_id": 2, "relationship_type": "associates", "confidence": 0.9},
        {"source_person_id": 2, "target_person_id": 3, "relationship_type": "associates", "confidence": 0.8}
    ]
    res = detect_communities(edges)
    assert len(res) > 0
    assert 1 in res[0]["member_person_ids"]


def test_anomalies():
    cases = [
        {"case_master_id": 1, "reporting_delay_hours": 100.0, "number_of_accused": 10, "number_of_evidence_items": 0},
        {"case_master_id": 2, "reporting_delay_hours": 1.0, "number_of_accused": 1, "number_of_evidence_items": 5},
        {"case_master_id": 3, "reporting_delay_hours": 2.0, "number_of_accused": 1, "number_of_evidence_items": 4}
    ]
    res = detect_anomalies(cases)
    assert len(res) > 0
    assert res[0]["case_master_id"] == 1
