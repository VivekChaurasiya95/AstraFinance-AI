from pydantic import BaseModel, Field
from typing import List, Optional

class WorkspaceCreate(BaseModel):
    name: str = Field(..., example="Q3 Earnings Analysis")
    description: Optional[str] = Field(None, example="Aggregated transcript data")

class WorkspaceResponse(BaseModel):
    id: str
    name: str
    description: str
    docs: int
    chats: int
    reports: int
    owner_name: str
    owner_initial: str
    updatedAt: str
    icon: str
    iconColor: str
    iconBg: str

class AgentActivity(BaseModel):
    id: str
    agent_name: str
    agent_type: str  # e.g., "Analyst", "Auditor"
    action: str
    workspace_name: str
    time_ago: str

class RedFlag(BaseModel):
    id: str
    severity: str
    title: str
    time_ago: str

class DashboardStats(BaseModel):
    active_workspaces: int
    documents_processed: int
    open_red_flags: int
    reports_generated: int
    agent_activity: List[AgentActivity]
    red_flags: List[RedFlag]
