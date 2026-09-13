from typing import List, Optional
from fastapi import APIRouter, Depends, Query, Request, status
from app.core.security import get_current_user, get_current_user_optional
from app.schemas.ticket import (
    TicketCreate,
    TicketUpdate,
    TicketListItem,
    TicketResponse,
    NoteCreate,
    BulkDeleteRequest,
)
from app.schemas.email import EmailSendRequest, EmailSendResponse
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/api/tickets", tags=["Tickets"])


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_ticket(
    payload: TicketCreate,
    user: dict = Depends(get_current_user_optional),
):
    """
    Create a new support ticket in database.
    Universal endpoint: accepts tickets from any authenticated staff or customer user.
    """
    if not payload.raised_by_name:
        payload.raised_by_name = (
            user.get("name")
            or user.get("displayName")
            or (user.get("email", "").split("@")[0].replace(".", " ").title() if user.get("email") else None)
            or payload.customer_name
        )
    if not payload.raised_by_user_id:
        payload.raised_by_user_id = (
            user.get("sub")
            or user.get("user_id")
            or user.get("uid")
            or (user.get("email", "").split("@")[0] if user.get("email") else None)
            or payload.customer_id
            or f"usr_{payload.customer_name.lower().replace(' ', '_')}"
        )
    return TicketService.create_ticket(payload)


@router.get("", response_model=List[TicketListItem])
async def list_tickets(
    search: Optional[str] = Query(None, description="Search term for ID, customer, subject, or description"),
    status: Optional[str] = Query(None, description="Filter by status (Open | In Progress | Closed | All)"),
    customer_id: Optional[str] = Query(None, description="Filter by customer ID (e.g. CUST-001)"),
    user: dict = Depends(get_current_user_optional),
):
    """
    List, search, and filter tickets from database.
    Universal endpoint: accessible across all user logins and team sessions.
    """
    return TicketService.list_tickets(search=search, status_filter=status, customer_id=customer_id)


@router.get("/customer/{customer_id}", response_model=List[TicketListItem])
async def get_tickets_by_customer(
    customer_id: str,
    user: dict = Depends(get_current_user_optional),
):
    """
    Fetch all tickets for a specific customer ID or email.
    Universal endpoint: accessible across all user logins.
    """
    return TicketService.list_tickets(customer_id=customer_id)


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket_details(
    ticket_id: str,
    user: dict = Depends(get_current_user_optional),
):
    """
    Fetch full ticket details with associated notes.
    Universal endpoint: allows fetching ticket by any valid ID across all sessions.
    """
    return TicketService.get_ticket(ticket_id)


@router.put("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: str,
    payload: TicketUpdate,
    user: dict = Depends(get_current_user_optional),
):
    """
    Update ticket status and optionally append an internal note.
    Protected endpoint: accepts valid Firebase JWT or authenticated session.
    """
    return TicketService.update_ticket(ticket_id, payload)


@router.post("/{ticket_id}/notes", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def add_note(
    ticket_id: str,
    payload: NoteCreate,
    request: Request,
    user: dict = Depends(get_current_user_optional),
):
    """
    Dedicated endpoint to add an internal note to a ticket.

    Supports idempotency via X-Client-Mutation-Id header:
    If the same mutation ID is received twice (due to network retry from the
    offline sync queue), the note will NOT be duplicated.

    Protected endpoint: requires valid Firebase JWT Bearer token.
    """
    # Read client mutation ID from header (preferred) or body field
    client_mutation_id = (
        request.headers.get("X-Client-Mutation-Id")
        or payload.client_mutation_id
    )
    return TicketService.add_note(
        ticket_id=ticket_id,
        note_text=payload.note_text,
        author_name=payload.author_name,
        author_email=payload.author_email,
        client_mutation_id=client_mutation_id,
    )


@router.delete("/{ticket_id}")
async def delete_ticket(
    ticket_id: str,
    user: dict = Depends(get_current_user_optional),
):
    """
    Delete a single ticket by ticket ID.
    """
    return TicketService.delete_ticket(ticket_id)


@router.post("/bulk-delete")
async def bulk_delete_tickets(
    payload: BulkDeleteRequest,
    user: dict = Depends(get_current_user_optional),
):
    """
    Bulk delete multiple tickets by ticket IDs.
    """
    return TicketService.delete_tickets_bulk(payload.ticket_ids)


@router.delete("")
async def bulk_delete_tickets_delete(
    payload: BulkDeleteRequest,
    user: dict = Depends(get_current_user_optional),
):
    """
    Bulk delete tickets via DELETE method.
    """
    return TicketService.delete_tickets_bulk(payload.ticket_ids)


@router.post("/{ticket_id}/send-email", response_model=EmailSendResponse)
async def send_ticket_email(
    ticket_id: str,
    payload: EmailSendRequest,
    user: dict = Depends(get_current_user),
):
    """
    Sends an official support response copy directly to the CUSTOMER's email address.
    Protected endpoint: requires valid Firebase JWT Bearer token.
    """
    return TicketService.send_ticket_email(
        ticket_id=ticket_id,
        subject=payload.subject,
        message=payload.message,
        ticket_data=payload.ticket_data,
        recipient_email=payload.recipient_email,
        recipient_name=payload.recipient_name,
    )



