from sqlalchemy.orm import Session
from app.models.case_master import CaseMaster

def get_case(db: Session, case_id: int):
    """
    Retrieve a single case by CaseMasterID.
    """
    return db.query(CaseMaster).filter(CaseMaster.CaseMasterID == case_id).first()

def get_cases(db: Session, skip: int = 0, limit: int = 100):
    """
    Retrieve multiple paginated cases.
    """
    return db.query(CaseMaster).offset(skip).limit(limit).all()

def count_cases(db: Session) -> int:
    """
    Count the total number of CaseMaster records in the database.
    """
    return db.query(CaseMaster).count()
