from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, BigInteger
from app.db.base_class import Base
from sqlalchemy.orm import relationship

class Evidence(Base):
    __tablename__ = "evidence"

    EvidenceID = Column(BigInteger, primary_key=True, index=True)
    CaseMasterID = Column(BigInteger, ForeignKey("case_master.CaseMasterID"), nullable=False, index=True)
    EvidenceType = Column(String, index=True)
    Description = Column(String)
    CollectionDate = Column(DateTime)

    # --- ORM Relationships ---
    case = relationship("CaseMaster", back_populates="evidence_items")
