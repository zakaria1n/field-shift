"""FastAPI dependency: resolve the anonymous client from the capability key header."""
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.errors import AnonymousAccessError, OwnershipError
from app.core.keys import KEY_HEADER, hash_key, normalize_header_key
from app.db.base import get_db
from app.db.models import AnonymousClient, Field


def get_client(
    db: Session = Depends(get_db),
    x_fieldshift_access_key: str | None = Header(default=None, alias=KEY_HEADER),
) -> AnonymousClient:
    key = normalize_header_key(x_fieldshift_access_key)
    if not key:
        raise AnonymousAccessError(
            "Anonymous access key missing. The browser generates and stores a local key; "
            "there is no account or login in Field Shift.",
        )
    client = db.query(AnonymousClient).filter(AnonymousClient.access_key_hash == hash_key(key)).one_or_none()
    if client is None:
        raise AnonymousAccessError(
            "Unknown anonymous access key. Saved fields on this server are not reachable from this browser. "
            "Clearing browser storage loses access to previously saved plans.",
        )
    return client


def get_owned_field(field_id: str, db: Session, client: AnonymousClient) -> Field:
    field = db.get(Field, field_id)
    if field is None:
        raise OwnershipError("Field not found for this key.", code="not_found", status_code=404)
    if field.client_id != client.client_id:
        # Do not confirm existence of other keys' fields.
        raise OwnershipError("Field not found for this key.", code="not_found", status_code=404)
    return field
