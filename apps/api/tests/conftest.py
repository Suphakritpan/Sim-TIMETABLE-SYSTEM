"""Test setup: a separate database (app_test), migrated to the newest version, emptied before each test."""

import os

# Same server as DATABASE_URL (so DB_PORT works), but the app_test database: tests empty its tables.
url = os.environ.get("DATABASE_URL", "postgresql+psycopg://app:app@localhost:5434/app")
os.environ["DATABASE_URL"] = url.rsplit("/", 1)[0] + "/app_test"
os.environ["APP_ENV"] = "dev"
os.environ["MAX_UPLOAD_MB"] = "1"

import pytest  # noqa: E402
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app import rate_limit  # noqa: E402
from app.db import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def migrated():
    # Running the real migrations here also tests them.
    command.upgrade(Config("alembic.ini"), "head")


@pytest.fixture(autouse=True)
def empty_tables():
    names = ", ".join(t.name for t in Base.metadata.sorted_tables)
    with engine.begin() as conn:
        conn.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
    rate_limit.hits.clear()


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)
