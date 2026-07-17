"""Isolation Forest anomaly detection over operational case signals."""

import numpy as np
from sklearn.ensemble import IsolationForest


def detect_anomalies(cases: list[dict]) -> list[dict]:
    matrix = np.asarray([[case["reporting_delay_hours"], case["number_of_accused"], case["number_of_evidence_items"]] for case in cases], dtype=float)
    model = IsolationForest(contamination="auto", random_state=42).fit(matrix)
    scores = -model.score_samples(matrix)
    threshold = float(np.percentile(scores, 85))
    findings = []
    for case, score in zip(cases, scores):
        if score < threshold:
            continue
        factors = []
        if case["reporting_delay_hours"] >= float(np.percentile(matrix[:, 0], 85)):
            factors.append("Unusually long reporting delay")
        if case["number_of_accused"] >= float(np.percentile(matrix[:, 1], 85)):
            factors.append("Unusually high number of accused")
        if case["number_of_evidence_items"] <= float(np.percentile(matrix[:, 2], 15)):
            factors.append("Low evidence volume for this case pattern")
        findings.append({"case_master_id": case["case_master_id"], "anomaly_score": round(float(score), 4), "factors": factors or ["Unusual combination of case signals"]})
    return sorted(findings, key=lambda item: item["anomaly_score"], reverse=True)
