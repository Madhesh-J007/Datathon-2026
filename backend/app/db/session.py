import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings, BASE_DIR

logger = logging.getLogger("ksp_backend")

def create_db_engine():
    """
    Creates a database engine for PostgreSQL or SQLite fallback.
    Tests connectivity to guarantee application startup never crashes.
    """
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        logger.info(f"Using SQLite database engine: {db_url}")
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False}
        )

    logger.info(f"Connecting to primary database: {db_url.split('@')[-1] if '@' in db_url else db_url}")
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,    # Checks connection health before reuse
            pool_size=5,           # Safe pool size for Supabase
            max_overflow=10,
            pool_recycle=300       # Recycle connections every 5 minutes
        )
        # Test connection immediately
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Primary database connection established successfully.")
        return engine
    except Exception as e:
        logger.warning(f"Primary PostgreSQL database connection unavailable: {e}")
        logger.info("Falling back to local SQLite engine to guarantee app startup and serverless execution.")
        fallback_path = os.path.join(BASE_DIR, "ksp_crime_intel.db")
        fallback_url = f"sqlite:///{fallback_path}"
        return create_engine(
            fallback_url,
            connect_args={"check_same_thread": False}
        )

# Safe engine initialization so module imports NEVER crash app startup
try:
    engine = create_db_engine()
except Exception as e:
    logger.error(f"Top-level database engine creation error: {e}")
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})

# Create session factory bound to active engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
