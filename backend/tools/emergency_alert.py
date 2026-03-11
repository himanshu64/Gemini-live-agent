"""ADK tool: log an emergency alert event."""

import asyncio

from google.adk.tools import ToolContext

from services import firestore_service


def emergency_alert(tool_context: ToolContext) -> dict:
    """Log an emergency alert for the current session."""
    session_id: str = tool_context.state["session_id"]
    asyncio.get_event_loop().run_until_complete(
        firestore_service.log_event(session_id, "emergency_alert", {})
    )
    return {
        "status": "alert_sent",
        "message": (
            "Emergency alert has been logged. If this is a real emergency, "
            "please also call your local emergency number."
        ),
    }
