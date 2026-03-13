"""ADK tool: generate an illustrated story using Gemini interleaved output."""

import base64
import logging

from google import genai
from google.genai import types as genai_types
from google.adk.tools import ToolContext

from services import storage_service

logger = logging.getLogger(__name__)


def generate_story(
    prompt: str,
    style: str,
    tool_context: ToolContext,
) -> dict:
    """Generate a story with inline illustrations using Gemini interleaved output.

    Args:
        prompt: Description of the story to create.
        style: Visual style — e.g. "children's book", "comic", "storyboard".
        tool_context: ADK tool context for accessing session state.
    """
    uid: str = tool_context.state.get("user_id", tool_context.state.get("session_id", "unknown"))

    system_prompt = (
        f"You are a creative storyteller. Create a short illustrated story in a {style or 'children\\'s book'} style. "
        "Include vivid descriptions and generate images to accompany each scene. "
        "Keep the story to 3-5 segments, each with a paragraph of text and an illustration."
    )

    try:
        client = genai.Client()
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=system_prompt,
                response_modalities=["TEXT", "IMAGE"],
            ),
        )
    except Exception:
        logger.exception("Gemini interleaved output call failed")
        return {"status": "error", "message": "Failed to generate story. Please try again."}

    segments: list[dict] = []
    image_urls: list[str] = []

    if response.candidates and response.candidates[0].content:
        for part in response.candidates[0].content.parts:
            if part.text:
                segments.append({"type": "text", "content": part.text})
            elif part.inline_data and part.inline_data.data:
                try:
                    mime = part.inline_data.mime_type or "image/png"
                    ext = "png" if "png" in mime else "jpg"
                    img_bytes = part.inline_data.data
                    url = storage_service.upload_frame(
                        uid, img_bytes, filename_prefix=f"story_{ext}"
                    )
                    image_urls.append(url)
                    segments.append({"type": "image", "url": url})
                except Exception:
                    logger.exception("Failed to upload story image")
                    # Still include as base64 fallback
                    b64 = base64.b64encode(part.inline_data.data).decode("utf-8")
                    segments.append({"type": "image", "data": b64})

    if not segments:
        return {"status": "error", "message": "No story content was generated."}

    # Store image URLs in session state so downstream can access them
    tool_context.state["story_images"] = image_urls

    return {
        "status": "ok",
        "segments": segments,
        "image_count": len(image_urls),
    }
