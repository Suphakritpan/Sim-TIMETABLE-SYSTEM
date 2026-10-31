"""Upload a workbook and read it back: POST /api/v1/imports and GET /api/v1/imports/{id}."""

from pathlib import PurePath

from fastapi import APIRouter, Depends, UploadFile
from sqlalchemy.orm import Session

from app import config
from app.db import get_db
from app.errors import ApiError
from app.services import import_service

router = APIRouter(prefix="/api/v1/imports")


@router.post("", status_code=201)
async def upload(file: UploadFile, db: Session = Depends(get_db)):
    """Check one .xlsx file. A readable file with wrong data still returns 201, with `status: invalid`."""
    filename = PurePath(file.filename or "").name
    if not filename.lower().endswith(".xlsx"):
        raise ApiError(415, "UNSUPPORTED_FILE_TYPE", "only .xlsx files are accepted")
    limit = config.MAX_UPLOAD_MB * 1024 * 1024
    content = await file.read(limit + 1)
    if len(content) > limit:
        raise ApiError(413, "FILE_TOO_LARGE", f"the limit is {config.MAX_UPLOAD_MB} MB")
    return import_service.create_import(db, filename, content)


@router.get("/{import_id}")
def read(import_id: str, db: Session = Depends(get_db)):
    return import_service.get_import(db, import_id)
