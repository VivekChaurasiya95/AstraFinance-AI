from fastapi import APIRouter
from app.schemas.workspace_schema import DashboardStats

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats():
    return {
        "active_workspaces": 12,
        "documents_processed": 482,
        "open_red_flags": 8,
        "reports_generated": 24,
        "agent_activity": [
            {
                "id": "event_1",
                "agent_name": "Analyst",
                "agent_type": "Analyst",
                "action": "SWOT completed for NVDA",
                "workspace_name": "Q3 Tech Sector",
                "time_ago": "10m ago"
            },
            {
                "id": "event_2",
                "agent_name": "Auditor",
                "agent_type": "Auditor",
                "action": "Compliance check passed",
                "workspace_name": "Emerging Markets ETF",
                "time_ago": "1h ago"
            },
            {
                "id": "event_3",
                "agent_name": "Macro Strategist",
                "agent_type": "Macro Strategist",
                "action": "Generated rate cut scenarios",
                "workspace_name": "Energy Infrastructure",
                "time_ago": "3h ago"
            }
        ],
        "red_flags": [
            {
                "id": "rf_1",
                "severity": "Critical",
                "title": "Cash flow anomaly in Energy Portfolio",
                "time_ago": "2h ago"
            },
            {
                "id": "rf_2",
                "severity": "High",
                "title": "Regulatory deadline for Global Fund",
                "time_ago": "5h ago"
            }
        ]
    }
