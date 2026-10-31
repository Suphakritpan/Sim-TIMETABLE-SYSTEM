"""Per-IP limits on the costly public routes (B25). Used by the middleware in main.py.

The IP is the connection's address. Uvicorn only trusts X-Forwarded-For from Caddy (--forwarded-allow-ips),
so a caller cannot pick a new address to escape the limit.
"""

import re
import time
from collections import defaultdict

from app import config

# (method, path pattern, name, limit per window); the name keeps each kind of route in its own count
RULES = [
    ("POST", re.compile(r"^/api/v1/imports$"), "upload", config.RATE_LIMIT_UPLOAD),
    ("POST", re.compile(r"^/api/v1/(schedules|evaluations)$"), "jobs", config.RATE_LIMIT_JOBS),
    ("POST", re.compile(r"^/api/v1/requests/interpret$"), "interpret", config.RATE_LIMIT_INTERPRET),
    ("GET", re.compile(r"^/api/v1/schedules/[^/]+/export$"), "export", config.RATE_LIMIT_EXPORT),
]

# shortcut: counts live in this process, so a restart resets them and more than one API process would
# count separately; move them to the database if the API ever runs as several processes.
hits: dict[tuple[str, str], list[float]] = defaultdict(list)


def over_limit(ip: str, method: str, path: str) -> bool:
    """Count this request and say whether it passes the limit of its route. Unlisted routes are never limited."""
    for rule_method, pattern, name, limit in RULES:
        if method == rule_method and pattern.match(path):
            key = (ip, name)
            now = time.monotonic()
            hits[key] = [t for t in hits[key] if now - t < config.RATE_WINDOW_SECONDS]
            if len(hits[key]) >= limit:
                return True
            hits[key].append(now)
    return False
