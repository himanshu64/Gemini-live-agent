"""FastAPI application with WebSocket endpoint for SightLine live streaming."""

import asyncio
import base64
import json
import logging
import time
from uuid import uuid4

from fastapi import FastAPI, Query, Request, Response, WebSocket, WebSocketDisconnect
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
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


# ---------------------------------------------------------------------------
# P2: Security headers middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next) -> Response:
    """Attach security headers to every HTTP response."""
    response: Response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; frame-ancestors 'none'"
    )
    return response

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
    msg_timestamps: list[float] = []

    try:
        while True:
            raw = await ws.receive_text()

            # --- Size limit ---
            if len(raw) > config.WS_MAX_MESSAGE_BYTES:
                await ws.send_json({"type": "error", "message": "Message too large"})
                continue

            # --- Rate limit (sliding window) ---
            now = time.monotonic()
            msg_timestamps = [t for t in msg_timestamps if now - t < 1.0]
            if len(msg_timestamps) >= config.WS_RATE_LIMIT_PER_SEC:
                await ws.send_json({"type": "error", "message": "Rate limit exceeded"})
                continue
            msg_timestamps.append(now)

            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue

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
async def websocket_endpoint(ws: WebSocket, token: str = Query("")) -> None:
    """Bidirectional audio/video streaming via WebSocket."""
    await ws.accept()

    # --- Token authentication ---
    if not token or token != config.API_TOKEN:
        client_host = ws.client.host if ws.client else "unknown"
        logger.warning(
            "Rejected WebSocket connection: invalid token from %s", client_host
        )
        await ws.close(code=1008, reason="Invalid or missing token")
        return

    session_id = str(uuid4())
    client_host = ws.client.host if ws.client else "unknown"
    logger.info("New session: %s from %s", session_id, client_host)

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
