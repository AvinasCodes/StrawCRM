from typing import Optional
from pydantic import BaseModel, Field


class EmailSendRequest(BaseModel):
    subject: str = Field(..., min_length=1, max_length=200, description="Email subject line")
    message: str = Field(..., min_length=1, description="Email body content / suggested response")
    ticket_data: Optional[dict] = Field(None, description="Optional ticket context payload")
    recipient_email: Optional[str] = Field(None, description="Optional recipient email override (defaults to customer_email)")
    recipient_name: Optional[str] = Field(None, description="Optional recipient name override (defaults to customer_name)")


class EmailSendResponse(BaseModel):
    success: bool
    recipient: str
    message: str
    ticket_id: str
