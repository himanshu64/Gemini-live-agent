"""ADK tool: persist a user preference to Firestore."""

import asyncio

from google.adk.tools import ToolContext

from services import firestore_service

# Allowed preference keys — reject anything not on this list.
ALLOWED_KEYS = {
    "speech_rate",
    "verbosity",
    "language",
    "contrast",
    "font_size",
    "haptic_feedback",
    "audio_descriptions",
    "auto_capture",
}

# Max length for preference values.
MAX_VALUE_LENGTH = 256


def save_preference(key: str, value: str, tool_context: ToolContext) -> dict:
    """Save a user preference (e.g. speech-rate, verbosity) to Firestore."""
    if key not in ALLOWED_KEYS:
        return {
            "status": "error",
            "message": f"Invalid preference key '{key}'. Allowed: {sorted(ALLOWED_KEYS)}",
        }

    if not isinstance(value, str) or len(value) > MAX_VALUE_LENGTH:
        return {
            "status": "error",
            "message": f"Value must be a string of at most {MAX_VALUE_LENGTH} characters.",
        }

    session_id: str = tool_context.state["session_id"]
    asyncio.get_event_loop().run_until_complete(
        firestore_service.save_preference(session_id, key, value)
    )
    return {"status": "saved", "key": key, "value": value}
