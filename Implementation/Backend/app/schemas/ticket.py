from typing import Optional, List, Union
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class TicketStatus:
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    CLOSED = "Closed"
    ALL = [OPEN, IN_PROGRESS, CLOSED]


class AttachmentItem(BaseModel):
    id: Optional[str] = None
    name: str
    url: str
    size: Optional[int] = 0
    type: Optional[str] = "application/octet-stream"
    storage: Optional[str] = "firestore_base64"  # "firestore_base64" | "file_storage"
    data: Optional[str] = None  # Base64 data URI if stored in Firestore


class TicketCreate(BaseModel):
    customer_id: Optional[str] = None
    raised_by_user_id: Optional[str] = None
    raised_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_id: Optional[str] = None
    category: Optional[str] = "General Inquiry"
    priority: Optional[str] = "Medium"
    customer_name: str = Field(..., min_length=2, max_length=150)
    customer_email: EmailStr
    subject: str = Field(..., min_length=3, max_length=255)
    description: str = Field(..., min_length=5)
    attachments: Optional[List[AttachmentItem]] = []


class TicketUpdate(BaseModel):
    status: Optional[str] = Field(None, pattern="^(Open|In Progress|Closed)$")
    notes: Optional[str] = Field(None, min_length=1)
    author_name: Optional[str] = "Support Agent"
    author_email: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_id: Optional[str] = None
    priority: Optional[str] = None
    attachments: Optional[List[AttachmentItem]] = None


class NoteCreate(BaseModel):
    """Schema for the dedicated POST /api/tickets/{ticket_id}/notes endpoint."""
    note_text: str = Field(..., min_length=1, max_length=5000)
    author_name: Optional[str] = "Support Agent"
    author_email: Optional[str] = None
    client_mutation_id: Optional[str] = Field(None, max_length=64)


class NoteItem(BaseModel):
    id: Optional[Union[str, int]] = 1
    note_text: str
    author_name: Optional[str] = "Support Agent"
    author_email: Optional[str] = None
    created_at: Union[datetime, str]


class TicketListItem(BaseModel):
    ticket_id: str
    customer_id: Optional[str] = None
    raised_by_user_id: Optional[str] = None
    raised_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_id: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = "Medium"
    customer_name: str
    customer_email: Optional[str] = ""
    subject: str
    description: Optional[str] = ""
    status: str
    attachments: Optional[List[AttachmentItem]] = []
    created_at: Union[datetime, str]
    updated_at: Optional[Union[datetime, str]] = None
    notes: Optional[List[NoteItem]] = []


class TicketResponse(BaseModel):
    ticket_id: str
    customer_id: Optional[str] = None
    raised_by_user_id: Optional[str] = None
    raised_by_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_email: Optional[str] = None
    assigned_to_id: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = "Medium"
    customer_name: str
    customer_email: str
    subject: str
    description: str
    status: str
    attachments: Optional[List[AttachmentItem]] = []
    created_at: Union[datetime, str]
    updated_at: Union[datetime, str]
    notes: List[NoteItem] = []


class BulkDeleteRequest(BaseModel):
    ticket_ids: List[str]

