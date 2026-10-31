"""Base tables: audit log, jobs and their events.

Revision ID: a1f0c0000001
Revises:
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a1f0c0000001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("target", sa.String(200), nullable=False),
        sa.Column("detail", postgresql.JSONB(), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_audit_log_at", "audit_log", ["at"])
    op.create_table(
        "job",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(50), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("params", postgresql.JSONB(), nullable=False),
        sa.Column("result", postgresql.JSONB()),
        sa.Column("error", sa.String()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True)),
    )
    op.create_index("ix_job_status", "job", ["status"])
    op.create_table(
        "event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("job.id", ondelete="CASCADE"), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_event_job_id", "event", ["job_id"])
    op.create_index("ix_event_at", "event", ["at"])


def downgrade() -> None:
    op.drop_table("event")
    op.drop_table("job")
    op.drop_table("audit_log")
