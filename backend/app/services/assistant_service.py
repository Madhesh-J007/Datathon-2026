import httpx
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.case_master import CaseMaster
from app.models.user import User
from app.services import ai_audit_service, report_service

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException, status

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.case_master import CaseMaster
from app.models.police_station import PoliceStation
from app.models.district import District
from app.models.accused import Accused
from app.models.user import User
from app.services import ai_audit_service, report_service

KNOWN_DISTRICTS = [
    "bengaluru", "belagavi", "mysuru", "dharwad", "hubballi", "bagalkot",
    "ballari", "bidar", "chamarajanagar", "chikballapur", "chikkamagaluru",
    "chitradurga", "dakshina kannada", "davanagere", "gadag", "hassan",
    "haveri", "kalaburagi", "kodagu", "kolar", "koppal", "mandya",
    "raichur", "ramanagara", "shivamogga", "tumakuru", "udupi", "uttara kannada", "vijayanagara", "yadgir"
]

import httpx
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from fastapi import HTTPException, status

from app.core.config import settings
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.models.case_master import CaseMaster
from app.models.police_station import PoliceStation
from app.models.district import District
from app.models.accused import Accused
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
    Multi-source RAG query assistant service. Queries PostgreSQL database tables
    (District, PoliceStation, CaseMaster, Accused) based on query intent, compiles
    rich structured context, and forwards to the AI Engine serving endpoint.
    """
    q_lower = query.lower()
    context_lines = []
    source_cases = []

    # 0. Statistical / Analytical Crime Query Processing
    keywords = ["mobile", "theft", "robbery", "vehicle", "murder", "burglary", "cyber", "extortion", "harassment", "narcotics", "drug", "assault", "weapon", "accident", "fraud"]
    matched_kw = [kw for kw in keywords if kw in q_lower]
    primary_kw = matched_kw[0] if matched_kw else None

    is_statistical_req = primary_kw and any(k in q_lower for k in ["which", "whic", "where", "highest", "more", "most", "top", "rank", "statistics", "count", "record", "recorded", "number"])

    if is_statistical_req:
        dist_counts = db.query(
            District.DistrictName,
            func.count(CaseMaster.CaseMasterID).label("cnt")
        ).join(
            PoliceStation, CaseMaster.PoliceStationID == PoliceStation.UnitID
        ).join(
            District, PoliceStation.DistrictID == District.DistrictID
        ).filter(
            CaseMaster.BriefFacts.ilike(f"%{primary_kw}%")
        ).group_by(
            District.DistrictName
        ).order_by(desc("cnt")).limit(5).all()

        station_counts = db.query(
            District.DistrictName,
            PoliceStation.UnitName,
            func.count(CaseMaster.CaseMasterID).label("cnt")
        ).join(
            PoliceStation, CaseMaster.PoliceStationID == PoliceStation.UnitID
        ).join(
            District, PoliceStation.DistrictID == District.DistrictID
        ).filter(
            CaseMaster.BriefFacts.ilike(f"%{primary_kw}%")
        ).group_by(
            District.DistrictName, PoliceStation.UnitName
        ).order_by(desc("cnt")).limit(5).all()

        sample_cases = db.query(CaseMaster).filter(CaseMaster.BriefFacts.ilike(f"%{primary_kw}%")).order_by(desc(CaseMaster.AIRiskScore)).limit(5).all()

        context_lines.append(f"STATISTICAL_ANALYSIS_TYPE: Crime Volume Ranking ({primary_kw.upper()})")
        context_lines.append(f"TOP_DISTRICTS_FOR_{primary_kw.upper()}:")
        for d_name, count in dist_counts:
            context_lines.append(f"- District: {d_name} | IncidentCount: {count}")

        context_lines.append(f"TOP_POLICE_STATIONS_FOR_{primary_kw.upper()}:")
        for d_name, p_name, count in station_counts:
            context_lines.append(f"- Station: {p_name} ({d_name}) | IncidentCount: {count}")

        context_lines.append("FEATURED_CASES:")
        for c in sample_cases:
            source_cases.append(c)
            accused_names = ", ".join([a.AccusedName for a in c.accused_list if a.AccusedName]) or "None listed"
            context_lines.append(
                f"CaseID: {c.CaseMasterID} | CaseNo: {c.CaseNo} | Accused: {accused_names} | Facts: {(c.BriefFacts or 'N/A')[:120]}"
            )

    if not context_lines:
        # 0.4 Case Linkage & Pronoun Query Processing
        is_linkage_query = any(k in q_lower for k in ["linked", "other cases", "more cases", "involved", "accomplice", "accomplices", "gang", "network", "is he", "is she", "are they"])

        if is_linkage_query:
            repeat_accused_list = db.query(
                Accused.AccusedName,
                func.count(Accused.CaseMasterID).label("cnt")
            ).group_by(
                Accused.AccusedName
            ).order_by(desc("cnt")).limit(5).all()

            context_lines.append("SUSPECT_CASE_LINKAGE_ANALYSIS:")
            context_lines.append("TOP_MULTI_FIR_REPEAT_OFFENDERS_IN_DB:")
            for a_name, cnt in repeat_accused_list:
                context_lines.append(f"- AccusedName: {a_name} | LinkedCasesCount: {cnt}")

            recent_accused_cases = db.query(
                Accused.AccusedName,
                CaseMaster.CaseNo,
                PoliceStation.UnitName,
                CaseMaster.BriefFacts
            ).join(
                CaseMaster, Accused.CaseMasterID == CaseMaster.CaseMasterID
            ).outerjoin(
                PoliceStation, CaseMaster.PoliceStationID == PoliceStation.UnitID
            ).order_by(desc(CaseMaster.CaseMasterID)).limit(5).all()

            context_lines.append("RECENT_ACCUSED_LINKAGE_RECORDS:")
            for a_name, c_no, p_name, facts in recent_accused_cases:
                context_lines.append(f"- AccusedName: {a_name} | CaseNo: {c_no} | Station: {p_name or 'N/A'} | Facts: {(facts or 'N/A')[:110]}")

    if not context_lines:
        # 0.5 Accused / Suspect / Person Name Search Intent
        stop_words = {"tell", "me", "about", "abt", "who", "is", "the", "accused", "suspect", "in", "case", "details", "for", "and", "give", "show", "search", "find"}
        clean_name_query = " ".join([w for w in q_lower.replace("?", "").replace(".", "").replace(",", "").split() if w not in stop_words and len(w) >= 2]).strip()

        accused_matches = []
        if clean_name_query:
            # 1st Priority: Exact full name query match
            exact_m = db.query(
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
            ).all()

            if exact_m:
                accused_matches.extend(exact_m)
            else:
                # 2nd Priority: Individual word tokens
                name_words = [w for w in clean_name_query.split() if len(w) >= 3]
                for w in name_words:
                    m = db.query(
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
                        Accused.AccusedName.ilike(f"%{w}%")
                    ).all()
                    if m:
                        accused_matches.extend(m)

        if accused_matches:
            context_lines.append("ACCUSED_SEARCH_MATCHES:")
            seen_accused = set()
            for row in accused_matches[:5]:
                a_name, age, occ, repeat, c_id, c_no, facts, p_name = row
                key = f"{a_name}_{c_no}"
                if key in seen_accused:
                    continue
                seen_accused.add(key)
                repeat_str = "Repeat Offender" if repeat else "First Offence"
                age_str = f"{age} yrs" if age else "Age N/A"
                occ_str = occ or "Unknown Occupation"
                station_str = p_name or "Station N/A"
                context_lines.append(
                    f"- AccusedName: {a_name} | Age: {age_str} | Occupation: {occ_str} | Status: {repeat_str} | CaseID: {c_id} | CaseNo: {c_no} | Station: {station_str} | Facts: {(facts or 'N/A')[:130]}"
                )

            context_lines.append("FEATURED_CASES:")
            for row in accused_matches[:5]:
                a_name, age, occ, repeat, c_id, c_no, facts, p_name = row
                c_obj = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == c_id).first()
                if c_obj:
                    source_cases.append(c_obj)
                    accused_names = ", ".join([a.AccusedName for a in c_obj.accused_list if a.AccusedName]) or a_name
                    context_lines.append(
                        f"CaseID: {c_obj.CaseMasterID} | CaseNo: {c_obj.CaseNo} | Accused: {accused_names} | Facts: {(c_obj.BriefFacts or 'N/A')[:120]}"
                    )

    if not context_lines:
        # 1. Location / District / Hotspot Intent Analysis
        matched_district = None
        for dist in KNOWN_DISTRICTS:
            if dist in q_lower:
                matched_district = dist
                break

        is_hotspot_query = any(k in q_lower for k in ["zone", "zones", "hotspot", "hotspots", "risk", "risky", "station", "precinct", "area", "where", "location"])

        if matched_district or is_hotspot_query:
            # Perform database query across District, PoliceStation, and CaseMaster
            location_query = db.query(
                District.DistrictName,
                PoliceStation.UnitName,
                CaseMaster.CaseMasterID,
                CaseMaster.CaseNo,
                CaseMaster.AIRiskScore,
                CaseMaster.InvestigationPriority,
                CaseMaster.BriefFacts
            ).join(
                PoliceStation, CaseMaster.PoliceStationID == PoliceStation.UnitID
            ).join(
                District, PoliceStation.DistrictID == District.DistrictID
            )

            if matched_district:
                location_query = location_query.filter(District.DistrictName.ilike(f"%{matched_district}%"))

            # Fetch high-risk cases sorted by AIRiskScore
            location_cases = location_query.order_by(desc(CaseMaster.AIRiskScore)).limit(15).all()

            if location_cases:
                dist_name = matched_district.title() if matched_district else "Precinct Scope"
                context_lines.append(f"TARGET_LOCATION: {dist_name}")
                context_lines.append("TOP_HIGH_RISK_STATIONS_AND_CASES:")

                # Group station statistics
                station_map = {}
                for row in location_cases:
                    d_name, p_name, c_id, c_no, risk_score, priority, facts = row
                    if p_name not in station_map:
                        station_map[p_name] = {"count": 0, "max_score": 0.0, "cases": []}
                    station_map[p_name]["count"] += 1
                    station_map[p_name]["max_score"] = max(station_map[p_name]["max_score"], float(risk_score or 0.0))
                    station_map[p_name]["cases"].append(row)

                for p_name, stats in list(station_map.items())[:5]:
                    context_lines.append(f"- Station: {p_name} | HighRiskCases: {stats['count']} | MaxRiskScore: {int(stats['max_score'] * 100)}%")

                context_lines.append("FEATURED_HIGH_RISK_CASES:")
                for row in location_cases[:6]:
                    d_name, p_name, c_id, c_no, risk_score, priority, facts = row
                    c_obj = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == c_id).first()
                    source_cases.append(c_obj)
                    accused_names = ", ".join([a.AccusedName for a in c_obj.accused_list if a.AccusedName]) if c_obj else "None listed"
                    context_lines.append(
                        f"CaseID: {c_id} | CaseNo: {c_no} | Station: {p_name} | District: {d_name} | RiskScore: {int((risk_score or 0)*100)}% | Accused: {accused_names} | Facts: {(facts or 'N/A')[:120]}"
                    )

    if not context_lines:
        # Fallback to general jurisdiction cases
        case_query = db.query(CaseMaster)
        case_query = apply_jurisdiction_filter(case_query, db, current_user)
        cases = case_query.order_by(desc(CaseMaster.AIRiskScore)).limit(15).all()
        source_cases = cases

        context_lines.append("PRECINCT_Scope_CASES:")
        for c in cases:
            accused_names = ", ".join([a.AccusedName for a in c.accused_list if a.AccusedName])
            context_lines.append(
                f"CaseID: {c.CaseMasterID} | CaseNo: {c.CaseNo} | RiskScore: {int((c.AIRiskScore or 0)*100)}% | Accused: {accused_names} | Facts: {(c.BriefFacts or 'N/A')[:120]}"
            )

    context_str = "\n".join(context_lines)

    # 3. Call stateless AI inference engine
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

    # 4. Log AI Audit run
    ai_audit_service.log_ai_run(
        db,
        user_id=current_user.UserID,
        capability="assistant_chat",
        model_name="claude-sonnet-4-6",
        model_version=result.get("model_version", "v3"),
        resource_id=None,
        summary={"query": query, "source_cases": len(result.get("source_case_ids", []))}
    )

    return result
