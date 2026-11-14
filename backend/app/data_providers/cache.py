"""SQLite-backed provider response cache with explicit fetch timestamps.

Cached responses are always surfaced as `cached` status with `cached_at` and
`data_period`, never relabelled as live.
"""
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.db.models import ProviderCache


def cache_get(session: Session, cache_key: str, ttl_seconds: int) -> ProviderCache | None:
    row = session.get(ProviderCache, cache_key)
    if row is None:
        return None
    fetched = datetime.fromisoformat(row.fetched_at)
    if datetime.now(timezone.utc) - fetched > timedelta(seconds=ttl_seconds):
        return None
    return row


def cache_put(session: Session, cache_key: str, source_id: str, payload: dict, data_period: str | None) -> None:
    session.merge(
        ProviderCache(
            cache_key=cache_key,
            source_id=source_id,
            payload_json=json.dumps(payload),
            fetched_at=datetime.now(timezone.utc).isoformat(timespec="seconds"),
            data_period=data_period,
        )
    )
    session.commit()


def cache_get_stale(session: Session, cache_key: str) -> ProviderCache | None:
    """Return an expired cache row too (used as fallback when live fetch fails)."""
    return session.get(ProviderCache, cache_key)
