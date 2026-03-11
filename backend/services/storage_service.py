"""Cloud Storage wrapper for uploading camera frames."""

from datetime import datetime, timezone

from google.cloud import storage

from config import config


def upload_frame(
    session_id: str,
    frame_bytes: bytes,
    content_type: str = "image/jpeg",
) -> str:
    """Upload a frame to GCS and return its public URL.

    Frames are stored under ``frames/{session_id}/{timestamp}.jpg``.
    """
    client = storage.Client()
    bucket = client.bucket(config.GCS_BUCKET)

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%f")
    blob_name = f"frames/{session_id}/{timestamp}.jpg"
    blob = bucket.blob(blob_name)

    blob.upload_from_string(frame_bytes, content_type=content_type)
    blob.make_public()

    return blob.public_url
