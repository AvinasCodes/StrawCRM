from typing import Optional, List, Union
from datetime import datetime
from pydantic import BaseModel
from app.schemas.ticket import TicketListItem


class CustomerListItem(BaseModel):
    customer_id: str
    customer_name: str
    customer_email: str
    ticket_count: int
    latest_ticket_id: Optional[str] = None
    latest_ticket_date: Optional[Union[datetime, str]] = None
    latest_subject: Optional[str] = None


class CustomerResponse(BaseModel):
    customer_id: str
    customer_name: str
    customer_email: str
    ticket_count: int
    latest_ticket_id: Optional[str] = None
    latest_ticket_date: Optional[Union[datetime, str]] = None
    latest_subject: Optional[str] = None
    tickets: List[TicketListItem] = []
