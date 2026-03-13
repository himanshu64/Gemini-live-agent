"""Usage tracking and free tier enforcement."""

import logging
from datetime import datetime, timezone

from google.cloud.firestore_v1 import AsyncClient, Increment

logger = logging.getLogger(__name__)

# Free tier: 30 minutes per day
FREE_TIER_SECONDS = 30 * 60
WARNING_AT_MINUTES = [25, 29]

_client: AsyncClient | None = None


def _get_client() -> AsyncClient:
    global _client
    if _client is None:
        _client = AsyncClient()
    return _client


def _today_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d")


async def get_user_tier(uid: str) -> str:
    """Get user's subscription tier. Default: free."""
    doc = await _get_client().document(f"users/{uid}").get()
    if doc.exists:
        return doc.to_dict().get("tier", "free")
    return "free"


async def ensure_user_doc(uid: str, email: str | None = None, is_anonymous: bool = True) -> None:
    """Create user document if it doesn't exist."""
    ref = _get_client().document(f"users/{uid}")
    doc = await ref.get()
    if not doc.exists:
        await ref.set({
            "tier": "free",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "email": email,
            "is_anonymous": is_anonymous,
        })
        logger.info("Created user doc for %s", uid)


async def get_daily_usage(uid: str) -> int:
    """Get seconds used today."""
    key = _today_key()
    doc = await _get_client().document(f"usage/{uid}/daily/{key}").get()
    if doc.exists:
        return doc.to_dict().get("seconds_used", 0)
    return 0


async def increment_usage(uid: str, seconds: int) -> int:
    """Atomically increment today's usage. Returns new total."""
    key = _today_key()
    ref = _get_client().document(f"usage/{uid}/daily/{key}")
    await ref.set(
        {
            "seconds_used": Increment(seconds),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        },
        merge=True,
    )
    # Read back the new value
    doc = await ref.get()
    return doc.to_dict().get("seconds_used", seconds)


async def check_limit(uid: str) -> tuple[bool, int]:
    """Check if user has remaining time.

    Returns (allowed, remaining_seconds).
    """
    tier = await get_user_tier(uid)
    if tier != "free":
        return True, -1  # unlimited

    used = await get_daily_usage(uid)
    remaining = max(0, FREE_TIER_SECONDS - used)
    return remaining > 0, remaining
