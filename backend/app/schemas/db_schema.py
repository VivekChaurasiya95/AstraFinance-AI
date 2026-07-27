from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime

class MongoBaseModel(BaseModel):
    id: str = Field(..., alias="_id")

class DocumentStatus(BaseModel):
    document_id: str
    status: str # "uploading", "parsing", "chunking", "embedding", "extracting", "completed", "failed"
    progress: int
    processing_step: int
    current_action: str
    error: Optional[str] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DBWorkspace(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    description: str = ""
    owner_id: str
    docs: int = 0
    chats: int = 0
    reports: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    icon: str = "FileTextIcon"
    iconColor: str = "text-blue-700"
    iconBg: str = "bg-blue-100"

class DBDocument(BaseModel):
    id: str = Field(..., alias="_id")
    workspace_id: str
    name: str
    size_bytes: int
    status: str = "processing"
    pdf_type: str = "Document"
    pages: int = 0
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class DBMetric(BaseModel):
    id: str = Field(..., alias="_id")
    workspace_id: str
    document_id: str
    label: str
    value: str
    trend: str = "flat"
    change: str = "0%"
    confidence: float = 0.0
    source_page: Optional[int] = None
    citation: Optional[str] = None
    chunk_id: Optional[str] = None

class DBRedFlag(BaseModel):
    id: str = Field(..., alias="_id")
    workspace_id: str
    document_id: str
    severity: str
    title: str
    description: str
    recommendation: Optional[str] = None
    source_page: Optional[int] = None
    citation: Optional[str] = None
    chunk_id: Optional[str] = None

class DBAgentLog(BaseModel):
    id: str = Field(..., alias="_id")
    workspace_id: str
    document_id: Optional[str] = None
    agent_name: str
    agent_type: str
    status: str
    action: str
    details: str
    duration: str = ""
    metadata: Dict[str, Any] = {}
    timestamp: datetime = Field(default_factory=datetime.utcnow)
