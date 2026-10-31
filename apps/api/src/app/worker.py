"""The worker: runs slow jobs outside the web process and applies the cleanup rule.

Start it with `uv run dev.py up` (or `uv run python -m app.worker`).
To add a job kind: write a function (params, emit) -> result dict and add it to HANDLERS.
"""

import time
from datetime import timedelta

from sqlalchemy import delete, func, select

from app.db import SessionLocal
from app.models import AuditLog, Dataset, Event, Job

EVENT_DAYS = 7  # cleanup rule: progress events are kept 7 days
AUDIT_DAYS = 365  # cleanup rule (D5): the audit log is kept 1 year
DATASET_DAYS = 7  # cleanup rule (D5): uploaded data is kept 7 days


HANDLERS: dict = {}


def run_one() -> bool:
    """Run the oldest queued job. Returns False when there was nothing to do."""
    with SessionLocal() as db:
        # SKIP LOCKED: two workers never take the same job.
        job = db.scalars(
            select(Job).where(Job.status == "queued").order_by(Job.id).limit(1).with_for_update(skip_locked=True)
        ).first()
        if job is None:
            return False
        job.status = "running"
        db.commit()

    def emit(data: dict) -> None:
        with SessionLocal() as db:
            db.add(Event(job_id=job.id, data=data))
            db.commit()

    try:
        result, status, error = HANDLERS[job.kind](job.params, emit), "done", None
    except Exception as e:  # a failed job must not stop the worker
        result, status, error = None, "failed", repr(e)
        emit({"error": error})

    with SessionLocal() as db:
        done = db.get(Job, job.id)
        done.status, done.result, done.error, done.finished_at = status, result, error, func.now()
        db.commit()
    return True


def cleanup() -> None:
    """Delete what the cleanup rule says is too old."""
    with SessionLocal() as db:
        db.execute(delete(Event).where(Event.at < func.now() - timedelta(days=EVENT_DAYS)))
        db.execute(delete(AuditLog).where(AuditLog.at < func.now() - timedelta(days=AUDIT_DAYS)))
        db.execute(delete(Dataset).where(Dataset.created_at < func.now() - timedelta(days=DATASET_DAYS)))
        db.commit()


def main() -> None:
    print("worker: waiting for jobs")
    last_cleanup = 0.0
    while True:
        if time.monotonic() - last_cleanup > 3600:
            cleanup()
            last_cleanup = time.monotonic()
        if not run_one():
            time.sleep(1)


if __name__ == "__main__":
    main()
