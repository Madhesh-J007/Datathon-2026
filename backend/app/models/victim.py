from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base_class import Base

class Victim(Base):
    __tablename__ = "victim"

    VictimMasterID = Column(Integer, primary_key=True, index=True)
    CaseMasterID = Column(Integer, ForeignKey("case_master.CaseMasterID"))
    VictimName = Column(String, index=True)
    AgeYear = Column(Integer)
    GenderID = Column(Integer)
    VictimPolice = Column(Integer)
    Occupation = Column(String)
    Address = Column(String)
    InjurySeverity = Column(String)
    RelationshipToAccused = Column(String)
    VictimProfileID = Column(Integer)
    IsRepeatVictim = Column(Integer)
