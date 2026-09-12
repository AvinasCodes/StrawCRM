from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import get_current_user
from app.schemas.ai import (
    AISummaryRequest,
    AISummaryResponse,
    AIReplyRequest,
    AIReplyResponse,
    AIQueryRequest,
    AIQueryResponse,
)
from app.services.ticket_service import TicketService
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/tickets", tags=["AI Assistance"])


def _resolve_ticket(ticket_id: str, fallback_data: Optional[dict] = None) -> dict:
    ticket = None
    clean_id = str(ticket_id or "").strip()
    id_variants = [clean_id]
    if clean_id.startswith("#"):
        id_variants.append(clean_id.lstrip("#"))
    else:
        id_variants.append(f"#{clean_id}")

    for tid in id_variants:
        try:
            ticket = TicketService.get_ticket(tid)
            if ticket:
                return ticket
        except Exception:
            continue

    if fallback_data and isinstance(fallback_data, dict):
        if not fallback_data.get("ticket_id"):
            fallback_data["ticket_id"] = clean_id
        return fallback_data

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Ticket '{ticket_id}' not found in database.",
    )


@router.post("/{ticket_id}/ai-summary", response_model=AISummaryResponse)
async def get_ticket_ai_summary(
    ticket_id: str,
    payload: Optional[AISummaryRequest] = None,
    user: dict = Depends(get_current_user),
):
    """
    Generate an AI summary of the ticket using Google Gemini API.
    Protected endpoint: requires valid Firebase JWT Bearer token.
    """
    fallback = payload.ticket_data if payload else None
    ticket = _resolve_ticket(ticket_id, fallback)
    return AIService.generate_summary(ticket)


@router.post("/{ticket_id}/ai-reply", response_model=AIReplyResponse)
async def generate_ticket_ai_reply(
    ticket_id: str,
    payload: Optional[AIReplyRequest] = None,
    user: dict = Depends(get_current_user),
):
    """
    Draft an AI response to the customer using Google Gemini API.
    Protected endpoint: requires valid Firebase JWT Bearer token.
    """
    fallback = payload.ticket_data if payload else None
    ticket = _resolve_ticket(ticket_id, fallback)
    instructions = payload.instructions if payload else None
    tone = payload.tone if payload else "professional"
    return AIService.generate_reply(ticket, instructions=instructions, tone=tone)


@router.post("/{ticket_id}/ai-query", response_model=AIQueryResponse)
async def execute_ticket_ai_query(
    ticket_id: str,
    payload: AIQueryRequest,
    user: dict = Depends(get_current_user),
):
    """
    Execute a targeted custom question, demand extraction, or triage query
    specifically for the internal support agent.
    Protected endpoint: requires valid Firebase JWT Bearer token.
    """
    fallback = payload.ticket_data
    ticket = _resolve_ticket(ticket_id, fallback)
    return AIService.execute_custom_query(ticket, query=payload.query)

