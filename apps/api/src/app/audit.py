"""Write one audit row (D2). There are no accounts, so a row says what happened, not who did it."""

from sqlalchemy.orm import Session

from app.models import AuditLog


def audit(db: Session, action: str, target: str, **detail) -> None:
    """Add the row to the caller's transaction, so it commits together with the change."""
    db.add(AuditLog(action=action, target=target, detail=detail))
