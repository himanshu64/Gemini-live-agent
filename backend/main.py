"""FastAPI application with WebSocket endpoint for SightLine live streaming."""

import asyncio
import base64
import logging
from uuid import uuid4

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.genai import types

from config import config
from agent.sightline_agent import create_session_service, create_runner
from google.adk.agents.live_request_queue import LiveRequestQueue

logger = logging.getLogger(__name__)

app = FastAPI(title="SightLine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

session_service = create_session_service()
runner = create_runner(session_service)


@app.get("/health")
async def health() -> dict:
    """Health-check endpoint."""
    return {"status": "ok"}


async def _handle_upstream(
    ws: WebSocket,
    live_request_queue: LiveRequestQueue,
    session_id: str,
) -> None:
    """Read messages from the WebSocket and forward to the Live API."""
    try:
        while True:
            message = await ws.receive_json()
            msg_type = message.get("type")

            if msg_type == "audio":
                audio_data = base64.b64decode(message["data"])
                live_request_queue.send_realtime(
                    types.LiveSendRealtimeInput(
                        media=types.MediaChunk(
                            data=audio_data,
                            mime_type="audio/pcm",
                        )
                    )
                )

            elif msg_type == "video":
                frame_data = base64.b64decode(message["data"])
                # Store latest frame in session state for capture_frame tool
                session = await session_service.get_session(
                    app_name="sightline",
                    user_id=session_id,
                    session_id=session_id,
                )
                if session:
                    session.state["latest_frame"] = message["data"]

                live_request_queue.send_realtime(
                    types.LiveSendRealtimeInput(
                        media=types.MediaChunk(
                            data=frame_data,
                            mime_type="image/jpeg",
                        )
                    )
                )
    except WebSocketDisconnect:
        logger.info("Client %s disconnected (upstream)", session_id)
    except Exception:
        logger.exception("Upstream error for session %s", session_id)


async def _handle_downstream(
    ws: WebSocket,
    session,
    live_request_queue: LiveRequestQueue,
    session_id: str,
) -> None:
    """Read events from the agent runner and forward to the WebSocket."""
    try:
        async for event in runner.run_live(
            session=session,
            live_request_queue=live_request_queue,
        ):
            if event.interrupted:
                await ws.send_json({"type": "interrupted"})
                continue

            # Server audio content
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.inline_data and part.inline_data.data:
                        audio_b64 = base64.b64encode(
                            part.inline_data.data
                        ).decode("utf-8")
                        await ws.send_json(
                            {"type": "audio", "data": audio_b64}
                        )
                    elif part.text:
                        await ws.send_json(
                            {"type": "transcript", "text": part.text}
                        )
    except WebSocketDisconnect:
        logger.info("Client %s disconnected (downstream)", session_id)
    except Exception:
        logger.exception("Downstream error for session %s", session_id)


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket) -> None:
    """Bidirectional audio/video streaming via WebSocket."""
    await ws.accept()
    session_id = str(uuid4())
    logger.info("New session: %s", session_id)

    live_request_queue = LiveRequestQueue()

    # Create an ADK session with initial state
    session = await session_service.create_session(
        app_name="sightline",
        user_id=session_id,
        session_id=session_id,
        state={
            "current_mode": "navigation",
            "session_id": session_id,
        },
    )

    upstream_task = asyncio.create_task(
        _handle_upstream(ws, live_request_queue, session_id)
    )
    downstream_task = asyncio.create_task(
        _handle_downstream(ws, session, live_request_queue, session_id)
    )

    try:
        await asyncio.gather(upstream_task, downstream_task)
    except Exception:
        logger.exception("Session %s ended with error", session_id)
    finally:
        upstream_task.cancel()
        downstream_task.cancel()
        live_request_queue.close()
        logger.info("Session %s cleaned up", session_id)
