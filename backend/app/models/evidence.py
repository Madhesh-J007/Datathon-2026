from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from app.db.base_class import Base

class Evidence(Base):
    __tablename__ = "evidence"

    EvidenceID = Column(Integer, primary_key=True, index=True)
    CaseMasterID = Column(Integer, ForeignKey("case_master.CaseMasterID"))
    EvidenceType = Column(String, index=True)
    Description = Column(String)
    CollectionDate = Column(DateTime)
