"""Start and follow the slow work: /api/v1/schedules (page 3) and /api/v1/evaluations (page 5)."""

from typing import Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import config
from app.db import get_db
from app.services import schedule_service

router = APIRouter(prefix="/api/v1")


class ConfirmedRequest(BaseModel):
    id: str = Field(max_length=40)
    kind: str = Field(max_length=40)
    category: Literal["must", "best_effort", "no_action"]
    params: dict = {}


class NewSchedule(BaseModel):
    importId: str = Field(max_length=40)
    seed: int | None = Field(default=None, ge=0, le=config.MAX_SEED)
    method: Literal["team", "baseline"] = "team"
    requests: list[ConfirmedRequest] = Field(default=[], max_length=500)


class NewEvaluation(BaseModel):
    importId: str = Field(max_length=40)
    seed: int | None = Field(default=None, ge=0, le=config.MAX_SEED)
    requests: list[ConfirmedRequest] = Field(default=[], max_length=500)


@router.post("/schedules", status_code=202)
def start_schedule(body: NewSchedule, db: Session = Depends(get_db)):
    requests = [r.model_dump() for r in body.requests]
    return schedule_service.start_schedule(db, body.importId, body.seed, body.method, requests)


@router.get("/schedules/{job_id}")
def read_schedule(job_id: str, db: Session = Depends(get_db)):
    """Status, stage, progress and result. The page polls this route."""
    return schedule_service.get_schedule(db, job_id)


@router.post("/schedules/{job_id}/cancel")
def cancel_schedule(job_id: str, db: Session = Depends(get_db)):
    return schedule_service.cancel_schedule(db, job_id)


@router.post("/evaluations", status_code=202)
def start_evaluation(body: NewEvaluation, db: Session = Depends(get_db)):
    requests = [r.model_dump() for r in body.requests]
    return schedule_service.start_evaluation(db, body.importId, body.seed, requests)


@router.get("/evaluations/{evaluation_id}")
def read_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    return schedule_service.get_evaluation(db, evaluation_id)
