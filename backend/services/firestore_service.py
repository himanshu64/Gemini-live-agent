"""Async Firestore wrapper for session, preference, and event storage."""

from datetime import datetime, timezone
from typing import Any

from google.cloud.firestore import AsyncClient

_client: AsyncClient | None = None


def get_client() -> AsyncClient:
    """Return a lazy-initialised Firestore AsyncClient singleton."""
    global _client
    if _client is None:
        _client = AsyncClient()
    return _client


async def save_session(session_id: str, data: dict[str, Any]) -> None:
    """Upsert a document in the 'sessions' collection."""
    client = get_client()
    doc_ref = client.collection("sessions").document(session_id)
    await doc_ref.set(data, merge=True)


async def get_session(session_id: str) -> dict[str, Any] | None:
    """Read a session document. Returns None if it does not exist."""
    client = get_client()
    doc = await client.collection("sessions").document(session_id).get()
    return doc.to_dict() if doc.exists else None


async def save_preference(session_id: str, key: str, value: Any) -> None:
    """Write a single preference into the session's preferences sub-collection."""
    client = get_client()
    pref_ref = (
        client.collection("sessions")
        .document(session_id)
        .collection("preferences")
        .document(key)
    )
    await pref_ref.set({"value": value}, merge=True)


async def get_preferences(session_id: str) -> dict[str, Any]:
    """Read all preferences for a session."""
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


async def get_recent_events(
    session_id: str, limit: int = 10
) -> list[dict[str, Any]]:
    """Read the most recent events for a session, ordered by timestamp desc."""
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
