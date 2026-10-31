"""Start and follow the slow work: /api/v1/schedules (page 3) and /api/v1/evaluations (page 5)."""

from typing import Literal

from fastapi import APIRouter, Depends, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import config
from app.db import get_db
from app.engine.requests import CannotRead, interpret
from app.errors import ApiError
from app.repositories import find_dataset
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


class NewInterpretation(BaseModel):
    importId: str = Field(max_length=40)
    text: str = Field(min_length=1, max_length=2000)


@router.post("/requests/interpret")
def read_request(body: NewInterpretation, db: Session = Depends(get_db)):
    """Read one Thai request. Text the rules cannot read gets 422, and the page opens its form."""
    data = find_dataset(db, body.importId).data
    try:
        return interpret(body.text.strip(), data)
    except CannotRead as e:
        raise ApiError(422, "INTERPRET_FAILED", "this request could not be read", e.ambiguities) from e


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


@router.get("/schedules/{job_id}/export")
def download(job_id: str, format: str, db: Session = Depends(get_db)):
    content, media_type, filename = schedule_service.export(db, job_id, format)
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return Response(content, media_type=media_type, headers=headers)


@router.post("/evaluations", status_code=202)
def start_evaluation(body: NewEvaluation, db: Session = Depends(get_db)):
    requests = [r.model_dump() for r in body.requests]
    return schedule_service.start_evaluation(db, body.importId, body.seed, requests)


@router.get("/evaluations/{evaluation_id}")
def read_evaluation(evaluation_id: str, db: Session = Depends(get_db)):
    return schedule_service.get_evaluation(db, evaluation_id)
