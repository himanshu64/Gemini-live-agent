"""ADK tool: persist a user preference to Firestore."""

import asyncio

from google.adk.tools import ToolContext

from services import firestore_service


def save_preference(key: str, value: str, tool_context: ToolContext) -> dict:
    """Save a user preference (e.g. speech-rate, verbosity) to Firestore."""
    session_id: str = tool_context.state["session_id"]
    asyncio.get_event_loop().run_until_complete(
        firestore_service.save_preference(session_id, key, value)
    )
    return {"status": "saved", "key": key, "value": value}
