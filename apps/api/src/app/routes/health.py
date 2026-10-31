"""GET /api/health: is the app up and can it reach the database? Used by `dev health` and deploy checks."""

import logging

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db import get_db

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/api/health")
def health(db: Session = Depends(get_db)):
    try:
        db.execute(text("select 1"))
    except Exception:
        # R3: the details go to the server log, not to whoever asked
        log.exception("health: database unreachable")
        return JSONResponse({"ok": False, "db": "unreachable"}, status_code=503)
    return {"ok": True, "db": "ok"}
