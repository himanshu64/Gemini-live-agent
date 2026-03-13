"""Firebase ID token verification for WebSocket authentication."""

import logging

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token

from config import config

logger = logging.getLogger(__name__)

_http_request = google_requests.Request()


async def verify_token(token: str) -> dict | None:
    """Verify a Firebase ID token or fall back to static API_TOKEN.

    Returns a dict with at least {"uid": str} on success, or None on failure.
    """
    if not token:
        return None

    # Fall back to static API_TOKEN for backwards compat / local dev
    if config.API_TOKEN and token == config.API_TOKEN:
        return {"uid": "dev-user", "auth_method": "api_token"}

    # Try Firebase ID token verification
    try:
        decoded = id_token.verify_firebase_token(
            token,
            _http_request,
            audience=config.GOOGLE_CLOUD_PROJECT,
        )
        return {
            "uid": decoded["uid"],
            "email": decoded.get("email"),
            "is_anonymous": decoded.get("firebase", {}).get("sign_in_provider") == "anonymous",
            "auth_method": "firebase",
        }
    except Exception as exc:
        logger.warning("Token verification failed: %s", exc)
        return None
