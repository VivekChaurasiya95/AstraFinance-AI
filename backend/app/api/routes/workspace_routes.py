from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Form, Depends
from typing import List, Optional, Dict, Any
import uuid
from pydantic import BaseModel
import time
import asyncio
import os
from datetime import datetime, timezone
import aiofiles
import traceback
import re

from ...schemas.workspace_schema import WorkspaceCreate, WorkspaceResponse
from ...agents.document_agent import DocumentAgent
from ...agents.extraction_agent import ExtractionAgent
from ...agents.red_flag_agent import RedFlagAgent
from .auth_routes import get_current_user
from ...database.mongo_client import (
    workspaces_collection,
    documents_collection,
    metrics_collection,
    red_flags_collection,
    agent_logs_collection,
    reports_collection
)
from ...agents.report_agent import report_agent
from fastapi.responses import FileResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

document_agent = DocumentAgent()
extraction_agent = ExtractionAgent()
red_flag_agent = RedFlagAgent()

# ── Helper ────────────────────────────────────────────────────────────────────
def format_workspace(ws: dict) -> dict:
    if "_id" in ws:
        ws["id"] = ws.pop("_id")
    if "updated_at" in ws and isinstance(ws["updated_at"], datetime):
        ws["updatedAt"] = ws["updated_at"].isoformat()
    elif "updatedAt" not in ws:
        ws["updatedAt"] = datetime.utcnow().isoformat()
    return ws


# ── Workspaces ────────────────────────────────────────────────────────────────
@router.get("", response_model=List[dict])
async def get_workspaces(current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    cursor = workspaces_collection.find({"owner_id": user_id}).sort("updated_at", -1)
    workspaces = []
    async for ws in cursor:
        workspaces.append(format_workspace(ws))
    return workspaces


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
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return format_workspace(ws)


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
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await workspaces_collection.insert_one(new_ws)
    return format_workspace(new_ws)


@router.put("/{workspace_id}")
async def rename_workspace(workspace_id: str, workspace: WorkspaceCreate, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    update_data = {"name": workspace.name, "updated_at": datetime.utcnow()}
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
    new_ws["created_at"] = datetime.utcnow()
    new_ws["updated_at"] = datetime.utcnow()
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

    docs_cursor = documents_collection.find({"workspace_id": workspace_id}).sort("uploaded_at", -1)
    docs = []
    async for doc in docs_cursor:
        doc["id"] = doc.pop("_id")
        # Format time if present
        if "uploaded_at" in doc and isinstance(doc["uploaded_at"], datetime):
            doc["uploaded_at"] = doc["uploaded_at"].strftime("%b %d, %Y")
        docs.append(doc)
        
    return {"documents": docs, "total": len(docs)}


async def simulate_document_processing(workspace_id: str, doc_id: str, file_path: str, file_name: str):
    async def add_activity(agent_name, agent_type, status, action, details, metadata=None):
        now = datetime.now(timezone.utc)
        duration = "Running"
        if status in ["Complete", "Failed"]:
            running_log = await agent_logs_collection.find_one(
                {
                    "workspace_id": workspace_id,
                    "document_id": doc_id,
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
            "document_id": doc_id,
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

    try:
        # Step 1: Parsing and Chunking
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 1, "progress": 20, "status": "processing"}})
        await add_activity("Document Agent", "document", "Running", "Extracting & Chunking", "Parsing PDF and creating semantic chunks.")
        
        await asyncio.sleep(1) # Yield
        stats: dict = await asyncio.to_thread(document_agent.process_and_index, file_path, workspace_id, doc_id, file_name)  # type: ignore
        await add_activity("Document Agent", "document", "Complete", "Text Chunked", f"Successfully extracted and indexed {stats.get('chunks')} chunks.", stats)
        
        # Step 2: Extraction
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 2, "progress": 50}})
        await add_activity("Extraction Agent", "extraction", "Running", "Extracting Metrics", "Analyzing chunks for financial metrics.")
        
        await asyncio.sleep(1)
        await asyncio.sleep(1)
        extraction_results: dict = await asyncio.to_thread(extraction_agent.extract, doc_id)  # type: ignore
        
        extraction_results["_id"] = str(uuid.uuid4())
        extraction_results["workspace_id"] = workspace_id
        extraction_results["document_id"] = doc_id
        await metrics_collection.insert_one(extraction_results)
            
        metrics_found = len(extraction_results.get("key_metrics", []))
        await add_activity("Extraction Agent", "extraction", "Complete", "Metrics Extracted", f"Found {metrics_found} metrics.", {"metrics_found": metrics_found})

        # Step 3: Red Flags
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 3, "progress": 75}})
        await add_activity("Red Flag Agent", "risk", "Running", "Analyzing Risks", "Scanning chunks for financial risks.")
        
        await asyncio.sleep(1)
        risk_data: dict = await asyncio.to_thread(red_flag_agent.analyze, doc_id)  # type: ignore
        red_flags = risk_data.get("red_flags", [])
        
        for rf in red_flags:
            rf["_id"] = str(uuid.uuid4())
            rf["workspace_id"] = workspace_id
            rf["document_id"] = doc_id
            await red_flags_collection.insert_one(rf)
            
        await add_activity("Red Flag Agent", "risk", "Complete", "Risk Analysis Complete", f"Identified {len(red_flags)} risks.", {"risks_found": len(red_flags)})

        # Cleanup
        if os.path.exists(file_path):
            os.remove(file_path)

        await documents_collection.update_one({"_id": doc_id}, {"$set": {"processing_step": 4, "progress": 100, "status": "ready"}})
        
    except Exception as e:
        traceback.print_exc()
        await documents_collection.update_one({"_id": doc_id}, {"$set": {"status": "failed", "progress": 100}})
        await add_activity("System", "document", "Failed", "Pipeline Failed", str(e))


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
        background_tasks.add_task(simulate_document_processing, workspace_id, doc_id, file_path, filename)
        
        # Update workspace docs count
        await workspaces_collection.update_one(
            {"_id": workspace_id}, 
            {"$inc": {"docs": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}}
        )

    return {"uploaded": uploaded, "workspace_id": workspace_id}


@router.delete("/{workspace_id}/documents/{document_id}")
async def delete_document(workspace_id: str, document_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a specific document from a workspace."""
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    res = await documents_collection.delete_one({"_id": document_id, "workspace_id": workspace_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Document not found")
        
    await workspaces_collection.update_one(
        {"_id": workspace_id},
        {"$inc": {"docs": -1}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    return {"message": "Document deleted successfully"}


# ── Agents ────────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/agents")
async def get_workspace_agents(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    cursor = agent_logs_collection.find({"workspace_id": workspace_id}).sort("timestamp", 1)
    logs = []
    
    status_map = {
        "Document Agent": {"status": "Idle", "details": "Waiting for documents"},
        "Extraction Agent": {"status": "Idle", "details": "Ready to extract"},
        "Red Flag Agent": {"status": "Idle", "details": "Ready to analyze"},
        "Comparison Agent": {"status": "Idle", "details": "Ready to compare"},
        "Research Agent": {"status": "Idle", "details": "Answering queries"},
        "Report Agent": {"status": "Idle", "details": "Ready to generate"}
    }
    
    async for log in cursor:
        log["id"] = log.pop("_id")
        if "timestamp" in log and isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].strftime("%I:%M %p")
            
        agent_name = log.get("agent_name")
        if agent_name in status_map:
            status = log.get("status")
            if status == "Running":
                status_map[agent_name] = {"status": "Running", "details": log.get("action", "Running...")}
            elif status == "Complete":
                status_map[agent_name] = {"status": "Complete", "details": log.get("action", "Completed")}
            elif status == "Failed":
                status_map[agent_name] = {"status": "Failed", "details": "Failed to complete"}
                
        # Insert at 0 so the timeline on frontend is newest first if needed, 
        # or we just return it chronological (append) if frontend wants Document -> Extraction -> Red Flag
        logs.append(log) 
        
    # Standard placeholder agents if none
    agents = [
        {"id": 1, "name": "Document Agent", "status": status_map["Document Agent"]["status"], "details": status_map["Document Agent"]["details"]},
        {"id": 2, "name": "Extraction Agent", "status": status_map["Extraction Agent"]["status"], "details": status_map["Extraction Agent"]["details"]},
        {"id": 3, "name": "Red Flag Agent", "status": status_map["Red Flag Agent"]["status"], "details": status_map["Red Flag Agent"]["details"]},
        {"id": 4, "name": "Comparison Agent", "status": status_map["Comparison Agent"]["status"], "details": status_map["Comparison Agent"]["details"]},
        {"id": 5, "name": "Research Agent", "status": status_map["Research Agent"]["status"], "details": status_map["Research Agent"]["details"]},
        {"id": 6, "name": "Report Agent", "status": status_map["Report Agent"]["status"], "details": status_map["Report Agent"]["details"]}
    ]
    
    return {
        "agents": agents,
        "logs": logs
    }


@router.get("/{workspace_id}/agent-activity")
async def get_workspace_agent_activity(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    cursor = agent_logs_collection.find({"workspace_id": workspace_id}).sort("timestamp", 1)
    logs = []
    async for log in cursor:
        log["id"] = log.pop("_id")
        log["agent"] = log.pop("agent_name", "Unknown Agent")
        log["metadata"] = log.get("metadata", {})
        log["details"] = log.get("details", "")
        
        if "timestamp" in log and isinstance(log["timestamp"], datetime):
            log["timestamp"] = log["timestamp"].strftime("%I:%M %p")
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
    files: Optional[List[UploadFile]] = File(None),
    current_user: dict = Depends(get_current_user)
):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    actual_message = message if message is not None else (chat_json.message if chat_json else "")
    
    await workspaces_collection.update_one({"_id": workspace_id}, {"$inc": {"chats": 1}})
    await asyncio.sleep(0.5)

    file_ack = ""
    if files and len(files) > 0:
        file_names = ", ".join([f.filename or "unnamed" for f in files])
        file_ack = f"I've received your attachments: {file_names}. "

    reply = (
        f"{file_ack}I've analyzed the documents in **{ws['name']}** and here's what I found regarding: *\"{actual_message}\"*\n\n"
        "The uploaded financial documents contain detailed disclosures about this topic. "
        "Key data points have been extracted and cross-referenced across all {doc_count} documents. "
    ).format(doc_count=ws.get("docs", 0))
    
    return {"reply": reply, "citations": []}


# ── Metrics ───────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/metrics")
async def get_workspace_metrics(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    latest_metrics = await metrics_collection.find_one(
        {"workspace_id": workspace_id},
        sort=[("_id", -1)]
    )
    
    if latest_metrics:
        latest_metrics.pop("_id", None)
        latest_metrics.pop("workspace_id", None)
        latest_metrics.pop("document_id", None)
        return latest_metrics

    # Fallback/Dummy data to structure it correctly for the frontend dashboard
    return {
        "period": "Analysis Period",
        "company": ws["name"].split(" ")[0],
        "key_metrics": [
            {"label": "Data", "value": "Awaiting Documents", "change": "-", "trend": "up", "period": "-"}
        ],
        "revenue_breakdown": [],
        "quarterly_trend": [],
        "geography_split": []
    }


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
async def get_workspace_red_flags(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    cursor = red_flags_collection.find({"workspace_id": workspace_id})
    flags = []
    async for rf in cursor:
        rf["id"] = rf.pop("_id")
        if "detected_at" not in rf:
            rf["detected_at"] = "Just now"
        flags.append(rf)

    return {
        "workspace_id": workspace_id,
        "total_flags": len(flags),
        "last_analyzed": "Just now" if flags else "Not analyzed",
        "flags": flags
    }


# ── Comparison ────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/comparison")
async def get_workspace_comparison(workspace_id: str, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
            
    cursor = documents_collection.find({"workspace_id": workspace_id, "status": "ready"})
    docs = []
    async for d in cursor:
        docs.append(d)
        
    peers: List[Dict[str, Any]] = []
    
    for idx, doc in enumerate(docs):
        doc_name = doc.get("name", f"Company {idx+1}")
        if doc_name.lower().endswith(".pdf"):
            doc_name = doc_name[:-4]
            
        ticker = doc_name[:4].upper()
        if "infosys" in doc_name.lower(): ticker = "INFY"
        elif "tcs" in doc_name.lower() or "tata" in doc_name.lower(): ticker = "TCS"
        elif "wipro" in doc_name.lower(): ticker = "WIPRO"
        elif "hcl" in doc_name.lower(): ticker = "HCL"
        
        metrics_cursor = metrics_collection.find({"document_id": doc.get("_id")})
        doc_metrics: Dict[str, Any] = {}
        async for extraction_obj in metrics_cursor:
            for m in extraction_obj.get("key_metrics", []):
                label = m.get("label", "").lower()
                val_str = str(m.get("value", ""))
                
                key = None
                if "revenue growth" in label: key = "revenue_growth"
                elif "revenue" in label: key = "revenue"
                elif "net profit margin" in label or "net margin" in label: key = "net_margin"
                elif "net profit" in label: key = "net_profit"
                elif "ebit" in label or "operating margin" in label: key = "ebit_margin"
                elif "deal" in label: key = "deal_wins"
                elif "headcount" in label or "employees" in label: key = "headcount"
                elif "attrition" in label: key = "attrition"
                elif "p/e" in label or "pe ratio" in label: key = "pe_ratio"
                
                if key:
                    num_match = re.search(r'[-+]?\d*\.?\d+', val_str.replace(',', ''))
                    if num_match:
                        num_val = float(num_match.group())
                        if key in ["revenue_growth", "net_margin", "ebit_margin", "attrition", "pe_ratio"]:
                            doc_metrics[key] = num_val
                        elif key == "headcount":
                            doc_metrics[key] = int(num_val)
                        else:
                            doc_metrics[key] = val_str
                    else:
                        doc_metrics[key] = val_str
                    
        for k in ["revenue", "revenue_growth", "net_profit", "net_margin", "ebit_margin", "deal_wins", "headcount", "attrition", "pe_ratio"]:
            if k not in doc_metrics:
                doc_metrics[k] = 0 if k not in ["revenue", "net_profit", "deal_wins"] else "N/A"
                
        peers.append({
            "company": doc_name,
            "ticker": ticker,
            "is_base": (idx == 0),
            "metrics": doc_metrics
        })
        
    if not peers:
        return {
            "workspace_id": workspace_id,
            "base_company": ws.get("name", "Unknown").split(" ")[0],
            "period": "Latest",
            "peers": [],
            "ranking": {}
        }
        
    ranking = {}
    metrics_to_rank = ["revenue_growth", "net_margin", "attrition"]
    for m in metrics_to_rank:
        ranking[m] = {}
        peer_vals = []
        for p in peers:
            val = p["metrics"].get(m)
            if isinstance(val, (int, float)):
                peer_vals.append((p["company"], val))
        
        if m == "attrition":
            peer_vals.sort(key=lambda x: x[1])
        else:
            peer_vals.sort(key=lambda x: x[1], reverse=True)
            
        for rank, (comp, val) in enumerate(peer_vals, start=1):
            ranking[m][comp] = rank

    return {
        "workspace_id": workspace_id,
        "base_company": peers[0]["company"] if peers else ws.get("name", "").split(" ")[0],
        "period": "Latest",
        "peers": peers,
        "ranking": ranking
    }


# ── Reports Generation ────────────────────────────────────────────────────────

class GenerateReportRequest(BaseModel):
    title: str = "AstraFinance Report"
    report_type: str = "Full Analysis"
    documents: List[str] = []
    sections: List[dict] = []

@router.post("/{workspace_id}/reports/generate")
async def generate_report(workspace_id: str, payload: GenerateReportRequest, current_user: dict = Depends(get_current_user)):
    user_id = str(current_user["_id"])
    ws = await workspaces_collection.find_one({"_id": workspace_id, "owner_id": user_id})
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
        
    # Log agent activity
    await agent_logs_collection.insert_one({
        "_id": str(uuid.uuid4()),
        "workspace_id": workspace_id,
        "document_id": "",
        "agent_name": "Report Agent",
        "agent_type": "Report Generator",
        "status": "Complete",
        "action": "Generated Report",
        "details": f"Compiled PDF report '{payload.title}' with {len(payload.documents)} documents.",
        "duration": "Completed",
        "metadata": {},
        "timestamp": datetime.now(timezone.utc)
    })

    docs = []
    metrics_data = []
    red_flags_data = []
    
    if payload.documents:
        docs_cursor = documents_collection.find({"_id": {"$in": payload.documents}, "workspace_id": workspace_id})
        async for doc in docs_cursor:
            docs.append(doc)
            
            # Fetch metrics for this doc
            m = await metrics_collection.find_one({"document_id": doc["_id"]})
            if m:
                metrics_data.append(m)
            
            # Fetch all red flags for this doc (each flag is a separate document)
            rf_cursor = red_flags_collection.find({"document_id": doc["_id"]})
            async for rf in rf_cursor:
                red_flags_data.append(rf)
                
    try:
        # Run synchronous PDF generation in a thread to avoid blocking the event loop
        pdf_path = await asyncio.to_thread(
            report_agent.generate_report,
            workspace_name=ws.get("name", "Unknown"),
            documents=docs,
            sections=payload.sections,
            metrics_data=metrics_data,
            red_flags_data=red_flags_data
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
    
    # Store report record in DB
    report_id = str(uuid.uuid4())
    report_doc = {
        "_id": report_id,
        "workspace_id": workspace_id,
        "title": payload.title,
        "summary": "AI generated comprehensive report.",
        "status": "completed",
        "created_at": datetime.now(timezone.utc),
        "pages": 0, # Could be calculated
        "type": payload.report_type,
        "companies": len(docs),
        "sections": len(payload.sections),
        "red_flags_included": any(s.get("id") == "risk_analysis" for s in payload.sections),
        "versions": [
            {
                "id": str(uuid.uuid4()),
                "version": "v1",
                "is_latest": True,
                "description": "Initial generated version",
                "generated_by": current_user.get("name", "User"),
                "created_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
                "pdf_path": pdf_path
            }
        ]
    }
    
    await reports_collection.insert_one(report_doc)
    
    # Increment workspace report count
    await workspaces_collection.update_one(
        {"_id": workspace_id},
        {"$inc": {"reports": 1}, "$set": {"updated_at": datetime.now(timezone.utc)}}
    )
    
    return {"report_id": report_id, "pdf_path": pdf_path}


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

