import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.email_service import EmailService

client = TestClient(app)


def get_auth_headers():
    return {"Authorization": "Bearer dev-test-token"}


def test_email_service_validates_email():
    assert EmailService.is_valid_email("agent@example.com") is True
    assert EmailService.is_valid_email("support@strawcrm.example.com") is True
    assert EmailService.is_valid_email("") is False
    assert EmailService.is_valid_email(None) is False
    assert EmailService.is_valid_email("invalid-email") is False


def test_send_ticket_email_to_assigned_agent():
    headers = get_auth_headers()
    # TKT-001 has assigned agent Support Agent (agent@strawcrm.example.com)
    payload = {
        "subject": "Ticket #TKT-001 Update for Agent",
        "message": "Here is the AI suggested reply drafted for review.",
        "ticket_data": {
            "ticket_id": "TKT-001",
            "subject": "How To Polish Boot?",
            "customer_name": "Test Customer",
            "customer_email": "customer@example.com",
            "assigned_to_name": "Support Agent",
            "assigned_to_email": "agent@strawcrm.example.com",
            "priority": "Normal",
            "status": "Open",
        }
    }
    response = client.post("/api/tickets/TKT-001/send-email", json=payload, headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    # Verify the recipient is the ASSIGNED AGENT, NOT the customer
    assert data["recipient"] == "agent@strawcrm.example.com"
    assert data["recipient"] != "customer@example.com"


def test_send_ticket_email_missing_agent_email_returns_400():
    headers = get_auth_headers()
    payload = {
        "subject": "Missing Agent Ticket",
        "message": "Testing unassigned ticket email failure.",
        "ticket_data": {
            "ticket_id": "TKT-99999",
            "subject": "Unassigned Ticket",
            "customer_name": "Customer Without Agent",
            "customer_email": "cust@example.com",
            "assigned_to_name": "",
            "assigned_to_email": "",
            "priority": "Normal",
            "status": "Open",
        }
    }
    response = client.post("/api/tickets/TKT-99999/send-email", json=payload, headers=headers)
    assert response.status_code in (400, 404)
