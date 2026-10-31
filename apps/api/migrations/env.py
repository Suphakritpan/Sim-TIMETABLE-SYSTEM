"""Alembic setup: migrations use the app's DATABASE_URL and its tables (app.models)."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine

import app.models  # noqa: F401  (registers the tables on Base.metadata)
from app.config import DATABASE_URL
from app.db import Base

if context.config.config_file_name is not None:
    fileConfig(context.config.config_file_name)

with create_engine(DATABASE_URL).connect() as connection:
    context.configure(connection=connection, target_metadata=Base.metadata, compare_type=True)
    with context.begin_transaction():
        context.run_migrations()
