import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, or_
from fastapi import HTTPException, status
import re

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.case_master import CaseMaster
from app.models.police_station import PoliceStation
from app.models.district import District
from app.models.accused import Accused
from app.models.evidence import Evidence
from app.models.victim import Victim
from app.models.user import User
from app.services import ai_audit_service, report_service

KNOWN_DISTRICTS = [
    "bengaluru", "belagavi", "mysuru", "dharwad", "hubballi", "bagalkot",
    "ballari", "bidar", "chamarajanagar", "chikballapur", "chikkamagaluru",
    "chitradurga", "dakshina kannada", "davanagere", "gadag", "hassan",
    "haveri", "kalaburagi", "kodagu", "kolar", "koppal", "mandya",
    "raichur", "ramanagara", "shivamogga", "tumakuru", "udupi", "uttara kannada", "vijayanagara", "yadgir"
]

def query_assistant(db: Session, query: str, current_user: User) -> dict:
    """
    Multi-source RAG query assistant service. Dynamically queries PostgreSQL database
    tables (CaseMaster, Accused, Evidence, Victim, District, PoliceStation) based on query
    intent, compiles real live database rows, and forwards to the AI Engine.
    """
    q_lower = query.lower()
    telemetry_lines = []
    search_lines = []
    source_cases = []

    # 1. Whole Dataset High-Level Overview Context
    total_firs = db.query(func.count(CaseMaster.CaseMasterID)).scalar() or 0
    high_risk_firs = db.query(func.count(CaseMaster.CaseMasterID)).filter(CaseMaster.AIRiskScore >= 0.70).scalar() or 0
    pending_firs = db.query(func.count(CaseMaster.CaseMasterID)).filter(CaseMaster.CaseStatusID.in_([1, 2])).scalar() or 0

    top_districts = db.query(
        District.DistrictName,
        func.count(CaseMaster.CaseMasterID).label("cnt")
    ).join(PoliceStation, CaseMaster.PoliceStationID == PoliceStation.UnitID)\
     .join(District, PoliceStation.DistrictID == District.DistrictID)\
     .group_by(District.DistrictName).order_by(desc("cnt")).limit(5).all()

    dist_summary = ", ".join([f"{d[0]} ({d[1]} FIRs)" for d in top_districts]) or "Bagalkot, Bengaluru Urban"

    telemetry_lines.append("=== WHOLE DATASET ANALYTICS SNAPSHOT ===")
    telemetry_lines.append(f"Total Registered FIRs in Database: {total_firs}")
    telemetry_lines.append(f"High AI Threat Risk FIRs (Score >= 0.70): {high_risk_firs}")
    telemetry_lines.append(f"Active Pending Investigations: {pending_firs}")
    telemetry_lines.append(f"Top District Volume: {dist_summary}")
    telemetry_lines.append("=========================================\n")

    # 2. Case Number Match (e.g. 202200001 or Case #1)
    case_no_match = re.search(r'\b(20\d{7}|\d{1,5})\b', query)
    if case_no_match:
        matched_str = case_no_match.group(1)
        found_case = db.query(CaseMaster).filter(
            or_(
                CaseMaster.CaseNo == matched_str,
                CaseMaster.CaseMasterID == (int(matched_str) if matched_str.isdigit() else -1)
            )
        ).first()

        if found_case:
            source_cases.append(found_case)
            accused_names = ", ".join([a.AccusedName for a in found_case.accused_list if a.AccusedName]) or "None listed"
            evidences = db.query(Evidence).filter(Evidence.CaseMasterID == found_case.CaseMasterID).all()
            ev_summary = ", ".join([e.Description for e in evidences if e.Description]) or "Standard crime scene evidence"

            search_lines.append(
                f"CaseID: {found_case.CaseMasterID} | CaseNo: {found_case.CaseNo} | RiskScore: {int((found_case.AIRiskScore or 0)*100)}% | Priority: {found_case.InvestigationPriority} | Accused: {accused_names} | Evidence: {ev_summary} | Facts: {found_case.BriefFacts}"
            )

    # 3. Accused / Suspect Search (e.g. Ramesh, Sunita, Hegde, Verma)
    stop_words = {"tell", "me", "about", "abt", "who", "is", "the", "accused", "suspect", "in", "case", "details", "for", "and", "give", "show", "search", "find", "analyze"}
    clean_name_query = " ".join([w for w in q_lower.replace("?", "").replace(".", "").replace(",", "").split() if w not in stop_words and len(w) >= 2]).strip()

    if clean_name_query and len(clean_name_query) >= 3:
        accused_rows = db.query(
            Accused.AccusedName,
            Accused.AgeYear,
            Accused.Occupation,
            Accused.IsRepeatOffender,
            CaseMaster.CaseMasterID,
            CaseMaster.CaseNo,
            CaseMaster.BriefFacts,
            PoliceStation.UnitName
        ).join(
            CaseMaster, Accused.CaseMasterID == CaseMaster.CaseMasterID
        ).outerjoin(
            PoliceStation, CaseMaster.PoliceStationID == PoliceStation.UnitID
        ).filter(
            Accused.AccusedName.ilike(f"%{clean_name_query}%")
        ).limit(10).all()

        if accused_rows:
            search_lines.append("=== MATCHED ACCUSED / SUSPECT RECORDS ===")
            for r in accused_rows:
                a_name, age, occ, repeat, c_id, c_no, facts, p_name = r
                c_obj = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == c_id).first()
                if c_obj and c_obj not in source_cases:
                    source_cases.append(c_obj)
                search_lines.append(
                    f"- AccusedName: {a_name} | Age: {age or 'N/A'} | Occupation: {occ or 'N/A'} | RepeatOffender: {'Yes' if repeat else 'No'} | CaseID: {c_id} | CaseNo: {c_no} | Station: {p_name or 'N/A'} | Facts: {(facts or 'N/A')[:130]}"
                )

    # 4. Keyword / Crime Head Search (e.g. theft, cyber, fraud, murder, robbery, narcotics, burglary)
    keywords = ["mobile", "theft", "robbery", "vehicle", "murder", "burglary", "cyber", "extortion", "harassment", "narcotics", "drug", "assault", "weapon", "accident", "fraud"]
    matched_kw = [kw for kw in keywords if kw in q_lower]

    if matched_kw:
        kw = matched_kw[0]
        kw_cases = db.query(CaseMaster).filter(CaseMaster.BriefFacts.ilike(f"%{kw}%")).order_by(desc(CaseMaster.AIRiskScore)).limit(10).all()
        if kw_cases:
            search_lines.append(f"=== MATCHED KEYWORD CRIME DOSSIERS ({kw.upper()}) ===")
            for c in kw_cases:
                if c not in source_cases:
                    source_cases.append(c)
                accused_names = ", ".join([a.AccusedName for a in c.accused_list if a.AccusedName]) or "None listed"
                search_lines.append(
                    f"CaseID: {c.CaseMasterID} | CaseNo: {c.CaseNo} | RiskScore: {int((c.AIRiskScore or 0)*100)}% | Priority: {c.InvestigationPriority} | Accused: {accused_names} | Facts: {(c.BriefFacts or 'N/A')[:120]}"
                )

    # 5. Location / District Search (e.g. Belagavi, Bengaluru, Mysuru)
    matched_district = None
    for dist in KNOWN_DISTRICTS:
        if dist in q_lower:
            matched_district = dist
            break

    if matched_district:
        dist_cases = db.query(
            District.DistrictName,
            PoliceStation.UnitName,
            CaseMaster.CaseMasterID,
            CaseMaster.CaseNo,
            CaseMaster.AIRiskScore,
            CaseMaster.BriefFacts
        ).join(
            PoliceStation, CaseMaster.PoliceStationID == PoliceStation.UnitID
        ).join(
            District, PoliceStation.DistrictID == District.DistrictID
        ).filter(
            District.DistrictName.ilike(f"%{matched_district}%")
        ).order_by(desc(CaseMaster.AIRiskScore)).limit(10).all()

        if dist_cases:
            search_lines.append(f"=== DISTRICT LOCATION RECORDS ({matched_district.upper()}) ===")
            for row in dist_cases:
                d_name, p_name, c_id, c_no, risk_score, facts = row
                c_obj = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == c_id).first()
                if c_obj and c_obj not in source_cases:
                    source_cases.append(c_obj)
                search_lines.append(
                    f"- Station: {p_name} | District: {d_name} | CaseID: {c_id} | CaseNo: {c_no} | RiskScore: {int((risk_score or 0)*100)}% | Facts: {(facts or 'N/A')[:110]}"
                )

    # 6. Repeat Offender / Linkage Intent
    if any(k in q_lower for k in ["repeat", "linkage", "linked", "gang", "network", "accomplice"]):
        repeat_accused_list = db.query(
            Accused.AccusedName,
            func.count(Accused.CaseMasterID).label("cnt")
        ).group_by(
            Accused.AccusedName
        ).order_by(desc("cnt")).limit(5).all()

        search_lines.append("=== REPEAT OFFENDER MULTI-FIR OVERLAPS ===")
        for a_name, cnt in repeat_accused_list:
            search_lines.append(f"- AccusedName: {a_name} | LinkedCasesCount: {cnt}")

    # 7. Fallback: If no specific search lines matched, retrieve top high-risk cases in DB
    if not search_lines:
        top_cases = db.query(CaseMaster).order_by(desc(CaseMaster.AIRiskScore)).limit(10).all()
        search_lines.append("=== TOP HIGH-RISK PRECINCT CASE DOSSIERS ===")
        for c in top_cases:
            if c not in source_cases:
                source_cases.append(c)
            accused_names = ", ".join([a.AccusedName for a in c.accused_list if a.AccusedName]) or "None listed"
            search_lines.append(
                f"CaseID: {c.CaseMasterID} | CaseNo: {c.CaseNo} | RiskScore: {int((c.AIRiskScore or 0)*100)}% | Priority: {c.InvestigationPriority} | Accused: {accused_names} | Facts: {(c.BriefFacts or 'N/A')[:120]}"
            )

    full_context_lines = telemetry_lines + search_lines
    context_str = "\n".join(full_context_lines)

    # 8. Call AI inference engine
    payload = {
        "query": query,
        "context": context_str
    }

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(f"{settings.AI_ENGINE_BASE_URL}/ai/v1/assistant/query", json=payload)
            response.raise_for_status()
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI Assistant inference service is offline or unreachable."
        ) from exc

    result = response.json()

    # If action is generate_pdf, trigger report creation & task
    if result.get("action") == "generate_pdf" and result.get("target_case_id"):
        target_cid = result["target_case_id"]
        try:
            job = report_service.create_report_job(db, target_cid, current_user)
            result["download_url"] = f"/api/v1/reports/jobs/{job.ReportJobID}/download"
        except Exception:
            result["download_url"] = None

    if not result.get("source_case_ids") and source_cases:
        result["source_case_ids"] = [c.CaseMasterID for c in source_cases[:5]]

    # Log AI Audit run
    ai_audit_service.log_ai_run(
        db,
        user_id=current_user.UserID,
        capability="assistant_chat",
        model_name="gemini-2.5-flash",
        model_version=result.get("model_version", "v3"),
        resource_id=None,
        summary={"query": query, "source_cases": len(result.get("source_case_ids", []))}
    )

    return result
