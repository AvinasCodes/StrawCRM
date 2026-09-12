import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token

client = TestClient(app)


def test_health_check():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_security_headers_present():
    response = client.get("/api/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"


def test_unauthenticated_request_returns_401():
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    assert "detail" in response.json()
    assert response.json()["detail"] == "Authentication credentials were not provided"


def test_unauthenticated_tickets_access_returns_401():
    response = client.get("/api/tickets")
    assert response.status_code == 401
    assert "WWW-Authenticate" in response.headers


def test_invalid_token_returns_401():
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer invalid_gibberish_token_string"},
    )
    assert response.status_code == 401
    assert "detail" in response.json()


def test_valid_token_returns_user_profile():
    valid_token = create_access_token({
        "sub": "usr_agent_456",
        "email": "agent@strawcrm.com",
        "name": "Agent Avinash",
    })

    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "usr_agent_456"
    assert data["email"] == "agent@strawcrm.com"
    assert data["authenticated"] is True


def test_authenticated_ticket_creation():
    valid_token = create_access_token({
        "sub": "usr_agent_456",
        "email": "agent@strawcrm.com",
    })

    payload = {
        "customer_name": "Test Customer",
        "customer_email": "customer@test.com",
        "subject": "Testing Auth Flow",
        "description": "This is a verified test ticket creation.",
    }

    response = client.post(
        "/api/tickets",
        json=payload,
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert response.status_code == 201
    assert "ticket_id" in response.json()


def test_invalid_ticket_payload_returns_422():
    valid_token = create_access_token({
        "sub": "usr_agent_456",
        "email": "agent@strawcrm.com",
    })

    # Missing customer_name, invalid email
    bad_payload = {
        "customer_email": "not-an-email",
        "subject": "X",
        "description": "Short",
    }

    response = client.post(
        "/api/tickets",
        json=bad_payload,
        headers={"Authorization": f"Bearer {valid_token}"},
    )
    assert response.status_code == 422
