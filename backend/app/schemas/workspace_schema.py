from pydantic import BaseModel, Field
from typing import Optional


class WorkspaceCreate(BaseModel):
    name: str = Field(..., json_schema_extra={"example": "Q3 Earnings Analysis"})
    description: Optional[str] = Field(None, json_schema_extra={"example": "Aggregated transcript data"})


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
    agent_type: str
    action: str
    workspace_name: str
    time_ago: str


class RedFlag(BaseModel):
    id: str
    workspace_id: str
    severity: str
    title: str
    time_ago: str
    pinned: bool = False


class AgentSummaryItem(BaseModel):
    agent_name: str
    total_actions: int
    completed: int
    failed: int
    latest_action: str
    latest_time: str


class WorkspaceSummaryItem(BaseModel):
    name: str
    docs_processed: int
    risks_found: int
    reports_generated: int


class RecentActivityItem(BaseModel):
    agent_name: str
    action: str
    details: str
    workspace_name: str
    status: str
    time_ago: str


class DailySummaryResponse(BaseModel):
    overview: str
    date: str
    total_agent_actions: int
    total_docs_processed: int
    total_risks_found: int
    total_reports: int
    agents: list[AgentSummaryItem]
    workspaces: list[WorkspaceSummaryItem]
    recent_activity: list[RecentActivityItem]


class DashboardStats(BaseModel):
    active_workspaces: int
    active_workspaces_trend: str
    documents_processed: int
    documents_processed_trend: str
    open_red_flags: int
    reports_generated: int
    reports_generated_trend: str
    agent_activity: list[AgentActivity]
    red_flags: list[RedFlag]


class Notification(BaseModel):
    id: str
    title: str
    message: str
    type: str  # "info", "warning", "success", "error"
    time_ago: str
    is_read: bool


class NotificationResponse(BaseModel):
    notifications: list[Notification]
    has_unread: bool
