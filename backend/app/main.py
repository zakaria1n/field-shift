"""FastAPI application composition."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.errors import ApiError, api_error_handler
from app.db.init_db import init_db
from app.api.routes_analysis import router as analysis_router
from app.api.routes_dashboard import misc_router, router as dashboard_router
from app.api.routes_fields import router as fields_router
from app.api.routes_rotations import router as rotations_router

logging.basicConfig(level=logging.INFO)

settings = get_settings()

app = FastAPI(
    title="Field Shift API",
    version="1.0.0",
    description=(
        "Crop rotation decision support backed by NASA Earth observations. "
        "Anonymous browser-key persistence in SQLite; no user accounts."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(fields_router)
app.include_router(analysis_router)
app.include_router(rotations_router)
app.include_router(dashboard_router)
app.include_router(misc_router)

app.add_exception_handler(ApiError, api_error_handler)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/")
def root():
    return {
        "name": "Field Shift API",
        "docs": "/docs",
        "health": "/api/v1/health",
    }
