"""The worker runs a queued job and records how it ended."""

from app import worker
from app.db import SessionLocal
from app.models import Job


def queue(kind: str) -> int:
    with SessionLocal() as db:
        job = Job(kind=kind, params={})
        db.add(job)
        db.commit()
        return job.id


def test_job_runs_once(monkeypatch):
    monkeypatch.setitem(worker.HANDLERS, "ok", lambda params, emit: {"done": True})
    job_id = queue("ok")
    assert worker.run_one() is True
    assert worker.run_one() is False  # nothing left
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        assert job.status == "done" and job.result == {"done": True}


def test_failed_job_is_recorded(monkeypatch):
    def broken(params, emit):
        raise ValueError("bad input")

    monkeypatch.setitem(worker.HANDLERS, "broken", broken)
    job_id = queue("broken")
    worker.run_one()
    with SessionLocal() as db:
        job = db.get(Job, job_id)
        assert job.status == "failed" and "bad input" in job.error
