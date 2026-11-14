"""Consistent error responses per docs/05 route-contract guidance."""
from fastapi import Request
from fastapi.responses import JSONResponse


class ApiError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, *, code: str | None = None, status_code: int | None = None, details: dict | None = None):
        self.message = message
        if code:
            self.code = code
        if status_code:
            self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class AnonymousAccessError(ApiError):
    """Missing/invalid anonymous capability key. Never routes the user to login."""

    status_code = 401
    code = "anonymous_access_required"


class NotFoundError(ApiError):
    status_code = 404
    code = "not_found"


class OwnershipError(ApiError):
    status_code = 403
    code = "ownership_required"


class ValidationFailed(ApiError):
    status_code = 422
    code = "validation_failed"


class ConflictError(ApiError):
    status_code = 409
    code = "conflict"


async def api_error_handler(_request: Request, exc: ApiError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
    )
