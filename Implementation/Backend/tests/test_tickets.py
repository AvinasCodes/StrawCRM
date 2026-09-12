import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)

# Helper to generate test auth headers
def get_auth_headers():
    token = create_access_token({"sub": "usr_test_agent", "email": "agent@strawcrm.com"})
    return {"Authorization": f"Bearer {token}"}


def test_list_tickets():
    headers = get_auth_headers()
    response = client.get("/api/tickets", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert "ticket_id" in data[0]
    assert "customer_name" in data[0]
    assert "status" in data[0]


def test_create_ticket_success():
    headers = get_auth_headers()
    payload = {
        "customer_name": "Anita Verma",
        "customer_email": "anita@example.com",
        "subject": "App crashes on launch",
        "description": "Whenever I open the iOS app, it crashes immediately on the splash screen.",
    }
    response = client.post("/api/tickets", json=payload, headers=headers)
    assert response.status_code == 201
    data = response.json()
    assert "ticket_id" in data
    assert data["ticket_id"].startswith("TKT-")
    assert "created_at" in data


def test_create_ticket_validation_errors():
    headers = get_auth_headers()
    # Invalid email
    bad_email_payload = {
        "customer_name": "Anita",
        "customer_email": "not-an-email",
        "subject": "Help",
        "description": "Something broke",
    }
    response = client.post("/api/tickets", json=bad_email_payload, headers=headers)
    assert response.status_code == 422

    # Description too short
    short_desc_payload = {
        "customer_name": "Anita",
        "customer_email": "anita@example.com",
        "subject": "Help",
        "description": "bad",
    }
    response = client.post("/api/tickets", json=short_desc_payload, headers=headers)
    assert response.status_code == 422


def test_filter_tickets_by_status():
    headers = get_auth_headers()
    response = client.get("/api/tickets?status=Open", headers=headers)
    assert response.status_code == 200
    data = response.json()
    for item in data:
        assert item["status"] == "Open"


def test_search_tickets():
    headers = get_auth_headers()
    response = client.get("/api/tickets?search=Rahul", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 1
    assert any("Rahul" in item["customer_name"] for item in data)


def test_get_ticket_details():
    headers = get_auth_headers()
    # TKT-001 is seeded in mock store
    response = client.get("/api/tickets/TKT-001", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["ticket_id"] == "TKT-001"
    assert "customer_email" in data
    assert "notes" in data
    assert isinstance(data["notes"], list)


def test_get_ticket_not_found():
    headers = get_auth_headers()
    response = client.get("/api/tickets/TKT-NONEXISTENT", headers=headers)
    assert response.status_code == 404


def test_update_ticket_status_and_add_note():
    headers = get_auth_headers()
    update_payload = {
        "status": "In Progress",
        "notes": "Spoke to the courier team, item is out for delivery today.",
    }
    response = client.put("/api/tickets/TKT-001", json=update_payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "In Progress"
    assert len(data["notes"]) >= 2
    assert any("courier team" in n["note_text"] for n in data["notes"])


def test_ai_summary():
    headers = get_auth_headers()
    response = client.post("/api/tickets/TKT-001/ai-summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["ticket_id"] == "TKT-001"
    assert "summary" in data
    assert "key_points" in data
    assert isinstance(data["key_points"], list)


def test_ai_reply():
    headers = get_auth_headers()
    payload = {
        "instructions": "Be extra polite and apologize for the delay",
        "tone": "friendly",
    }
    response = client.post("/api/tickets/TKT-001/ai-reply", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["ticket_id"] == "TKT-001"
    assert "suggested_reply" in data
    assert len(data["suggested_reply"]) > 20


def test_analytics_overview():
    headers = get_auth_headers()
    response = client.get("/api/analytics/overview", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "total_tickets" in data
    assert "open_tickets" in data
    assert "in_progress_tickets" in data
    assert "closed_tickets" in data
    assert "resolution_rate" in data


def test_dashboard_summary():
    headers = get_auth_headers()
    response = client.get("/api/dashboard/summary?range=7d", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert "summary" in data
    assert "recent_tickets" in data
    assert "range" in data
    assert data["range"] == "7d"
    summary = data["summary"]
    assert "open" in summary
    assert "in_progress" in summary
    assert "closed" in summary
    assert "total" in summary
    assert "changes" in summary
    assert summary["total"] >= summary["open"] + summary["in_progress"] + summary["closed"]
    assert isinstance(data["recent_tickets"], list)


def test_list_customers():
    headers = get_auth_headers()
    response = client.get("/api/customers", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    first = data[0]
    assert "customer_id" in first
    assert "customer_name" in first
    assert "customer_email" in first
    assert "ticket_count" in first


def test_get_customer_details_by_id():
    headers = get_auth_headers()
    response = client.get("/api/customers/CUST-001", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["customer_id"] == "CUST-001"
    assert data["customer_name"] == "Rahul Sharma"
    assert "tickets" in data
    assert isinstance(data["tickets"], list)
    assert len(data["tickets"]) >= 1


def test_get_ticket_by_customer_id():
    headers = get_auth_headers()
    # Fetching ticket endpoint using customer ID should return matching ticket
    response = client.get("/api/tickets/CUST-001", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["customer_id"] == "CUST-001"
    assert data["customer_name"] == "Rahul Sharma"


def test_get_tickets_by_customer_filter():
    headers = get_auth_headers()
    response = client.get("/api/tickets?customer_id=CUST-001", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1
    assert all(item["customer_id"] == "CUST-001" for item in data)


def test_multi_user_status_and_notes_persistence():
    # User A modifies status and adds note
    user_a_headers = {"Authorization": "Bearer usr_alice_support"}
    update_res = client.put(
        "/api/tickets/TKT-001",
        json={"status": "In Progress"},
        headers=user_a_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["status"] == "In Progress"

    note_res = client.post(
        "/api/tickets/TKT-001/notes",
        json={"note_text": "Investigated by User A: Root cause identified.", "author_name": "Alice Support"},
        headers=user_a_headers,
    )
    assert note_res.status_code == 201
    assert any(n["note_text"] == "Investigated by User A: Root cause identified." for n in note_res.json()["notes"])

    # User B (different user ID) fetches list and detail
    user_b_headers = {"Authorization": "Bearer usr_bob_manager"}
    list_res = client.get("/api/tickets", headers=user_b_headers)
    assert list_res.status_code == 200
    tkt_001 = next(t for t in list_res.json() if t["ticket_id"] == "TKT-001")
    assert tkt_001["status"] == "In Progress"
    assert "notes" in tkt_001
    assert any(n["note_text"] == "Investigated by User A: Root cause identified." for n in tkt_001["notes"])

    # User B fetches full ticket detail
    detail_res = client.get("/api/tickets/TKT-001", headers=user_b_headers)
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["status"] == "In Progress"
    assert any(n["note_text"] == "Investigated by User A: Root cause identified." for n in detail["notes"])


def test_delete_ticket_and_bulk_delete():
    headers = get_auth_headers()
    # 1. Create two temporary tickets
    t1 = client.post(
        "/api/tickets",
        json={
            "customer_name": "Delete Test User 1",
            "customer_email": "del1@example.com",
            "subject": "Delete Single Test Ticket",
            "description": "This ticket will be deleted individually.",
        },
        headers=headers,
    ).json()
    t1_id = t1["ticket_id"]

    t2 = client.post(
        "/api/tickets",
        json={
            "customer_name": "Delete Test User 2",
            "customer_email": "del2@example.com",
            "subject": "Delete Bulk Test Ticket 2",
            "description": "This ticket will be deleted in bulk.",
        },
        headers=headers,
    ).json()
    t2_id = t2["ticket_id"]

    t3 = client.post(
        "/api/tickets",
        json={
            "customer_name": "Delete Test User 3",
            "customer_email": "del3@example.com",
            "subject": "Delete Bulk Test Ticket 3",
            "description": "This ticket will also be deleted in bulk.",
        },
        headers=headers,
    ).json()
    t3_id = t3["ticket_id"]

    # 2. Test single DELETE /api/tickets/{ticket_id}
    del1_res = client.delete(f"/api/tickets/{t1_id}", headers=headers)
    assert del1_res.status_code == 200
    assert del1_res.json()["success"] is True

    # Verify t1 is gone
    get1_res = client.get(f"/api/tickets/{t1_id}", headers=headers)
    assert get1_res.status_code == 404

    # 3. Test bulk POST /api/tickets/bulk-delete
    bulk_res = client.post(
        "/api/tickets/bulk-delete",
        json={"ticket_ids": [t2_id, t3_id]},
        headers=headers,
    )
    assert bulk_res.status_code == 200
    assert bulk_res.json()["deleted_count"] == 2
    assert t2_id in bulk_res.json()["deleted_ticket_ids"]
    assert t3_id in bulk_res.json()["deleted_ticket_ids"]

    # Verify both are gone
    assert client.get(f"/api/tickets/{t2_id}", headers=headers).status_code == 404
    assert client.get(f"/api/tickets/{t3_id}", headers=headers).status_code == 404



