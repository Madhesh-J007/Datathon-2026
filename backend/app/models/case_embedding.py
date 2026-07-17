from sqlalchemy import Column, ForeignKey, DateTime, BigInteger, String
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.db.base_class import Base
from sqlalchemy.orm import relationship

class CaseEmbedding(Base):
    __tablename__ = "case_embedding"

    EmbeddingID = Column(BigInteger, primary_key=True, index=True)
    CaseMasterID = Column(BigInteger, ForeignKey("case_master.CaseMasterID"), nullable=False, index=True)
    EmbeddingVector = Column(Vector(768), nullable=False)  # 768 is the vector dimensions of LaBSE
    EmbeddingModel = Column(String, nullable=False)
    Version = Column(String, nullable=False)
    CreatedAt = Column(DateTime(timezone=True), default=func.now(), nullable=False)

    case = relationship("CaseMaster", back_populates="embeddings")
