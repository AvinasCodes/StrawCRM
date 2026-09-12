import io
import base64
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)


def test_upload_small_file_stored_in_firestore_base64():
    """Files < ATTACHMENT_INLINE_LIMIT_KB (default 500 KB) must be stored inline as base64."""
    small_content = b"Small file content for receipt #1049" * 50  # ~1.8 KB
    file_obj = io.BytesIO(small_content)

    response = client.post(
        "/api/upload",
        files={"file": ("receipt.txt", file_obj, "text/plain")},
        data={"ticket_id": "TKT-001"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "receipt.txt"
    assert data["size"] == len(small_content)
    assert data["storage"] == "firestore_base64"
    assert data["url"].startswith("data:text/plain;base64,")
    assert data["data"].startswith("data:text/plain;base64,")

    # Verify base64 decoded content matches original
    b64_part = data["url"].split(",", 1)[1]
    decoded = base64.b64decode(b64_part)
    assert decoded == small_content


def test_upload_large_file_stored_in_file_storage():
    """Files >= ATTACHMENT_INLINE_LIMIT_KB must be stored in file storage with streaming URL."""
    large_size = (settings.ATTACHMENT_INLINE_LIMIT_KB + 10) * 1024  # 510 KB
    large_content = b"X" * large_size
    file_obj = io.BytesIO(large_content)

    response = client.post(
        "/api/upload",
        files={"file": ("large_document.bin", file_obj, "application/octet-stream")},
        data={"ticket_id": "TKT-002"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "large_document.bin"
    assert data["size"] == large_size
    assert data["storage"] == "file_storage"
    assert data["url"].startswith("/api/upload/attachments/")

    # Verify stream retrieval endpoint
    att_id = data["id"]
    stream_resp = client.get(f"/api/upload/attachments/{att_id}")
    assert stream_resp.status_code == 200
    assert len(stream_resp.content) == large_size
    assert stream_resp.content == large_content


def test_create_ticket_with_dual_tier_attachments():
    """Ticket creation accepts and preserves both firestore_base64 and file_storage attachments."""
    auth_headers = {"Authorization": "Bearer dev-test-token"}

    ticket_payload = {
        "customer_name": "Test Customer",
        "customer_email": "test@example.com",
        "subject": "Dual Tier Attachment Test Ticket",
        "description": "Testing attachment persistence across both tiers.",
        "attachments": [
            {
                "id": "att_small_001",
                "name": "icon.png",
                "url": "data:image/png;base64,iVBORw0KGgo=",
                "size": 12,
                "type": "image/png",
                "storage": "firestore_base64",
                "data": "data:image/png;base64,iVBORw0KGgo=",
            },
            {
                "id": "att_large_002",
                "name": "dataset.csv",
                "url": "/api/upload/attachments/att_large_002",
                "size": 600000,
                "type": "text/csv",
                "storage": "file_storage",
            },
        ],
    }

    create_resp = client.post("/api/tickets", json=ticket_payload, headers=auth_headers)
    assert create_resp.status_code == 201
    created = create_resp.json()
    assert len(created["attachments"]) == 2
    assert created["attachments"][0]["storage"] == "firestore_base64"
    assert created["attachments"][1]["storage"] == "file_storage"

    # Verify get ticket details preserves storage type
    ticket_id = created["ticket_id"]
    detail_resp = client.get(f"/api/tickets/{ticket_id}", headers=auth_headers)
    assert detail_resp.status_code == 200
    detail = detail_resp.json()
    assert detail["attachments"][0]["storage"] == "firestore_base64"
    assert detail["attachments"][1]["storage"] == "file_storage"
