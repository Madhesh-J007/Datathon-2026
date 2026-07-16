from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base_class import Base

class Accused(Base):
    __tablename__ = "accused"

    AccusedMasterID = Column(Integer, primary_key=True, index=True)
    CaseMasterID = Column(Integer, ForeignKey("case_master.CaseMasterID"))
    AccusedName = Column(String, index=True)
    AgeYear = Column(Integer)
    GenderID = Column(Integer)
    PersonID = Column(Integer)
    Occupation = Column(String)
    Address = Column(String)
    CriminalProfileID = Column(Integer)
    GangID = Column(Integer)
    IsRepeatOffender = Column(Integer)
