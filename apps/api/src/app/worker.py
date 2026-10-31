"""The worker: runs slow jobs outside the web process and applies the cleanup rule.

Start it with `uv run dev.py up` (or `uv run python -m app.worker`). It runs one job at a time, oldest first.
To add a job kind: write a function (job data, progress) -> (status, result) and add it to HANDLERS.
"""

import logging
import time
from datetime import timedelta

from sqlalchemy import delete, func, select, update

from app.db import SessionLocal
from app.engine.solver import Cancelled
from app.models import AuditLog, Dataset, Job
from app.services.schedule_service import run_compare, run_schedule

log = logging.getLogger(__name__)

AUDIT_DAYS = 365  # cleanup rule (D5): the audit log is kept 1 year
DATASET_DAYS = 7  # cleanup rule (D5): uploaded data is kept 7 days, with its jobs
MIN_PROGRESS_STEP = 0.01  # do not write to the database for less change than this
HANDLERS = {"schedule": run_schedule, "compare": run_compare}


class Progress:
    """What a handler uses to report its stage and to learn about a cancel."""

    def __init__(self, job_id: int):
        self.job_id = job_id
        self.last = (None, -1.0)

    def report(self, stage: str, progress: float) -> None:
        if stage != self.last[0] or progress - self.last[1] >= MIN_PROGRESS_STEP:
            self.last = (stage, progress)
            with SessionLocal() as db:
                db.execute(update(Job).where(Job.id == self.job_id).values(stage=stage, progress=round(progress, 3)))
                db.commit()

    def cancelled(self) -> bool:
        with SessionLocal() as db:
            return bool(db.scalar(select(Job.cancel_requested).where(Job.id == self.job_id)))


def run_one() -> bool:
    """Run the oldest queued job. Returns False when there was nothing to do."""
    with SessionLocal() as db:
        # SKIP LOCKED: two workers never take the same job.
        job = db.scalars(
            select(Job).where(Job.status == "queued").order_by(Job.id).limit(1).with_for_update(skip_locked=True)
        ).first()
        if job is None:
            return False
        job.status, job.stage = "running", "VALIDATING"
        data = db.get(Dataset, job.dataset_id).data
        db.commit()

    error = None
    try:
        status, result = HANDLERS[job.kind](data, job.params, Progress(job.id))
    except Cancelled:
        status, result = "cancelled", None
    except Exception:  # a failed job must not stop the worker; details go to the log only (R3)
        log.exception("job %s failed", job.id)
        status, result, error = "failed", None, "INTERNAL_ERROR"

    with SessionLocal() as db:
        done = db.get(Job, job.id)
        done.status, done.result, done.error, done.finished_at = status, result, error, func.now()
        done.stage = None
        db.commit()
    return True


def recover() -> None:
    """A job left running by a restart can never finish, so end it instead of leaving a page waiting."""
    with SessionLocal() as db:
        db.execute(update(Job).where(Job.status == "running").values(status="failed", error="WORKER_RESTARTED"))
        db.commit()


def cleanup() -> None:
    """Delete what the cleanup rule says is too old."""
    with SessionLocal() as db:
        db.execute(delete(AuditLog).where(AuditLog.at < func.now() - timedelta(days=AUDIT_DAYS)))
        db.execute(delete(Dataset).where(Dataset.created_at < func.now() - timedelta(days=DATASET_DAYS)))
        db.commit()


def main() -> None:
    print("worker: waiting for jobs")
    recover()
    last_cleanup = 0.0
    while True:
        if time.monotonic() - last_cleanup > 3600:
            cleanup()
            last_cleanup = time.monotonic()
        if not run_one():
            time.sleep(1)


if __name__ == "__main__":
    main()
