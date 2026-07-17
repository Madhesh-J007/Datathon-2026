from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import Optional

from app.core.dependencies import get_db
from app.core.permissions import verify_permission
from app.models.user import User
from app.models.case_master import CaseMaster
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter
from app.schemas.hotspot import HotspotResponse, HotspotPoint

router = APIRouter()

@router.get("", response_model=HotspotResponse, summary="Get Crime Hotspots")
def get_hotspots(
    station_id: Optional[int] = Query(None, alias="stationId", description="Filter by Police Station ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(verify_permission("cases:read"))
):
    """
    Retrieves coordinate points of active crime cases to construct hotspots and heatmaps.
    Implicitly filters locations based on row-level officer jurisdiction parameters.
    """
    query = db.query(CaseMaster).filter(
        CaseMaster.latitude != 0.0,
        CaseMaster.longitude != 0.0
    )
    query = apply_jurisdiction_filter(query, db, current_user)
    
    if station_id is not None:
        query = query.filter(CaseMaster.PoliceStationID == station_id)
        
    cases = query.all()
    points = [
        HotspotPoint(
            latitude=case.latitude,
            longitude=case.longitude,
            weight=1.0,
            BriefFacts=case.BriefFacts,
            CaseNo=case.CaseNo
        )
        for case in cases
    ]
    return HotspotResponse(
        points=points,
        total_points=len(points)
    )
