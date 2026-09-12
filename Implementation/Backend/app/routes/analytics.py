from fastapi import APIRouter, Depends
from app.core.security import get_current_user
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_analytics_overview(
    user: dict = Depends(get_current_user),
):
    """
    Get aggregated ticket statistics for dashboard cards.
    Protected endpoint: requires valid Firebase JWT Bearer token.
    """
    all_tickets = TicketService.list_tickets()
    total = len(all_tickets)
    open_count = sum(1 for t in all_tickets if str(t.get("status", "")).lower() == "open")
    in_progress = sum(1 for t in all_tickets if str(t.get("status", "")).lower() == "in progress")
    closed_count = sum(1 for t in all_tickets if str(t.get("status", "")).lower() == "closed")

    return {
        "total_tickets": total,
        "open_tickets": open_count,
        "in_progress_tickets": in_progress,
        "closed_tickets": closed_count,
        "resolution_rate": round((closed_count / total * 100), 1) if total > 0 else 0.0,
    }
