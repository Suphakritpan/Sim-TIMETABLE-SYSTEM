"""Database connection, the base class for tables, and the per-request session."""

from datetime import datetime

from sqlalchemy import DateTime, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import DATABASE_URL

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    # Store every time with its time zone, so logs read the same on any server.
    type_annotation_map = {datetime: DateTime(timezone=True)}


def get_db():
    """FastAPI dependency: one session per request, closed afterwards."""
    with SessionLocal() as db:
        yield db
