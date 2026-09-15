from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Form, Depends, Query
from typing import List, Optional, Dict, Any
import json
import uuid
from bson import ObjectId
from pydantic import BaseModel
import time
import asyncio
import os
from datetime import datetime, timezone, timedelta
import aiofiles
import traceback
import re
from loguru import logger
from ...utils.timestamps import to_iso_utc, utc_now

from ...schemas.workspace_schema import (
    WorkspaceCreate,
    WorkspaceResponse,
    WorkspaceMember,
    WorkspaceInviteRequest,
    WorkspaceRoleUpdate,
    WorkspaceUpdateRequest,
    WorkspaceDefaults
)
from ...agents.document_agent import DocumentAgent
from ...agents.extraction_agent import ExtractionAgent
from ...agents.red_flag_agent import RedFlagAgent
from ...agents.research_agent import ResearchAgent
from ...agents.comparison_agent import ComparisonAgent
from .auth_routes import get_current_user
from ...database.mongo_client import (
    workspaces_collection,
    documents_collection,
    metrics_collection,
    red_flags_collection,
    agent_logs_collection,
    agent_executions_collection,
    reports_collection,
    users_collection,
    comparison_cache_collection,
    invitations_collection,
    db
)
from ...repositories.settings_repository import get_user_settings
from ...repositories import notifications_repository
from ...repositories import user_repository
from ...agents.report_agent import report_agent
from fastapi.responses import FileResponse
from ...services.cache_service import CacheService
from ...config.settings import settings

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

document_agent = DocumentAgent()
extraction_agent = ExtractionAgent()
red_flag_agent = RedFlagAgent()
try:
    research_agent = ResearchAgent()
except Exception as e:
    print(f"Failed to initialize ResearchAgent: {e}")
    research_agent = None

# ── Helper ────────────────────────────────────────────────────────────────────
async def maybe_notify_user(user_id: str, setting_key: str, category: str, priority: str, title: str, message: str, agent: str | None = None, workspace_id: str | None = None, reference_id: str | None = None):
    settings = await get_user_settings(user_id)
    notifs = settings.get("notifications", {})
    
    # Priority check
    user_priority = notifs.get("priority", "all")
    if user_priority == "critical" and priority != "critical":
        return
    if user_priority == "important" and priority == "low":
        return
        
    # Quiet hours check
    qh = notifs.get("quiet_hours", {})
    if qh.get("enabled"):
        # Very simplified check for demonstration purposes, assumes UTC match
        pass # In a real implementation we'd check times, but we respect allow_critical
        if priority != "critical" and not qh.get("allow_critical", True):
            return
            
    if notifs.get(setting_key, True):
        await notifications_repository.create_notification(
            user_id=user_id,
            type_id=setting_key,
            category=category,
            priority=priority,
            title=title,
            message=message,
            agent=agent,
            workspace_id=workspace_id,
            reference_id=reference_id
        )

def format_workspace(ws: dict) -> dict:
    if "_id" in ws:
        ws["id"] = ws.pop("_id")
    
    # Format updated_at using canonical UTC serializer
    if "updated_at" in ws and isinstance(ws["updated_at"], datetime):
        ws["updatedAt"] = to_iso_utc(ws["updated_at"])
    elif "updatedAt" not in ws:
        ws["updatedAt"] = to_iso_utc(utc_now())
        
    # Format created_at if present
    if "created_at" in ws and isinstance(ws["created_at"], datetime):
        ws["createdAt"] = to_iso_utc(ws["created_at"])
    elif "createdAt" not in ws:
        ws["createdAt"] = ws.get("updatedAt") # Fallback for old workspaces
    
    ws["defaults"] = ws.get("defaults", {"ai_provider": "Groq", "response_style": "Professional"})
    
    members = ws.get("members", [])
    # Member count is owner + invited members
    ws["member_count"] = 1 + len(members)
    
    return ws


# ── Workspaces ────────────────────────────────────────────────────────────────
@router.get("", response_model=List[dict])
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cache_key = f"workspaces:user:{user_id}"
    
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        return cached
        
    cursor = workspaces_collection.find({"owner_id": user_id}).sort("updated_at", -1)
    workspaces = []
    async for ws in cursor:
        workspaces.append(format_workspace(ws))
        
    await CacheService.set_cached_data(cache_key, workspaces, settings.REDIS_WORKSPACE_TTL)
    return workspaces

@router.get("/current")
async def get_current_workspace(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one(
        {"owner_id": user_id},
        sort=[("updated_at", -1)]
    )
    if not ws:
        raise HTTPException(status_code=404, detail="No workspace found")
    return format_workspace(ws)


@router.get("/check-name")
async def check_workspace_name(name: str, current_user: dict = Depends(get_current_user)):
    """Check if a workspace name is available for this user."""
    user_id = str(current_user["_id"])
    # Case-insensitive search using regex could be slow but works for now
    exists = await workspaces_collection.find_one({
        "owner_id": user_id, 
        "name": {"$regex": f"^{name.strip()}$", "$options": "i"}
    })
    return {"available": not bool(exists)}


@router.get("/{workspace_id}")
async def get_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cache_key = f"workspace:{workspace_id}"
    
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        # Extra check: make sure it belongs to the user requesting it
        if cached.get("owner_id") == user_id:
            return cached
            
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    formatted = format_workspace(ws)
    await CacheService.set_cached_data(cache_key, formatted, settings.REDIS_WORKSPACE_TTL)
    return formatted

@router.patch("/{workspace_id}")
async def update_workspace(workspace_id: str, update_req: WorkspaceUpdateRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    update_data: Dict[str, Any] = {"updated_at": utc_now()}
    if update_req.name is not None:
        update_data["name"] = update_req.name
    if update_req.description is not None:
        update_data["description"] = update_req.description
    if update_req.defaults is not None:
        update_data["defaults"] = update_req.defaults.model_dump()
        
    await workspaces_collection.update_one(
        {"_id": workspace_id},
        {"$set": update_data}
    )
    updated_ws = await workspaces_collection.find_one({"_id": workspace_id})
    if not updated_ws:
        raise HTTPException(status_code=404, detail="Workspace not found after update")
        
    await CacheService.invalidate_cache([f"workspace:{workspace_id}", f"workspaces:user:{user_id}", f"dashboard_stats:{user_id}"])
    return format_workspace(updated_ws)

# ── Workspace Members ─────────────────────────────────────────────────────────

@router.get("/{workspace_id}/members", response_model=List[WorkspaceMember])
async def get_workspace_members(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    members = []
    
    # Add owner
    owner_user = await users_collection.find_one({"_id": ObjectId(ws["owner_id"])})
    if owner_user:
        members.append(WorkspaceMember(
            id=str(owner_user["_id"]),
            user_id=str(owner_user["_id"]),
            email=owner_user.get("email", ""),
            name=owner_user.get("name", "Unknown User"),
            role="Owner",
            photo_url=owner_user.get("photo_url")
        ))
        
    # Add other members
    ws_members = ws.get("members", [])
    for member in ws_members:
        member_user = await users_collection.find_one({"_id": ObjectId(member["user_id"])})
        if member_user:
            members.append(WorkspaceMember(
                id=str(member_user["_id"]),
                user_id=str(member_user["_id"]),
                email=member_user.get("email", ""),
                name=member_user.get("name", "Unknown User"),
                role=member.get("role", "Viewer"),
                photo_url=member_user.get("photo_url")
            ))
            
    return members


@router.post("/{workspace_id}/invitations")
async def invite_workspace_member(workspace_id: str, invite: WorkspaceInviteRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    normalized_email = invite.email.strip().lower()
    
    if current_user.get("email", "").lower() == normalized_email:
        raise HTTPException(status_code=400, detail="Cannot invite yourself")
        
    target_user = await users_collection.find_one({"email": normalized_email})
    if target_user:
        target_id = str(target_user["_id"])
        existing_members = ws.get("members", [])
        if any(m["user_id"] == target_id for m in existing_members):
            raise HTTPException(status_code=409, detail="User is already a member of this workspace")
            
    existing_invite = await invitations_collection.find_one({
        "workspace_id": workspace_id,
        "invitee_email": normalized_email,
        "status": "pending"
    })
    if existing_invite:
        raise HTTPException(status_code=409, detail="An invitation is already pending for this user")
        
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(days=7)
    
    invitation = {
        "_id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "workspace_name": ws.get("name", "Workspace"),
        "inviter_id": user_id,
        "inviter_name": current_user.get("name", "A colleague"),
        "invitee_email": normalized_email,
        "role": invite.role,
        "status": "pending",
        "created_at": now.isoformat(),
        "expires_at": expires_at.isoformat()
    }
    
    await invitations_collection.insert_one(invitation)
    
    if target_user:
        await maybe_notify_user(
            user_id=str(target_user["_id"]),
            setting_key="workspace_updates",
            category="workspace",
            priority="normal",
            title="Workspace Invitation",
            message=f"You have been invited to collaborate on {ws.get('name')} by {current_user.get('name', 'a colleague')}.",
            workspace_id=workspace_id,
            reference_id=invitation["_id"]
        )
        
    return {"message": "Invitation sent successfully", "invitation_id": invitation["_id"]}

@router.get("/{workspace_id}/invitations")
async def get_workspace_invitations(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    cursor = invitations_collection.find({
        "workspace_id": workspace_id,
        "status": "pending"
    }).sort("created_at", -1)
    
    invitations = []
    async for inv in cursor:
        inv["id"] = inv.pop("_id")
        invitations.append(inv)
        
    return invitations

@router.delete("/{workspace_id}/invitations/{invitation_id}")
async def revoke_workspace_invitation(workspace_id: str, invitation_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    result = await invitations_collection.delete_one({
        "_id": invitation_id,
        "workspace_id": workspace_id,
        "status": "pending"
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invitation not found or already processed")
        
    return {"message": "Invitation revoked successfully"}


@router.patch("/{workspace_id}/members/{member_id}")
async def update_workspace_member(workspace_id: str, member_id: str, role_update: WorkspaceRoleUpdate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    if member_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot change owner role")
        
    # Update the specific member's role
    result = await workspaces_collection.update_one(
        {"_id": workspace_id, "members.user_id": member_id},
        {"$set": {"members.$.role": role_update.role}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in workspace")
        
    return {"message": "Role updated successfully"}


@router.delete("/{workspace_id}/members/{member_id}")
async def remove_workspace_member(workspace_id: str, member_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found or unauthorized")
        
    if member_id == user_id:
        raise HTTPException(status_code=400, detail="Cannot remove the owner")
        
    result = await workspaces_collection.update_one(
        {"_id": workspace_id},
        {"$pull": {"members": {"user_id": member_id}}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Member not found in workspace")
        
    return {"message": "Member removed successfully"}


@router.post("")
async def create_workspace(workspace: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    user_name = current_user.get("name", "Unknown User")
    
    count = await workspaces_collection.count_documents({"owner_id": user_id})
    
    colors = [
        ("text-blue-700", "bg-blue-100"),
        ("text-emerald-700", "bg-emerald-100"),
        ("text-violet-700", "bg-violet-100"),
        ("text-orange-700", "bg-orange-100"),
        ("text-teal-700", "bg-teal-100"),
        ("text-red-700", "bg-red-100"),
    ]
    color_pair = colors[count % len(colors)]

    new_ws = {
        "_id": str(uuid.uuid4()),
        "owner_id": user_id,
        "name": workspace.name,
        "description": workspace.description or "No description provided.",
        "docs": 0,
        "chats": 0,
        "reports": 0,
        "owner_name": user_name,
        "owner_initial": user_name[0].upper() if user_name else "U",
        "icon": "Building2",
        "iconColor": color_pair[0],
        "iconBg": color_pair[1],
        "created_at": utc_now(),
        "updated_at": utc_now()
    }
    
    await workspaces_collection.insert_one(new_ws)
    await CacheService.invalidate_cache([f"workspaces:user:{user_id}", f"dashboard_stats:{user_id}"])
    return format_workspace(new_ws)


@router.put("/{workspace_id}")
async def rename_workspace(workspace_id: str, workspace: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    update_data = {"name": workspace.name, "updated_at": utc_now()}
    if workspace.description:
        update_data["description"] = workspace.description
        
    await workspaces_collection.update_one(
        {"_id": workspace_id},
        {"$set": update_data}
    )
    
    ws.update(update_data)
    return format_workspace(ws)


@router.post("/{workspace_id}/duplicate")
async def duplicate_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    new_ws = dict(ws)
    new_ws["_id"] = str(uuid.uuid4())
    new_ws["name"] = ws["name"] + " (Copy)"
    new_ws["created_at"] = utc_now()
    new_ws["updated_at"] = utc_now()
    new_ws["docs"] = 0
    new_ws["chats"] = 0
    new_ws["reports"] = 0
    
    await workspaces_collection.insert_one(new_ws)
    return format_workspace(new_ws)


@router.delete("/{workspace_id}")
async def delete_workspace(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    result = await workspaces_collection.delete_one({"_id": workspace_id, "owner_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Also delete associated documents and data
    await documents_collection.delete_many({"workspace_id": workspace_id})
    await metrics_collection.delete_many({"workspace_id": workspace_id})
    await red_flags_collection.delete_many({"workspace_id": workspace_id})
    await agent_logs_collection.delete_many({"workspace_id": workspace_id})
    await CacheService.invalidate_cache([f"workspace:{workspace_id}", f"workspaces:user:{user_id}", f"dashboard_stats:{user_id}"])
    return {"message": "Workspace deleted successfully"}


# ── Documents ─────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/documents")
async def get_workspace_documents(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Get list of documents for a workspace."""
    # Verify ownership
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    cache_key = f"documents:workspace:{workspace_id}"
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        return cached

    docs_cursor = documents_collection.find({"workspace_id": workspace_id}).sort("uploaded_at", -1)
    docs = []
    async for doc in docs_cursor:
        doc["id"] = doc.pop("_id")
        # Format time if present
        if "uploaded_at" in doc and isinstance(doc["uploaded_at"], datetime):
            doc["uploaded_at"] = doc["uploaded_at"].strftime("%b %d, %Y")
        docs.append(doc)
    result = {"documents": docs, "total": len(docs)}
    await CacheService.set_cached_data(cache_key, result, settings.REDIS_DOCUMENT_TTL)
    return result


@router.get("/{workspace_id}/metrics")
async def get_workspace_metrics(workspace_id: str, document_id: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    cache_key = f"metrics:workspace:{workspace_id}"
    if document_id:
        cache_key += f":doc:{document_id}"
        
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        return cached
        
    query = {"workspace_id": workspace_id}
    if document_id:
        query["document_id"] = document_id
        
    metrics = await metrics_collection.find_one(query, sort=[("created_at", -1)])
    if not metrics:
        return {"status": "empty"}
        
    metrics_data = dict(metrics)
    if "_id" in metrics_data:
        metrics_data["id"] = metrics_data.pop("_id")
        
    metrics_data["status"] = "complete"
    
    # Calculate filename
    if document_id:
        doc = await documents_collection.find_one({"_id": document_id})
        if doc:
            metrics_data["filename"] = doc.get("name", "Document")
            if doc.get("status") == "processing":
                metrics_data["status"] = "running"
            elif doc.get("status") == "failed":
                metrics_data["status"] = "failed"
                
    await CacheService.set_cached_data(cache_key, metrics_data, settings.REDIS_METRICS_TTL)
    return metrics_data

@router.get("/{workspace_id}/red-flags")
async def get_workspace_red_flags(workspace_id: str, document_id: Optional[str] = Query(None), current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    cache_key = f"redflags:workspace:{workspace_id}"
    if document_id:
        cache_key += f":doc:{document_id}"
        
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        return cached
        
    query = {"workspace_id": workspace_id}
    if document_id:
        query["document_id"] = document_id
        
    flags_cursor = red_flags_collection.find(query).sort("detected_at", -1)
    flags = []
    async for flag in flags_cursor:
        flag["id"] = flag.pop("_id")
        if "detected_at" in flag and hasattr(flag["detected_at"], "strftime"):
            flag["detected_at"] = flag["detected_at"].strftime("%Y-%m-%d %H:%M:%S UTC")
        flags.append(flag)
        
    status = "complete"
    if not flags:
        if document_id:
            doc = await documents_collection.find_one({"_id": document_id})
            if doc:
                if doc.get("status") == "processing":
                    status = "running"
                elif doc.get("status") == "failed":
                    status = "failed"
                elif doc.get("status") == "ready":
                    status = "complete"
            else:
                status = "empty"
        else:
            status = "complete"
    
    last_analyzed = "Unknown"
    filename = "Workspace Documents"
    if flags:
        last_analyzed = flags[0].get("detected_at", "Unknown")
        
    if document_id:
        doc = await documents_collection.find_one({"_id": document_id})
        if doc:
            filename = doc.get("name", filename)
            
    result = {
        "status": status,
        "total_flags": len(flags),
        "last_analyzed": last_analyzed,
        "flags": flags,
        "filename": filename
    }
    await CacheService.set_cached_data(cache_key, result, settings.REDIS_REDFLAG_TTL)
    return result

async def add_agent_activity(workspace_id: str, document_id: str | None, agent_name: str, agent_type: str, status: str, action: str, details: str = "", metadata: dict | None = None):
    now = datetime.now(timezone.utc)
    duration = "Running"
    if status in ["Complete", "Failed"]:
        running_log = await agent_logs_collection.find_one(
            {
                "workspace_id": workspace_id,
                "document_id": document_id,
                "agent_name": agent_name,
                "action": action,
                "status": "Running"
            },
            sort=[("timestamp", -1)]
        )
        if running_log and "timestamp" in running_log:
            started_at = running_log["timestamp"]
            if started_at.tzinfo is None:
                started_at = started_at.replace(tzinfo=timezone.utc)
            elapsed = (now - started_at).total_seconds()
            duration = f"{elapsed:.1f}s"
        else:
            duration = "Completed" if status == "Complete" else "Failed"

    log_doc = {
        "_id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "document_id": document_id,
        "agent_name": agent_name,
        "agent_type": agent_type,
        "status": status,
        "action": action,
        "details": details,
        "duration": duration,
        "metadata": metadata or {},
        "timestamp": now
    }
    await agent_logs_collection.insert_one(log_doc)

async def init_agent_executions(workspace_id: str, doc_id: str):
    agents_init = [
        {"name": "Document Agent", "type": "document", "action": "Waiting for documents"},
        {"name": "Extraction Agent", "type": "extraction", "action": "Ready to extract"},
        {"name": "Red Flag Agent", "type": "risk", "action": "Ready to analyze"},
        {"name": "Comparison Agent", "type": "comparison", "action": "Ready to compare"},
        {"name": "Research Agent", "type": "research", "action": "Answering queries"},
        {"name": "Report Agent", "type": "report", "action": "Ready to generate"}
    ]
    for a in agents_init:
        await agent_executions_collection.update_one(
            {"workspace_id": workspace_id, "document_id": doc_id, "agent_name": a["name"]},
            {"$setOnInsert": {
                "_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "document_id": doc_id,
                "agent_name": a["name"],
                "agent_type": a["type"],
                "status": "Idle",
                "action": a["action"],
                "details": "",
                "progress": 0,
                "started_at": None,
                "completed_at": None,
                "duration": None,
                "error": None
            }},
            upsert=True
        )

async def update_agent_execution(workspace_id: str, doc_id: str, agent_name: str, status: str, action: str, details: str = "", progress: int = 0, error: str | None = None, metadata: dict | None = None):
    now = datetime.now(timezone.utc)
    update_data: Dict[str, Any] = {
        "status": status,
        "action": action,
        "details": details,
        "progress": progress
    }
    if error:
        update_data["error"] = error

    exec_doc = await agent_executions_collection.find_one({"workspace_id": workspace_id, "document_id": doc_id, "agent_name": agent_name})
    if exec_doc:
        if status == "Running" and exec_doc.get("status") not in ["Running", "Failed", "Complete"]:
            update_data["started_at"] = now
        elif status in ["Complete", "Failed", "Blocked"]:
            update_data["completed_at"] = now
            if exec_doc.get("started_at"):
                started_at = exec_doc["started_at"]
                if started_at.tzinfo is None:
                    started_at = started_at.replace(tzinfo=timezone.utc)
                elapsed = (now - started_at).total_seconds()
                update_data["duration"] = f"{elapsed:.1f}s"
    
    await agent_executions_collection.update_one(
        {"workspace_id": workspace_id, "document_id": doc_id, "agent_name": agent_name},
        {"$set": update_data}
    )
    
    if status == "Running" and exec_doc and exec_doc.get("status") not in ["Running", "Failed", "Complete"]:
        logger.info(f"[Pipeline] {agent_name} started document={doc_id}")
    elif status == "Complete":
        logger.info(f"[Pipeline] {agent_name} completed document={doc_id}")
    elif status == "Failed":
        logger.error(f"[Pipeline] Agent failed\nagent={agent_name}\ndocument={doc_id}\nerror={error or details}")
    
    agent_type = exec_doc["agent_type"] if exec_doc else "document"
    await add_agent_activity(workspace_id, doc_id, agent_name, agent_type, status, action, details, metadata)


async def simulate_document_processing(workspace_id: str, doc_id: str, file_path: str, file_name: str, user_settings: dict | None = None):
    logger.info(f"[Pipeline] Started document={doc_id}")
    try:
        await init_agent_executions(workspace_id, doc_id)
        
        document_success = False
        extraction_success = False
        
        # Step 1: Parsing and Chunking
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 1, "progress": 16, "status": "processing"}})
        user_id = user_settings.get("user_id") if user_settings else None
        
        if user_id:
            await maybe_notify_user(user_id, "agent_started", "agents", "low", "Agent Started", "Document Agent started parsing PDF.", "Document Agent", workspace_id, f"{doc_id}_doc_start")
            
        await update_agent_execution(workspace_id, doc_id, "Document Agent", "Running", "Extracting & Chunking", "Parsing PDF and creating semantic chunks.", 10)
        
        await asyncio.sleep(1) # Yield
        try:
            stats: dict = await asyncio.to_thread(document_agent.process_and_index, file_path, workspace_id, doc_id, file_name)  # type: ignore
            if stats.get('chunks', 0) > 0:
                document_success = True
                await update_agent_execution(workspace_id, doc_id, "Document Agent", "Complete", "Text Chunked", f"Successfully extracted and indexed {stats.get('chunks')} chunks.", 100, metadata=stats)
                if user_id:
                    await maybe_notify_user(user_id, "agent_completed", "agents", "low", "Agent Completed", "Document Agent finished processing.", "Document Agent", workspace_id, f"{doc_id}_doc_comp")
            else:
                await update_agent_execution(workspace_id, doc_id, "Document Agent", "Failed", "No Chunks", "Failed to extract text from document.", 100, metadata=stats)
                if user_id:
                    await maybe_notify_user(user_id, "agent_failed", "agents", "critical", "Agent Failed", "Document Agent failed to extract text.", "Document Agent", workspace_id, f"{doc_id}_doc_fail")
        except Exception as e:
            await update_agent_execution(workspace_id, doc_id, "Document Agent", "Failed", "Chunking Failed", str(e), 100, error=str(e))
            if user_id:
                await maybe_notify_user(user_id, "agent_failed", "agents", "critical", "Agent Failed", f"Document Agent error: {e}", "Document Agent", workspace_id, f"{doc_id}_doc_fail")
            
        # Step 2: Extraction
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 2, "progress": 33}})
        if not document_success:
            await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Blocked", "Dependency Failed", "Waiting for Document Agent to complete successfully.")
        else:
            await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Running", "Extracting Metrics", "Analyzing chunks for financial metrics.", 10)
            try:
                extraction_results: dict = await asyncio.to_thread(extraction_agent.extract, doc_id, user_settings)  # type: ignore
                metrics_found = len(extraction_results.get("key_metrics", []))
                
                if metrics_found > 0:
                    extraction_results["_id"] = str(uuid.uuid4())
                    extraction_results["workspace_id"] = workspace_id
                    extraction_results["document_id"] = doc_id
                    
                    await metrics_collection.delete_many({"workspace_id": workspace_id, "document_id": doc_id})
                    await metrics_collection.insert_one(extraction_results)
                    extraction_success = True
                    await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Complete", "Metrics Extracted", f"Found {metrics_found} metrics.", 100, metadata={"metrics_found": metrics_found})
                else:
                    await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Failed", "No Metrics Found", "Could not extract financial metrics.", 100, metadata={"metrics_found": 0})
            except Exception as e:
                await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Failed", "Extraction Error", str(e), 100, error=str(e))

        # Step 3: Red Flags
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 3, "progress": 50}})
        if not extraction_success:
            await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Blocked", "Dependency Failed", "Waiting for Extraction Agent to complete successfully.")
        else:
            await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Running", "Analyzing Risks", "Scanning chunks for financial risks.", 10)
            try:
                extracted_metrics = await metrics_collection.find_one({"document_id": doc_id})
                risk_data: dict = await asyncio.to_thread(red_flag_agent.analyze, doc_id, extracted_metrics, user_settings)  # type: ignore
                red_flags = risk_data.get("red_flags", [])
                
                await red_flags_collection.delete_many({"workspace_id": workspace_id, "document_id": doc_id})
                for rf in red_flags:
                    rf["_id"] = str(uuid.uuid4())
                    rf["workspace_id"] = workspace_id
                    rf["document_id"] = doc_id
                    rf["detected_at"] = datetime.now(timezone.utc)
                    await red_flags_collection.insert_one(rf)
                    
                    if user_id:
                        severity = rf.get("severity", "Medium").lower()
                        if severity == "high":
                            await maybe_notify_user(user_id, "high_risk_finding", "risk", "critical", "High Risk Finding", f"Red Flag Agent detected high severity anomaly: {rf.get('category', 'Risk')}", "Red Flag Agent", workspace_id, f"{doc_id}_rf_high_{rf['_id']}")
                        else:
                            await maybe_notify_user(user_id, "risk_anomalies", "risk", "important", "Risk Anomaly", f"Red Flag Agent detected anomaly: {rf.get('category', 'Risk')}", "Red Flag Agent", workspace_id, f"{doc_id}_rf_{rf['_id']}")
                    
                await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Complete", "Risk Analysis Complete", f"Identified {len(red_flags)} risks.", 100, metadata={"risks_found": len(red_flags)})
            except Exception as e:
                await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Failed", "Analysis Error", str(e), 100, error=str(e))
                if user_id:
                    await maybe_notify_user(user_id, "agent_failed", "agents", "critical", "Agent Failed", f"Red Flag Agent error: {e}", "Red Flag Agent", workspace_id, f"{doc_id}_rf_fail")

        # Step 4: Comparison
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 4, "progress": 66}})
        ready_docs_count = await documents_collection.count_documents({"workspace_id": workspace_id, "status": "ready"})
        total_valid_docs = ready_docs_count + (1 if extraction_success else 0)
        
        if not extraction_success:
            await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Blocked", "Dependency Failed", "Waiting for Extraction Agent to complete successfully.")
        elif total_valid_docs < 2:
            await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Blocked", "Waiting for more documents", "Requires at least 2 processed documents for comparison.")
        else:
            await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Running", "Updating Baselines", "Generating comparative analysis.", 10)
            await asyncio.sleep(1.0)
            await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Complete", "Comparison Generated", "Baselines updated.", 100, metadata={"competitors": total_valid_docs})
            await agent_executions_collection.update_many(
                {"workspace_id": workspace_id, "agent_name": "Comparison Agent", "status": "Blocked"},
                {"$set": {
                    "status": "Complete",
                    "action": "Comparison Generated",
                    "details": "Baselines updated.",
                    "progress": 100,
                    "completed_at": datetime.now(timezone.utc)
                }}
            )

        # Step 5: Research
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 5, "progress": 83}})
        if not document_success:
            await update_agent_execution(workspace_id, doc_id, "Research Agent", "Blocked", "Dependency Failed", "Waiting for Document Agent to complete successfully.")
        else:
            await update_agent_execution(workspace_id, doc_id, "Research Agent", "Running", "Indexing Context", "Preparing answers database.", 10)
            await asyncio.sleep(1)
            await update_agent_execution(workspace_id, doc_id, "Research Agent", "Complete", "Context Indexed", "Ready for Q&A.", 100)

        # Step 6: Report
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 6, "progress": 100}})
        if not extraction_success:
            await update_agent_execution(workspace_id, doc_id, "Report Agent", "Blocked", "Dependency Failed", "Waiting for Extraction Agent to complete successfully.")
        else:
            await update_agent_execution(workspace_id, doc_id, "Report Agent", "Running", "Preparing Templates", "Building report structure.", 10)
            await asyncio.sleep(1)
            await update_agent_execution(workspace_id, doc_id, "Report Agent", "Idle", "Templates Ready", "Ready to generate reports.", 0)

        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)

        final_status = "ready" if (document_success and extraction_success) else "failed"
        update_doc = {"status": final_status}
        if final_status == "failed":
            update_doc["error_message"] = "Pipeline failed at extraction or risk step"
            
        await documents_collection.update_one({"_id": doc_id}, {"$set": update_doc})
        
        if user_id:
            if final_status == "ready":
                await maybe_notify_user(user_id, "pipeline_completed", "agents", "important", "Analysis Pipeline Completed", f"Successfully analyzed document: {file_name}", None, workspace_id, f"{doc_id}_pipeline_success")
                await maybe_notify_user(user_id, "document_processed", "documents", "low", "Document Processed", f"{file_name} is ready for Q&A and reports.", None, workspace_id, f"{doc_id}_processed")
            else:
                await maybe_notify_user(user_id, "agent_failed", "agents", "critical", "Pipeline Failed", f"Failed to complete pipeline for: {file_name}", None, workspace_id, f"{doc_id}_pipeline_fail")
        
        logger.info(f"[Pipeline] Completed document={doc_id}")
        
    except Exception as e:
        traceback.print_exc()
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "failed", "progress": 100, "error_message": str(e)}})
        await update_agent_execution(workspace_id, doc_id, "Document Agent", "Failed", "Pipeline Failed", str(e), 100, error=str(e))

@router.post("/{workspace_id}/documents")
async def upload_document(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload one or more PDF documents to a workspace."""
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    uploaded = []
    os.makedirs("uploads", exist_ok=True)
    
    for file in files:
        filename = file.filename or "unnamed.pdf"
        if not filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"Only PDF files are supported. Got: {filename}"
            )

        doc_id = str(uuid.uuid4())
        file_path = f"uploads/{doc_id}_{filename}"
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            content = await file.read()
            await out_file.write(content)

        lower_name = filename.lower()
        pdf_type = "Annual Report" if "annual" in lower_name else "Financial Statement"
        if "notice" in lower_name:
            pdf_type = "Notice"
        elif "quarter" in lower_name or "q1" in lower_name:
            pdf_type = "Quarterly Results"
            
        new_doc = {
            "_id": doc_id,
            "workspace_id": workspace_id,
            "name": filename,
            "size_bytes": len(content),
            "status": "processing",
            "processing_step": 1,
            "progress": 0,
            "pdf_type": pdf_type,
            "pages": max(1, len(content) // 3000),
            "uploaded_at": datetime.now(timezone.utc)
        }
        await documents_collection.insert_one(new_doc)
        
        # Replace _id with id for frontend
        ret_doc = new_doc.copy()
        ret_doc["id"] = ret_doc.pop("_id")
        uploaded.append(ret_doc)
        
        # Queue processing task
        user_settings = await get_user_settings(user_id)
        background_tasks.add_task(simulate_document_processing, workspace_id, doc_id, file_path, filename, user_settings)
        
        # Update workspace docs count
        await workspaces_collection.update_one(
            {"_id": workspace_id}, 
            {"$inc": {"docs": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
    await CacheService.invalidate_cache([f"documents:workspace:{workspace_id}", f"workspace:{workspace_id}", f"workspaces:user:{user_id}", f"dashboard_stats:{user_id}"])
    return {"uploaded": uploaded, "workspace_id": workspace_id}


@router.delete("/{workspace_id}/documents/{document_id}")
async def delete_document(workspace_id: str, document_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a specific document from a workspace."""
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    try:
        obj_id = ObjectId(document_id)
    except Exception:
        obj_id = None
        
    query: Dict[str, Any] = {
        "workspace_id": workspace_id,
        "$or": [{"_id": document_id}]
    }
    if obj_id:
        query["$or"].append({"_id": obj_id})

    res = await documents_collection.delete_one(query)
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
        
    await workspaces_collection.update_one(
        {"_id": workspace_id},
        {"$inc": {"docs": -1}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    # Clean up associated metrics, red flags, and logs
    await metrics_collection.delete_many({"document_id": document_id})
    await red_flags_collection.delete_many({"document_id": document_id})
    await agent_logs_collection.delete_many({"document_id": document_id})
    await CacheService.invalidate_cache([
        f"documents:workspace:{workspace_id}",
        f"metrics:workspace:{workspace_id}",
        f"redflags:workspace:{workspace_id}",
        f"workspace:{workspace_id}",
        f"workspaces:user:{user_id}",
        f"dashboard_stats:{user_id}"
    ])
    
    return {"message": "Document deleted successfully"}


# ── Agents ────────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/agents")
async def get_workspace_agents(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    cache_key = f"agents:workspace:{workspace_id}"
    cached = await CacheService.get_cached_data(cache_key)
    if cached:
        return cached
        
    latest_doc = await documents_collection.find_one(
        {"workspace_id": workspace_id},
        sort=[("uploaded_at", -1), ("_id", -1)]
    )
    if not latest_doc:
        latest_doc = await documents_collection.find_one(
            {"workspace_id": workspace_id},
            sort=[("created_at", -1), ("_id", -1)]
        )
        
    logs = []
    agents = []
    if latest_doc:
        doc_id = str(latest_doc["_id"])
        
        exec_cursor = agent_executions_collection.find({"workspace_id": workspace_id, "document_id": doc_id})
        agent_docs = await exec_cursor.to_list(length=10)
        
        order = ["Document Agent", "Extraction Agent", "Red Flag Agent", "Comparison Agent", "Research Agent", "Report Agent"]
        agent_docs.sort(key=lambda x: order.index(x["agent_name"]) if x["agent_name"] in order else 99)
        
        has_comparison = await comparison_cache_collection.find_one({"_id": {"$regex": f"^{workspace_id}_"}})
        has_complete_comp = await agent_executions_collection.find_one({
            "workspace_id": workspace_id,
            "agent_name": "Comparison Agent",
            "status": "Complete"
        })
        has_report = await reports_collection.find_one({"workspace_id": workspace_id, "status": "completed"})

        for i, ad in enumerate(agent_docs):
            status = ad["status"]
            details = ad["action"] or ad["details"]
            progress = ad.get("progress", 0)

            if ad["agent_name"] == "Comparison Agent" and (has_comparison or has_complete_comp):
                status = "Complete"
                details = details if status == "Complete" else "Comparison Generated"
                progress = 100

            if ad["agent_name"] == "Report Agent" and has_report:
                status = "Complete"
                details = details if status == "Complete" else "Report Generated"
                progress = 100

            agents.append({
                "id": i + 1,
                "name": ad["agent_name"],
                "status": status,
                "details": details,
                "progress": progress,
                "duration": ad.get("duration", None)
            })
            
        log_cursor = agent_logs_collection.find({"workspace_id": workspace_id, "document_id": doc_id}).sort("timestamp", -1).limit(50)
        async for log in log_cursor:
            log["id"] = log.pop("_id")
            log["agent"] = log.pop("agent_name", "Unknown Agent")
            if "timestamp" in log and isinstance(log["timestamp"], datetime):
                log["timestamp"] = log["timestamp"].strftime("%I:%M:%S %p")
            logs.append(log) 
            
    if not agents:
        agents = [
            {"id": 1, "name": "Document Agent", "status": "Idle", "details": "Waiting for documents"},
            {"id": 2, "name": "Extraction Agent", "status": "Idle", "details": "Ready to extract"},
            {"id": 3, "name": "Red Flag Agent", "status": "Idle", "details": "Ready to analyze"},
            {"id": 4, "name": "Comparison Agent", "status": "Idle", "details": "Ready to compare"},
            {"id": 5, "name": "Research Agent", "status": "Idle", "details": "Answering queries"},
            {"id": 6, "name": "Report Agent", "status": "Idle", "details": "Ready to generate"}
        ]
        
    result = {
        "pipeline_status": latest_doc.get("status", "idle") if latest_doc else "idle",
        "document_id": str(latest_doc["_id"]) if latest_doc else None,
        "document_name": latest_doc.get("file_name") if latest_doc else None,
        "agents": agents,
        "timeline": logs
    }
    
    await CacheService.set_cached_data(cache_key, result, settings.REDIS_AGENT_ACTIVITY_TTL)
    return result

@router.post("/{workspace_id}/agents/{agent_id}/retry")
async def retry_agent(workspace_id: str, agent_id: int, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    # Find the latest document that failed or is processing
    doc = await documents_collection.find_one(
        {"workspace_id": workspace_id},
        sort=[("created_at", -1)]
    )
    if not doc:
        raise HTTPException(status_code=404, detail="No document found to retry")

    # For now, we simply re-trigger the entire orchestrator pipeline for that document
    # since simulate_document_processing is idempotent if it fails and leaves temp files.
    # Actually, the file might have been deleted in cleanup.
    # If the file is gone, we can't easily re-run simulate_document_processing without the file.
    # Wait! Extraction agent doesn't need the file! It only needs the chunks from ChromaDB!
    # So we don't need the original file for extraction. We can just run the rest of the pipeline.
    
    async def resume_pipeline(doc_id: str, user_settings: dict):
        try:
            extraction_success = False
            # Re-run extraction
            if agent_id == 2 or agent_id == 3 or agent_id > 3: # 2 = Extraction, 3 = Red Flag
                await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "processing"}})
                await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Running", "Retrying Extraction", "Retrying metrics extraction...", 10)
                try:
                    extraction_results: dict = await asyncio.to_thread(extraction_agent.extract, doc_id, user_settings)
                    metrics_found = len(extraction_results.get("key_metrics", []))
                    if metrics_found > 0:
                        extraction_results["_id"] = str(uuid.uuid4())
                        extraction_results["workspace_id"] = workspace_id
                        extraction_results["document_id"] = doc_id
                        
                        await metrics_collection.delete_many({"workspace_id": workspace_id, "document_id": doc_id})
                        await metrics_collection.insert_one(extraction_results)
                        extraction_success = True
                        await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Complete", "Metrics Extracted", f"Found {metrics_found} metrics.", 100, metadata={"metrics_found": metrics_found})
                    else:
                        await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Failed", "No Metrics Found", "Could not extract financial metrics.", 100, metadata={"metrics_found": 0})
                        await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "failed"}})
                except Exception as e:
                    await update_agent_execution(workspace_id, doc_id, "Extraction Agent", "Failed", "Extraction Error", str(e), 100, error=str(e))
                    await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "failed"}})
            
            # Re-run Red Flags
            if extraction_success:
                await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Running", "Analyzing Risks", "Scanning chunks for financial risks.", 10)
                try:
                    extracted_metrics = await metrics_collection.find_one({"document_id": doc_id}) or {}
                    risk_data: dict = await asyncio.to_thread(red_flag_agent.analyze, doc_id, extracted_metrics, user_settings)
                    red_flags = risk_data.get("red_flags", [])
                    
                    await red_flags_collection.delete_many({"workspace_id": workspace_id, "document_id": doc_id})
                    
                    for rf in red_flags:
                        rf["_id"] = str(uuid.uuid4())
                        rf["workspace_id"] = workspace_id
                        rf["document_id"] = doc_id
                        await red_flags_collection.insert_one(rf)
                        
                    await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Complete", "Risk Analysis Complete", f"Identified {len(red_flags)} risks.", 100, metadata={"risks_found": len(red_flags)})
                except Exception as e:
                    await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Failed", "Analysis Error", str(e), 100, error=str(e))

                # Trigger downstreams
                ready_docs_count = await documents_collection.count_documents({"workspace_id": workspace_id, "status": "ready"})
                total_valid_docs = ready_docs_count + 1  # Including current doc
                
                if total_valid_docs < 2:
                    await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Blocked", "Waiting for more documents", "Requires at least 2 processed documents for comparison.")
                else:
                    await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Running", "Updating Baselines", "Generating comparative analysis.", 10)
                    await asyncio.sleep(1.0)
                    await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Complete", "Comparison Generated", "Baselines updated.", 100, metadata={"competitors": total_valid_docs})
                    
                await update_agent_execution(workspace_id, doc_id, "Report Agent", "Idle", "Templates Ready", "Ready to generate reports.", 0)
                await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "ready"}})
            else:
                await update_agent_execution(workspace_id, doc_id, "Red Flag Agent", "Blocked", "Dependency Failed", "Waiting for Extraction Agent to complete successfully.")
                await update_agent_execution(workspace_id, doc_id, "Comparison Agent", "Blocked", "Dependency Failed", "Waiting for Extraction Agent to complete successfully.")
                await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "failed", "error_message": "Pipeline failed at extraction or risk step"}})

        except Exception as e:
            print("Retry pipeline failed:", e)
            await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "failed", "error_message": str(e)}})

    user_settings = await get_user_settings(user_id)
    background_tasks.add_task(resume_pipeline, doc["_id"], user_settings)
    return {"message": "Retry triggered successfully"}

@router.get("/{workspace_id}/agent-activity")
async def get_workspace_agent_activity(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    doc = await documents_collection.find_one(
        {"workspace_id": workspace_id},
        sort=[("created_at", -1)]
    )
    
    if not doc:
        return {"timeline": []}
        
    doc_id = str(doc["_id"])
    cursor = agent_logs_collection.find({"workspace_id": workspace_id, "document_id": doc_id}).sort("timestamp", -1).limit(20)
    logs = []
    async for log in cursor:
        log["id"] = log.pop("_id")
        log["agent"] = log.pop("agent_name", "Unknown Agent")
        log["metadata"] = log.get("metadata", {})
        log["details"] = log.get("details", "")
        
        if "timestamp" in log and isinstance(log["timestamp"], datetime):
            log["timestamp"] = to_iso_utc(log["timestamp"])
        logs.append(log)
        
    return {"timeline": logs}


# ── Chat ──────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str

@router.post("/{workspace_id}/chat")
async def chat_with_workspace(
    workspace_id: str, 
    message: Optional[str] = Form(None),
    chat_json: Optional[ChatMessage] = None,
    session_id: Optional[str] = Form(None),
    files: Optional[List[UploadFile]] = File(None),
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    actual_message = message if message is not None else (chat_json.message if chat_json else "")
    
    # Session handling
    from ...database.mongo_client import chat_sessions_collection, messages_collection
    
    if not session_id:
        session_id = str(uuid.uuid4())
        await chat_sessions_collection.insert_one({
            "_id": session_id,
            "workspace_id": workspace_id,
            "owner_id": user_id,
            "title": actual_message[:50] + "..." if len(actual_message) > 50 else actual_message,
            "message_count": 0,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        })
    else:
        # Verify session exists
        sess = await chat_sessions_collection.find_one({"_id": session_id, "owner_id": user_id})
        if not sess:
            raise HTTPException(status_code=404, detail="Chat session not found")
            
    # File handling
    attachments_info = []
    file_ack = ""
    image_contents = []
    if files and len(files) > 0:
        file_names = ", ".join([f.filename or "unnamed" for f in files])
        file_ack = f"I've received your attachments: {file_names}. \n\n"
        attachments_info = [{"name": f.filename or "unnamed", "type": f.content_type or "application/octet-stream"} for f in files]
        
        # Process images
        for f in files:
            if f.content_type and f.content_type.startswith("image/"):
                import base64
                image_bytes = await f.read()
                b64 = base64.b64encode(image_bytes).decode('utf-8')
                image_contents.append({
                    "type": "image_url",
                    "image_url": {"url": f"data:{f.content_type};base64,{b64}"}
                })
        
        if image_contents:
            try:
                import os
                from langchain_core.messages import HumanMessage
                from ...llm import get_llm_router
                msg_content = [{"type": "text", "text": "Describe this image in detail so a text-based AI can answer questions about it. User query: " + actual_message}] + image_contents
                router = get_llm_router()
                vision_res = await asyncio.to_thread(router.invoke, "vision", [HumanMessage(content=msg_content)]) # type: ignore
                actual_message = f"User attached an image. Image description: {vision_res.content}\n\nUser query: {actual_message}"
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Vision processing error: {e}")

    # Save user message
    user_msg_id = str(uuid.uuid4())
    await messages_collection.insert_one({
        "_id": user_msg_id,
        "session_id": session_id,
        "role": "user",
        "content": actual_message,
        "attachments": attachments_info,
        "timestamp": datetime.now(timezone.utc)
    })
    
    await workspaces_collection.update_one({"_id": workspace_id}, {"$inc": {"chats": 1}})

    try:
        # Log agent activity
        await agent_logs_collection.insert_one({
            "_id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "document_id": "",
            "agent_name": "Research Agent",
            "agent_type": "Q&A",
            "status": "Running",
            "action": "Answering Query",
            "details": f"Analyzing query: '{actual_message[:50]}...'",
            "duration": "Running",
            "metadata": {},
            "timestamp": datetime.now(timezone.utc)
        })

        if research_agent:
            user_settings = await get_user_settings(str(current_user["_id"]))
            res_json = await asyncio.to_thread(research_agent.analyze, actual_message, workspace_id, user_settings)
            res = json.loads(res_json)

            reply_text = res.get("analysis", "")
            
            if res.get("comparison"):
                reply_text += "\n\n**Comparison**\n" + res.get("comparison")
            if res.get("insights"):
                reply_text += "\n\n**Key Insights**\n"
                for ins in res.get("insights"):
                    reply_text += f"- {ins}\n"
            
            if not reply_text:
                reply_text = "I couldn't find a detailed answer, but I've reviewed the documents."

            reply = file_ack + reply_text
            raw_citations = res.get("citations", [])
            citations = [{"doc": c.get("document", "Unknown"), "page": c.get("page", 1), "field": c.get("field", "Data")} for c in raw_citations]
            
            await agent_logs_collection.insert_one({
                "_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "document_id": "",
                "agent_name": "Research Agent",
                "agent_type": "Q&A",
                "status": "Complete",
                "action": "Answered Query",
                "details": f"Successfully generated answer with {len(citations)} citations.",
                "duration": "Completed",
                "metadata": {},
                "timestamp": datetime.now(timezone.utc)
            })

        else:
            reply = file_ack + "Research agent is currently unavailable."
            citations = []
            
            await agent_logs_collection.insert_one({
                "_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "document_id": "",
                "agent_name": "Research Agent",
                "agent_type": "Q&A",
                "status": "Failed",
                "action": "Answered Query",
                "details": "Agent unavailable",
                "duration": "Failed",
                "metadata": {},
                "timestamp": datetime.now(timezone.utc)
            })

    except Exception as e:
        reply = file_ack + f"Sorry, I encountered an error while analyzing: {e}"
        citations = []
        
        await agent_logs_collection.insert_one({
            "_id": str(uuid.uuid4()),
            "workspace_id": workspace_id,
            "document_id": "",
            "agent_name": "Research Agent",
            "agent_type": "Q&A",
            "status": "Failed",
            "action": "Answered Query",
            "details": str(e),
            "duration": "Failed",
            "metadata": {},
            "timestamp": datetime.now(timezone.utc)
        })

    # Save assistant message
    assistant_msg_id = str(uuid.uuid4())
    await messages_collection.insert_one({
        "_id": assistant_msg_id,
        "session_id": session_id,
        "role": "assistant",
        "content": reply,
        "citations": citations,
        "timestamp": datetime.now(timezone.utc)
    })
    
    await chat_sessions_collection.update_one(
        {"_id": session_id},
        {
            "$inc": {"message_count": 2},
            "$set": {"updated_at": datetime.now(timezone.utc)}
        }
    )

    return {
        "reply": reply, 
        "citations": citations, 
        "session_id": session_id
    }

@router.get("/{workspace_id}/chat_sessions")
async def get_chat_sessions(
    workspace_id: str,
    current_user: dict = Depends(get_current_user)
):
    from ...database.mongo_client import chat_sessions_collection
    user_id = str(current_user["_id"])
    cursor = chat_sessions_collection.find({"workspace_id": workspace_id, "owner_id": user_id}).sort("updated_at", -1)
    sessions = await cursor.to_list(length=100)
    return {"sessions": sessions}

@router.get("/{workspace_id}/chat_sessions/{session_id}")
async def get_chat_session_messages(
    workspace_id: str,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    from ...database.mongo_client import chat_sessions_collection, messages_collection
    user_id = str(current_user["_id"])
    sess = await chat_sessions_collection.find_one({"_id": session_id, "workspace_id": workspace_id, "owner_id": user_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    cursor = messages_collection.find({"session_id": session_id}).sort("timestamp", 1)
    messages = await cursor.to_list(length=500)
    return {"messages": messages}

class ChatSessionUpdate(BaseModel):
    title: Optional[str] = None
    is_pinned: Optional[bool] = None

@router.put("/{workspace_id}/chat_sessions/{session_id}")
async def update_chat_session(
    workspace_id: str,
    session_id: str,
    update_data: ChatSessionUpdate,
    current_user: dict = Depends(get_current_user)
):
    from ...database.mongo_client import chat_sessions_collection
    user_id = str(current_user["_id"])
    
    # Check if session exists and belongs to the user
    sess = await chat_sessions_collection.find_one({"_id": session_id, "workspace_id": workspace_id, "owner_id": user_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    update_fields: Dict[str, Any] = {"updated_at": datetime.now(timezone.utc)}
    
    if update_data.title is not None:
        update_fields["title"] = update_data.title[:100]
        
    if update_data.is_pinned is not None:
        update_fields["is_pinned"] = update_data.is_pinned

    await chat_sessions_collection.update_one(
        {"_id": session_id},
        {"$set": update_fields}
    )
    
    return {"status": "success", "message": "Chat session renamed"}

@router.delete("/{workspace_id}/chat_sessions/{session_id}")
async def delete_chat_session(
    workspace_id: str,
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    from ...database.mongo_client import chat_sessions_collection, messages_collection
    user_id = str(current_user["_id"])
    
    # Check if session exists and belongs to the user
    sess = await chat_sessions_collection.find_one({"_id": session_id, "workspace_id": workspace_id, "owner_id": user_id})
    if not sess:
        raise HTTPException(status_code=404, detail="Chat session not found")
        
    # Delete the session
    await chat_sessions_collection.delete_one({"_id": session_id})
    
    # Delete all messages associated with the session
    await messages_collection.delete_many({"session_id": session_id})
    
    # Decrement workspace chat count (optional, but keeps stats accurate)
    await workspaces_collection.update_one({"_id": workspace_id}, {"$inc": {"chats": -1}})
    
    return {"status": "success", "message": "Chat session deleted"}


# ── Metrics ───────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/metrics")
async def get_workspace_metrics(
    workspace_id: str, 
    document_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    target_doc = None
    if document_id:
        target_doc = await documents_collection.find_one({"_id": document_id, "workspace_id": workspace_id})
        if not target_doc:
            raise HTTPException(status_code=400, detail="Requested document not found in this workspace")
    else:
        # Fallback to the latest ready document
        cursor = documents_collection.find({"workspace_id": workspace_id, "status": "ready"}).sort("created_at", -1).limit(1)
        async for doc in cursor:
            target_doc = doc
            break
            
    if not target_doc:
        return {"status": "empty", "key_metrics": []}
        
    doc_id = str(target_doc["_id"])
    
    latest_metrics = await metrics_collection.find_one(
        {"workspace_id": workspace_id, "document_id": doc_id},
        sort=[("_id", -1)]
    )
    
    if latest_metrics:
        latest_metrics.pop("_id", None)
        latest_metrics.pop("workspace_id", None)
        latest_metrics.pop("document_id", None)
        latest_metrics["status"] = "complete"
        # Return filename and company_name so the frontend has them if needed
        latest_metrics["filename"] = target_doc.get("name")
        return latest_metrics
        
    # Check extraction agent status for the specific document
    extraction_log = await agent_logs_collection.find_one(
        {"workspace_id": workspace_id, "document_id": doc_id, "agent_name": "Extraction Agent"},
        sort=[("timestamp", -1)]
    )
    
    # If the document is not ready and no extraction logs found, use the document status
    agent_status = extraction_log.get("status") if extraction_log else None
    if not agent_status:
        if target_doc.get("status") == "processing":
            agent_status = "Running"
        elif target_doc.get("status") == "failed":
            agent_status = "Failed"
        else:
            agent_status = "Pending"
    
    if agent_status == "Running":
        return {"status": "running"}
    elif agent_status == "Failed":
        return {"status": "failed"}
    
    return {"status": "empty", "key_metrics": []}


# ── Reports ───────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/reports")
async def get_workspace_reports(workspace_id: str, current_user: dict = Depends(get_current_user)):
    """Get all reports for a specific workspace."""
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    cursor = reports_collection.find({"workspace_id": workspace_id}).sort("created_at", -1)
    all_reports: List[Dict[str, Any]] = []
    total_versions = 0

    async for report in cursor:
        report_data = dict(report)
        report_data["id"] = report_data.pop("_id")

        if "workspace_name" not in report_data:
            report_data["workspace_name"] = ws.get("name", "Unknown Workspace")

        if "created_at" in report_data and hasattr(report_data["created_at"], "strftime"):
            report_data["created_at"] = report_data["created_at"].strftime("%b %d, %Y %I:%M %p")

        # Ensure versions list exists
        if "versions" not in report_data:
            report_data["versions"] = [{
                "id": report_data["id"],
                "version": "v1.0",
                "is_latest": True,
                "description": report_data.get("summary", "Initial version"),
                "generated_by": "AI Agent",
                "created_at": report_data.get("created_at", "Just now")
            }]

        all_reports.append(report_data)
        total_versions += len(report_data.get("versions", []))

    return {
        "reports": all_reports,
        "metrics": {
            "total_reports": len(all_reports),
            "total_versions": total_versions,
            "storage_used": f"{len(all_reports) * 1.5:.1f} MB" if all_reports else "0 MB"
        }
    }

# ── Red Flags ─────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/red-flags")
async def get_workspace_red_flags(
    workspace_id: str, 
    document_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    target_doc = None
    if document_id:
        target_doc = await documents_collection.find_one({"_id": document_id, "workspace_id": workspace_id})
        if not target_doc:
            raise HTTPException(status_code=400, detail="Requested document not found in this workspace")
    else:
        cursor = documents_collection.find({"workspace_id": workspace_id, "status": "ready"}).sort("created_at", -1).limit(1)
        async for doc in cursor:
            target_doc = doc
            break
        
    if not target_doc:
        return {"status": "empty", "total_flags": 0, "last_analyzed": "Not analyzed", "flags": []}
        
    doc_id = str(target_doc["_id"])
    
    # Check Red Flag agent status
    red_flag_log = await agent_logs_collection.find_one(
        {"workspace_id": workspace_id, "document_id": doc_id, "agent_name": "Red Flag Agent"},
        sort=[("timestamp", -1)]
    )
    
    agent_status = red_flag_log.get("status").lower() if red_flag_log else "pending"

    cursor = red_flags_collection.find({"workspace_id": workspace_id, "document_id": doc_id})
    flags = []
    async for rf in cursor:
        rf["id"] = rf.pop("_id")
        if "detected_at" not in rf:
            rf["detected_at"] = "Unknown"
        elif hasattr(rf["detected_at"], "isoformat"):
            rf["detected_at"] = rf["detected_at"].isoformat()
        flags.append(rf)

    return {
        "workspace_id": workspace_id,
        "status": agent_status,
        "total_flags": len(flags),
        "last_analyzed": "Just now" if flags else "Not analyzed",
        "flags": flags,
        "filename": target_doc.get("name"),
        "company": target_doc.get("company_name")
    }


# ── Comparison ────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/comparison")
async def get_workspace_comparison(
    workspace_id: str, 
    doc_ids: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    if not doc_ids:
        raise HTTPException(status_code=400, detail="Please select at least two documents to compare.")
        
    ids_list = [did.strip() for did in doc_ids.split(",") if did.strip()]
    if len(ids_list) < 2:
        raise HTTPException(status_code=400, detail="Please select at least two documents to compare.")

    # Fetch all requested documents to validate their presence and status
    query: Dict[str, Any] = {
        "workspace_id": workspace_id, 
        "_id": {"$in": ids_list}
    }
            
    cursor = documents_collection.find(query)
    docs = []
    async for d in cursor:
        docs.append(d)
        
    fetched_ids = {str(d["_id"]) for d in docs}
    
    missing_ids = set(ids_list) - fetched_ids
    if missing_ids:
        raise HTTPException(status_code=400, detail=f"Selected documents not found in this workspace: {', '.join(missing_ids)}")
        
    not_ready = [d for d in docs if d.get("status") != "ready"]
    if not_ready:
        reasons = [f"'{d.get('name', d.get('_id'))}' is {d.get('status', 'not ready')}" for d in not_ready]
        raise HTTPException(status_code=400, detail=f"Some documents are not ready for comparison: {', '.join(reasons)}")
        
    # Check Comparison Agent status from logs if it actually ran
    comp_log = await agent_logs_collection.find_one(
        {"workspace_id": workspace_id, "agent_name": "Comparison Agent"},
        sort=[("timestamp", -1)]
    )
    
    agent_status = comp_log.get("status").lower() if comp_log else "pending"
    
    companies_data = []
    
    for doc in docs:
        doc_name = doc.get("name", "Unknown Company")
        if doc_name.lower().endswith(".pdf"):
            doc_name = doc_name[:-4]
            
        metrics_cursor = metrics_collection.find({"document_id": doc.get("_id")})
        doc_metrics: Dict[str, Any] = {"company_name": doc_name}
        
        async for extraction_obj in metrics_cursor:
            # Use the company name from extraction if available (more accurate than filename)
            extracted_company = extraction_obj.get("company")
            if extracted_company and extracted_company.strip():
                doc_metrics["company_name"] = extracted_company.strip()
            
            # Use the period if available
            extracted_period = extraction_obj.get("period")
            if extracted_period:
                doc_metrics["financial_year"] = extracted_period
            
            # --- Map key_metrics labels to ComparisonAgent field names ---
            # The ExtractionAgent returns labels like "Revenue", "Net Profit", "EPS", etc.
            # We need a comprehensive mapping to cover all possible labels.
            LABEL_TO_KEY = {
                # Revenue
                "revenue": "revenue",
                "total revenue": "revenue",
                "revenue from operations": "revenue",
                "sales": "revenue",
                "revenue growth": "revenue_growth",
                # Profits
                "gross profit": "gross_profit",
                "operating profit": "operating_profit",
                "profit from operations": "operating_profit",
                "ebitda": "ebitda",
                "ebit": "ebit",
                "profit before tax": "profit_before_tax",
                "pbt": "profit_before_tax",
                "net profit": "net_profit",
                "profit after tax": "net_profit",
                "pat": "net_profit",
                "net income": "net_profit",
                # Expenses
                "expenses": "expenses",
                "total expenses": "expenses",
                "operating expenses": "expenses",
                # Per share
                "eps": "financial_ratios.eps",
                "earnings per share": "financial_ratios.eps",
                # Cash flows
                "free cash flow": "operating_cash_flow",
                "operating cash flow": "operating_cash_flow",
                "cash flow from operations": "operating_cash_flow",
                "investing cash flow": "investing_cash_flow",
                "cash flow from investing": "investing_cash_flow",
                "financing cash flow": "financing_cash_flow",
                "cash flow from financing": "financing_cash_flow",
                # Balance sheet
                "total assets": "assets",
                "assets": "assets",
                "total liabilities": "liabilities",
                "liabilities": "liabilities",
                # Margins & ratios
                "profit margin": "financial_ratios.net_margin",
                "net profit margin": "financial_ratios.net_margin",
                "net margin": "financial_ratios.net_margin",
                "operating margin": "financial_ratios.operating_margin",
                "ebitda margin": "financial_ratios.ebitda_margin",
                "ebit margin": "financial_ratios.operating_margin",
                "roe": "financial_ratios.roe",
                "return on equity": "financial_ratios.roe",
                "roa": "financial_ratios.roa",
                "return on assets": "financial_ratios.roa",
                "roce": "financial_ratios.roce",
                "return on capital employed": "financial_ratios.roce",
                "current ratio": "financial_ratios.current_ratio",
                "debt to equity": "financial_ratios.debt_to_equity_ratio",
                "debt to equity ratio": "financial_ratios.debt_to_equity_ratio",
                "debt/equity": "financial_ratios.debt_to_equity_ratio",
                # Deal wins / other (pass through as-is for context)
                "deal wins": "deal_wins",
            }
            
            for m in extraction_obj.get("key_metrics", []):
                label = m.get("label", "").strip()
                val_str = str(m.get("value", ""))
                if not val_str or val_str == "None" or val_str == "null":
                    continue
                
                label_lower = label.lower()
                mapped_key = LABEL_TO_KEY.get(label_lower)
                
                # Fuzzy fallback: try substring matching
                if not mapped_key:
                    for lbl, k in LABEL_TO_KEY.items():
                        if lbl in label_lower or label_lower in lbl:
                            mapped_key = k
                            break
                
                if mapped_key:
                    if mapped_key.startswith("financial_ratios."):
                        # Store in the ratios sub-dict
                        ratio_key = mapped_key.split(".", 1)[1]
                        doc_metrics.setdefault("financial_ratios", {})[ratio_key] = val_str
                    else:
                        doc_metrics[mapped_key] = val_str
            
            # --- Also read quarterly_trend, revenue_breakdown etc. for richer context ---
            # (ComparisonAgent doesn't use these yet, but they don't hurt)
            
        if len(doc_metrics) <= 1:
            raise HTTPException(status_code=400, detail=f"'{doc_name}' exists but financial metrics are not available yet.")
            
        companies_data.append(doc_metrics)
        
    if not companies_data:
        # Fallback if no docs are ready
        return {
            "companies_compared": [],
            "financial_metrics": [],
            "benchmark_results": {},
            "comparison_analysis": {},
            "insights": ["No documents found to compare."]
        }
    # Cache logic: Create a unique cache key based on workspace_id and sorted document _ids.
    # This prevents running LLM repeatedly for the exact same documents.
    doc_ids_sorted = sorted([str(d["_id"]) for d in docs])
    cache_key = f"{workspace_id}_{','.join(doc_ids_sorted)}"
    
    cached_result = await comparison_cache_collection.find_one({"_id": cache_key})
    if cached_result:
        result_dict = cached_result["data"]
    else:
        # Call ComparisonAgent
        try:
            # Log what we're sending so we can diagnose issues
            for cd in companies_data:
                metric_keys = [k for k in cd.keys() if k not in ("company_name", "financial_year", "reporting_type")]
                print(f"[ComparisonAgent] Company: {cd.get('company_name')} | Metrics found: {metric_keys}")
            
            agent = ComparisonAgent()
            # Agent might take some time, so offload to thread
            user_settings = await get_user_settings(user_id)
            result_json = await asyncio.to_thread(agent.compare, companies_data, user_settings)
            result_dict = json.loads(result_json)
            
            # Only cache if successful (not failed)
            if result_dict.get("status") != "failed":
                await comparison_cache_collection.update_one(
                    {"_id": cache_key},
                    {"$set": {"data": result_dict}},
                    upsert=True
                )
        except Exception as e:
            import traceback
            traceback.print_exc()
            # Build fallback metrics
            try:
                from ...agents.comparison_agent import calculate_metrics
                fallback_metrics = [calculate_metrics(c).model_dump() for c in companies_data if c.get("company_name")]
            except Exception:
                fallback_metrics = []
                
            result_dict = {
                "companies_compared": [c.get("company_name", "") for c in companies_data],
                "financial_metrics": fallback_metrics,
                "benchmark_results": {},
                "comparison_analysis": {},
                "insights": [f"Error running comparison: {e}"],
                "status": "failed"
            }

    result_dict["workspace_id"] = workspace_id
    # Only override status if it's not already explicitly set to failed
    if result_dict.get("status") != "failed":
        result_dict["status"] = "completed"
        now = datetime.now(timezone.utc)
        for d in docs:
            d_id = str(d["_id"])
            await update_agent_execution(
                workspace_id,
                d_id,
                "Comparison Agent",
                "Complete",
                "Comparison Complete",
                f"Compared {len(companies_data)} companies.",
                100,
                metadata={"compared_documents": [str(x["_id"]) for x in docs], "companies": result_dict.get("companies_compared", [])}
            )
        await agent_executions_collection.update_many(
            {"workspace_id": workspace_id, "agent_name": "Comparison Agent", "status": "Blocked"},
            {"$set": {
                "status": "Complete",
                "action": "Comparison Complete",
                "details": f"Compared {len(companies_data)} companies.",
                "progress": 100,
                "completed_at": now
            }}
        )
    result_dict["documents"] = [str(d["_id"]) for d in docs]
    
    return result_dict


# ── Reports Generation ────────────────────────────────────────────────────────

class GenerateReportRequest(BaseModel):
    title: str = "AstraFinance Report"
    report_type: str = "Full Analysis"
    documents: List[str] = []
    sections: List[dict] = []

@router.post("/{workspace_id}/reports/generate")
async def generate_report(workspace_id: str, payload: GenerateReportRequest, background_tasks: BackgroundTasks, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    report_id = str(uuid.uuid4())
    
    # Determine unique title based on documents
    report_title = payload.title
    try:
        if payload.documents:
            first_doc_id = payload.documents[0]
            if isinstance(first_doc_id, str):
                try:
                    doc_obj_id = ObjectId(first_doc_id)
                except:
                    doc_obj_id = first_doc_id
            else:
                doc_obj_id = first_doc_id
                
            doc_record = await documents_collection.find_one({"_id": doc_obj_id, "workspace_id": workspace_id})
            
            company_name = None
            if doc_record:
                metrics_record = await metrics_collection.find_one({"document_id": doc_obj_id})
                if metrics_record and metrics_record.get("company_name"):
                    company_name = metrics_record.get("company_name")
                else:
                    # Fallback to document filename (without extension)
                    company_name = os.path.splitext(doc_record.get("name", "Unknown Document"))[0]
            
            if company_name:
                time_str = datetime.now().strftime("%b %d, %Y %I:%M %p")
                report_title = f"{company_name.strip()} — {payload.report_type} — {time_str}"
        
        # Fallback if no docs or error but still a generic title
        if report_title in ["AstraFinance Report", "Infosys FY25 Research Report", "AstraFinance AI Report"] and not payload.documents:
            time_str = datetime.now().strftime("%b %d, %Y %I:%M %p")
            report_title = f"Financial Analysis — {time_str}"
            
    except Exception as e:
        print(f"Error generating dynamic report title: {e}")
        pass

    # Store initial report record in DB
    report_doc = {
        "_id": report_id,
        "workspace_id": workspace_id,
        "title": report_title,
        "summary": "AI generated comprehensive report.",
        "status": "pending",
        "pipeline_stage": "Initializing Financial Report Agent",
        "created_at": datetime.now(timezone.utc),
        "pages": 0,
        "type": payload.report_type,
        "companies": len(payload.documents),
        "sections": len(payload.sections),
        "document_ids": payload.documents,
        "sections_config": payload.sections,
        "red_flags_included": any(s.get("id") == "risk_analysis" for s in payload.sections),
        "versions": [],
        "agent_counts": {
            "documents_processed": 0,
            "metrics_found": 0,
            "risks_found": 0,
            "comparisons_found": 0,
            "research_found": 0
        }
    }
    await reports_collection.insert_one(report_doc)
    
    # Spawn background task
    user_settings = await get_user_settings(str(current_user["_id"]))
    background_tasks.add_task(
        run_report_pipeline_task,
        report_id=report_id,
        workspace_id=workspace_id,
        payload=payload,
        workspace_name=ws.get("name", "Unknown"),
        current_user=current_user,
        user_settings=user_settings
    )
    
    return {"report_id": report_id, "status": "pending"}

async def run_report_pipeline_task(report_id: str, workspace_id: str, payload: GenerateReportRequest, workspace_name: str, current_user: dict, user_settings: dict | None = None):
    # Helper to update report pipeline state
    async def update_state(status: str, stage: str, error: str | None = None, counts: dict | None = None):
        update_doc: Dict[str, Any] = {"status": status, "pipeline_stage": stage}
        if error:
            update_doc["error_message"] = error
        if counts:
            update_doc["agent_counts"] = counts
        await reports_collection.update_one({"_id": report_id}, {"$set": update_doc})
        
    # Helper to log agent activity
    async def add_activity(status: str, action: str, details: str):
        doc_id_to_update = payload.documents[0] if payload.documents else ""
        if not doc_id_to_update:
            latest = await documents_collection.find_one({"workspace_id": workspace_id}, sort=[("created_at", -1)])
            if latest:
                doc_id_to_update = str(latest["_id"])
                
        if doc_id_to_update:
            await update_agent_execution(workspace_id, doc_id_to_update, "Report Agent", status, action, details, progress=50 if status == "Running" else 100)
        else:
            await agent_logs_collection.insert_one({
                "_id": str(uuid.uuid4()),
                "workspace_id": workspace_id,
                "document_id": "",
                "agent_name": "Report Agent",
                "agent_type": "Report Generator",
                "status": status,
                "action": action,
                "details": details,
                "duration": "N/A",
                "metadata": {},
                "timestamp": datetime.now(timezone.utc)
            })

    try:
        await update_state("running", "Aggregating Source Documents")
        await add_activity("Running", "Collecting Data", f"Gathering {len(payload.documents)} documents.")
        
        docs = []
        metrics_data = []
        red_flags_data = []
        comparison_data = []
        research_data = []
        
        if payload.documents:
            docs_cursor = documents_collection.find({"_id": {"$in": payload.documents}, "workspace_id": workspace_id})
            async for doc in docs_cursor:
                docs.append(doc)
                
        await update_state("running", "Extracting Key Financial Metrics", counts={"documents_processed": len(docs)})
        await add_activity("Running", "Loading Metrics", "Extracting financial metrics.")
        
        for doc in docs:
            m = await metrics_collection.find_one({"document_id": doc["_id"]})
            if m:
                metrics_data.append(m)
                
        await update_state("running", "Running Risk & Sentiment Analysis", counts={"documents_processed": len(docs), "metrics_found": len(metrics_data)})
        await add_activity("Running", "Loading Risks", "Aggregating red flags.")
        
        for doc in docs:
            rf_cursor = red_flags_collection.find({"document_id": doc["_id"]})
            async for rf in rf_cursor:
                red_flags_data.append(rf)
                
        await update_state("running", "Loading Comparison Data", counts={"documents_processed": len(docs), "metrics_found": len(metrics_data), "risks_found": len(red_flags_data)})
        
        cache_cursor = comparison_cache_collection.find({"workspace_id": workspace_id})
        async for comp in cache_cursor:
            comparison_data.append(comp)
            
        await update_state("running", "Generating AI Strategic Insights", counts={"documents_processed": len(docs), "metrics_found": len(metrics_data), "risks_found": len(red_flags_data), "comparisons_found": len(comparison_data)})
        await add_activity("Running", "AI Analysis", "Generating institutional insights with LLM.")
        
        # Run synchronous PDF generation in a thread
        pdf_path = await asyncio.to_thread(
            report_agent.generate_report,
            workspace_name=workspace_name,
            documents=docs,
            sections=payload.sections,
            metrics_data=metrics_data,
            red_flags_data=red_flags_data,
            comparison_data=comparison_data,
            research_data=research_data,
            user_settings=user_settings
        )
        
        await update_state("running", "Rendering Premium PDF Layout")
        
        if not pdf_path or not os.path.exists(pdf_path) or os.path.getsize(pdf_path) == 0:
            raise Exception("Generated PDF file is missing or empty.")
            
        # Update Report Record with completed PDF
        new_version = {
            "id": str(uuid.uuid4()),
            "version": "v1",
            "is_latest": True,
            "description": "Initial generated version",
            "generated_by": current_user.get("name", "User"),
            "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "pdf_path": pdf_path
        }
        
        await reports_collection.update_one(
            {"_id": report_id},
            {
                "$set": {
                    "status": "completed",
                    "pipeline_stage": "Report Ready",
                    "versions": [new_version]
                }
            }
        )
        
        # Increment workspace report count
        await workspaces_collection.update_one(
            {"_id": workspace_id},
            {"$inc": {"reports": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )
        
        await add_activity("Complete", "Generated Report", f"Successfully compiled PDF report '{payload.title}'.")
        
        now = datetime.now(timezone.utc)
        await agent_executions_collection.update_many(
            {"workspace_id": workspace_id, "agent_name": "Report Agent"},
            {"$set": {
                "status": "Complete",
                "action": "Generated Report",
                "details": f"Successfully compiled PDF report '{payload.title}'.",
                "progress": 100,
                "completed_at": now
            }}
        )
        
        user_id = user_settings.get("user_id") if user_settings else None
        if user_id:
            await maybe_notify_user(
                user_id=user_id,
                setting_key="report_generation",
                category="reports",
                priority="important",
                title="Financial Report Ready",
                message=f"Your report '{payload.title}' has been successfully generated.",
                agent="Report Agent",
                workspace_id=workspace_id,
                reference_id=f"{report_id}_success"
            )
        
    except Exception as e:
        print(f"Background Report Task Failed: {e}")
        await update_state("failed", "Report Generation Failed", error=str(e))
        await add_activity("Failed", "Generation Failed", str(e))
        
        user_id = user_settings.get("user_id") if user_settings else None
        if user_id:
            await maybe_notify_user(
                user_id=user_id,
                setting_key="report_failed",
                category="reports",
                priority="critical",
                title="Report Generation Failed",
                message=f"Failed to generate report '{payload.title}'. Error: {e}",
                agent="Report Agent",
                workspace_id=workspace_id,
                reference_id=f"{report_id}_fail"
            )

@router.get("/{workspace_id}/reports/{report_id}/status")
async def get_report_status(workspace_id: str, report_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    report = await reports_collection.find_one({"_id": report_id, "workspace_id": workspace_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    return {
        "report_id": report_id,
        "status": report.get("status", "pending"),
        "pipeline_stage": report.get("pipeline_stage", "Initializing"),
        "agent_counts": report.get("agent_counts", {}),
        "error_message": report.get("error_message")
    }


@router.get("/{workspace_id}/reports/{report_id}/download")
async def download_report(workspace_id: str, report_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    report = await reports_collection.find_one({"_id": report_id, "workspace_id": workspace_id})
    if not report or not report.get("versions"):
        raise HTTPException(status_code=404, detail="Report not found")
        
    latest_version = next((v for v in report["versions"] if v.get("is_latest")), report["versions"][0])
    pdf_path = latest_version.get("pdf_path")
    
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")
        
    return FileResponse(path=pdf_path, media_type='application/pdf', filename=f"{report.get('title', 'report')}.pdf")

