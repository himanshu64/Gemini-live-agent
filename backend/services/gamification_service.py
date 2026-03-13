"""Gamification & loyalty service — XP, levels, streaks, badges, and rewards."""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any

from google.cloud.firestore_v1 import AsyncClient, Increment

logger = logging.getLogger(__name__)

_client: AsyncClient | None = None


def _get_client() -> AsyncClient:
    global _client
    if _client is None:
        _client = AsyncClient()
    return _client


# ---------------------------------------------------------------------------
# XP & Level system
# ---------------------------------------------------------------------------

LEVEL_THRESHOLDS = [
    0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5200,
    6500, 8000, 10000, 12500, 15500, 19000, 23000, 27500, 32500, 38000,
]
LEVEL_TITLES = [
    "Newcomer", "Explorer", "Navigator", "Scout", "Pathfinder",
    "Adventurer", "Trailblazer", "Ranger", "Voyager", "Pioneer",
    "Guide", "Mentor", "Expert", "Master", "Grandmaster",
    "Legend", "Champion", "Hero", "Luminary", "Visionary",
]

# XP awards for various actions
XP_ACTIONS = {
    "session_start": 10,
    "session_5min": 25,
    "session_15min": 50,
    "session_30min": 100,
    "mode_switch": 5,
    "frame_capture": 15,
    "daily_login": 20,
    "streak_bonus_3": 50,
    "streak_bonus_7": 150,
    "streak_bonus_30": 500,
    "google_signin": 100,
    "first_session": 50,
    "all_modes_used": 75,
    "share_transcript": 20,
}


def level_for_xp(xp: int) -> int:
    """Return level (0-indexed) for given XP."""
    for i in range(len(LEVEL_THRESHOLDS) - 1, -1, -1):
        if xp >= LEVEL_THRESHOLDS[i]:
            return i
    return 0


def xp_for_next_level(xp: int) -> tuple[int, int]:
    """Return (xp_into_current_level, xp_needed_for_next_level)."""
    level = level_for_xp(xp)
    current_threshold = LEVEL_THRESHOLDS[level]
    next_threshold = LEVEL_THRESHOLDS[level + 1] if level + 1 < len(LEVEL_THRESHOLDS) else LEVEL_THRESHOLDS[-1] + 5000
    return xp - current_threshold, next_threshold - current_threshold


# ---------------------------------------------------------------------------
# Badge definitions
# ---------------------------------------------------------------------------

BADGES = {
    "first_steps": {"name": "First Steps", "description": "Complete your first session", "icon": "footprints"},
    "early_bird": {"name": "Early Bird", "description": "Use SightLine before 7 AM", "icon": "sunrise"},
    "night_owl": {"name": "Night Owl", "description": "Use SightLine after 10 PM", "icon": "moon"},
    "navigator": {"name": "Navigator", "description": "Use navigation mode 10 times", "icon": "compass"},
    "bookworm": {"name": "Bookworm", "description": "Use reading mode 10 times", "icon": "book"},
    "shopper": {"name": "Shopper", "description": "Use shopping mode 10 times", "icon": "cart"},
    "social_butterfly": {"name": "Social Butterfly", "description": "Use social mode 10 times", "icon": "people"},
    "all_rounder": {"name": "All-Rounder", "description": "Use all 4 modes in one day", "icon": "star"},
    "streak_3": {"name": "On a Roll", "description": "3-day usage streak", "icon": "fire"},
    "streak_7": {"name": "Weekly Warrior", "description": "7-day usage streak", "icon": "flame"},
    "streak_30": {"name": "Monthly Master", "description": "30-day usage streak", "icon": "trophy"},
    "power_user": {"name": "Power User", "description": "Use 25+ minutes in a single day", "icon": "bolt"},
    "centurion": {"name": "Centurion", "description": "Reach level 10", "icon": "shield"},
    "verified": {"name": "Verified", "description": "Sign in with Google", "icon": "check"},
    "photographer": {"name": "Photographer", "description": "Capture 10 frames", "icon": "camera"},
    "marathon": {"name": "Marathon", "description": "100 total sessions", "icon": "medal"},
    "loyal": {"name": "Loyal User", "description": "Active for 7 different days", "icon": "heart"},
}


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

async def get_gamification_profile(uid: str) -> dict[str, Any]:
    """Get full gamification profile for a user."""
    ref = _get_client().document(f"gamification/{uid}")
    doc = await ref.get()
    if doc.exists:
        data = doc.to_dict() or {}
    else:
        data = {}

    xp = data.get("xp", 0)
    level = level_for_xp(xp)
    xp_into, xp_needed = xp_for_next_level(xp)

    return {
        "xp": xp,
        "level": level,
        "level_title": LEVEL_TITLES[min(level, len(LEVEL_TITLES) - 1)],
        "xp_into_level": xp_into,
        "xp_for_next_level": xp_needed,
        "streak_days": data.get("streak_days", 0),
        "longest_streak": data.get("longest_streak", 0),
        "last_active_date": data.get("last_active_date"),
        "total_sessions": data.get("total_sessions", 0),
        "total_minutes": data.get("total_minutes", 0),
        "badges": data.get("badges", []),
        "total_badges": len(data.get("badges", [])),
        "available_badges": len(BADGES),
        "loyalty_points": data.get("loyalty_points", 0),
        "rewards_claimed": data.get("rewards_claimed", []),
    }


async def award_xp(uid: str, action: str, amount: int | None = None) -> dict[str, Any]:
    """Award XP for an action. Returns updated profile summary."""
    xp_amount = amount if amount is not None else XP_ACTIONS.get(action, 0)
    if xp_amount <= 0:
        return {"awarded": 0}

    ref = _get_client().document(f"gamification/{uid}")
    await ref.set({"xp": Increment(xp_amount)}, merge=True)

    # Log the XP event
    events_ref = _get_client().collection(f"gamification/{uid}/xp_log")
    await events_ref.add({
        "action": action,
        "xp": xp_amount,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })

    # Re-read to get new total
    doc = await ref.get()
    new_xp = (doc.to_dict() or {}).get("xp", xp_amount)
    old_level = level_for_xp(new_xp - xp_amount)
    new_level = level_for_xp(new_xp)
    leveled_up = new_level > old_level

    result: dict[str, Any] = {"awarded": xp_amount, "total_xp": new_xp, "level": new_level}
    if leveled_up:
        result["leveled_up"] = True
        result["new_title"] = LEVEL_TITLES[min(new_level, len(LEVEL_TITLES) - 1)]

    return result


async def update_streak(uid: str) -> dict[str, Any]:
    """Update login streak. Call once per session start."""
    ref = _get_client().document(f"gamification/{uid}")
    doc = await ref.get()
    data = doc.to_dict() if doc.exists else {}

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    yesterday = (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d")
    last_active = data.get("last_active_date", "")

    if last_active == today:
        # Already logged in today
        return {"streak_days": data.get("streak_days", 1), "bonus_xp": 0}

    streak = data.get("streak_days", 0)
    if last_active == yesterday:
        streak += 1
    else:
        streak = 1

    longest = max(data.get("longest_streak", 0), streak)
    bonus_xp = 0
    new_badges: list[str] = []
    badges = data.get("badges", [])

    # Streak milestones
    if streak >= 3 and "streak_3" not in badges:
        bonus_xp += XP_ACTIONS["streak_bonus_3"]
        new_badges.append("streak_3")
    if streak >= 7 and "streak_7" not in badges:
        bonus_xp += XP_ACTIONS["streak_bonus_7"]
        new_badges.append("streak_7")
    if streak >= 30 and "streak_30" not in badges:
        bonus_xp += XP_ACTIONS["streak_bonus_30"]
        new_badges.append("streak_30")

    # Daily login XP
    bonus_xp += XP_ACTIONS["daily_login"]

    update_data: dict[str, Any] = {
        "streak_days": streak,
        "longest_streak": longest,
        "last_active_date": today,
        "xp": Increment(bonus_xp),
        "total_sessions": Increment(1),
    }
    if new_badges:
        update_data["badges"] = badges + new_badges

    await ref.set(update_data, merge=True)

    return {
        "streak_days": streak,
        "longest_streak": longest,
        "bonus_xp": bonus_xp,
        "new_badges": new_badges,
    }


async def check_and_award_badges(uid: str) -> list[str]:
    """Check conditions and award any newly earned badges. Returns list of new badge IDs."""
    ref = _get_client().document(f"gamification/{uid}")
    doc = await ref.get()
    data = doc.to_dict() if doc.exists else {}
    badges = data.get("badges", [])
    new_badges: list[str] = []

    total_sessions = data.get("total_sessions", 0)
    level = level_for_xp(data.get("xp", 0))

    if total_sessions >= 1 and "first_steps" not in badges:
        new_badges.append("first_steps")
    if total_sessions >= 100 and "marathon" not in badges:
        new_badges.append("marathon")
    if level >= 10 and "centurion" not in badges:
        new_badges.append("centurion")

    # Check loyal user (7 unique active days)
    days_active = data.get("unique_days_active", 0)
    if days_active >= 7 and "loyal" not in badges:
        new_badges.append("loyal")

    if new_badges:
        await ref.set({"badges": badges + new_badges}, merge=True)
        # Award XP for new badges
        badge_xp = len(new_badges) * 25
        await ref.set({"xp": Increment(badge_xp)}, merge=True)

    return new_badges


async def record_session_minutes(uid: str, minutes: int) -> None:
    """Record session minutes for gamification tracking."""
    ref = _get_client().document(f"gamification/{uid}")
    update: dict[str, Any] = {"total_minutes": Increment(minutes)}

    # Check for power_user badge
    doc = await ref.get()
    data = doc.to_dict() if doc.exists else {}
    badges = data.get("badges", [])
    if minutes >= 25 and "power_user" not in badges:
        update["badges"] = badges + ["power_user"]

    await ref.set(update, merge=True)


# ---------------------------------------------------------------------------
# Loyalty rewards
# ---------------------------------------------------------------------------

REWARDS = {
    "extra_5min": {"name": "Extra 5 Minutes", "description": "+5 min to daily limit", "cost": 200, "type": "usage_bonus"},
    "extra_15min": {"name": "Extra 15 Minutes", "description": "+15 min to daily limit", "cost": 500, "type": "usage_bonus"},
    "priority_support": {"name": "Priority Badge", "description": "Priority support badge for 7 days", "cost": 1000, "type": "badge"},
}


async def get_rewards() -> list[dict[str, Any]]:
    """List available loyalty rewards."""
    return [{"id": k, **v} for k, v in REWARDS.items()]


async def claim_reward(uid: str, reward_id: str) -> dict[str, Any]:
    """Attempt to claim a reward with loyalty points."""
    if reward_id not in REWARDS:
        raise ValueError(f"Unknown reward: {reward_id}")

    reward = REWARDS[reward_id]
    ref = _get_client().document(f"gamification/{uid}")
    doc = await ref.get()
    data = doc.to_dict() if doc.exists else {}

    points = data.get("loyalty_points", 0)
    if points < reward["cost"]:
        raise ValueError("Not enough loyalty points")

    claimed = data.get("rewards_claimed", [])
    claimed.append({
        "reward_id": reward_id,
        "claimed_at": datetime.now(timezone.utc).isoformat(),
    })

    await ref.update({
        "loyalty_points": Increment(-reward["cost"]),
        "rewards_claimed": claimed,
    })

    return {"claimed": reward_id, "cost": reward["cost"], "remaining_points": points - reward["cost"]}


async def earn_loyalty_points(uid: str, points: int) -> None:
    """Add loyalty points (earned alongside XP from usage)."""
    ref = _get_client().document(f"gamification/{uid}")
    await ref.set({"loyalty_points": Increment(points)}, merge=True)


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------

async def get_leaderboard(limit: int = 10) -> list[dict[str, Any]]:
    """Get top users by XP."""
    client = _get_client()
    leaderboard: list[dict[str, Any]] = []

    query = client.collection("gamification").order_by("xp", direction="DESCENDING").limit(limit)
    rank = 0
    async for doc in query.stream():
        rank += 1
        data = doc.to_dict() or {}
        xp = data.get("xp", 0)
        leaderboard.append({
            "rank": rank,
            "uid": doc.id,
            "xp": xp,
            "level": level_for_xp(xp),
            "level_title": LEVEL_TITLES[min(level_for_xp(xp), len(LEVEL_TITLES) - 1)],
            "streak_days": data.get("streak_days", 0),
            "total_sessions": data.get("total_sessions", 0),
            "badge_count": len(data.get("badges", [])),
        })

    return leaderboard
