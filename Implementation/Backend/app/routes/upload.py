import os
import re
import json
import uuid
import base64
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, status, Response
from app.core.config import settings

router = APIRouter(prefix="/api/upload", tags=["Uploads"])

# Upload directory: Implementation/Backend/uploads
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    ticket_id: Optional[str] = Form(None),
):
    """
    Handle direct file uploads:
    - Small files (< limit KB, default 500 KB): Encoded and stored inline as base64.
    - Large files (>= limit KB): Stored in persistent file storage with streaming URL.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required",
        )

    # Read content and enforce size limits
    content = await file.read()
    file_size = len(content)

    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum allowed limit of 50 MB.",
        )

    attachment_id = f"att_{uuid.uuid4().hex[:12]}"
    content_type = file.content_type or "application/octet-stream"
    limit_bytes = settings.ATTACHMENT_INLINE_LIMIT_KB * 1024

    # Tier 1: Small files (< limit KB) -> Base64 data URI
    if file_size < limit_bytes:
        b64_content = base64.b64encode(content).decode("utf-8")
        data_uri = f"data:{content_type};base64,{b64_content}"

        return {
            "id": attachment_id,
            "name": file.filename,
            "size": file_size,
            "type": content_type,
            "storage": "firestore_base64",
            "data": data_uri,
            "url": data_uri,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "ticket_id": ticket_id,
        }

    # Tier 2: Large files (>= limit KB) -> Persistent File Storage
    safe_name = re.sub(r"[^a-zA-Z0-9._-]", "_", file.filename)
    unique_filename = f"{attachment_id}_{safe_name}"
    target_path = os.path.join(UPLOAD_DIR, unique_filename)
    meta_path = os.path.join(UPLOAD_DIR, f"{attachment_id}.meta.json")

    with open(target_path, "wb") as f:
        f.write(content)

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "id": attachment_id,
                "name": file.filename,
                "size": file_size,
                "type": content_type,
                "filename": unique_filename,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "ticket_id": ticket_id,
            },
            f,
        )

    return {
        "id": attachment_id,
        "name": file.filename,
        "size": file_size,
        "type": content_type,
        "storage": "file_storage",
        "data": None,
        "url": f"/api/upload/attachments/{attachment_id}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "ticket_id": ticket_id,
    }


@router.get("/attachments/{attachment_id}")
async def get_attachment_file(attachment_id: str):
    """
    Stream attachment stored in persistent file storage.
    """
    if os.path.exists(UPLOAD_DIR):
        meta_path = os.path.join(UPLOAD_DIR, f"{attachment_id}.meta.json")
        meta = {}
        if os.path.exists(meta_path):
            try:
                with open(meta_path, "r", encoding="utf-8") as mf:
                    meta = json.load(mf)
            except Exception:
                pass

        for fname in os.listdir(UPLOAD_DIR):
            if fname.startswith(attachment_id) and not fname.endswith(".meta.json"):
                file_path = os.path.join(UPLOAD_DIR, fname)
                with open(file_path, "rb") as f:
                    data = f.read()
                original_name = meta.get("name") or fname.split("_", 1)[-1] if "_" in fname else fname
                content_type = meta.get("type") or "application/octet-stream"
                return Response(
                    content=data,
                    media_type=content_type,
                    headers={
                        "Content-Disposition": f'inline; filename="{original_name}"',
                        "Content-Length": str(len(data)),
                    },
                )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Attachment not found",
    )
