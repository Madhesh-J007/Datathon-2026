import os
import sys
import socket
import logging
import traceback
from urllib.parse import urlparse, parse_qs
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

logger = logging.getLogger("ksp_backend")

def get_masked_url(url: str) -> str:
    """Masks password in connection URL for safe logging."""
    try:
        parsed = urlparse(url)
        if parsed.password:
            masked = url.replace(f":{parsed.password}@", ":****@")
            return masked
        return url
    except Exception:
        return "postgresql://****"

def run_environment_and_db_diagnostics(db_url: str):
    """
    Executes a complete, un-truncated diagnostic suite on environment variables,
    DNS resolution, network connectivity, and raw psycopg2 connection.
    """
    logger.info("==========================================================")
    logger.info("       KSP BACKEND DATABASE DIAGNOSTIC SUITE             ")
    logger.info("==========================================================")
    
    # 1. Environment Variable Audit
    candidate_keys = ["DATABASE_URL", "POSTGRES_URL", "SQLALCHEMY_DATABASE_URI", "CATALYST_DATABASE_URL"]
    logger.info("Auditing environment variables in container OS environment:")
    for key in candidate_keys:
        val = os.getenv(key)
        if val:
            logger.info(f"  - {key}: Present (Length: {len(val)}, Masked: {get_masked_url(val)})")
        else:
            logger.info(f"  - {key}: NOT SET in os.environ")

    # 2. Parse URL parameters
    masked_url = get_masked_url(db_url)
    logger.info(f"Active Target Connection URL: {masked_url}")
    
    try:
        parsed = urlparse(db_url)
        query_params = parse_qs(parsed.query)
        sslmode = query_params.get("sslmode", ["not specified"])[0]
        host = parsed.hostname or ""
        port = parsed.port or 5432
        db_name = parsed.path.lstrip("/")
        user = parsed.username or ""

        logger.info(f"Parsed Connection Metadata:")
        logger.info(f"  - Host     : {host}")
        logger.info(f"  - Port     : {port}")
        logger.info(f"  - Database : {db_name}")
        logger.info(f"  - Username : {user}")
        logger.info(f"  - SSL Mode : {sslmode}")
    except Exception as parse_err:
        logger.error(f"Failed to parse DATABASE_URL: {parse_err}")
        return

    # 3. DNS Resolution Diagnostic
    logger.info(f"Testing DNS Resolution for Host '{host}' on Port {port}...")
    try:
        addr_info = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
        resolved_ips = list(set([item[4][0] for item in addr_info if item[4]]))
        logger.info(f"SUCCESS: DNS resolved '{host}' to IP address(es): {resolved_ips}")
    except socket.gaierror as dns_err:
        logger.error(f"CRITICAL DNS ERROR: socket.getaddrinfo failed for '{host}': {dns_err}")
        logger.error("DIAGNOSIS: Host cannot be resolved. Verify Supabase project is active or check host name syntax.")

    # 4. Raw psycopg2 Connection Diagnostic (for PostgreSQL)
    if db_url.startswith("postgresql") or db_url.startswith("postgres"):
        logger.info("Testing raw psycopg2 connection with 10s timeout...")
        try:
            import psycopg2
            raw_conn = psycopg2.connect(db_url, connect_timeout=10)
            logger.info("SUCCESS: Raw psycopg2 connection established!")
            with raw_conn.cursor() as cur:
                cur.execute("SELECT version();")
                pg_version = cur.fetchone()[0]
                cur.execute("SELECT current_database();")
                pg_dbname = cur.fetchone()[0]
                cur.execute("SELECT current_user;")
                pg_user = cur.fetchone()[0]
                try:
                    cur.execute("SELECT inet_server_addr();")
                    pg_srv_addr = cur.fetchone()[0]
                except Exception:
                    pg_srv_addr = host

                logger.info("=== POSTGRESQL RUNTIME METRICS ===")
                logger.info(f"  - PostgreSQL Version     : {pg_version}")
                logger.info(f"  - Connected Database     : {pg_dbname}")
                logger.info(f"  - Connected User         : {pg_user}")
                logger.info(f"  - Server IP Address      : {pg_srv_addr}")
                logger.info("==================================")
            raw_conn.close()
        except Exception as raw_conn_err:
            logger.error("CRITICAL: Raw psycopg2 Connection Failed!")
            logger.error(traceback.format_exc())

def create_strict_postgres_engine():
    """
    Creates a strict SQLAlchemy engine for PostgreSQL.
    NO SILENT FALLBACKS TO SQLITE. Startup will fail with complete traceback if PostgreSQL connection fails.
    """
    db_url = settings.DATABASE_URL

    if db_url.startswith("sqlite"):
        logger.warning("DATABASE_URL is set to SQLite. Enforcing PostgreSQL requirement per environment config.")

    run_environment_and_db_diagnostics(db_url)

    logger.info("Initializing SQLAlchemy Engine for PostgreSQL...")
    try:
        engine = create_engine(
            db_url,
            pool_pre_ping=True,
            pool_size=5,
            max_overflow=10,
            pool_recycle=300
        )
        # Test connection through SQLAlchemy connection pool
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            if result == 1:
                logger.info(f"SUCCESS: SQLAlchemy Engine verified PostgreSQL connection (Dialect: {engine.dialect.name}).")
        return engine
    except Exception as e:
        logger.critical("FATAL: SQLAlchemy failed to connect to PostgreSQL database!")
        logger.critical(traceback.format_exc())
        raise e

# Create engine strictly
engine = create_strict_postgres_engine()

# Create session factory bound to strict engine
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
