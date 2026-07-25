from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Create engine with cloud-friendly connection pool settings for PostgreSQL/Supabase
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,    # Checks connection health before reuse
    pool_size=5,           # Safe pool size for Supabase
    max_overflow=10,
    pool_recycle=300       # Recycle connections every 5 minutes
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
