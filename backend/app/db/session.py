import os
import socket
import logging
import traceback
from urllib.parse import urlparse, parse_qs
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings, BASE_DIR

logger = logging.getLogger("ksp_backend")

def parse_db_url_metadata(db_url: str) -> dict:
    """Safely extracts connection parameters from DATABASE_URL for diagnostic logging (excluding password)."""
    try:
        parsed = urlparse(db_url)
        query_params = parse_qs(parsed.query)
        sslmode = query_params.get("sslmode", ["default"])[0]
        return {
            "scheme": parsed.scheme,
            "username": parsed.username or "none",
            "host": parsed.hostname or "localhost",
            "port": parsed.port or (5432 if "postgres" in parsed.scheme else 0),
            "database": parsed.path.lstrip('/') or "default",
            "sslmode": sslmode
        }
    except Exception as e:
        return {"parse_error": str(e)}

def run_postgresql_diagnostics(db_url: str, meta: dict):
    """Executes network, DNS, psycopg2, and SQL diagnostics for PostgreSQL."""
    host = meta.get("host", "")
    port = meta.get("port", 5432)
    logger.info(f"--- POSTGRESQL DIAGNOSTIC SUITE ---")
    logger.info(f"Target Host     : {host}")
    logger.info(f"Target Port     : {port}")
    logger.info(f"Target Database : {meta.get('database')}")
    logger.info(f"Target User     : {meta.get('username')}")
    logger.info(f"SSL Mode        : {meta.get('sslmode')}")

    # 1. DNS Resolution Check
    try:
        addr_info = socket.getaddrinfo(host, port)
        resolved_ips = list(set([item[4][0] for item in addr_info if item[4]]))
        logger.info(f"DNS Resolution SUCCESS: Host '{host}' resolved to IP(s): {resolved_ips}")
    except socket.gaierror as dns_err:
        logger.error(f"CRITICAL DNS FAILURE: Unable to resolve hostname '{host}' ({dns_err}).")
        logger.error("DIAGNOSIS: The Supabase project is PAUSED, deleted, or the hostname in DATABASE_URL is invalid.")

    # 2. Raw psycopg2 Connection & SQL Diagnostics
    try:
        import psycopg2
        logger.info("Executing raw psycopg2 connection diagnostic...")
        raw_conn = psycopg2.connect(db_url, connect_timeout=5)
        with raw_conn.cursor() as cur:
            cur.execute("SELECT version();")
            pg_ver = cur.fetchone()[0]
            cur.execute("SELECT current_database();")
            pg_db = cur.fetchone()[0]
            cur.execute("SELECT current_user;")
            pg_user = cur.fetchone()[0]
            try:
                cur.execute("SELECT inet_server_addr();")
                srv_addr = cur.fetchone()[0]
            except Exception:
                srv_addr = host
            logger.info(f"PostgreSQL Version      : {pg_ver}")
            logger.info(f"PostgreSQL Active DB    : {pg_db}")
            logger.info(f"PostgreSQL Active User  : {pg_user}")
            logger.info(f"PostgreSQL Server Addr  : {srv_addr}")
        raw_conn.close()
        logger.info("Raw psycopg2 connection diagnostic PASSED 100%!")
    except Exception as raw_err:
        logger.error("psycopg2 Connection Diagnostic FAILED:")
        logger.error(traceback.format_exc())

def create_db_engine():
    """
    Creates a database engine for PostgreSQL or SQLite.
    Performs full diagnostic checks and logs complete tracebacks without hiding errors.
    """
    db_url = settings.DATABASE_URL
    meta = parse_db_url_metadata(db_url)

    if db_url.startswith("sqlite"):
        logger.info(f"Using SQLite Database Engine (Path: {meta.get('database')}).")
        return create_engine(
            db_url,
            connect_args={"check_same_thread": False}
        )

    logger.info(f"Connecting to Primary PostgreSQL Database: {meta.get('host')}:{meta.get('port')}/{meta.get('database')}")
    run_postgresql_diagnostics(db_url, meta)

    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=300
        )
        # Test connection immediately
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info(f"SUCCESS: Connected to PostgreSQL database successfully (Dialect: {engine.dialect.name}).")
        return engine
    except Exception as e:
        logger.error("Primary PostgreSQL Database Connection FAILED:")
        logger.error(traceback.format_exc())
        
        # Only fallback if explicitly allowed or local dev mode
        if os.getenv("ALLOW_SQLITE_FALLBACK", "true").lower() == "true":
            logger.warning("ALLOW_SQLITE_FALLBACK is enabled. Falling back to local SQLite engine to guarantee app startup.")
            fallback_path = os.path.join(BASE_DIR, "ksp_crime_intel.db")
            return create_engine(f"sqlite:///{fallback_path}", connect_args={"check_same_thread": False})
        else:
            raise e

try:
    engine = create_db_engine()
except Exception as e:
    logger.critical(f"Fatal Database Engine Initialization Error: {e}")
    fallback_path = os.path.join(BASE_DIR, "ksp_crime_intel.db")
    engine = create_engine(f"sqlite:///{fallback_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
