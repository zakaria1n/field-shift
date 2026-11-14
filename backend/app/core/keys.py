"""Anonymous browser capability key handling.

The frontend generates a high-entropy key once (crypto.getRandomValues) and
stores it in localStorage. We persist only its SHA-256 hash. This prevents
casual ID enumeration; it is NOT authentication and cannot protect shared
devices, stolen browser storage or cross-device access.
"""
import hashlib
import hmac
import secrets

KEY_HEADER = "X-FieldShift-Access-Key"


def new_access_key() -> str:
    return "fsk_" + secrets.token_urlsafe(32)


def hash_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def verify_key(key: str, key_hash: str) -> bool:
    return hmac.compare_digest(hash_key(key), key_hash)


def normalize_header_key(raw: str | None) -> str | None:
    if not raw:
        return None
    key = raw.strip()
    return key or None
