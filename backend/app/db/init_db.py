"""Database initialization and versioned migration strategy.

Simple, reliable migrations: a `schema_migrations` table stores applied version
numbers; each migration is a plain function. New deploys apply pending steps.
"""
import logging

from sqlalchemy.orm import Session
from sqlalchemy import inspect, text

from app.db.base import get_engine, get_session_factory
from app.db.models import Base, SchemaVersion

log = logging.getLogger("fieldshift.db")


def _m1_initial(session: Session) -> None:
    # Version 1 == current declarative schema (created by create_all below for
    # fresh databases; guarded for existing partial DBs by table checks).
    Base.metadata.create_all(session.get_bind())


def _m2_geographic_validation(session: Session) -> None:
    columns = {c["name"] for c in inspect(session.connection()).get_columns("fields")}
    if "geographic_validation_json" not in columns:
        session.execute(text("ALTER TABLE fields ADD COLUMN geographic_validation_json TEXT"))


MIGRATIONS: dict[int, callable] = {1: _m1_initial, 2: _m2_geographic_validation}


def init_db() -> None:
    engine = get_engine()
    # Ensure the migration tracking table itself exists before versioning.
    SchemaVersion.__table__.create(engine, checkfirst=True)

    session = get_session_factory()()
    try:
        applied = {v for (v,) in session.query(SchemaVersion.version).all()}
        for version in sorted(MIGRATIONS):
            if version in applied:
                continue
            log.info("applying schema migration v%s", version)
            MIGRATIONS[version](session)
            session.add(SchemaVersion(version=version))
            session.commit()
    finally:
        session.close()
