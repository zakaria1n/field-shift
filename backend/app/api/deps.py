"""FastAPI dependency: resolve the anonymous client from the capability key header.

A well-formed key seen for the first time is provisioned on first use — there
is no registration step; the key itself is the browser's capability token.
"""
from fastapi import Depends, Header
from sqlalchemy.orm import Session

from app.core.errors import AnonymousAccessError, NotFoundError
from app.core.keys import KEY_HEADER, hash_key, normalize_header_key
from app.db.base import get_db
from app.db.models import AnonymousClient, Field, new_id, utcnow_iso


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
    key_hash = hash_key(key)
    client = db.query(AnonymousClient).filter(AnonymousClient.access_key_hash == key_hash).one_or_none()
    if client is None:
        client = AnonymousClient(client_id=new_id("client"), access_key_hash=key_hash, created_at=utcnow_iso())
        db.add(client)
        db.commit()
    return client


def get_owned_field(field_id: str, db: Session, client: AnonymousClient) -> Field:
    field = db.get(Field, field_id)
    if field is None or field.client_id != client.client_id:
        # Do not confirm existence of other keys' fields.
        raise NotFoundError("Field not found for this key.")
    return field
