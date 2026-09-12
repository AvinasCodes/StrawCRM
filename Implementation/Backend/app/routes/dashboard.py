from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.core.security import get_current_user
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary")
async def get_dashboard_summary(
    range: Optional[str] = Query("7d", description="Time range filter: today, 7d, 30d, all"),
    user: dict = Depends(get_current_user),
):
    """
    Get dashboard KPI metrics, recent tickets, and comparison indicators.
    Protected endpoint: requires valid Firebase JWT Bearer token.
    """
    return TicketService.get_dashboard_summary(date_range=range)
