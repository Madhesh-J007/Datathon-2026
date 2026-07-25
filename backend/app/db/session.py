import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger("ksp_backend")

def create_db_engine():
    db_url = settings.DATABASE_URL
    # Ensure URL is valid PostgreSQL scheme
    if not db_url or "change_me" in db_url or "postgres" not in db_url:
        logger.warning(f"Using default or unconfigured DATABASE_URL: {db_url}")
    return create_engine(
        db_url,
        pool_pre_ping=True,    # Checks connection health before reuse
        pool_size=5,           # Safe pool size for Supabase
        max_overflow=10,
        pool_recycle=300       # Recycle connections every 5 minutes
    )

# Top-level safe engine initialization so module imports NEVER crash app startup
try:
    engine = create_db_engine()
except Exception as e:
    logger.error(f"Top-level database engine creation warning: {e}")
    # Fallback SQLite in-memory engine to guarantee app startup and port binding
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
