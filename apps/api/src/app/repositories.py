"""Finding records by their public ID. A wrong ID always gives the same 404."""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.errors import ApiError
from app.models import Dataset


def find_dataset(db: Session, public_id: str) -> Dataset:
    dataset = db.scalars(select(Dataset).where(Dataset.public_id == public_id)).first()
    if dataset is None:
        raise ApiError(404, "IMPORT_NOT_FOUND", "no such import")
    return dataset
