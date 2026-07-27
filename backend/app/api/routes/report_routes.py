from fastapi import APIRouter, Depends
from typing import Dict, Any, List
from app.api.routes.auth_routes import get_current_user
from app.database.mongo_client import reports_collection, workspaces_collection

router = APIRouter(prefix="/reports", tags=["reports"])

@router.get("", response_model=Dict[str, Any])
async def get_all_reports(current_user: dict = Depends(get_current_user)):
    """
    Get all reports across all workspaces, along with aggregate statistics.
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
    
    if user_workspaces:
        reports_cursor = reports_collection.find({"workspace_id": {"$in": user_workspaces}}).sort("created_at", -1)
        async for report in reports_cursor:
            report_data = dict(report)
            report_data["id"] = report_data.pop("_id")
            
            ws_id = report_data.get("workspace_id")
            if "workspace_name" not in report_data:
                report_data["workspace_name"] = ws_map.get(ws_id, "Unknown Workspace")
                
            if "created_at" in report_data and hasattr(report_data["created_at"], "strftime"):
                report_data["created_at"] = report_data["created_at"].strftime("%b %d, %Y")
                
            all_reports.append(report_data)
            
            if "versions" in report_data:
                total_versions += len(report_data["versions"])
                
            if ws_id:
                unique_workspaces.add(ws_id)
                
    # Basic mock for storage used, could be computed based on real sizes later
    storage_used_mb = len(all_reports) * 1.5 
    storage_str = f"{storage_used_mb:.1f} MB" if storage_used_mb > 0 else "0 MB"

    return {
        "reports": all_reports,
        "metrics": {
            "total_reports": len(all_reports),
            "total_versions": total_versions,
            "total_workspaces": len(unique_workspaces),
            "storage_used": storage_str
        }
    }
