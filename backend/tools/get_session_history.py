"""ADK tool: retrieve recent session events from Firestore."""

import asyncio

from google.adk.tools import ToolContext

from services import firestore_service


def get_session_history(tool_context: ToolContext) -> dict:
    """Return the most recent events for the current session."""
    session_id: str = tool_context.state["session_id"]
    events = asyncio.get_event_loop().run_until_complete(
        firestore_service.get_recent_events(session_id)
    )
    return {"events": events}
