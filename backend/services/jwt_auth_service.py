"""Google ID token verification + JWT session management."""

import logging
import time
from datetime import datetime, timezone

import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from config import config

logger = logging.getLogger(__name__)

_http_request = google_requests.Request()

ACCESS_TOKEN_EXPIRY = 60 * 15       # 15 minutes
REFRESH_TOKEN_EXPIRY = 60 * 60 * 24 * 7  # 7 days

# In-memory revoked refresh tokens (use Redis/Firestore in production at scale)
_revoked_tokens: set[str] = set()


def _get_jwt_secret() -> str:
    secret = config.JWT_SECRET or config.API_TOKEN
    if not secret:
        raise RuntimeError("JWT_SECRET or API_TOKEN must be set")
    return secret


def verify_google_id_token(token: str) -> dict:
    """Verify a Google ID token and return user info.

    Raises ValueError on invalid token.
    """
    client_id = config.GOOGLE_CLIENT_ID
    if not client_id:
        raise ValueError("GOOGLE_CLIENT_ID not configured")

    try:
        idinfo = google_id_token.verify_oauth2_token(
            token,
            _http_request,
            audience=client_id,
        )
    except Exception as exc:
        logger.warning("Google token verification failed: %s", exc)
        raise ValueError(f"Invalid Google token: {exc}") from exc

    # Verify issuer
    if idinfo.get("iss") not in ("accounts.google.com", "https://accounts.google.com"):
        raise ValueError("Invalid issuer")

    # Verify token is not expired (library handles this, but double-check)
    if idinfo.get("exp", 0) < time.time():
        raise ValueError("Token expired")

    return {
        "sub": idinfo["sub"],
        "email": idinfo.get("email", ""),
        "name": idinfo.get("name", ""),
        "picture": idinfo.get("picture", ""),
    }


def create_access_token(user_id: str, email: str) -> str:
    """Create a short-lived JWT access token."""
    now = time.time()
    payload = {
        "sub": user_id,
        "email": email,
        "type": "access",
        "iat": int(now),
        "exp": int(now + ACCESS_TOKEN_EXPIRY),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm="HS256")


def create_refresh_token(user_id: str) -> str:
    """Create a long-lived JWT refresh token."""
    now = time.time()
    payload = {
        "sub": user_id,
        "type": "refresh",
        "iat": int(now),
        "exp": int(now + REFRESH_TOKEN_EXPIRY),
    }
    return jwt.encode(payload, _get_jwt_secret(), algorithm="HS256")


def verify_access_token(token: str) -> dict | None:
    """Verify an access token. Returns payload or None."""
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "access":
            return None
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def verify_refresh_token(token: str) -> dict | None:
    """Verify a refresh token. Returns payload or None."""
    try:
        payload = jwt.decode(token, _get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            return None
        if token in _revoked_tokens:
            return None
        return payload
    except jwt.InvalidTokenError:
        return None


def revoke_refresh_token(token: str) -> None:
    """Revoke a refresh token."""
    _revoked_tokens.add(token)


async def get_or_create_user(google_info: dict) -> dict:
    """Find or create user in Firestore. Returns user dict."""
    from services.firestore_service import get_firestore_client

    db = get_firestore_client()
    user_id = google_info["sub"]
    user_ref = db.collection("users").document(user_id)
    doc = user_ref.get()

    if doc.exists:
        data = doc.to_dict()
        # Update profile if changed
        updates = {}
        if data.get("email") != google_info["email"]:
            updates["email"] = google_info["email"]
        if data.get("name") != google_info["name"]:
            updates["name"] = google_info["name"]
        if data.get("avatar") != google_info["picture"]:
            updates["avatar"] = google_info["picture"]
        if updates:
            user_ref.update(updates)
            data.update(updates)
        return {"id": user_id, **data}

    # Create new user
    now = datetime.now(timezone.utc).isoformat()
    user_data = {
        "email": google_info["email"],
        "name": google_info["name"],
        "avatar": google_info["picture"],
        "tier": "free",
        "is_anonymous": False,
        "created_at": now,
    }
    user_ref.set(user_data)
    return {"id": user_id, **user_data}
