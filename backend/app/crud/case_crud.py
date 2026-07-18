from sqlalchemy.orm import Session, selectinload
from sqlalchemy import or_, desc
from app.models.case_master import CaseMaster
from app.models.user import User
from app.middleware.jurisdiction_scope import apply_jurisdiction_filter

def get_case_by_id(db: Session, case_id: int, user: User) -> CaseMaster | None:
    """
    Retrieves a single case record by CaseMasterID.
    Enforces row-level jurisdiction scopes and eagerly loads related child entities 
    using selectinload to avoid N+1 query latencies.
    """
    query = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == case_id)
    query = apply_jurisdiction_filter(query, db, user)
    options = (
        selectinload(CaseMaster.accused_list),
        selectinload(CaseMaster.victims),
        selectinload(CaseMaster.witnesses),
        selectinload(CaseMaster.evidence_items),
        selectinload(CaseMaster.vehicles),
        selectinload(CaseMaster.assignments),
        selectinload(CaseMaster.annotations),
        selectinload(CaseMaster.embeddings)
    )
    query = query.options(*options)
    res = query.first()
    if not res:
        # Check if the user has an active, approved collaboration request for this case
        from app.services import collaboration_service
        if collaboration_service.check_active_collaboration(db, case_id, user.OfficerID):
            bypass_query = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == case_id).options(*options)
            return bypass_query.first()
    return res

def get_cases_paginated(
    db: Session,
    user: User,
    skip: int = 0,
    limit: int = 50,
    search: str = None,
    station_id: int = None,
    status_id: int = None,
    sort_by: str = None
) -> tuple[list[CaseMaster], int]:
    """
    Retrieves a paginated list of cases alongside the total count matching the criteria.
    Implicitly applies row-level jurisdiction constraints based on the active user profile.
    """
    query = db.query(CaseMaster)
    query = apply_jurisdiction_filter(query, db, user)

    # Filters
    if station_id is not None:
        query = query.filter(CaseMaster.PoliceStationID == station_id)
    if status_id is not None:
        query = query.filter(CaseMaster.CaseStatusID == status_id)
    if search:
        query = query.filter(
            or_(
                CaseMaster.CaseNo.ilike(f"%{search}%"),
                CaseMaster.BriefFacts.ilike(f"%{search}%")
            )
        )

    # Count matching query before pagination offsets are applied
    total_count = query.count()

    # Sorting
    if sort_by == "date_desc":
        query = query.order_by(desc(CaseMaster.CrimeRegisteredDate))
    elif sort_by == "date_asc":
        query = query.order_by(CaseMaster.CrimeRegisteredDate)
    elif sort_by == "priority_desc":
        query = query.order_by(desc(CaseMaster.InvestigationPriority))
    elif sort_by == "risk_desc":
        query = query.order_by(desc(CaseMaster.AIRiskScore))
    else:
        query = query.order_by(desc(CaseMaster.CaseMasterID))

    # Eagerly load primary list relationships
    query = query.options(
        selectinload(CaseMaster.accused_list),
        selectinload(CaseMaster.victims)
    )

    cases = query.offset(skip).limit(limit).all()
    return cases, total_count

def create_case(db: Session, case_data: dict) -> CaseMaster:
    """Creates a new CaseMaster record in the database."""
    db_case = CaseMaster(**case_data)
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

def update_case(db: Session, case_db: CaseMaster, case_data: dict) -> CaseMaster:
    """Updates fields on an existing CaseMaster record."""
    for key, value in case_data.items():
        setattr(case_db, key, value)
    db.commit()
    db.refresh(case_db)
    return case_db

def delete_case(db: Session, case_id: int) -> bool:
    """Deletes a CaseMaster record by CaseMasterID."""
    db_case = db.query(CaseMaster).filter(CaseMaster.CaseMasterID == case_id).first()
    if not db_case:
        return False
    db.delete(db_case)
    db.commit()
    return True
