"""The web app: all API routes, public and without cookies. Run with `uv run dev.py up`."""

import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException

from app import config
from app.errors import ApiError, error_response
from app.rate_limit import over_limit
from app.routes import health, imports, schedules

log = logging.getLogger(__name__)

app = FastAPI(title="ระบบจัดตารางสอนอัตโนมัติ API")

# A6: the API's answers are data, never pages to show or frame.
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "frame-ancestors 'none'",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
}
HTTP_ERROR_CODES = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}


@app.middleware("http")
async def guard(request: Request, call_next):
    """Give each request an ID, apply the rate limit, and turn any crash into the error shape."""
    request.state.request_id = uuid.uuid4().hex
    ip = request.client.host if request.client else "unknown"
    if over_limit(ip, request.method, request.url.path):
        response = error_response(429, "RATE_LIMITED", "too many requests", request.state.request_id)
    else:
        try:
            response = await call_next(request)
        except Exception:  # caught here, not by an app handler, so the answer still gets CORS headers
            # R3: the details go to the server log, not to whoever asked
            log.exception("unhandled error, request %s", request.state.request_id)
            response = error_response(500, "INTERNAL_ERROR", "internal error", request.state.request_id)
    response.headers.update(SECURITY_HEADERS)
    response.headers["X-Request-Id"] = request.state.request_id
    return response


# Added last, so it wraps everything above, including error answers (B26).
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=["Content-Disposition", "X-Request-Id"],
    allow_credentials=False,
    max_age=600,
)


@app.exception_handler(ApiError)
async def on_api_error(request: Request, e: ApiError):
    return error_response(e.status, e.code, e.message, request.state.request_id, e.details)


@app.exception_handler(HTTPException)
async def on_http_error(request: Request, e: HTTPException):
    code = HTTP_ERROR_CODES.get(e.status_code, "HTTP_ERROR")
    return error_response(e.status_code, code, str(e.detail), request.state.request_id)


@app.exception_handler(RequestValidationError)
async def on_validation_error(request: Request, e: RequestValidationError):
    details = [{"field": ".".join(str(p) for p in err["loc"]), "reason": err["msg"]} for err in e.errors()]
    return error_response(422, "VALIDATION_FAILED", "invalid request", request.state.request_id, details)


app.include_router(health.router)
app.include_router(imports.router)
app.include_router(schedules.router)
