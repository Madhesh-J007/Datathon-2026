from sqlalchemy import Column, Integer, String, Date, DateTime, Float, Text, BigInteger
from app.db.base_class import Base

class CaseMaster(Base):
    __tablename__ = "case_master"

    CaseMasterID = Column(Integer, primary_key=True, index=True)
    CrimeNo = Column(BigInteger, unique=True, index=True)
    CaseNo = Column(String, index=True)
    CrimeRegisteredDate = Column(Date)
    PolicePersonID = Column(Integer)
    PoliceStationID = Column(Integer)
    CaseCategoryID = Column(Integer)
    GravityOffenceID = Column(Integer)
    CrimeMajorHeadID = Column(Integer)
    CrimeMinorHeadID = Column(Integer)
    CaseStatusID = Column(Integer)
    CourtID = Column(Integer)
    IncidentFromDate = Column(DateTime)
    IncidentToDate = Column(DateTime)
    InfoReceivedPSDate = Column(DateTime)
    latitude = Column(Float)
    longitude = Column(Float)
    BriefFacts = Column(Text)
