"""Jobs hold timetable work: public ID, link to a dataset, stage, progress and cancel. Events are gone.

Revision ID: a1f0c0000003
Revises: a1f0c0000002
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a1f0c0000003"
down_revision = "a1f0c0000002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_table("event")
    op.execute("DELETE FROM job")  # nothing real can be here: no route created a job before this version
    op.alter_column("job", "status", type_=sa.String(20))
    op.add_column("job", sa.Column("public_id", sa.String(40), nullable=False))
    op.add_column("job", sa.Column("dataset_id", sa.Integer(), nullable=False))
    op.add_column("job", sa.Column("stage", sa.String(30)))
    op.add_column("job", sa.Column("progress", sa.Float()))
    op.add_column("job", sa.Column("cancel_requested", sa.Boolean(), nullable=False))
    op.create_unique_constraint("job_public_id_key", "job", ["public_id"])
    op.create_index("ix_job_dataset_id", "job", ["dataset_id"])
    op.create_foreign_key("job_dataset_id_fkey", "job", "dataset", ["dataset_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint("job_dataset_id_fkey", "job", type_="foreignkey")
    op.drop_index("ix_job_dataset_id", table_name="job")
    op.drop_constraint("job_public_id_key", "job", type_="unique")
    op.drop_column("job", "cancel_requested")
    op.drop_column("job", "progress")
    op.drop_column("job", "stage")
    op.drop_column("job", "dataset_id")
    op.drop_column("job", "public_id")
    op.alter_column("job", "status", type_=sa.String(10))
    op.create_table(
        "event",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("job.id", ondelete="CASCADE"), nullable=False),
        sa.Column("data", postgresql.JSONB(), nullable=False),
        sa.Column("at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_event_job_id", "event", ["job_id"])
    op.create_index("ix_event_at", "event", ["at"])
