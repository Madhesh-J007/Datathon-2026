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
    and seeds initial datasets safely without crashing app startup.
    """
    try:
        from app.middleware.audit_listeners import register_audit_listeners
        register_audit_listeners()
    except Exception as exc:
        logger.warning(f"Audit listeners registration warning: {exc}")

    logger.info("Initializing database schema...")
    try:
        # Enable database extensions safely if supported on cloud DB
        try:
            with engine.begin() as conn:
                try:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                except Exception as ext_err:
                    logger.warning(f"Vector extension creation skipped: {ext_err}")
                try:
                    conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                except Exception as ext_err:
                    logger.warning(f"PostGIS extension creation skipped: {ext_err}")
        except Exception as conn_err:
            logger.warning(f"Database extension setup warning: {conn_err}")

        # Create all tables defined in SQLAlchemy models if they do not exist
        try:
            Base.metadata.create_all(bind=engine)
        except Exception as table_err:
            logger.warning(f"Base table creation warning: {table_err}")

        try:
            with engine.begin() as conn:
                conn.execute(text('ALTER TABLE report_jobs ADD COLUMN IF NOT EXISTS "CreatedBy" INTEGER;'))
                conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FileName" VARCHAR;'))
                conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FilePath" VARCHAR;'))
                conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FileUrl" VARCHAR;'))
                conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "FileSize" BIGINT;'))
                conn.execute(text('ALTER TABLE evidence ADD COLUMN IF NOT EXISTS "UploadedBy" INTEGER;'))
        except Exception as alter_err:
            logger.warning(f"Column alignment warning: {alter_err}")

        logger.info("Database schema initialized successfully.")
        
        # Seed relational datasets asynchronously in a background thread so port 8000 opens instantly
        import threading
        def run_background_seed():
            try:
                db = SessionLocal()
                try:
                    seed_database(db)
                finally:
                    db.close()
            except Exception as seed_err:
                logger.warning(f"Background database seed warning: {seed_err}")

        threading.Thread(target=run_background_seed, daemon=True).start()

    except Exception as e:
        logger.error(f"Database initialization warning: {e}")

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

# Permissive CORS middleware for cloud deployments & local development
allowed_origins_list = [
    "https://ksp-frontend-cvrhtldi.onslate.in",
    "http://localhost:5173",
    "http://localhost:3000"
]
if settings.CORS_ALLOWED_ORIGINS and settings.CORS_ALLOWED_ORIGINS != "*":
    for o in settings.CORS_ALLOWED_ORIGINS.split(","):
        if o.strip() and o.strip() not in allowed_origins_list:
            allowed_origins_list.append(o.strip())

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins_list,
    allow_origin_regex=r"https://.*\.onslate\.in|https://.*\.catalystappsail\.in|http://localhost:.*",
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

@app.get("/")
def root():
    """
    Root endpoint for cloud platform (Catalyst AppSail) health checks.
    """
    return {
        "status": "online",
        "service": "KSP Crime Intelligence Platform API Backend",
        "version": "1.0.0"
    }

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
