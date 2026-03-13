"""Cloud Storage wrapper for uploading camera frames."""

from datetime import datetime, timedelta, timezone

from google.cloud import storage

from config import config

# Maximum allowed frame size (10 MB).
MAX_FRAME_BYTES = 10 * 1024 * 1024

# Maximum frames returned by list_user_frames.
MAX_LIST_FRAMES = 50


def _get_bucket():
    """Return the configured GCS bucket."""
    client = storage.Client()
    return client.bucket(config.GCS_BUCKET)


def upload_frame(
    uid: str,
    frame_bytes: bytes,
    content_type: str = "image/jpeg",
) -> str:
    """Upload a frame to GCS and return a time-limited signed URL.

    Frames are stored under ``frames/{uid}/{timestamp}.jpg``.
    The returned URL expires after 1 hour.
    """
    if len(frame_bytes) > MAX_FRAME_BYTES:
        raise ValueError(f"Frame too large ({len(frame_bytes)} bytes)")

    if content_type not in ("image/jpeg", "image/png", "image/webp"):
        raise ValueError(f"Unsupported content type: {content_type}")

    bucket = _get_bucket()

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    blob_name = f"frames/{uid}/{timestamp}.jpg"
    blob = bucket.blob(blob_name)

    blob.upload_from_string(frame_bytes, content_type=content_type)

    url = blob.generate_signed_url(
        version="v4",
        expiration=timedelta(hours=1),
        method="GET",
    )
    return url


def list_user_frames(uid: str) -> list[dict]:
    """List the most recent frames for a user.

    Returns up to ``MAX_LIST_FRAMES`` entries sorted newest-first, each
    containing ``name``, ``url``, ``created``, and ``size``.
    """
    bucket = _get_bucket()
    prefix = f"frames/{uid}/"
    blobs = list(bucket.list_blobs(prefix=prefix))

    # Sort newest first by name (names contain timestamps).
    blobs.sort(key=lambda b: b.name, reverse=True)
    blobs = blobs[:MAX_LIST_FRAMES]

    results: list[dict] = []
    for blob in blobs:
        url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=1),
            method="GET",
        )
        results.append({
            "name": blob.name,
            "url": url,
            "created": blob.time_created.isoformat() if blob.time_created else None,
            "size": blob.size,
        })
    return results


def delete_frame(uid: str, blob_name: str) -> bool:
    """Delete a single frame blob, validating it belongs to the user.

    Returns True if deleted, raises ValueError for unauthorized paths.
    """
    expected_prefix = f"frames/{uid}/"
    if not blob_name.startswith(expected_prefix):
        raise ValueError("Unauthorized: blob does not belong to this user")

    bucket = _get_bucket()
    blob = bucket.blob(blob_name)
    blob.delete()
    return True
