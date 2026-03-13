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
from services.auth_service import verify_token
from services.usage_service import (
    check_limit,
    ensure_user_doc,
    increment_usage,
    FREE_TIER_SECONDS,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="SightLine API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN, "*"],
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


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
    return response

session_service = create_session_service()
runner = create_runner(session_service)

WS_KEEPALIVE_INTERVAL = 25
USAGE_TRACK_INTERVAL = 60  # Track usage every 60 seconds


@app.get("/health")
async def health() -> dict:
    """Health-check endpoint."""
    return {"status": "ok"}


async def _handle_keepalive(ws: WebSocket, session_id: str) -> None:
    """Send periodic pings to prevent Cloud Run from killing idle connections."""
    try:
        while True:
            await asyncio.sleep(WS_KEEPALIVE_INTERVAL)
            try:
                await ws.send_json({"type": "ping"})
            except Exception:
                break
    except asyncio.CancelledError:
        pass


async def _track_usage(ws: WebSocket, uid: str, session_id: str) -> None:
    """Periodically increment usage and warn when approaching limit."""
    try:
        while True:
            await asyncio.sleep(USAGE_TRACK_INTERVAL)
            try:
                total = await increment_usage(uid, USAGE_TRACK_INTERVAL)
                remaining = max(0, FREE_TIER_SECONDS - total)
                remaining_min = remaining // 60

                # Send warnings at 5 min and 1 min remaining
                if remaining_min == 5 or remaining_min == 1:
                    await ws.send_json({
                        "type": "usage_warning",
                        "minutes_remaining": remaining_min,
                    })

                # Disconnect if limit reached
                if remaining <= 0:
                    await ws.send_json({
                        "type": "error",
                        "message": "You have used your 30 free minutes for today. Come back tomorrow or upgrade to Pro.",
                    })
                    await ws.close(code=1000, reason="Usage limit reached")
                    return
            except Exception:
                logger.exception("Usage tracking error for %s", session_id)
    except asyncio.CancelledError:
        # Final increment for partial minute
        try:
            await increment_usage(uid, 30)  # rough estimate
        except Exception:
            pass


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

            if len(raw) > config.WS_MAX_MESSAGE_BYTES:
                await ws.send_json({"type": "error", "message": "Message too large"})
                continue

            now = time.monotonic()
            msg_timestamps = [t for t in msg_timestamps if now - t < 1.0]
            if len(msg_timestamps) >= config.WS_RATE_LIMIT_PER_SEC:
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
                    types.Blob(data=audio_data, mime_type="audio/pcm")
                )

            elif msg_type == "video":
                frame_data = base64.b64decode(message["data"])
                session = await session_service.get_session(
                    app_name="sightline",
                    user_id=session_id,
                    session_id=session_id,
                )
                if session:
                    session.state["latest_frame"] = message["data"]

                live_request_queue.send_realtime(
                    types.Blob(data=frame_data, mime_type="image/jpeg")
                )

            elif msg_type == "mode":
                new_mode = message.get("mode", "navigation")
                session = await session_service.get_session(
                    app_name="sightline",
                    user_id=session_id,
                    session_id=session_id,
                )
                if session:
                    session.state["current_mode"] = new_mode
                    logger.info("Session %s switched to mode: %s", session_id, new_mode)
                await ws.send_json({"type": "status", "status": f"mode:{new_mode}"})

            elif msg_type == "pong":
                pass

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
        await ws.send_json({"type": "status", "status": "listening"})
        logger.info("Session %s: starting Gemini Live stream", session_id)

        async for event in runner.run_live(
            session=session,
            live_request_queue=live_request_queue,
        ):
            if event.interrupted:
                await ws.send_json({"type": "interrupted"})
                continue

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
    except Exception as exc:
        logger.exception("Downstream error for session %s", session_id)
        try:
            await ws.send_json({
                "type": "error",
                "message": f"Agent error: {type(exc).__name__}: {exc}",
            })
        except Exception:
            pass


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query("")) -> None:
    """Bidirectional audio/video streaming via WebSocket."""
    await ws.accept()

    # --- Authentication (Firebase ID token or static API_TOKEN) ---
    auth_info = await verify_token(token)
    if not auth_info:
        # Allow unauthenticated if no API_TOKEN configured (hackathon mode)
        if config.API_TOKEN:
            client_host = ws.client.host if ws.client else "unknown"
            logger.warning("Rejected connection: invalid token from %s", client_host)
            await ws.close(code=1008, reason="Invalid or missing token")
            return
        auth_info = {"uid": f"anon-{uuid4().hex[:8]}", "auth_method": "none"}

    uid = auth_info["uid"]
    session_id = str(uuid4())
    client_host = ws.client.host if ws.client else "unknown"
    logger.info("New session: %s user: %s from %s", session_id, uid, client_host)

    # --- Ensure user document exists ---
    try:
        await ensure_user_doc(
            uid,
            email=auth_info.get("email"),
            is_anonymous=auth_info.get("is_anonymous", True),
        )
    except Exception:
        logger.exception("Failed to ensure user doc for %s", uid)

    # --- Check usage limits ---
    try:
        allowed, remaining = await check_limit(uid)
        if not allowed:
            await ws.send_json({
                "type": "error",
                "message": "You have used your 30 free minutes for today. Come back tomorrow or upgrade to Pro.",
            })
            await ws.close(code=1000, reason="Usage limit reached")
            return
        if remaining > 0:
            remaining_min = remaining // 60
            logger.info("User %s has %d min remaining today", uid, remaining_min)
    except Exception:
        logger.exception("Usage check failed for %s, allowing anyway", uid)

    live_request_queue = LiveRequestQueue()

    try:
        session = await session_service.create_session(
            app_name="sightline",
            user_id=session_id,
            session_id=session_id,
            state={
                "current_mode": "navigation",
                "session_id": session_id,
                "user_id": uid,
            },
        )
    except Exception as exc:
        logger.exception("Failed to create session %s", session_id)
        await ws.send_json({
            "type": "error",
            "message": f"Session creation failed: {exc}",
        })
        await ws.close(code=1011, reason="Session creation failed")
        return

    await ws.send_json({"type": "status", "status": "ready"})

    upstream_task = asyncio.create_task(
        _handle_upstream(ws, live_request_queue, session_id)
    )
    downstream_task = asyncio.create_task(
        _handle_downstream(ws, session, live_request_queue, session_id)
    )
    keepalive_task = asyncio.create_task(
        _handle_keepalive(ws, session_id)
    )
    usage_task = asyncio.create_task(
        _track_usage(ws, uid, session_id)
    )

    try:
        done, pending = await asyncio.wait(
            [upstream_task, downstream_task, keepalive_task, usage_task],
            return_when=asyncio.FIRST_COMPLETED,
        )
        for task in done:
            if task.exception():
                logger.error(
                    "Session %s task error: %s", session_id, task.exception()
                )
    except Exception:
        logger.exception("Session %s ended with error", session_id)
    finally:
        upstream_task.cancel()
        downstream_task.cancel()
        keepalive_task.cancel()
        usage_task.cancel()
        live_request_queue.close()
        logger.info("Session %s (user %s) cleaned up", session_id, uid)
