"""Admin analytics service — aggregate stats from Firestore."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from google.cloud.firestore_v1 import AsyncClient

from config import config

logger = logging.getLogger(__name__)

_client: AsyncClient | None = None


def _get_admin_emails() -> set[str]:
    """Parse ADMIN_EMAILS env var into a set of lowercase emails."""
    raw = config.ADMIN_EMAILS.strip()
    if not raw:
        return set()
    return {e.strip().lower() for e in raw.split(",") if e.strip()}


def _get_client() -> AsyncClient:
    global _client
    if _client is None:
        _client = AsyncClient()
    return _client


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


def _past_days(n: int) -> list[str]:
    """Return date keys for the past n days (inclusive of today)."""
    today = datetime.now(timezone.utc).date()
    return [(today - timedelta(days=i)).isoformat() for i in range(n)]


async def is_admin(uid: str) -> bool:
    """Check if a user is an admin.

    A user is admin if:
    1. Their email is in the ADMIN_EMAILS env var (comma-separated), OR
    2. Their Firestore user doc has role == "admin"
    """
    admin_emails = _get_admin_emails()

    doc = await _get_client().document(f"users/{uid}").get()
    if doc.exists:
        data = doc.to_dict() or {}
        # Check email against ADMIN_EMAILS env var
        user_email = (data.get("email") or "").lower()
        if user_email and user_email in admin_emails:
            return True
        # Fallback: check Firestore role field
        if data.get("role") == "admin":
            return True

    return False


async def set_user_disabled(uid: str, disabled: bool) -> None:
    """Enable or disable a user account."""
    ref = _get_client().document(f"users/{uid}")
    doc = await ref.get()
    if not doc.exists:
        raise ValueError(f"User {uid} not found")
    await ref.update({"disabled": disabled})
    logger.info("User %s %s by admin", uid, "disabled" if disabled else "enabled")


async def get_overview_stats() -> dict[str, Any]:
    """Get high-level platform stats."""
    client = _get_client()

    # Count total users
    users_query = client.collection("users")
    total_users = 0
    anonymous_users = 0
    google_users = 0
    admin_users = 0
    async for doc in users_query.stream():
        total_users += 1
        data = doc.to_dict()
        if data.get("is_anonymous"):
            anonymous_users += 1
        else:
            google_users += 1
        if data.get("role") == "admin":
            admin_users += 1

    # Today's active users (users with usage docs for today)
    today = _today_key()
    active_today = 0
    total_seconds_today = 0
    usage_collection = client.collection_group("daily")
    async for doc in usage_collection.stream():
        if doc.id == today:
            data = doc.to_dict()
            seconds = data.get("seconds_used", 0)
            if seconds > 0:
                active_today += 1
                total_seconds_today += seconds

    return {
        "total_users": total_users,
        "anonymous_users": anonymous_users,
        "google_users": google_users,
        "admin_users": admin_users,
        "active_today": active_today,
        "total_seconds_today": total_seconds_today,
        "total_minutes_today": round(total_seconds_today / 60, 1),
    }


async def get_users_list(limit: int = 50) -> list[dict[str, Any]]:
    """Get list of users with their usage data."""
    client = _get_client()
    today = _today_key()
    users: list[dict[str, Any]] = []

    users_query = client.collection("users").limit(limit)
    async for doc in users_query.stream():
        data = doc.to_dict() or {}
        uid = doc.id

        # Get today's usage for this user
        usage_doc = await client.document(f"usage/{uid}/daily/{today}").get()
        today_seconds = 0
        if usage_doc.exists:
            today_seconds = (usage_doc.to_dict() or {}).get("seconds_used", 0)

        users.append({
            "uid": uid,
            "email": data.get("email"),
            "tier": data.get("tier", "free"),
            "role": data.get("role", "user"),
            "is_anonymous": data.get("is_anonymous", True),
            "disabled": data.get("disabled", False),
            "created_at": data.get("created_at"),
            "today_seconds": today_seconds,
            "today_minutes": round(today_seconds / 60, 1),
        })

    # Sort by today's usage descending
    users.sort(key=lambda u: u["today_seconds"], reverse=True)
    return users


async def get_usage_trends(days: int = 7) -> list[dict[str, Any]]:
    """Get daily usage totals for the past N days."""
    client = _get_client()
    date_keys = _past_days(days)
    trends: list[dict[str, Any]] = []

    for date_key in reversed(date_keys):  # oldest first
        total_seconds = 0
        active_users = 0
        usage_collection = client.collection_group("daily")
        async for doc in usage_collection.stream():
            if doc.id == date_key:
                data = doc.to_dict()
                seconds = data.get("seconds_used", 0)
                if seconds > 0:
                    active_users += 1
                    total_seconds += seconds

        trends.append({
            "date": date_key,
            "total_seconds": total_seconds,
            "total_minutes": round(total_seconds / 60, 1),
            "active_users": active_users,
        })

    return trends


async def get_recent_sessions(limit: int = 20) -> list[dict[str, Any]]:
    """Get most recent sessions."""
    client = _get_client()
    sessions: list[dict[str, Any]] = []

    sessions_query = (
        client.collection("sessions")
        .order_by("created_at", direction="DESCENDING")
        .limit(limit)
    )
    try:
        async for doc in sessions_query.stream():
            data = doc.to_dict() or {}
            sessions.append({
                "session_id": doc.id,
                "user_id": data.get("user_id"),
                "current_mode": data.get("current_mode"),
                "created_at": data.get("created_at"),
            })
    except Exception:
        # sessions collection may not have created_at index
        sessions_query = client.collection("sessions").limit(limit)
        async for doc in sessions_query.stream():
            data = doc.to_dict() or {}
            sessions.append({
                "session_id": doc.id,
                "user_id": data.get("user_id"),
                "current_mode": data.get("current_mode"),
                "created_at": data.get("created_at"),
            })

    return sessions


async def get_error_log(limit: int = 30) -> list[dict[str, Any]]:
    """Get recent error events across all sessions for crashlytics-like view."""
    client = _get_client()
    errors: list[dict[str, Any]] = []

    # Scan sessions for error events
    sessions_query = client.collection("sessions").limit(50)
    async for session_doc in sessions_query.stream():
        session_id = session_doc.id
        events_query = (
            client.collection("sessions")
            .document(session_id)
            .collection("events")
            .order_by("timestamp", direction="DESCENDING")
            .limit(10)
        )
        try:
            async for event_doc in events_query.stream():
                data = event_doc.to_dict() or {}
                event_type = data.get("event_type", "")
                if "error" in event_type.lower() or "crash" in event_type.lower():
                    errors.append({
                        "session_id": session_id,
                        "event_id": event_doc.id,
                        "event_type": event_type,
                        "data": data.get("data", {}),
                        "timestamp": data.get("timestamp"),
                    })
        except Exception:
            pass  # skip sessions without events index

        if len(errors) >= limit:
            break

    errors.sort(key=lambda e: e.get("timestamp", ""), reverse=True)
    return errors[:limit]


async def get_user_journeys(limit: int = 30) -> list[dict[str, Any]]:
    """Build user journey maps — sequence of events per session for funnel analysis."""
    client = _get_client()
    journeys: list[dict[str, Any]] = []

    sessions_query = client.collection("sessions").limit(limit)
    async for session_doc in sessions_query.stream():
        session_id = session_doc.id
        session_data = session_doc.to_dict() or {}
        steps: list[dict[str, Any]] = []

        # Collect events for this session
        events_query = (
            client.collection("sessions")
            .document(session_id)
            .collection("events")
            .order_by("timestamp")
            .limit(50)
        )
        try:
            async for event_doc in events_query.stream():
                data = event_doc.to_dict() or {}
                steps.append({
                    "event_type": data.get("event_type", "unknown"),
                    "timestamp": data.get("timestamp"),
                    "data": data.get("data", {}),
                })
        except Exception:
            pass  # skip sessions without events index

        journeys.append({
            "session_id": session_id,
            "user_id": session_data.get("user_id"),
            "current_mode": session_data.get("current_mode"),
            "steps": steps,
            "step_count": len(steps),
            "has_errors": any("error" in s.get("event_type", "").lower() for s in steps),
        })

    # Sort: sessions with most steps first
    journeys.sort(key=lambda j: j["step_count"], reverse=True)
    return journeys


async def get_mode_distribution() -> dict[str, int]:
    """Get distribution of session modes across all sessions."""
    client = _get_client()
    modes: dict[str, int] = {}

    sessions_query = client.collection("sessions").limit(200)
    async for doc in sessions_query.stream():
        data = doc.to_dict() or {}
        mode = data.get("current_mode", "unknown")
        modes[mode] = modes.get(mode, 0) + 1

    return modes


async def get_retention_data(days: int = 7) -> dict[str, Any]:
    """Calculate basic retention: users who came back on subsequent days."""
    client = _get_client()
    date_keys = _past_days(days)

    # Build sets of active UIDs per day
    daily_uids: dict[str, set[str]] = {d: set() for d in date_keys}
    usage_collection = client.collection_group("daily")
    async for doc in usage_collection.stream():
        if doc.id in daily_uids:
            data = doc.to_dict()
            if data and data.get("seconds_used", 0) > 0:
                # Extract uid from parent path: usage/{uid}/daily/{date}
                parent_path = doc.reference.parent.parent
                if parent_path:
                    daily_uids[doc.id].add(parent_path.id)

    # Calculate day-over-day retention
    retention: list[dict[str, Any]] = []
    sorted_dates = sorted(daily_uids.keys())
    for i in range(1, len(sorted_dates)):
        prev_date = sorted_dates[i - 1]
        curr_date = sorted_dates[i]
        prev_users = daily_uids[prev_date]
        curr_users = daily_uids[curr_date]
        returning = prev_users & curr_users
        rate = (len(returning) / len(prev_users) * 100) if prev_users else 0
        retention.append({
            "date": curr_date,
            "active_users": len(curr_users),
            "returning_users": len(returning),
            "new_users": len(curr_users - prev_users),
            "retention_rate": round(rate, 1),
        })

    return {
        "daily_retention": retention,
        "total_unique_users_period": len(set().union(*daily_uids.values())) if daily_uids else 0,
    }
