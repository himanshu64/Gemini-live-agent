"""Async Firestore wrapper for session, preference, and event storage."""

import logging
import re
from datetime import datetime, timezone
from typing import Any

from google.cloud.firestore import AsyncClient

logger = logging.getLogger(__name__)

_client: AsyncClient | None = None

# Firestore document IDs must be safe path segments.
_SAFE_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{1,128}$")

# Maximum events query limit to prevent abuse.
MAX_EVENTS_QUERY = 50


def _validate_session_id(session_id: str) -> None:
    """Reject session IDs that aren't valid UUID-like strings."""
    if not _SAFE_ID_RE.match(session_id):
        raise ValueError(f"Invalid session_id: {session_id!r}")


def _validate_key(key: str) -> None:
    """Reject keys that aren't safe Firestore document IDs."""
    if not _SAFE_ID_RE.match(key):
        raise ValueError(f"Invalid key: {key!r}")


def get_client() -> AsyncClient:
    """Return a lazy-initialised Firestore AsyncClient singleton."""
    global _client
    if _client is None:
        _client = AsyncClient()
    return _client


async def save_session(session_id: str, data: dict[str, Any]) -> None:
    """Upsert a document in the 'sessions' collection."""
    _validate_session_id(session_id)
    client = get_client()
    doc_ref = client.collection("sessions").document(session_id)
    await doc_ref.set(data, merge=True)
    logger.info("Session saved: %s", session_id)


async def get_session(session_id: str) -> dict[str, Any] | None:
    """Read a session document. Returns None if it does not exist."""
    _validate_session_id(session_id)
    client = get_client()
    doc = await client.collection("sessions").document(session_id).get()
    return doc.to_dict() if doc.exists else None


async def save_preference(session_id: str, key: str, value: Any) -> None:
    """Write a single preference into the session's preferences sub-collection."""
    _validate_session_id(session_id)
    _validate_key(key)
    client = get_client()
    pref_ref = (
        client.collection("sessions")
        .document(session_id)
        .collection("preferences")
        .document(key)
    )
    await pref_ref.set({"value": value}, merge=True)
    logger.info("Preference saved: session=%s key=%s", session_id, key)


async def get_preferences(session_id: str) -> dict[str, Any]:
    """Read all preferences for a session."""
    _validate_session_id(session_id)
    client = get_client()
    prefs_ref = (
        client.collection("sessions")
        .document(session_id)
        .collection("preferences")
    )
    docs = prefs_ref.stream()
    preferences: dict[str, Any] = {}
    async for doc in docs:
        data = doc.to_dict()
        preferences[doc.id] = data.get("value") if data else None
    return preferences


async def log_event(
    session_id: str, event_type: str, data: dict[str, Any] | None = None
) -> None:
    """Write an event document with a server timestamp."""
    _validate_session_id(session_id)
    client = get_client()
    events_ref = (
        client.collection("sessions")
        .document(session_id)
        .collection("events")
    )
    event_doc = {
        "event_type": event_type,
        "data": data or {},
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await events_ref.add(event_doc)
    logger.info("Event logged: session=%s type=%s", session_id, event_type)


async def get_recent_events(
    session_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    """Read the most recent events for a session, ordered by timestamp desc."""
    _validate_session_id(session_id)
    limit = min(limit, MAX_EVENTS_QUERY)
    client = get_client()
    events_ref = (
        client.collection("sessions")
        .document(session_id)
        .collection("events")
        .order_by("timestamp", direction="DESCENDING")
        .limit(limit)
    )
    events: list[dict[str, Any]] = []
    async for doc in events_ref.stream():
        event = doc.to_dict()
        if event:
            event["id"] = doc.id
            events.append(event)
    return events
