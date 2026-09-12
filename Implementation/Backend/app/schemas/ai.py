from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class AISummaryRequest(BaseModel):
    ticket_data: Optional[Dict[str, Any]] = None


class AISummaryResponse(BaseModel):
    ticket_id: str
    summary: str
    key_points: List[str] = []
    suggested_priority: Optional[str] = "Normal"
    sentiment: Optional[str] = "Neutral"


class AIReplyRequest(BaseModel):
    instructions: Optional[str] = Field(None, max_length=500, description="Optional custom agent guidance")
    tone: Optional[str] = Field("professional", description="Tone: professional | friendly | concise")
    ticket_data: Optional[Dict[str, Any]] = None


class AIReplyResponse(BaseModel):
    ticket_id: str
    suggested_reply: str
    tone: str = "professional"


class AIQueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="Agent's custom query or extraction task")
    ticket_data: Optional[Dict[str, Any]] = None
    messages: Optional[List[Dict[str, Any]]] = Field(default_factory=list, description="Recent conversation messages for multi-turn RAG chat")


class AIQueryResponse(BaseModel):
    ticket_id: str
    query: str
    answer: str
    sources: Optional[List[str]] = Field(default_factory=list, description="Grounding sources retrieved for the query")

