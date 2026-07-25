import os
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("seed_supabase")

os.environ["DATABASE_URL"] = "postgresql://postgres:KSPdatabase2026@db.vgflwpabareqxudaehbe.supabase.co:5432/postgres?sslmode=require"

backend_dir = os.path.dirname(os.path.abspath(__file__))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.db.session import SessionLocal
from app.db.init_db import seed_database
from app.db.base import Base
from app.db.session import engine

if __name__ == "__main__":
    logger.info("Initializing database tables on Supabase...")
    Base.metadata.create_all(bind=engine)
    
    logger.info("Seeding CSV datasets into Supabase PostgreSQL...")
    db = SessionLocal()
    try:
        seed_database(db)
        logger.info("Supabase database seeding completed successfully!")
    except Exception as e:
        logger.error(f"Seeding failed: {e}", exc_info=True)
    finally:
        db.close()
