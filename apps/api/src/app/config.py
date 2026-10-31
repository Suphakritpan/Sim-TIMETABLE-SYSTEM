"""Settings, read from environment variables. The names and dev values are in .env.example."""

import os

APP_ENV = os.environ.get("APP_ENV", "dev")  # dev | prod
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql+psycopg://app:app@localhost:5434/app")
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "10"))
DEV_ORIGIN = "http://localhost:5173"  # Vite's default port, used by apps/web in development
DEV_ORIGINS = f"{DEV_ORIGIN},http://localhost:4173"  # the second is `vite preview`

MAX_QUEUED_JOBS = 20  # B24
MAX_SEED = 2**31 - 1

# Requests allowed per minute, per IP (B25). Polling is not limited: pages poll every 1 to 2 seconds.
RATE_WINDOW_SECONDS = 60
RATE_LIMIT_UPLOAD = 10
RATE_LIMIT_JOBS = 10
RATE_LIMIT_EXPORT = 30
RATE_LIMIT_INTERPRET = 120


def parse_origins(app_env: str, raw: str) -> list[str]:
    """The origins allowed to call the API. Production stops at start on `*` or an empty list (B26)."""
    origins = [o.strip() for o in raw.split(",") if o.strip()]
    if app_env != "dev" and (not origins or "*" in origins):
        raise RuntimeError("ALLOWED_ORIGINS must list the real site origins outside dev")
    return origins


ALLOWED_ORIGINS = parse_origins(APP_ENV, os.environ.get("ALLOWED_ORIGINS", DEV_ORIGINS if APP_ENV == "dev" else ""))
