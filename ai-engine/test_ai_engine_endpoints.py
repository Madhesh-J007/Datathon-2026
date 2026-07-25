import sys
from fastapi.testclient import TestClient
from serving.main import app

client = TestClient(app)

def test_endpoints():
    print("\n=======================================================")
    print("      AI ENGINE MICROSERVICE ENDPOINT TEST SUITE       ")
    print("=======================================================\n")

    endpoints = [
        ("GET", "/health", None),
        ("GET", "/readiness", None),
        ("POST", "/ai/v1/risk-score", {
            "gravity_offence_id": 1,
            "reporting_delay_hours": 12.5,
            "case_age_days": 30,
            "number_of_accused": 2,
            "number_of_evidence_items": 4,
            "investigation_priority": "High"
        }),
        ("POST", "/ai/v1/hotspots/predict", {
            "cases": [
                {"latitude": 15.3173, "longitude": 75.7139, "crime_major_head_id": 2},
                {"latitude": 15.3200, "longitude": 75.7150, "crime_major_head_id": 2},
                {"latitude": 15.3150, "longitude": 75.7120, "crime_major_head_id": 1}
            ]
        }),
        ("POST", "/ai/v1/forecast/crime-trend", {
            "registration_dates": [
                "2026-07-01T10:00:00", "2026-07-02T10:00:00", "2026-07-03T10:00:00",
                "2026-07-04T10:00:00", "2026-07-05T10:00:00", "2026-07-06T10:00:00"
            ],
            "horizon_days": 7
        }),
        ("POST", "/ai/v1/repeat-offenders/resolve", {
            "source": {"accused_master_id": 1, "name": "Sharath Kumar", "age": 32, "gender_id": 1, "person_id": 101, "case_count": 2},
            "candidates": [
                {"accused_master_id": 2, "name": "Sharath alias D-Gang", "age": 33, "gender_id": 1, "person_id": 101, "case_count": 3}
            ]
        }),
        ("POST", "/ai/v1/anomalies/detect", {
            "cases": [
                {"case_master_id": 101, "reporting_delay_hours": 72.0, "number_of_accused": 4, "number_of_evidence_items": 1},
                {"case_master_id": 102, "reporting_delay_hours": 2.0, "number_of_accused": 1, "number_of_evidence_items": 5},
                {"case_master_id": 103, "reporting_delay_hours": 96.0, "number_of_accused": 5, "number_of_evidence_items": 0}
            ]
        }),
        ("POST", "/ai/v1/embeddings", {
            "texts": ["Accused extorted shopkeeper at knife point in Belagavi market."]
        }),
        ("POST", "/ai/v1/network/communities", {
            "edges": [
                {"source_person_id": 101, "target_person_id": 102, "relationship_type": "Associate", "confidence": 0.90},
                {"source_person_id": 102, "target_person_id": 103, "relationship_type": "Co-Accused", "confidence": 0.85}
            ]
        })
    ]

    passed = 0
    failed = 0

    for method, path, payload in endpoints:
        try:
            if method == "GET":
                res = client.get(path)
            else:
                res = client.post(path, json=payload)

            if res.status_code == 200:
                print(f"  [OK]   {method:4s} {path:35s} -> HTTP {res.status_code}")
                passed += 1
            else:
                print(f"  [FAIL] {method:4s} {path:35s} -> HTTP {res.status_code} ({res.text[:120]})")
                failed += 1
        except Exception as e:
            print(f"  [EXC]  {method:4s} {path:35s} -> Exception: {e}")
            failed += 1

    print("\n-------------------------------------------------------")
    print(f"  TOTAL AI TEST RESULTS: {passed} PASSED, {failed} FAILED")
    print("-------------------------------------------------------\n")

    if failed == 0:
        print("[SUCCESS] ALL AI ENGINE MICROSERVICE ENDPOINTS OPERATIONAL!")
        sys.exit(0)
    else:
        print("[WARNING] SOME AI ENDPOINTS RETURNED NON-200 STATUS CODES.")
        sys.exit(1)

if __name__ == "__main__":
    test_endpoints()
