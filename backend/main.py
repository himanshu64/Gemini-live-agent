"""FastAPI application with WebSocket endpoint for SightLine live streaming."""

import asyncio
import base64
import json
import logging
import time
from uuid import uuid4

import httpx
from fastapi import FastAPI, Header, HTTPException, Query, Request, Response, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from google.genai import types

from config import config
from agent.sightline_agent import create_session_service, create_runner
from google.adk.agents.live_request_queue import LiveRequestQueue
from services.auth_service import verify_token
from services.firestore_service import get_user_preferences, save_user_preference
from services.storage_service import list_user_frames, delete_frame
from tools.save_preference import ALLOWED_KEYS
from services.usage_service import (
    check_limit,
    ensure_user_doc,
    get_daily_usage,
    get_user_tier,
    increment_usage,
    FREE_TIER_SECONDS,
)
from services.admin_service import (
    is_admin,
    get_overview_stats,
    get_users_list,
    get_usage_trends,
    get_recent_sessions,
    get_error_log,
    get_user_journeys,
    get_mode_distribution,
    get_retention_data,
    set_user_disabled,
)
from services.gamification_service import (
    get_gamification_profile,
    award_xp,
    update_streak,
    check_and_award_badges,
    get_rewards,
    claim_reward,
    earn_loyalty_points,
    get_leaderboard,
    BADGES,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(title="SightLine API", version="1.0.0")

# --- DDoS protection: per-IP connection + rate limiting ---
_connections_per_ip: dict[str, int] = {}
MAX_CONNECTIONS_PER_IP = 3
MAX_TOTAL_CONNECTIONS = 50
_total_connections = 0

_http_rate: dict[str, list[float]] = {}

# --- Captcha nonce store (short-lived, in-memory) ---
_captcha_nonces: dict[str, float] = {}  # nonce -> expiry timestamp

app.add_middleware(
    CORSMiddleware,
    allow_origins=[config.FRONTEND_ORIGIN],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


@app.middleware("http")
async def rate_limit_http(request: Request, call_next) -> Response:
    """Rate-limit /api/* endpoints to 60 req/min per IP."""
    if request.url.path.startswith("/api/"):
        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        timestamps = [t for t in _http_rate.get(ip, []) if now - t < 60]
        if len(timestamps) >= 60:
            return Response(status_code=429, content="Rate limit exceeded")
        timestamps.append(now)
        _http_rate[ip] = timestamps
    return await call_next(request)


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
    response.headers["Content-Security-Policy"] = "default-src 'none'; frame-ancestors 'none'"
    return response

session_service = create_session_service()
runner = create_runner(session_service)

WS_KEEPALIVE_INTERVAL = 25
USAGE_TRACK_INTERVAL = 60  # Track usage every 60 seconds


@app.get("/health")
async def health() -> dict:
    """Health-check endpoint."""
    return {"status": "ok"}


@app.get("/api/usage")
async def get_usage(authorization: str = Header("")) -> dict:
    """Return usage stats for the authenticated user."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")

    uid = auth_info["uid"]
    tier = await get_user_tier(uid)
    used = await get_daily_usage(uid)
    limit = FREE_TIER_SECONDS if tier == "free" else -1
    remaining = max(0, limit - used) if limit > 0 else -1

    return {
        "uid": uid,
        "tier": tier,
        "today_seconds_used": used,
        "today_seconds_limit": limit,
        "today_seconds_remaining": remaining,
    }


@app.get("/api/preferences")
async def get_preferences(authorization: str = Header("")) -> dict:
    """Return all preferences for the authenticated user."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")

    uid = auth_info["uid"]
    prefs = await get_user_preferences(uid)
    return {"preferences": prefs}


@app.put("/api/preferences")
async def put_preference(request: Request, authorization: str = Header("")) -> dict:
    """Save a single preference for the authenticated user."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    key = body.get("key", "")
    value = body.get("value", "")

    if key not in ALLOWED_KEYS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid preference key '{key}'. Allowed: {sorted(ALLOWED_KEYS)}",
        )

    if len(str(value)) > 256:
        raise HTTPException(status_code=400, detail="Value too long")

    uid = auth_info["uid"]
    await save_user_preference(uid, key, str(value))
    return {"status": "saved", "key": key, "value": value}


@app.get("/api/frames")
async def get_frames(authorization: str = Header("")) -> dict:
    """Return captured frames for the authenticated user."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")

    uid = auth_info["uid"]
    frames = list_user_frames(uid)
    return {"frames": frames}


@app.delete("/api/frames")
async def remove_frame(request: Request, authorization: str = Header("")) -> dict:
    """Delete a single captured frame for the authenticated user."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")

    body = await request.json()
    name = body.get("name", "")
    if not name:
        raise HTTPException(status_code=400, detail="Missing 'name' field")

    uid = auth_info["uid"]
    try:
        delete_frame(uid, name)
    except ValueError as exc:
        raise HTTPException(status_code=403, detail=str(exc))

    return {"status": "deleted", "name": name}


@app.post("/api/verify-captcha")
async def verify_captcha(request: Request) -> dict:
    """Verify a Cloudflare Turnstile token and return a one-time nonce."""
    if not config.TURNSTILE_SECRET_KEY:
        # Turnstile not configured — return a pass-through nonce
        nonce = uuid4().hex
        _captcha_nonces[nonce] = time.time() + 60
        return {"nonce": nonce}

    body = await request.json()
    turnstile_token = body.get("token", "")
    if not turnstile_token:
        raise HTTPException(400, "Missing captcha token")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": config.TURNSTILE_SECRET_KEY, "response": turnstile_token},
        )
    result = resp.json()
    if not result.get("success"):
        raise HTTPException(403, "Captcha verification failed")

    nonce = uuid4().hex
    _captcha_nonces[nonce] = time.time() + 60
    return {"nonce": nonce}


# ---------------------------------------------------------------------------
# Admin analytics endpoints
# ---------------------------------------------------------------------------

async def _require_admin(authorization: str) -> dict:
    """Verify token and check admin role. Raises HTTPException if not admin."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")
    if not await is_admin(auth_info["uid"]):
        raise HTTPException(status_code=403, detail="Admin access required")
    return auth_info


@app.get("/api/admin/check")
async def admin_check(authorization: str = Header("")) -> dict:
    """Lightweight check — returns {admin: true} or 403."""
    await _require_admin(authorization)
    return {"admin": True}


@app.get("/api/admin/stats")
async def admin_stats(authorization: str = Header("")) -> dict:
    """Aggregate platform statistics."""
    await _require_admin(authorization)
    stats = await get_overview_stats()
    return stats


@app.get("/api/admin/users")
async def admin_users(authorization: str = Header(""), limit: int = Query(50)) -> dict:
    """List all users with usage data."""
    await _require_admin(authorization)
    users = await get_users_list(min(limit, 100))
    return {"users": users}


@app.get("/api/admin/usage-trends")
async def admin_usage_trends(authorization: str = Header(""), days: int = Query(7)) -> dict:
    """Daily usage trends for the past N days."""
    await _require_admin(authorization)
    trends = await get_usage_trends(min(days, 30))
    return {"trends": trends}


@app.get("/api/admin/sessions")
async def admin_sessions(authorization: str = Header(""), limit: int = Query(20)) -> dict:
    """Recent sessions."""
    await _require_admin(authorization)
    sessions = await get_recent_sessions(min(limit, 50))
    return {"sessions": sessions}


@app.get("/api/admin/errors")
async def admin_errors(authorization: str = Header(""), limit: int = Query(30)) -> dict:
    """Recent error events (crashlytics-like)."""
    await _require_admin(authorization)
    errors = await get_error_log(min(limit, 100))
    return {"errors": errors}


@app.get("/api/admin/journeys")
async def admin_journeys(authorization: str = Header(""), limit: int = Query(30)) -> dict:
    """User journey maps across sessions."""
    await _require_admin(authorization)
    journeys = await get_user_journeys(min(limit, 50))
    return {"journeys": journeys}


@app.get("/api/admin/modes")
async def admin_modes(authorization: str = Header("")) -> dict:
    """Mode distribution across sessions."""
    await _require_admin(authorization)
    modes = await get_mode_distribution()
    return {"modes": modes}


@app.get("/api/admin/retention")
async def admin_retention(authorization: str = Header(""), days: int = Query(7)) -> dict:
    """User retention data."""
    await _require_admin(authorization)
    data = await get_retention_data(min(days, 30))
    return data


@app.get("/api/admin/server-stats")
async def admin_server_stats(authorization: str = Header("")) -> dict:
    """Live server stats: connections, rate limits, captcha."""
    await _require_admin(authorization)
    return {
        "total_connections": _total_connections,
        "max_connections": MAX_TOTAL_CONNECTIONS,
        "connections_per_ip": dict(_connections_per_ip),
        "max_per_ip": MAX_CONNECTIONS_PER_IP,
        "active_captcha_nonces": len(_captcha_nonces),
        "rate_limited_ips": len(_http_rate),
        "turnstile_enabled": bool(config.TURNSTILE_SECRET_KEY),
    }


@app.put("/api/admin/users/{target_uid}/disable")
async def admin_disable_user(target_uid: str, request: Request, authorization: str = Header("")) -> dict:
    """Enable or disable a user account."""
    await _require_admin(authorization)
    body = await request.json()
    disabled = bool(body.get("disabled", True))
    try:
        await set_user_disabled(target_uid, disabled)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"status": "disabled" if disabled else "enabled", "uid": target_uid}


# ---------------------------------------------------------------------------
# Gamification & loyalty endpoints
# ---------------------------------------------------------------------------

@app.get("/api/gamification/profile")
async def gamification_profile(authorization: str = Header("")) -> dict:
    """Get the authenticated user's gamification profile."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return await get_gamification_profile(auth_info["uid"])


@app.get("/api/gamification/leaderboard")
async def gamification_leaderboard(limit: int = Query(10)) -> dict:
    """Public leaderboard — top users by XP."""
    board = await get_leaderboard(min(limit, 50))
    return {"leaderboard": board}


@app.get("/api/gamification/badges")
async def gamification_badges() -> dict:
    """List all available badges."""
    return {"badges": {k: v for k, v in BADGES.items()}}


@app.get("/api/gamification/rewards")
async def gamification_rewards() -> dict:
    """List available loyalty rewards."""
    rewards = await get_rewards()
    return {"rewards": rewards}


@app.post("/api/gamification/claim-reward")
async def gamification_claim_reward(request: Request, authorization: str = Header("")) -> dict:
    """Claim a loyalty reward."""
    token = authorization.removeprefix("Bearer ").strip()
    auth_info = await verify_token(token)
    if not auth_info:
        raise HTTPException(status_code=401, detail="Unauthorized")
    body = await request.json()
    reward_id = body.get("reward_id", "")
    if not reward_id:
        raise HTTPException(status_code=400, detail="Missing reward_id")
    try:
        result = await claim_reward(auth_info["uid"], reward_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return result


# ---------------------------------------------------------------------------
# Feedback endpoints
# ---------------------------------------------------------------------------

@app.post("/api/feedback")
async def submit_feedback(request: Request) -> dict:
    """Submit anonymous feedback from the landing page."""
    body = await request.json()
    message = (body.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    if len(message) > 2000:
        raise HTTPException(status_code=400, detail="Message too long (max 2000 chars)")

    name = (body.get("name") or "Anonymous").strip()[:100]
    email = (body.get("email") or "").strip()[:200]

    from services.firestore_service import get_client as _get_fs_client
    fs = _get_fs_client()
    doc_ref = fs.collection("feedback").document()
    rating = body.get("rating")
    if rating is not None:
        try:
            rating = max(1, min(5, int(rating)))
        except (TypeError, ValueError):
            rating = None

    await doc_ref.set({
        "name": name,
        "email": email or None,
        "message": message,
        "rating": rating,
        "created_at": time.time(),
    })

    return {"status": "ok", "id": doc_ref.id}


@app.get("/api/admin/feedback")
async def admin_feedback(authorization: str = Header(""), limit: int = Query(50)) -> dict:
    """List feedback submissions (admin only)."""
    await _require_admin(authorization)

    from services.firestore_service import get_client as _get_fs_client
    fs = _get_fs_client()
    feedback_list = []
    query = fs.collection("feedback").order_by("created_at", direction="DESCENDING").limit(min(limit, 100))
    try:
        async for doc in query.stream():
            data = doc.to_dict() or {}
            feedback_list.append({
                "id": doc.id,
                "name": data.get("name", "Anonymous"),
                "email": data.get("email"),
                "message": data.get("message", ""),
                "created_at": data.get("created_at"),
            })
    except Exception:
        logger.exception("Failed to fetch feedback")

    return {"feedback": feedback_list}


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
    drop_count = 0

    try:
        while True:
            raw = await ws.receive_text()

            if len(raw) > config.WS_MAX_MESSAGE_BYTES:
                await ws.send_json({"type": "error", "message": "Message too large"})
                continue

            now = time.monotonic()
            msg_timestamps = [t for t in msg_timestamps if now - t < 1.0]
            if len(msg_timestamps) >= config.WS_RATE_LIMIT_PER_SEC:
                drop_count += 1
                if drop_count == 3:
                    await ws.send_json({"type": "error", "message": "Rate limit: slow down"})
                if drop_count >= 10:
                    await ws.close(code=1008, reason="Rate limit exceeded")
                    return
                continue
            drop_count = 0
            msg_timestamps.append(now)

            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "Invalid JSON"})
                continue

            msg_type = message.get("type")

            if msg_type == "audio":
                try:
                    audio_data = base64.b64decode(message["data"])
                except Exception:
                    continue
                live_request_queue.send_realtime(
                    types.Blob(data=audio_data, mime_type="audio/pcm")
                )

            elif msg_type == "video":
                try:
                    frame_data = base64.b64decode(message["data"])
                except Exception:
                    continue
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

            elif msg_type == "text":
                text = message.get("text", "").strip()
                if text:
                    live_request_queue.send_content(
                        types.Content(role="user", parts=[types.Part(text=text)])
                    )

            elif msg_type == "emergency":
                # Handle SOS emergency
                location = message.get("location")
                timestamp = message.get("timestamp", int(time.time() * 1000))
                logger.warning(
                    "EMERGENCY SOS: session=%s location=%s timestamp=%s",
                    session_id, location, timestamp,
                )

                session = await session_service.get_session(
                    app_name="sightline",
                    user_id=session_id,
                    session_id=session_id,
                )
                if session:
                    session.state["current_mode"] = "emergency"
                    session.state["emergency_active"] = True
                    session.state["emergency_location"] = location

                # Log emergency to Firestore
                try:
                    from services.firestore_service import get_client as _get_fs_client
                    fs = _get_fs_client()
                    uid = session.state.get("user_id", "unknown") if session else "unknown"
                    await fs.collection("emergencies").document(f"{uid}_{timestamp}").set({
                        "uid": uid,
                        "session_id": session_id,
                        "location": location,
                        "timestamp": timestamp,
                        "created_at": time.time(),
                    })
                except Exception:
                    logger.exception("Failed to log emergency to Firestore")

                # Inject emergency prompt into the live stream as audio text
                emergency_prompt = (
                    "EMERGENCY: The user has triggered an SOS alert. Priority: describe the environment "
                    "for safety. Identify: exits, people nearby, obstacles, hazards, street signs, "
                    "addresses. Be direct and concise. Continue describing until the user cancels."
                )
                try:
                    live_request_queue.send_content(
                        types.Content(
                            role="user",
                            parts=[types.Part(text=emergency_prompt)],
                        )
                    )
                except AttributeError:
                    # Fallback: send as realtime text blob
                    live_request_queue.send_realtime(
                        types.Blob(data=emergency_prompt.encode(), mime_type="text/plain")
                    )

                # Capture current frame if available
                if session and session.state.get("latest_frame"):
                    try:
                        from services.storage_service import upload_frame
                        frame_data = base64.b64decode(session.state["latest_frame"])
                        upload_frame(uid, f"emergency_{timestamp}.jpg", frame_data)
                    except Exception:
                        logger.exception("Failed to save emergency frame")

                await ws.send_json({"type": "sos_active", "message": "Emergency mode active"})

            elif msg_type == "mode":
                new_mode = message.get("mode", "navigation")
                session = await session_service.get_session(
                    app_name="sightline",
                    user_id=session_id,
                    session_id=session_id,
                )
                if session:
                    session.state["current_mode"] = new_mode
                    session.state["emergency_active"] = False
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
    except Exception:
        logger.exception("Downstream error for session %s", session_id)
        try:
            await ws.send_json({
                "type": "error",
                "message": "An internal error occurred",
            })
        except Exception:
            pass


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(""), captcha: str = Query("")) -> None:
    """Bidirectional audio/video streaming via WebSocket."""
    global _total_connections

    # --- Per-IP connection limiting (before accept) ---
    client_host = ws.client.host if ws.client else "unknown"
    if _total_connections >= MAX_TOTAL_CONNECTIONS:
        await ws.close(code=1013, reason="Server at capacity")
        return
    if _connections_per_ip.get(client_host, 0) >= MAX_CONNECTIONS_PER_IP:
        await ws.close(code=1008, reason="Too many connections from this IP")
        return

    await ws.accept()
    _connections_per_ip[client_host] = _connections_per_ip.get(client_host, 0) + 1
    _total_connections += 1

    try:
        await _handle_ws_session(ws, token, captcha, client_host)
    finally:
        _connections_per_ip[client_host] = max(0, _connections_per_ip.get(client_host, 0) - 1)
        _total_connections = max(0, _total_connections - 1)


async def _handle_ws_session(ws: WebSocket, token: str, captcha_nonce: str, client_host: str) -> None:
    """Inner WebSocket handler after connection limiting."""
    # --- Authentication (Firebase ID token or static API_TOKEN) ---
    auth_info = await verify_token(token)
    if not auth_info:
        logger.warning("Rejected connection: invalid token from %s", client_host)
        await ws.close(code=1008, reason="Invalid or missing token")
        return

    # --- Captcha nonce validation (only when Turnstile is configured) ---
    if config.TURNSTILE_SECRET_KEY:
        expiry = _captcha_nonces.pop(captcha_nonce, 0)
        if time.time() > expiry:
            await ws.close(code=1008, reason="Invalid or expired captcha")
            return

    uid = auth_info["uid"]

    # --- Check if user is disabled ---
    from services.firestore_service import get_client as _get_fs_client
    user_doc = await _get_fs_client().document(f"users/{uid}").get()
    if user_doc.exists and (user_doc.to_dict() or {}).get("disabled"):
        await ws.close(code=1008, reason="Account disabled")
        return

    session_id = str(uuid4())
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

    # --- Gamification: streak + session XP ---
    try:
        streak_result = await update_streak(uid)
        xp_result = await award_xp(uid, "session_start")
        await earn_loyalty_points(uid, 5)  # 5 loyalty points per session
        await check_and_award_badges(uid)
        if streak_result.get("new_badges") or (xp_result.get("leveled_up")):
            logger.info("Gamification: user %s streak=%d, new_badges=%s, leveled_up=%s",
                         uid, streak_result.get("streak_days", 0),
                         streak_result.get("new_badges", []),
                         xp_result.get("leveled_up", False))
    except Exception:
        logger.exception("Gamification error for %s", uid)

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
    except Exception:
        logger.exception("Failed to create session %s", session_id)
        await ws.send_json({
            "type": "error",
            "message": "Session creation failed",
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
