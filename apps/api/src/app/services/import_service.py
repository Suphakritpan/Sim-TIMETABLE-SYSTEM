"""Page 1's work: take an upload, check it, store it, and read it back by ID. Used by routes/imports.py."""

import secrets

from sqlalchemy.orm import Session

from app.audit import audit
from app.engine.domain import periods_info
from app.engine.excel_reader import FileTooLargeUnzipped, UnreadableFile, read_sheets
from app.engine.validate import validate
from app.errors import ApiError
from app.models import Dataset
from app.repositories import find_dataset

ID_BYTES = 16  # 128 random bits: an ID cannot be guessed, and there is no list route


def summarise(data: dict) -> dict:
    return {
        "teachers": len(data["teachers"]),
        "rooms": len(data["rooms"]),
        "groups": len(data["groups"]),
        "courses": len(data["courses"]),
        "assignments": len(data["assignments"]),
        "requests": len(data["requests"]),
    }


def to_response(dataset: Dataset) -> dict:
    """The import as the page reads it (`importSchema`)."""
    return {
        "importId": dataset.public_id,
        "status": dataset.status,
        "createdAt": dataset.created_at.isoformat() if dataset.created_at else None,
        "summary": dataset.summary,
        "issues": dataset.issues,
        "periods": periods_info(),
        **dataset.data,
    }


def create_import(db: Session, filename: str, content: bytes) -> dict:
    """Check one uploaded workbook and store the result. Bad data is a normal result (B23), not an error.

    Raises ApiError when the file itself cannot be opened. The file is never written to disk.
    """
    try:
        sheets = read_sheets(content)
    except UnreadableFile as e:
        raise ApiError(400, "FILE_UNREADABLE", "the file cannot be opened as a workbook") from e
    except FileTooLargeUnzipped as e:
        raise ApiError(413, "FILE_TOO_LARGE", "the file expands too far when unzipped") from e
    data, issues = validate(sheets)
    dataset = Dataset(
        public_id="imp_" + secrets.token_hex(ID_BYTES),
        status="invalid" if issues else "valid",
        filename=filename[:255],
        summary=summarise(data),
        issues=issues,
        data=data,
    )
    db.add(dataset)
    db.flush()
    audit(db, "upload", f"import:{dataset.public_id}", status=dataset.status, issues=len(issues))
    db.commit()
    return to_response(dataset)


def get_import(db: Session, public_id: str) -> dict:
    return to_response(find_dataset(db, public_id))
