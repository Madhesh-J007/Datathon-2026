from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.db.base_class import Base

class CollaborationRequest(Base):
    __tablename__ = "collaboration_requests"

    CollaborationRequestID = Column(Integer, primary_key=True, index=True)
    CaseMasterID = Column(Integer, ForeignKey("case_master.CaseMasterID"), nullable=False)
    RequestingOfficerID = Column(Integer, ForeignKey("officer.OfficerID"), nullable=False)
    Justification = Column(String, nullable=True)
    RequestStatus = Column(String, default="Pending", nullable=False)  # Pending, Approved, Denied
    ApprovedAt = Column(DateTime(timezone=True), nullable=True)
    ExpiryAt = Column(DateTime(timezone=True), nullable=True)
    CreatedAt = Column(DateTime(timezone=True), default=func.now(), nullable=False)
