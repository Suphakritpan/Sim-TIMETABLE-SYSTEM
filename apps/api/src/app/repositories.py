"""Finding records by their public ID. A wrong ID always gives the same 404."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Dataset, Job


def find_dataset(db: Session, public_id: str) -> Dataset:
    dataset = db.scalars(select(Dataset).where(Dataset.public_id == public_id)).first()
    if dataset is None:
        raise ApiError(404, "IMPORT_NOT_FOUND", "no such import")
    return dataset


def find_job(db: Session, public_id: str, kind: str, not_found_code: str, lock: bool = False) -> Job:
    query = select(Job).where(Job.public_id == public_id, Job.kind == kind)
    job = db.scalars(query.with_for_update() if lock else query).first()
    if job is None:
        raise ApiError(404, not_found_code, "no such job")
    return job
