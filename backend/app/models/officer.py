from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base_class import Base

class Officer(Base):
    __tablename__ = "officer"

    OfficerID = Column(Integer, primary_key=True, index=True)
    PoliceStationID = Column(Integer, ForeignKey("police_station.UnitID"))
    DistrictID = Column(Integer, ForeignKey("district.DistrictID"))
    Name = Column(String, index=True)
    Gender = Column(String)
    Rank = Column(String)
    BadgeNumber = Column(String)
    YearsOfService = Column(Integer)
    AssignedCaseCount = Column(Integer)
