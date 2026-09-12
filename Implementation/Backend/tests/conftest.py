import pytest
import json
from pathlib import Path
from app.database import firestore_client

TEST_SEEDS = {
    "TKT-001": {
        "ticket_id": "TKT-001",
        "customer_id": "CUST-001",
        "raised_by_name": "Rahul Sharma",
        "raised_by_user_id": "usr_rahul_921",
        "customer_name": "Rahul Sharma",
        "customer_email": "rahul@datastraw.in",
        "subject": "Order delayed in transit",
        "description": "Customer order #DS-8921 has not arrived yet. Tracking shows delayed at hub.",
        "status": "Open",
        "attachments": [
            {
                "name": "invoice_8921.pdf",
                "url": "http://localhost:8000/uploads/seed_invoice_8921.pdf",
                "size": 142850,
                "type": "application/pdf"
            }
        ],
        "created_at": "2026-09-08T10:30:00Z",
        "updated_at": "2026-09-08T10:45:00Z",
        "notes": [
            {
                "id": 1,
                "note_text": "Customer contacted support via portal.",
                "author_name": "Support Desk",
                "author_email": "desk@datastraw.in",
                "created_at": "2026-09-08T10:35:00Z"
            }
        ]
    },
    "TKT-004": {
        "ticket_id": "TKT-004",
        "customer_id": "CUST-004",
        "raised_by_name": "Vikram Sethi",
        "raised_by_user_id": "usr_vikram_ops",
        "customer_name": "Vikram Sethi",
        "customer_email": "vikram.s@logistics.in",
        "subject": "Webhook integration timeout",
        "description": "Webhook payload delivery returns 504 gateway timeout after 30 seconds.",
        "status": "Closed",
        "attachments": [],
        "created_at": "2026-09-07T14:00:00Z",
        "updated_at": "2026-09-08T09:00:00Z",
        "notes": []
    }
}

@pytest.fixture(autouse=True, scope="session")
def setup_and_teardown_test_db(tmp_path_factory):
    # Save original paths
    orig_db_file = firestore_client.DB_FILE
    orig_data_dir = firestore_client.DATA_DIR

    # Use isolated temporary test database
    temp_dir = tmp_path_factory.mktemp("test_strawcrm_data")
    temp_file = temp_dir / "test_tickets_db.json"
    firestore_client.DATA_DIR = temp_dir
    firestore_client.DB_FILE = temp_file

    # Populate isolated test seeds
    firestore_client._save_db(TEST_SEEDS)
    yield
    # Restore original database paths
    firestore_client.DATA_DIR = orig_data_dir
    firestore_client.DB_FILE = orig_db_file
