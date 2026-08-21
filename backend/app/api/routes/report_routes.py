from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import uuid
import os
import asyncio

from .auth_routes import get_current_user
from ...database.mongo_client import (
    reports_collection, 
    workspaces_collection,
    documents_collection,
    metrics_collection,
    red_flags_collection,
    agent_logs_collection
)
from ...agents.report_agent import report_agent
from pydantic import BaseModel

router = APIRouter(prefix="/reports", tags=["reports"])

class RenameReportRequest(BaseModel):
    title: str

@router.get("", response_model=Dict[str, Any])
async def get_all_reports(
    search: Optional[str] = Query(None),
    workspace: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    sort: str = Query("latest"),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    """
    Get all reports across all workspaces with filtering, searching, and pagination.
    """
    user_id = str(current_user["_id"])
    
    # Get all workspaces for user
    ws_cursor = workspaces_collection.find({"owner_id": user_id}, {"_id": 1, "name": 1})
    user_workspaces = []
    ws_map = {}
    async for ws in ws_cursor:
        user_workspaces.append(ws["_id"])
        ws_map[ws["_id"]] = ws["name"]
        
    all_reports = []
    total_versions = 0
    unique_workspaces = set()
    total_count = 0
    
    if user_workspaces:
        # Build query
        query: Dict[str, Any] = {"workspace_id": {"$in": user_workspaces}}
        
        if search:
            query["title"] = {"$regex": search, "$options": "i"}
            
        if workspace and workspace != "all":
            if workspace in ws_map:
                query["workspace_id"] = workspace
                
        if status and status != "all":
            query["status"] = status

        # Count total
        total_count = await reports_collection.count_documents(query)

        # Sorting
        sort_field = "created_at"
        sort_dir = -1
        if sort == "oldest":
            sort_dir = 1
        elif sort == "a-z":
            sort_field = "title"
            sort_dir = 1
            
        skip = (page - 1) * limit
        
        reports_cursor = reports_collection.find(query).sort(sort_field, sort_dir).skip(skip).limit(limit)
        async for report in reports_cursor:
            report_data = dict(report)
            report_data["id"] = report_data.pop("_id")
            
            ws_id = report_data.get("workspace_id")
            report_data["workspace_name"] = ws_map.get(ws_id, "Unknown Workspace")
                
            if "created_at" in report_data and hasattr(report_data["created_at"], "strftime"):
                # Use a specific format for the frontend
                report_data["created_at"] = report_data["created_at"].strftime("%b %d, %Y %I:%M %p")
                
            all_reports.append(report_data)
            
            if "versions" in report_data:
                total_versions += len(report_data["versions"])
                
            if ws_id:
                unique_workspaces.add(ws_id)
                
    # Storage calculation (mock for now, or sum file sizes)
    storage_used_mb = len(all_reports) * 1.5 
    storage_str = f"{storage_used_mb:.1f} MB" if storage_used_mb > 0 else "0 MB"

    return {
        "reports": all_reports,
        "metrics": {
            "total_reports": total_count,
            "total_versions": total_versions,
            "total_workspaces": len(unique_workspaces),
            "storage_used": storage_str
        },
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total_count,
            "pages": (total_count + limit - 1) // limit
        }
    }


@router.get("/{report_id}", response_model=Dict[str, Any])
async def get_report(report_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get a single report by ID.
    """
    user_id = str(current_user["_id"])
    
    report = await reports_collection.find_one({"_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    ws = await workspaces_collection.find_one({"_id": report["workspace_id"], "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=403, detail="Unauthorized access to report")
        
    report_data = dict(report)
    report_data["id"] = report_data.pop("_id")
    report_data["workspace_name"] = ws.get("name", "Unknown Workspace")
    
    if "created_at" in report_data and hasattr(report_data["created_at"], "strftime"):
        report_data["created_at"] = report_data["created_at"].strftime("%b %d, %Y %I:%M %p")
        
    return report_data


@router.patch("/{report_id}")
async def rename_report(report_id: str, request: RenameReportRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    report = await reports_collection.find_one({"_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    ws = await workspaces_collection.find_one({"_id": report["workspace_id"], "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=403, detail="Unauthorized access to report")
        
    await reports_collection.update_one(
        {"_id": report_id},
        {"$set": {"title": request.title}}
    )
    
    return {"message": "Report renamed successfully"}


@router.delete("/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    report = await reports_collection.find_one({"_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    ws = await workspaces_collection.find_one({"_id": report["workspace_id"], "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=403, detail="Unauthorized access to report")
        
    # Delete PDF files physically
    versions = report.get("versions", [])
    for version in versions:
        pdf_path = version.get("pdf_path")
        if pdf_path and os.path.exists(pdf_path):
            try:
                os.remove(pdf_path)
            except Exception as e:
                pass # Ignore file deletion errors
                
    # Delete from DB
    await reports_collection.delete_one({"_id": report_id})
    
    # Decrement workspace report count
    await workspaces_collection.update_one(
        {"_id": report["workspace_id"]},
        {"$inc": {"reports": -1}}
    )
    
    return {"message": "Report deleted successfully"}


@router.get("/{report_id}/download")
async def download_report(report_id: str, version_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    report = await reports_collection.find_one({"_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    ws = await workspaces_collection.find_one({"_id": report["workspace_id"], "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=403, detail="Unauthorized access to report")
        
    versions = report.get("versions", [])
    if not versions:
        raise HTTPException(status_code=404, detail="No versions found for report")
        
    target_version = None
    if version_id:
        target_version = next((v for v in versions if v.get("id") == version_id), None)
    else:
        target_version = next((v for v in versions if v.get("is_latest")), versions[0])
        
    if not target_version:
        raise HTTPException(status_code=404, detail="Target version not found")
        
    pdf_path = target_version.get("pdf_path")
    if not pdf_path or not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="PDF file not found on server")
        
    return FileResponse(path=pdf_path, media_type='application/pdf', filename=f"{report.get('title', 'report')}.pdf")


@router.post("/{report_id}/regenerate")
async def regenerate_report(report_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    report = await reports_collection.find_one({"_id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    workspace_id = report["workspace_id"]
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=403, detail="Unauthorized access to report")
        
    document_ids = report.get("document_ids", [])
    sections = report.get("sections_config", [])
    
    docs = []
    metrics_data = []
    red_flags_data = []
    
    if document_ids:
        docs_cursor = documents_collection.find({"_id": {"$in": document_ids}, "workspace_id": workspace_id})
        async for doc in docs_cursor:
            docs.append(doc)
            
            # Fetch metrics for this doc
            m = await metrics_collection.find_one({"document_id": doc["_id"]})
            if m:
                metrics_data.append(m)
            
            # Fetch all red flags for this doc
            rf_cursor = red_flags_collection.find({"document_id": doc["_id"]})
            async for rf in rf_cursor:
                red_flags_data.append(rf)
                
    try:
        pdf_path = await asyncio.to_thread(
            report_agent.generate_report,
            workspace_name=ws.get("name", "Unknown"),
            documents=docs,
            sections=sections,
            metrics_data=metrics_data,
            red_flags_data=red_flags_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report regeneration failed: {str(e)}")
        
    # Update versioning
    versions = report.get("versions", [])
    # Mark old versions as not latest
    for v in versions:
        v["is_latest"] = False
        
    new_version_num = f"v{len(versions) + 1}"
    
    new_version = {
        "id": str(uuid.uuid4()),
        "version": new_version_num,
        "is_latest": True,
        "description": "Regenerated version",
        "generated_by": current_user.get("name", "User"),
        "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "pdf_path": pdf_path
    }
    versions.append(new_version)
    
    await reports_collection.update_one(
        {"_id": report_id},
        {"$set": {"versions": versions, "status": "completed"}}
    )
    
    # Log agent activity
    await agent_logs_collection.insert_one({
        "_id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "document_id": "",
        "agent_name": "Report Agent",
        "agent_type": "Report Generator",
        "status": "Complete",
        "action": "Regenerated Report",
        "details": f"Regenerated PDF report '{report.get('title')}' ({new_version_num}).",
        "duration": "Completed",
        "metadata": {},
        "timestamp": datetime.now(timezone.utc)
    })
    
    return {"message": "Report regenerated successfully", "new_version": new_version}
