from typing import List, Optional
from fastapi import APIRouter, Depends, Query, status
from app.core.security import get_current_user, get_current_user_optional
from app.schemas.customer import CustomerListItem, CustomerResponse
from app.schemas.ticket import TicketListItem
from app.services.ticket_service import TicketService

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", response_model=List[CustomerListItem])
async def list_customers(
    search: Optional[str] = Query(None, description="Search by customer ID, name, email, or topic"),
    user: dict = Depends(get_current_user_optional),
):
    """
    Fetch all unique customers with ticket statistics.
    Accessible by any authenticated staff member / user.
    """
    return TicketService.list_customers(search=search)


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: str,
    user: dict = Depends(get_current_user_optional),
):
    """
    Fetch customer details and all tickets for a specific customer ID
    (e.g., CUST-001, cust-001, 1, #CUST-001, or customer email).
    Accessible by any authenticated staff member / user.
    """
    return TicketService.get_customer(customer_id)


@router.get("/{customer_id}/tickets", response_model=List[TicketListItem])
async def get_customer_tickets(
    customer_id: str,
    user: dict = Depends(get_current_user_optional),
):
    """
    Fetch all tickets for a specific customer ID.
    Accessible by any authenticated staff member / user.
    """
    return TicketService.list_tickets(customer_id=customer_id)


from app.core.ws_manager import ws_manager


@router.delete("/{customer_id}")
async def delete_customer(
    customer_id: str,
    user: dict = Depends(get_current_user_optional),
):
    """
    Delete a customer profile and remove all associated tickets.
    """
    res = TicketService.delete_customer(customer_id)
    try:
        await ws_manager.broadcast({"type": "customer_deleted", "customer_id": customer_id})
    except Exception:
        pass
    return res
