from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base_class import Base

class Vehicle(Base):
    __tablename__ = "vehicle"

    VehicleID = Column(Integer, primary_key=True, index=True)
    CaseMasterID = Column(Integer, ForeignKey("case_master.CaseMasterID"))
    RegistrationNumber = Column(String, index=True)
    VehicleType = Column(String)
    Make = Column(String)
    Model = Column(String)
    Color = Column(String)
    InvolvementRole = Column(String)
