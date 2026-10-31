"""The API's error shape, used by every route: {"error": {code, message, details, requestId}}."""

from fastapi.responses import JSONResponse


class ApiError(Exception):
    """A failure the caller can understand. `message` is for developers; the page shows text by `code`."""

    def __init__(self, status: int, code: str, message: str, details: list | None = None):
        self.status, self.code, self.message, self.details = status, code, message, details or []


def error_response(status: int, code: str, message: str, request_id: str, details: list | None = None) -> JSONResponse:
    body = {"code": code, "message": message, "details": details or [], "requestId": request_id}
    return JSONResponse({"error": body}, status_code=status)
