"""Token verification for API authentication.

Accepts: Firebase ID tokens, JWT access tokens, or static API_TOKEN.
"""

import logging
import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import config

logger = logging.getLogger(__name__)

_http_request = google_requests.Request()

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "") or config.GOOGLE_CLOUD_PROJECT


async def verify_token(token: str) -> dict | None:
    """Verify a token (JWT, Firebase, or static API_TOKEN).

    Returns a dict with at least {"uid": str} on success, or None on failure.
    """
    if not token:
        return None

    # Fall back to static API_TOKEN for backwards compat / local dev
    if config.API_TOKEN and token == config.API_TOKEN:
        return {"uid": "dev-user", "auth_method": "api_token"}

    # Try JWT access token first
    try:
        from services.jwt_auth_service import verify_access_token
        payload = verify_access_token(token)
        if payload:
            return {
                "uid": payload["sub"],
                "email": payload.get("email"),
                "is_anonymous": False,
                "auth_method": "jwt",
            }
    except Exception:
        pass

    # Try Firebase ID token verification
    audiences = list(dict.fromkeys([FIREBASE_PROJECT_ID, config.GOOGLE_CLOUD_PROJECT]))
    last_exc: Exception | None = None

    for audience in audiences:
        try:
            decoded = id_token.verify_firebase_token(
                token,
                _http_request,
                audience=audience,
            )
            return {
                "uid": decoded["uid"],
                "email": decoded.get("email"),
                "is_anonymous": decoded.get("firebase", {}).get("sign_in_provider") == "anonymous",
                "auth_method": "firebase",
            }
        except Exception as exc:
            last_exc = exc
            continue

    logger.warning(
        "Token verification failed (audiences=%s): %s",
        audiences,
        last_exc,
    )
    return None
