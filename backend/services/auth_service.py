"""Firebase ID token verification for WebSocket authentication."""

import logging
import os

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import config

logger = logging.getLogger(__name__)

_http_request = google_requests.Request()

# Firebase project ID may differ from GCP project ID (e.g. includes numeric suffix).
# Accept FIREBASE_PROJECT_ID env var as an override for the token audience.
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "") or config.GOOGLE_CLOUD_PROJECT


async def verify_token(token: str) -> dict | None:
    """Verify a Firebase ID token or fall back to static API_TOKEN.

    Returns a dict with at least {"uid": str} on success, or None on failure.
    """
    if not token:
        return None

    # Fall back to static API_TOKEN for backwards compat / local dev
    if config.API_TOKEN and token == config.API_TOKEN:
        return {"uid": "dev-user", "auth_method": "api_token"}

    # Try Firebase ID token verification with each candidate audience
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
