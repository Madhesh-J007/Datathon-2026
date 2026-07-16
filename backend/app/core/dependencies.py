from typing import Generator
from app.db.session import SessionLocal

def get_db() -> Generator:
    """
    Database session dependency generator.
    Yields a database session to the handler and closes it after the request is finished.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
