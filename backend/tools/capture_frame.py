"""ADK tool: capture the latest camera frame and upload to Cloud Storage."""

import base64

from google.adk.tools import ToolContext

from services import storage_service


def capture_frame(tool_context: ToolContext) -> dict:
    """Capture the most recent camera frame and store it in Cloud Storage."""
    latest_frame_b64: str | None = tool_context.state.get("latest_frame")

    if not latest_frame_b64:
        return {
            "status": "error",
            "message": "No frame available. The camera may not be active.",
        }

    session_id: str = tool_context.state["session_id"]
    frame_bytes = base64.b64decode(latest_frame_b64)
    url = storage_service.upload_frame(session_id, frame_bytes)

    return {"status": "captured", "url": url}
