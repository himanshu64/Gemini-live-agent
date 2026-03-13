"""SightLine ADK Agent definition and runner helpers."""

from google.adk.agents import Agent
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai.types import (
    GenerateContentConfig,
    SpeechConfig,
    VoiceConfig,
    PrebuiltVoiceConfig,
)

from agent.prompts import get_prompt
from tools.save_preference import save_preference
from tools.switch_mode import switch_mode
from tools.capture_frame import capture_frame
from tools.get_session_history import get_session_history
from tools.emergency_alert import emergency_alert


def _build_instruction(ctx) -> str:
    """Callable instruction that reads the current mode from ReadonlyContext."""
    try:
        current_mode = ctx.state.get("current_mode", "navigation")
    except AttributeError:
        # Fallback if called with a plain dict (e.g., tests)
        current_mode = ctx.get("current_mode", "navigation") if isinstance(ctx, dict) else "navigation"
    return get_prompt(current_mode)


sightline_agent = Agent(
    name="sightline_agent",
    model="gemini-live-2.5-flash-native-audio",
    instruction=_build_instruction,
    tools=[
        save_preference,
        switch_mode,
        capture_frame,
        get_session_history,
        emergency_alert,
    ],
    generate_content_config=GenerateContentConfig(
        response_modalities=["AUDIO"],
        speech_config=SpeechConfig(
            voice_config=VoiceConfig(
                prebuilt_voice_config=PrebuiltVoiceConfig(voice_name="Kore")
            )
        ),
    ),
)


def create_session_service() -> InMemorySessionService:
    """Create a fresh in-memory session service."""
    return InMemorySessionService()


def create_runner(session_service: InMemorySessionService) -> Runner:
    """Create a Runner wired to the SightLine agent."""
    return Runner(
        agent=sightline_agent,
        app_name="sightline",
        session_service=session_service,
    )
