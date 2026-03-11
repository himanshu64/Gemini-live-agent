"""ADK tool: switch the active SightLine operating mode."""

from google.adk.tools import ToolContext

VALID_MODES = ["navigation", "reading", "shopping", "social"]


def switch_mode(mode: str, tool_context: ToolContext) -> dict:
    """Switch SightLine to a different operating mode.

    Valid modes: navigation, reading, shopping, social.
    """
    if mode not in VALID_MODES:
        return {
            "status": "error",
            "message": f"Invalid mode '{mode}'. Choose from: {VALID_MODES}",
        }

    tool_context.state["current_mode"] = mode
    return {"status": "switched", "mode": mode}
