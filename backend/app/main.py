from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from contextlib import asynccontextmanager
from app.api.v1.router import api_router
from app.core.config import settings
from app.core.dependencies import get_db
from app.db.session import SessionLocal, engine
from app.db.init_db import seed_database
from app.db.base import Base
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("ksp_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that handles startup database migrations
    (automatic table creation) and seeds initial datasets.
    """
    logger.info("Initializing database schema...")
    try:
        # Create all tables defined in SQLAlchemy models if they do not exist
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully.")
        
        # Seed all relational datasets from CSVs if tables are empty
        db = SessionLocal()
        try:
            seed_database(db)
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    yield

app = FastAPI(
    title="KSP Crime Intelligence & Investigation Platform",
    description="Core Backend API handling cases, network graph analytics, hotspots, and user RBAC.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware configuration
if settings.CORS_ALLOWED_ORIGINS:
    origins = [origin.strip() for origin in settings.CORS_ALLOWED_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Include v1 router prefix
app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    """
    Health check endpoint to verify database connectivity.
    Executes a simple 'SELECT 1' query.
    """
    try:
        # Execute basic SQL command to verify database connectivity
        db.execute(text("SELECT 1"))
        db_status = "healthy"
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        db_status = "unhealthy"

    return {
        "status": "online",
        "database": db_status
    }
