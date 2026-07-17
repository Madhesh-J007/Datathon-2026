"""Explainable record-linkage model for likely repeat offenders."""

from difflib import SequenceMatcher


def resolve_repeat_offenders(source: dict, candidates: list[dict]) -> list[dict]:
    matches = []
    source_name = (source.get("name") or "").strip().lower()
    for candidate in candidates:
        if candidate["accused_master_id"] == source["accused_master_id"]:
            continue
        factors: list[str] = []
        score = 0.0
        if source.get("person_id") and source["person_id"] == candidate.get("person_id"):
            score += 0.65
            factors.append("Shared police identity reference")
        candidate_name = (candidate.get("name") or "").strip().lower()
        name_similarity = SequenceMatcher(None, source_name, candidate_name).ratio() if source_name and candidate_name else 0
        if name_similarity >= 0.85:
            score += 0.20
            factors.append("Strong name similarity")
        if source.get("gender_id") and source["gender_id"] == candidate.get("gender_id"):
            score += 0.05
            factors.append("Same recorded gender")
        if source.get("age") and candidate.get("age") and abs(source["age"] - candidate["age"]) <= 3:
            score += 0.10
            factors.append("Compatible age band")
        if candidate.get("case_count", 1) > 1:
            score += 0.05
            factors.append("Appears in multiple case records")
        if score >= 0.45:
            matches.append({"accused_master_id": candidate["accused_master_id"], "confidence": round(min(score, 1.0), 4), "factors": factors})
    return sorted(matches, key=lambda item: item["confidence"], reverse=True)[:20]
