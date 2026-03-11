"""Cloud Storage wrapper for uploading camera frames."""

from datetime import datetime, timedelta, timezone

from google.cloud import storage

from config import config

# Maximum allowed frame size (10 MB).
MAX_FRAME_BYTES = 10 * 1024 * 1024


def upload_frame(
    session_id: str,
    frame_bytes: bytes,
    content_type: str = "image/jpeg",
) -> str:
    """Upload a frame to GCS and return a time-limited signed URL.

    Frames are stored under ``frames/{session_id}/{timestamp}.jpg``.
    The returned URL expires after 1 hour.
    """
    if len(frame_bytes) > MAX_FRAME_BYTES:
        raise ValueError(f"Frame too large ({len(frame_bytes)} bytes)")

    if content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise ValueError(f"Unsupported content type: {content_type}")

    client = storage.Client()
    bucket = client.bucket(config.GCS_BUCKET)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    blob_name = f"frames/{session_id}/{timestamp}.jpg"
    blob = bucket.blob(blob_name)

    blob.upload_from_string(frame_bytes, content_type=content_type)

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=1),
        method="GET",
    )
    return url
