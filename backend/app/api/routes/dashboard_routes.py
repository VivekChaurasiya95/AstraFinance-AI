from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from datetime import datetime, timedelta, timezone
from typing import Optional
import io
from fpdf import FPDF
from ...utils.timestamps import to_iso_utc

from .auth_routes import get_current_user
from ...database.mongo_client import (
    workspaces_collection,
    documents_collection,
    red_flags_collection,
    reports_collection,
    agent_logs_collection,
    users_collection,
)
from ...schemas.workspace_schema import (
    DashboardStats,
    NotificationResponse,
    DailySummaryResponse,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def parse_dt(dt) -> datetime:
    if isinstance(dt, datetime):
        return dt
    if isinstance(dt, str):
        try:
            return datetime.fromisoformat(dt.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.now(timezone.utc)

def time_ago(dt: Optional[datetime]) -> str:
    if dt is None:
        return "Unknown"
    try:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        diff = datetime.now(timezone.utc) - dt
        if diff.days > 0:
            return f"{diff.days}d ago"
        hours = diff.seconds // 3600
        if hours > 0:
            return f"{hours}h ago"
        minutes = diff.seconds // 60
        if minutes > 0:
            return f"{minutes}m ago"
        if diff.seconds > 0:
            return f"{diff.seconds}s ago"
        return "Just now"
    except Exception:
        return "Unknown"

import json
from ...services.cache_service import CacheService
from ...config.settings import settings

# ── Dashboard Stats ────────────────────────────────────────────────────────────
@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cache_key = f"dashboard_stats:{user_id}"
    
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        return cached

    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)

    # 1. Total active workspaces for user & Trend
    workspaces_count = await workspaces_collection.count_documents({"owner_id": user_id})
    ws_recent = await workspaces_collection.count_documents(
        {"owner_id": user_id, "created_at": {"$gte": seven_days_ago}}
    )
    ws_trend = f"+{ws_recent} this week" if ws_recent > 0 else "No new this week"

    # Get user's workspaces to filter documents and agents
    ws_cursor = workspaces_collection.find({"owner_id": user_id}, {"_id": 1, "name": 1})
    user_workspaces: list[str] = []
    ws_map: dict[str, str] = {}
    async for ws in ws_cursor:
        user_workspaces.append(ws["_id"])
        ws_map[ws["_id"]] = ws["name"]

    if not user_workspaces:
        return {
            "active_workspaces": 0,
            "active_workspaces_trend": "No new this week",
            "documents_processed": 0,
            "documents_processed_trend": "Last 30 days",
            "open_red_flags": 0,
            "reports_generated": 0,
            "reports_generated_trend": "0% vs last mo",
            "agent_activity": [],
            "red_flags": [],
        }

    # 2. Total documents & Trend
    documents_count = await documents_collection.count_documents(
        {"workspace_id": {"$in": user_workspaces}}
    )
    docs_recent = await documents_collection.count_documents(
        {"workspace_id": {"$in": user_workspaces}, "uploaded_at": {"$gte": thirty_days_ago}}
    )
    docs_trend = f"{docs_recent} in last 30 days" if docs_recent > 0 else "Last 30 days"

    # 3. Reports generated & Trend
    reports_count = await reports_collection.count_documents(
        {"workspace_id": {"$in": user_workspaces}}
    )
    reports_this_mo = await reports_collection.count_documents(
        {"workspace_id": {"$in": user_workspaces}, "created_at": {"$gte": thirty_days_ago}}
    )
    reports_trend = f"+{reports_this_mo} this month" if reports_this_mo > 0 else "0 vs last mo"

    # 4. Open red flags
    red_flags_count = await red_flags_collection.count_documents(
        {
            "workspace_id": {"$in": user_workspaces},
            "severity": {"$in": ["Critical", "High"]},
            "status": {"$ne": "dismissed"},
        }
    )

    # 5. Agent activity (last 5 logs)
    agent_logs_cursor = agent_logs_collection.find(
        {"workspace_id": {"$in": user_workspaces}}
    ).sort("timestamp", -1).limit(5)

    agent_activity = []
    async for log in agent_logs_cursor:
        agent_activity.append(
            {
                "id": log["_id"],
                "agent_name": log.get("agent_name", "Agent"),
                "agent_type": log.get("agent_type", "Unknown"),
                "action": log.get("action", "Did something"),
                "workspace_name": ws_map.get(log.get("workspace_id", ""), "Workspace"),
                "time_ago": time_ago(parse_dt(log.get("timestamp"))),
                "timestamp": to_iso_utc(parse_dt(log.get("timestamp"))),
            }
        )

    # 6. Recent red flags (pinned first, then by date)
    red_flags_cursor = red_flags_collection.find(
        {
            "workspace_id": {"$in": user_workspaces},
            "severity": {"$in": ["Critical", "High"]},
            "status": {"$ne": "dismissed"},
        }
    ).sort([("pinned", -1), ("detected_at", -1)]).limit(5)

    recent_flags = []
    async for rf in red_flags_cursor:
        dt = parse_dt(rf.get("detected_at"))

        title_raw: str = rf.get("title", rf.get("description", "Unknown Issue"))
        title = (title_raw[:50] + "...") if len(title_raw) > 50 else title_raw

        recent_flags.append(
            {
                "id": rf["_id"],
                "workspace_id": rf.get("workspace_id", ""),
                "severity": rf.get("severity", "High"),
                "title": title,
                "time_ago": time_ago(dt),
                "detected_at": dt.isoformat(),
                "pinned": rf.get("pinned", False),
            }
        )

    result = {
        "active_workspaces": workspaces_count,
        "active_workspaces_trend": ws_trend,
        "documents_processed": documents_count,
        "documents_processed_trend": docs_trend,
        "open_red_flags": red_flags_count,
        "reports_generated": reports_count,
        "reports_generated_trend": reports_trend,
        "agent_activity": agent_activity,
        "red_flags": recent_flags,
    }
    
    await CacheService.set_cached_data(cache_key, result, settings.REDIS_DASHBOARD_TTL)
        
    return result

# ── Notifications ──────────────────────────────────────────────────────────────
@router.get("/notifications", response_model=NotificationResponse)
async def get_dashboard_notifications(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cache_key = f"dashboard_notifs:{user_id}"
    
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        return cached

    last_read: datetime = current_user.get("last_read_notifications", datetime.min)
    if isinstance(last_read, str):
        try:
            last_read = datetime.fromisoformat(last_read)
        except ValueError:
            last_read = datetime.min

    # Ensure naive datetime for comparison
    if hasattr(last_read, "tzinfo") and last_read.tzinfo is not None:
        last_read = last_read.replace(tzinfo=None)

    # Get user's workspaces
    ws_cursor = workspaces_collection.find({"owner_id": user_id}, {"_id": 1})
    user_workspaces: list[str] = []
    async for ws in ws_cursor:
        user_workspaces.append(ws["_id"])

    if not user_workspaces:
        return {"notifications": [], "has_unread": False}

    notifications = []
    has_unread = False

    # Recent red flags
    rf_cursor = red_flags_collection.find(
        {"workspace_id": {"$in": user_workspaces}, "severity": {"$in": ["Critical", "High"]}}
    ).sort("detected_at", -1).limit(5)

    async for rf in rf_cursor:
        dt = parse_dt(rf.get("detected_at"))
        if hasattr(dt, "tzinfo") and dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)

        is_unread = dt > last_read
        if is_unread:
            has_unread = True

        notifications.append(
            {
                "id": "rf_" + rf["_id"],
                "title": f"{rf.get('severity', 'High')} Risk Detected",
                "message": rf.get("title", rf.get("description", "Unknown Issue"))[:100],
                "type": "error" if rf.get("severity") == "Critical" else "warning",
                "time_ago": time_ago(dt),
                "created_at": to_iso_utc(dt) if isinstance(dt, datetime) else dt,
                "is_read": not is_unread,
                "_raw_dt": dt,
            }
        )

    # Recent agent logs
    al_cursor = agent_logs_collection.find(
        {"workspace_id": {"$in": user_workspaces}}
    ).sort("timestamp", -1).limit(5)

    async for log in al_cursor:
        dt = parse_dt(log.get("timestamp"))
        if hasattr(dt, "tzinfo") and dt.tzinfo is not None:
            dt = dt.replace(tzinfo=None)

        is_unread = dt > last_read
        if is_unread:
            has_unread = True

        status: str = log.get("status", "Complete")
        ntype = "success" if status == "Complete" else "info" if status == "Running" else "error"

        notifications.append(
            {
                "id": "al_" + log["_id"],
                "title": f"{log.get('agent_name', 'Agent')} {status}",
                "message": log.get("action", "Activity"),
                "type": ntype,
                "time_ago": time_ago(dt),
                "created_at": to_iso_utc(dt) if isinstance(dt, datetime) else dt,
                "is_read": not is_unread,
                "_raw_dt": dt,
            }
        )

    # Sort by time and strip the internal sort key
    notifications.sort(key=lambda x: x["_raw_dt"], reverse=True)
    for n in notifications:
        del n["_raw_dt"]

    result = {
        "notifications": notifications[:10],
        "has_unread": has_unread,
    }
    
    await CacheService.set_cached_data(cache_key, result, settings.REDIS_DASHBOARD_TTL)
    return result


@router.post("/notifications/mark-read")
async def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    await CacheService.invalidate_cache([f"dashboard_notifs:{user_id}"])
        
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {"last_read_notifications": datetime.now(timezone.utc)}},
    )
    return {"status": "success"}


# ── Daily Summary ──────────────────────────────────────────────────────────────
@router.post("/daily-summary", response_model=DailySummaryResponse)
async def generate_daily_summary(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    now = datetime.now(timezone.utc)
    one_day_ago = now - timedelta(days=1)

    # Get user workspaces
    ws_cursor = workspaces_collection.find({"owner_id": user_id}, {"_id": 1, "name": 1})
    user_workspaces: list[str] = []
    ws_map: dict[str, str] = {}
    async for ws in ws_cursor:
        user_workspaces.append(ws["_id"])
        ws_map[ws["_id"]] = ws["name"]

    if not user_workspaces:
        return {
            "overview": "You have no active workspaces. Start by creating a new workspace and uploading some documents!",
            "date": now.strftime("%b %d, %Y"),
            "total_agent_actions": 0,
            "total_docs_processed": 0,
            "total_risks_found": 0,
            "total_reports": 0,
            "agents": [],
            "workspaces": [],
            "recent_activity": [],
        }

    # Fetch agent logs from last 24h; fall back to all-time if empty
    agent_logs_cursor = agent_logs_collection.find(
        {"workspace_id": {"$in": user_workspaces}, "timestamp": {"$gte": one_day_ago}}
    ).sort("timestamp", -1)

    all_logs: list[dict] = []
    async for log in agent_logs_cursor:
        all_logs.append(log)

    if not all_logs:
        agent_logs_cursor = agent_logs_collection.find(
            {"workspace_id": {"$in": user_workspaces}}
        ).sort("timestamp", -1).limit(50)
        async for log in agent_logs_cursor:
            all_logs.append(log)

    # ── Per-Agent Summary ──
    agent_stats: dict[str, dict] = {}
    for log in all_logs:
        name: str = log.get("agent_name", "Unknown Agent")
        if name not in agent_stats:
            agent_stats[name] = {
                "total_actions": 0,
                "completed": 0,
                "failed": 0,
                "latest_action": "",
                "latest_time": None,
            }
        agent_stats[name]["total_actions"] += 1
        log_status: str = log.get("status", "")
        if log_status == "Complete":
            agent_stats[name]["completed"] += 1
        elif log_status == "Failed":
            agent_stats[name]["failed"] += 1

        ts = parse_dt(log.get("timestamp", now))
        if hasattr(ts, "tzinfo") and ts.tzinfo is not None:
            ts = ts.replace(tzinfo=None)

        prev_latest = agent_stats[name]["latest_time"]
        if prev_latest is None or ts > prev_latest:
            agent_stats[name]["latest_time"] = ts
            agent_stats[name]["latest_action"] = log.get("action", "Unknown action")

    agents_list = [
        {
            "agent_name": name,
            "total_actions": data["total_actions"],
            "completed": data["completed"],
            "failed": data["failed"],
            "latest_action": data["latest_action"],
            "latest_time": time_ago(data["latest_time"]) if data["latest_time"] else "N/A",
        }
        for name, data in agent_stats.items()
    ]

    # ── Per-Workspace Summary ──
    workspace_summaries = []
    for ws_id, ws_name in ws_map.items():
        docs_count = await documents_collection.count_documents({"workspace_id": ws_id})
        risks_count = await red_flags_collection.count_documents({"workspace_id": ws_id})
        rep_count = await reports_collection.count_documents({"workspace_id": ws_id})
        workspace_summaries.append(
            {
                "id": ws_id,
                "name": ws_name,
                "docs_processed": docs_count,
                "risks_found": risks_count,
                "reports_generated": rep_count,
            }
        )

    # ── Recent Activity (last 10) ──
    recent_activity = []
    for log in all_logs[:10]:
        log_ts = parse_dt(log.get("timestamp", now))
        if hasattr(log_ts, "tzinfo") and log_ts.tzinfo is not None:
            log_ts = log_ts.replace(tzinfo=None)

        recent_activity.append(
            {
                "agent_name": log.get("agent_name", "Agent"),
                "action": log.get("action", "Unknown"),
                "details": log.get("details", ""),
                "workspace_name": ws_map.get(log.get("workspace_id", ""), "Unknown"),
                "status": log.get("status", "Unknown"),
                "time_ago": time_ago(log_ts),
            }
        )

    # ── Aggregate Counts ──
    total_docs = await documents_collection.count_documents(
        {"workspace_id": {"$in": user_workspaces}}
    )
    total_risks = await red_flags_collection.count_documents(
        {"workspace_id": {"$in": user_workspaces}}
    )
    total_reports = await reports_collection.count_documents(
        {"workspace_id": {"$in": user_workspaces}}
    )

    # ── Build overview text ──
    overview_parts = [
        f"Daily summary for {now.strftime('%b %d, %Y')}.",
        f"Across {len(user_workspaces)} workspace(s), your agents performed {len(all_logs)} action(s).",
    ]
    if total_docs > 0:
        overview_parts.append(f"{total_docs} document(s) have been processed in total.")
    if total_risks > 0:
        overview_parts.append(f"{total_risks} risk(s) identified across all analyses.")
    if total_reports > 0:
        overview_parts.append(f"{total_reports} report(s) generated.")
    if not all_logs:
        overview_parts.append("No recent agent activity. Upload documents to start analysis.")

    return {
        "overview": " ".join(overview_parts),
        "date": now.strftime("%b %d, %Y"),
        "total_agent_actions": len(all_logs),
        "total_docs_processed": total_docs,
        "total_risks_found": total_risks,
        "total_reports": total_reports,
        "agents": agents_list,
        "workspaces": workspace_summaries,
        "recent_activity": recent_activity,
    }


@router.post("/daily-summary/pdf")
async def generate_daily_summary_pdf(current_user: dict = Depends(get_current_user)):
    # First get the summary data using the existing logic
    raw_summary = await generate_daily_summary(current_user)
    
    # Parse into the Pydantic model for type safety and easy attribute access
    if isinstance(raw_summary, dict):
        summary = DailySummaryResponse.model_validate(raw_summary)
    else:
        summary = raw_summary

    # Create PDF
    pdf = FPDF()
    pdf.add_page()
    
    # Title
    pdf.set_font("Helvetica", style="B", size=20)
    pdf.set_text_color(99, 102, 241) # Indigo-500
    pdf.cell(0, 10, "Agent Activity Summary", new_x="LMARGIN", new_y="NEXT", align="C")
    
    # Date
    pdf.set_font("Helvetica", size=12)
    pdf.set_text_color(100, 116, 139) # Slate-500
    pdf.cell(0, 10, f"Report for {summary.date}", new_x="LMARGIN", new_y="NEXT", align="C")
    
    pdf.ln(10)
    
    # Overview
    pdf.set_font("Helvetica", size=11)
    pdf.set_text_color(15, 23, 42) # Slate-900
    pdf.multi_cell(0, 8, summary.overview)
    pdf.ln(10)
    
    # Stats
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(0, 10, "Key Metrics", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", size=11)
    pdf.cell(0, 8, f"Total Agent Actions: {summary.total_agent_actions}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Total Documents Processed: {summary.total_docs_processed}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Total Risks Found: {summary.total_risks_found}", new_x="LMARGIN", new_y="NEXT")
    pdf.cell(0, 8, f"Total Reports Generated: {summary.total_reports}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(10)
    
    # Agent Breakdown
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(0, 10, "Agent Breakdown", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", size=11)
    for agent in summary.agents:
        pdf.set_font("Helvetica", style="B", size=11)
        pdf.cell(60, 8, agent.agent_name)
        pdf.set_font("Helvetica", size=11)
        pdf.cell(40, 8, f"Actions: {agent.total_actions}")
        pdf.cell(40, 8, f"Completed: {agent.completed}")
        pdf.cell(0, 8, f"Failed: {agent.failed}", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(10)
    
    # Workspace Overview
    pdf.set_font("Helvetica", style="B", size=14)
    pdf.cell(0, 10, "Workspace Overview", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", size=11)
    for ws in summary.workspaces:
        pdf.set_font("Helvetica", style="B", size=11)
        pdf.cell(80, 8, ws.name)
        pdf.set_font("Helvetica", size=11)
        pdf.cell(40, 8, f"Docs: {ws.docs_processed}")
        pdf.cell(40, 8, f"Risks: {ws.risks_found}")
        pdf.cell(0, 8, f"Reports: {ws.reports_generated}", new_x="LMARGIN", new_y="NEXT")

    # Save PDF to bytes
    pdf_bytes = pdf.output(dest="S")
    
    # Return as StreamingResponse
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=agent_activity_summary_{summary.date.replace(' ', '_').replace(',', '')}.pdf"
        }
    )


# ── Red Flag Actions ───────────────────────────────────────────────────────────
@router.post("/red-flags/{flag_id}/dismiss")
async def dismiss_red_flag(flag_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    flag = await red_flags_collection.find_one({"_id": flag_id})
    if not flag:
        return {"success": False, "message": "Flag not found"}

    workspace = await workspaces_collection.find_one({"_id": flag.get("workspace_id")})
    if not workspace or workspace.get("owner_id") != user_id:
        return {"success": False, "message": "Unauthorized"}

    await red_flags_collection.update_one({"_id": flag_id}, {"$set": {"status": "dismissed"}})
    return {"success": True, "message": "Flag dismissed"}


@router.post("/red-flags/{flag_id}/pin")
async def pin_red_flag(flag_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    flag = await red_flags_collection.find_one({"_id": flag_id})
    if not flag:
        return {"success": False, "message": "Flag not found"}

    workspace = await workspaces_collection.find_one({"_id": flag.get("workspace_id")})
    if not workspace or workspace.get("owner_id") != user_id:
        return {"success": False, "message": "Unauthorized"}

    current_pinned: bool = flag.get("pinned", False)
    await red_flags_collection.update_one(
        {"_id": flag_id}, {"$set": {"pinned": not current_pinned}}
    )
    return {"success": True, "message": f"Flag {'unpinned' if current_pinned else 'pinned'}"}
