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

# Configure logging with a structured format
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - [%(name)s] - [%(filename)s:%(lineno)d] - %(message)s"
)
logger = logging.getLogger("ksp_backend")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager that handles startup database migrations
    (automatic table creation) and seeds initial datasets.
    """
    # Register SQLAlchemy event listeners for automated auditing
    from app.middleware.audit_listeners import register_audit_listeners
    register_audit_listeners()

    logger.info("Initializing database schema...")
    try:
        # Enable pgvector extension before creating tables that use the Vector type
        with engine.begin() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
            conn.execute(text('ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS "CreatedBy" INTEGER;'))
            conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FileName" VARCHAR;'))
            conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FilePath" VARCHAR;'))
            conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FileUrl" VARCHAR;'))
            conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FileSize" BIGINT;'))
            conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "UploadedBy" INTEGER;'))
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

from fastapi import Depends
from fastapi.staticfiles import StaticFiles
import os
from app.core.dependencies import rate_limit_dependency

app = FastAPI(
    title="KSP Crime Intelligence & Investigation Platform",
    description="Core Backend API handling cases, network graph analytics, hotspots, and user RBAC.",
    version="1.0.0",
    dependencies=[Depends(rate_limit_dependency)],
    lifespan=lifespan
)

# Static uploads directory for evidence files (CCTV, images, docs)
from app.core.config import UPLOADS_DIR
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(os.path.join(UPLOADS_DIR, "evidence"), exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Centralized exception handling
from app.core.exceptions import KSPException
from sqlalchemy.exc import IntegrityError
from fastapi.exceptions import RequestValidationError
from app.core.handlers import (
    ksp_exception_handler, db_integrity_error_handler,
    validation_exception_handler, unhandled_exception_handler
)

app.add_exception_handler(KSPException, ksp_exception_handler)
app.add_exception_handler(IntegrityError, db_integrity_error_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

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

# OWASP Security Headers Middleware
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response

# Include v1 router prefix
from app.middleware.audit_hook import AuditLoggingMiddleware
app.add_middleware(AuditLoggingMiddleware)

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
