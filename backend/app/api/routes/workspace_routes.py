from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Form
from typing import List, Optional
import uuid
from pydantic import BaseModel
import time
import asyncio

from app.schemas.workspace_schema import WorkspaceCreate, WorkspaceResponse

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])

# In-memory storage – replace with MongoDB later
MOCK_WORKSPACES = [
    {
        "id": "1",
        "name": "Infosys Financial Analysis Q1 FY25",
        "description": "Aggregated transcript data and sentiment analysis for key tech sector earnings calls.",
        "docs": 3,
        "chats": 12,
        "reports": 1,
        "owner_name": "Vivek Chaurasiya",
        "owner_initial": "V",
        "updatedAt": "Updated 2 hours ago",
        "icon": "FileTextIcon",
        "iconColor": "text-blue-700",
        "iconBg": "bg-blue-100",
    },
    {
        "id": "2",
        "name": "TCS vs Infosys Comparison",
        "description": "Central bank policy shifts and supply chain vulnerability models.",
        "docs": 5,
        "chats": 18,
        "reports": 2,
        "owner_name": "Vivek Chaurasiya",
        "owner_initial": "V",
        "updatedAt": "Updated yesterday",
        "icon": "FileTextIcon",
        "iconColor": "text-emerald-700",
        "iconBg": "bg-emerald-100",
    },
    {
        "id": "3",
        "name": "HDFC Bank Annual Report 2024",
        "description": "Central bank policy shifts and supply chain vulnerability models.",
        "docs": 2,
        "chats": 8,
        "reports": 0,
        "owner_name": "Vivek Chaurasiya",
        "owner_initial": "V",
        "updatedAt": "Updated 3 days ago",
        "icon": "FileTextIcon",
        "iconColor": "text-orange-700",
        "iconBg": "bg-orange-100",
    },
    {
        "id": "4",
        "name": "Reliance Industries FY24 Analysis",
        "description": "Central bank policy shifts and supply chain vulnerability models.",
        "docs": 4,
        "chats": 15,
        "reports": 1,
        "owner_name": "Vivek Chaurasiya",
        "owner_initial": "V",
        "updatedAt": "Updated 5 days ago",
        "icon": "FileTextIcon",
        "iconColor": "text-red-700",
        "iconBg": "bg-red-100",
    },
    {
        "id": "5",
        "name": "IT Sector Quarterly Review",
        "description": "Central bank policy shifts and supply chain vulnerability models.",
        "docs": 6,
        "chats": 22,
        "reports": 3,
        "owner_name": "Vivek Chaurasiya",
        "owner_initial": "V",
        "updatedAt": "Updated 1 week ago",
        "icon": "FileTextIcon",
        "iconColor": "text-blue-700",
        "iconBg": "bg-blue-100",
    },
    {
        "id": "6",
        "name": "Adani Group Financial Overview",
        "description": "Central bank policy shifts and supply chain vulnerability models.",
        "docs": 3,
        "chats": 9,
        "reports": 1,
        "owner_name": "Vivek Chaurasiya",
        "owner_initial": "V",
        "updatedAt": "Updated 1 week ago",
        "icon": "FileTextIcon",
        "iconColor": "text-violet-700",
        "iconBg": "bg-violet-100",
    },
]

# In-memory document store per workspace
WORKSPACE_DOCUMENTS: dict = {
    "1": [
        {"id": "doc_1a", "name": "Infosys_Q1_FY25_Annual_Report.pdf", "size_bytes": 2456789, "status": "ready", "pages": 145, "uploaded_at": "2 hours ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
        {"id": "doc_1b", "name": "Q1_Results_Presentation.pdf", "size_bytes": 1234567, "status": "ready", "pages": 42, "uploaded_at": "2 hours ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
        {"id": "doc_1c", "name": "Infosys_Investor_Update.pdf", "size_bytes": 987654, "status": "ready", "pages": 28, "uploaded_at": "3 hours ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
    ],
    "2": [
        {"id": "doc_2a", "name": "TCS_Q1_FY25_Report.pdf", "size_bytes": 3123456, "status": "ready", "pages": 198, "uploaded_at": "Yesterday", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
        {"id": "doc_2b", "name": "Infosys_Q1_FY25_Annual_Report.pdf", "size_bytes": 2456789, "status": "ready", "pages": 145, "uploaded_at": "Yesterday", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
        {"id": "doc_2c", "name": "Sector_Comparison_Analysis.pdf", "size_bytes": 876543, "status": "ready", "pages": 35, "uploaded_at": "2 days ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
        {"id": "doc_2d", "name": "IT_Index_Benchmark.pdf", "size_bytes": 654321, "status": "ready", "pages": 22, "uploaded_at": "2 days ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
        {"id": "doc_2e", "name": "Market_Share_Data.pdf", "size_bytes": 543210, "status": "ready", "pages": 18, "uploaded_at": "3 days ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
    ],
    "3": [
        {"id": "doc_3a", "name": "HDFC_Annual_Report_2024.pdf", "size_bytes": 4567890, "status": "ready", "pages": 312, "uploaded_at": "3 days ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
        {"id": "doc_3b", "name": "HDFC_Q4_Results.pdf", "size_bytes": 1098765, "status": "ready", "pages": 56, "uploaded_at": "3 days ago", "processing_step": 5, "progress": 100, "extracted_metrics": [], "red_flags": []},
    ],
}

# In-memory report store per workspace
WORKSPACE_REPORTS: dict = {
    "1": [
        {
            "id": "rep_1a",
            "title": "Infosys Q1 FY25 Financial Analysis",
            "summary": "Comprehensive analysis of Infosys Q1 FY25 results showing 4.2% revenue growth YoY with strong margin expansion.",
            "status": "completed",
            "created_at": "2 hours ago",
            "pages": 12,
            "type": "Full Analysis",
        }
    ],
    "2": [
        {
            "id": "rep_2a",
            "title": "TCS vs Infosys — Head-to-Head Comparison",
            "summary": "Side-by-side comparison of key financial metrics for Q1 FY25.",
            "status": "completed",
            "created_at": "Yesterday",
            "pages": 8,
            "type": "Comparison Report",
        },
        {
            "id": "rep_2b",
            "title": "IT Sector Risk Assessment",
            "summary": "Risk analysis highlighting regulatory, demand, and currency headwinds.",
            "status": "completed",
            "created_at": "2 days ago",
            "pages": 6,
            "type": "Risk Report",
        },
    ],
}


@router.get("", response_model=List[WorkspaceResponse])
def get_workspaces():
    return MOCK_WORKSPACES


@router.get("/check-name")
def check_workspace_name(name: str):
    """Check if a workspace name is available."""
    exists = any(w["name"].lower() == name.strip().lower() for w in MOCK_WORKSPACES)
    return {"available": not exists}


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str):
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


@router.post("", response_model=WorkspaceResponse)
def create_workspace(workspace: WorkspaceCreate):
    colors = [
        ("text-blue-700", "bg-blue-100"),
        ("text-emerald-700", "bg-emerald-100"),
        ("text-violet-700", "bg-violet-100"),
        ("text-orange-700", "bg-orange-100"),
        ("text-teal-700", "bg-teal-100"),
        ("text-red-700", "bg-red-100"),
    ]
    color_pair = colors[len(MOCK_WORKSPACES) % len(colors)]

    new_ws = {
        "id": str(uuid.uuid4()),
        "name": workspace.name,
        "description": workspace.description or "No description provided.",
        "docs": 0,
        "chats": 0,
        "reports": 0,
        "owner_name": "Vivek Chaurasiya",
        "owner_initial": "V",
        "updatedAt": "Just now",
        "icon": "FileTextIcon",
        "iconColor": color_pair[0],
        "iconBg": color_pair[1],
    }
    MOCK_WORKSPACES.insert(0, new_ws)
    WORKSPACE_DOCUMENTS[new_ws["id"]] = []
    WORKSPACE_REPORTS[new_ws["id"]] = []
    return new_ws


@router.get("/{workspace_id}/documents")
def get_workspace_documents(workspace_id: str):
    """Get list of documents for a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    docs = WORKSPACE_DOCUMENTS.get(workspace_id, [])
    return {"documents": docs, "total": len(docs)}

async def simulate_document_processing(workspace_id: str, doc_id: str):
    """Simulate a 5-step processing pipeline."""
    steps = [
        {"name": "Parsing Document", "duration": 2},
        {"name": "Cleaning Content", "duration": 2},
        {"name": "Chunking Text", "duration": 2},
        {"name": "Generating Embeddings", "duration": 3},
        {"name": "Indexing in Vector Database", "duration": 2},
    ]
    
    docs = WORKSPACE_DOCUMENTS.get(workspace_id, [])
    doc = next((d for d in docs if d["id"] == doc_id), None)
    if not doc:
        return
        
    for i, step in enumerate(steps):
        doc["processing_step"] = i + 1
        doc["status"] = "processing"
        
        # Simulating progress 0-100% for this step
        for p in range(0, 100, 20):
            doc["progress"] = p
            await asyncio.sleep(step["duration"] / 5)
            
        doc["progress"] = 100
        
    doc["status"] = "ready"
    doc["processing_step"] = 5
    doc["extracted_metrics"] = [
        {"label": "Revenue (FY24)", "value": "₹ 1,62,990 Cr", "trend": "up", "change": "+ 3.3%"},
        {"label": "Net Profit (FY24)", "value": "₹ 26,311 Cr", "trend": "up", "change": "+ 6.2%"},
        {"label": "EBITDA", "value": "₹ 40,987 Cr", "trend": "up", "change": "+ 4.8%"},
        {"label": "ROE", "value": "30.8%", "trend": "up", "change": "+ 1.6%"},
    ]
    doc["red_flags"] = [
        {"title": "Decline in Operating Margin", "severity": "High"},
        {"title": "Increase in Employee Costs", "severity": "Medium"},
    ]


@router.post("/{workspace_id}/documents")
async def upload_document(
    workspace_id: str,
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    """Upload one or more PDF documents to a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    uploaded = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            raise HTTPException(
                status_code=400,
                detail=f"Only PDF files are supported. Got: {file.filename}"
            )

        contents = await file.read()
        doc_id = str(uuid.uuid4())
        
        # Determine a mock pdf type based on filename
        lower_name = file.filename.lower()
        pdf_type = "Annual Report" if "annual" in lower_name else "Financial Statement"
        if "notice" in lower_name:
            pdf_type = "Notice"
        elif "quarter" in lower_name or "q1" in lower_name:
            pdf_type = "Quarterly Results"
            
        new_doc = {
            "id": doc_id,
            "name": file.filename,
            "size_bytes": len(contents),
            "status": "processing",
            "processing_step": 1,
            "progress": 0,
            "pdf_type": pdf_type,
            "pages": max(1, len(contents) // 3000),
            "uploaded_at": "Just now",
            "extracted_metrics": [],
            "red_flags": []
        }
        uploaded.append(new_doc)
        if workspace_id not in WORKSPACE_DOCUMENTS:
            WORKSPACE_DOCUMENTS[workspace_id] = []
        WORKSPACE_DOCUMENTS[workspace_id].append(new_doc)
        
        # Queue processing task
        background_tasks.add_task(simulate_document_processing, workspace_id, doc_id)
        
        ws["docs"] = len(WORKSPACE_DOCUMENTS[workspace_id])
        ws["updatedAt"] = "Just now"

    return {"uploaded": uploaded, "workspace_id": workspace_id}


@router.delete("/{workspace_id}/documents/{document_id}")
def delete_document(workspace_id: str, document_id: str):
    """Delete a specific document from a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    docs = WORKSPACE_DOCUMENTS.get(workspace_id, [])
    initial_len = len(docs)
    WORKSPACE_DOCUMENTS[workspace_id] = [d for d in docs if d["id"] != document_id]
    if len(WORKSPACE_DOCUMENTS[workspace_id]) == initial_len:
        raise HTTPException(status_code=404, detail="Document not found")
    ws["docs"] = len(WORKSPACE_DOCUMENTS[workspace_id])
    ws["updatedAt"] = "Just now"
    return {"message": "Document deleted successfully"}


@router.put("/{workspace_id}", response_model=WorkspaceResponse)
def rename_workspace(workspace_id: str, workspace: WorkspaceCreate):
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws["name"] = workspace.name
    if workspace.description:
        ws["description"] = workspace.description
    ws["updatedAt"] = "Just now"
    return ws


@router.delete("/{workspace_id}")
def delete_workspace(workspace_id: str):
    global MOCK_WORKSPACES
    initial_len = len(MOCK_WORKSPACES)
    MOCK_WORKSPACES = [w for w in MOCK_WORKSPACES if w["id"] != workspace_id]
    if len(MOCK_WORKSPACES) == initial_len:
        raise HTTPException(status_code=404, detail="Workspace not found")
    WORKSPACE_DOCUMENTS.pop(workspace_id, None)
    WORKSPACE_REPORTS.pop(workspace_id, None)
    return {"message": "Workspace deleted successfully"}


# ── Agents ────────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/agents")
def get_workspace_agents(workspace_id: str):
    return {
        "agents": [
            {"id": 1, "name": "Document Agent", "status": "Complete", "details": "3 documents processed\n145 pages • 2m ago"},
            {"id": 2, "name": "Extraction Agent", "status": "Running", "details": "Extracting financial metrics...\n60% complete • Just now"},
            {"id": 3, "name": "Red Flag Agent", "status": "Complete", "details": "Risk analysis completed\n4 risks identified • 1m ago"},
            {"id": 4, "name": "Comparison Agent", "status": "Idle", "details": "Ready to compare\nNo active task"},
            {"id": 5, "name": "Research Agent", "status": "Running", "details": "Answering user queries...\n1 active session • Just now"},
            {"id": 6, "name": "Report Agent", "status": "Failed", "details": "Report generation failed\nRetry"}
        ]
    }


# ── Chat ──────────────────────────────────────────────────────────────────────
class ChatMessage(BaseModel):
    message: str

@router.post("/{workspace_id}/chat")
async def chat_with_workspace(
    workspace_id: str, 
    message: str = Form(None),
    chat_json: ChatMessage = None,
    files: List[UploadFile] = File(None)
):
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Support both Form data (with files) and JSON body (legacy)
    actual_message = message if message is not None else (chat_json.message if chat_json else "")
    
    # Increment chat count
    ws["chats"] = ws.get("chats", 0) + 1
    await asyncio.sleep(0.5)

    # Acknowledge files if attached
    file_ack = ""
    if files and len(files) > 0:
        file_names = ", ".join([f.filename for f in files])
        file_ack = f"I've received your attachments: {file_names}. "

    # Context-aware mock responses
    message_lower = actual_message.lower()
    if "overview" in message_lower or "summary" in message_lower or "performance" in message_lower:
        reply = (
            f"Based on the uploaded documents for **{ws['name']}**, here is the financial overview:\n\n"
            "• **Revenue**: ₹38,318 Cr (+4.2% YoY)\n"
            "• **Net Profit**: ₹6,368 Cr (+7.1% YoY)\n"
            "• **EBIT Margin**: 20.8% (expanded by 60 bps)\n"
            "• **Headcount**: 3,17,240 employees\n\n"
            "Q1 FY25 performance was in-line with analyst expectations, driven by strong deal wins and operational efficiency."
        )
        citations = [{"doc": "Infosys_Q1_FY25_Annual_Report.pdf", "page": 4}, {"doc": "Q1_Results_Presentation.pdf", "page": 2}]
    elif "risk" in message_lower or "red flag" in message_lower:
        reply = (
            "The **Risk Analysis Agent** has identified the following key risks:\n\n"
            "🔴 **High**: Revenue concentration risk — top 10 clients contribute ~32% of revenue\n"
            "🟠 **Medium**: Currency headwinds from USD/INR fluctuation (negative impact: ~1.2%)\n"
            "🟡 **Medium**: Attrition rate at 17.3% — above industry average\n"
            "🟢 **Low**: Regulatory compliance risk — all major geographies compliant\n\n"
            "Overall risk posture is manageable with strong balance sheet backing."
        )
        citations = [{"doc": "Infosys_Q1_FY25_Annual_Report.pdf", "page": 28}, {"doc": "Q1_Results_Presentation.pdf", "page": 15}]
    elif "compare" in message_lower or "metric" in message_lower:
        reply = (
            "**Comparison of Key Financial Metrics** (Q1 FY25):\n\n"
            "| Metric | Infosys | TCS | Wipro |\n"
            "|--------|---------|-----|-------|\n"
            "| Revenue Growth | 4.2% | 8.4% | 3.1% |\n"
            "| Net Margin | 16.6% | 19.8% | 12.3% |\n"
            "| EBIT Margin | 20.8% | 24.1% | 17.2% |\n"
            "| Deal Wins ($B) | 4.1 | 8.3 | 3.7 |\n\n"
            "TCS leads on most metrics, but Infosys shows stronger margin trajectory."
        )
        citations = [{"doc": "Sector_Comparison_Analysis.pdf", "page": 7}]
    elif "report" in message_lower or "generate" in message_lower:
        reply = (
            "I'm generating a comprehensive financial report for **{ws_name}**. "
            "The report will include:\n\n"
            "1. Executive Summary & Key Highlights\n"
            "2. Revenue & Profitability Analysis\n"
            "3. Segment Performance Breakdown\n"
            "4. Risk Factors & Red Flags\n"
            "5. Peer Comparison\n"
            "6. Outlook & Investment Thesis\n\n"
            "The report will be ready in approximately 2 minutes. You can track progress in the **Reports** tab."
        ).format(ws_name=ws["name"])
        citations = []
    else:
        reply = (
            f"{file_ack}I've analyzed the documents in **{ws['name']}** and here's what I found regarding: *\"{actual_message}\"*\n\n"
            "The uploaded financial documents contain detailed disclosures about this topic. "
            "Key data points have been extracted and cross-referenced across all {doc_count} documents. "
            "For a deeper analysis, try asking about specific metrics like revenue, margins, risk factors, or segment performance."
        ).format(doc_count=ws.get("docs", 0))
        citations = [{"doc": "Infosys_Q1_FY25_Annual_Report.pdf", "page": 12}]

    if file_ack and "overview" in message_lower or "risk" in message_lower or "compare" in message_lower or "report" in message_lower:
        reply = file_ack + "\n\n" + reply

    return {"reply": reply, "citations": citations}


# ── Metrics ───────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/metrics")
def get_workspace_metrics(workspace_id: str):
    """Get extracted financial metrics for a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "workspace_id": workspace_id,
        "period": "Q1 FY2025",
        "company": ws["name"].split(" ")[0],
        "key_metrics": [
            {"label": "Revenue", "value": "₹38,318 Cr", "change": "+4.2%", "trend": "up", "period": "YoY"},
            {"label": "Net Profit", "value": "₹6,368 Cr", "change": "+7.1%", "trend": "up", "period": "YoY"},
            {"label": "EBIT Margin", "value": "20.8%", "change": "+60 bps", "trend": "up", "period": "YoY"},
            {"label": "EPS", "value": "₹15.33", "change": "+8.3%", "trend": "up", "period": "YoY"},
            {"label": "Free Cash Flow", "value": "₹5,245 Cr", "change": "-3.1%", "trend": "down", "period": "YoY"},
            {"label": "Deal Wins", "value": "$4.1B", "change": "+12.5%", "trend": "up", "period": "QoQ"},
        ],
        "revenue_breakdown": [
            {"segment": "Financial Services", "value": 32.4, "revenue": "₹12,415 Cr"},
            {"segment": "Manufacturing", "value": 14.2, "revenue": "₹5,441 Cr"},
            {"segment": "Energy & Utilities", "value": 13.8, "revenue": "₹5,288 Cr"},
            {"segment": "Retail", "value": 13.1, "revenue": "₹5,019 Cr"},
            {"segment": "Communication", "value": 12.7, "revenue": "₹4,866 Cr"},
            {"segment": "Hi-Tech", "value": 8.5, "revenue": "₹3,257 Cr"},
            {"segment": "Others", "value": 5.3, "revenue": "₹2,032 Cr"},
        ],
        "quarterly_trend": [
            {"quarter": "Q1 FY24", "revenue": 36844, "profit": 5945, "margin": 20.2},
            {"quarter": "Q2 FY24", "revenue": 37933, "profit": 6212, "margin": 20.5},
            {"quarter": "Q3 FY24", "revenue": 38821, "profit": 6106, "margin": 20.3},
            {"quarter": "Q4 FY24", "revenue": 37923, "profit": 7969, "margin": 21.1},
            {"quarter": "Q1 FY25", "revenue": 38318, "profit": 6368, "margin": 20.8},
        ],
        "geography_split": [
            {"region": "North America", "percentage": 58.4},
            {"region": "Europe", "percentage": 25.1},
            {"region": "India", "percentage": 3.5},
            {"region": "Rest of World", "percentage": 13.0},
        ]
    }


# ── Red Flags ─────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/red-flags")
def get_workspace_red_flags(workspace_id: str):
    """Get AI-detected red flags for a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "workspace_id": workspace_id,
        "total_flags": 4,
        "last_analyzed": "1 minute ago",
        "flags": [
            {
                "id": "rf_1",
                "severity": "High",
                "category": "Revenue Concentration",
                "title": "Top 10 clients contribute 32% of revenue",
                "description": "Significant client concentration risk. A churn in any top-3 client could impact revenue by ~8-12%.",
                "recommendation": "Monitor client renewal pipeline and diversification strategy.",
                "source_doc": "Infosys_Q1_FY25_Annual_Report.pdf",
                "source_page": 28,
                "detected_at": "1 minute ago",
            },
            {
                "id": "rf_2",
                "severity": "High",
                "category": "Attrition",
                "title": "Annualized attrition at 17.3% — above industry average",
                "description": "Talent retention remains a key challenge. Q1 FY25 attrition of 17.3% is higher than TCS (13.3%) and Wipro (15.8%).",
                "recommendation": "Investigate employee satisfaction programs and compensation benchmarking.",
                "source_doc": "Q1_Results_Presentation.pdf",
                "source_page": 15,
                "detected_at": "1 minute ago",
            },
            {
                "id": "rf_3",
                "severity": "Medium",
                "category": "Currency Risk",
                "title": "USD/INR headwind impacting margins",
                "description": "INR appreciation against USD reduced reported margins by approximately 1.2% on a constant currency basis.",
                "recommendation": "Review hedging strategy for FY25. Current hedge ratio is 52% of expected revenues.",
                "source_doc": "Infosys_Q1_FY25_Annual_Report.pdf",
                "source_page": 42,
                "detected_at": "2 minutes ago",
            },
            {
                "id": "rf_4",
                "severity": "Low",
                "category": "Deal Pipeline",
                "title": "Large deal ramp-down in BFSI segment",
                "description": "One large BFSI client deal is ramping down in Q2-Q3 FY25, which may create a revenue gap of ~₹200-400 Cr.",
                "recommendation": "Monitor replacement pipeline. Management has indicated 3 large BFSI pursuits in final stages.",
                "source_doc": "Q1_Results_Presentation.pdf",
                "source_page": 22,
                "detected_at": "2 minutes ago",
            },
        ]
    }


# ── Comparison ────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/comparison")
def get_workspace_comparison(workspace_id: str):
    """Get peer comparison data for a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "workspace_id": workspace_id,
        "base_company": ws["name"].split(" ")[0],
        "period": "Q1 FY2025",
        "peers": [
            {
                "company": "Infosys",
                "ticker": "INFY",
                "is_base": True,
                "metrics": {
                    "revenue": "₹38,318 Cr",
                    "revenue_growth": 4.2,
                    "net_profit": "₹6,368 Cr",
                    "net_margin": 16.6,
                    "ebit_margin": 20.8,
                    "deal_wins": "$4.1B",
                    "headcount": 317240,
                    "attrition": 17.3,
                    "pe_ratio": 24.5,
                }
            },
            {
                "company": "TCS",
                "ticker": "TCS",
                "is_base": False,
                "metrics": {
                    "revenue": "₹61,237 Cr",
                    "revenue_growth": 8.4,
                    "net_profit": "₹12,105 Cr",
                    "net_margin": 19.8,
                    "ebit_margin": 24.1,
                    "deal_wins": "$8.3B",
                    "headcount": 601546,
                    "attrition": 13.3,
                    "pe_ratio": 32.1,
                }
            },
            {
                "company": "Wipro",
                "ticker": "WIPRO",
                "is_base": False,
                "metrics": {
                    "revenue": "₹22,208 Cr",
                    "revenue_growth": 3.1,
                    "net_profit": "₹2,870 Cr",
                    "net_margin": 12.3,
                    "ebit_margin": 17.2,
                    "deal_wins": "$3.7B",
                    "headcount": 234054,
                    "attrition": 15.8,
                    "pe_ratio": 19.8,
                }
            },
            {
                "company": "HCL Tech",
                "ticker": "HCLTECH",
                "is_base": False,
                "metrics": {
                    "revenue": "₹26,673 Cr",
                    "revenue_growth": 6.7,
                    "net_profit": "₹3,843 Cr",
                    "net_margin": 14.4,
                    "ebit_margin": 18.5,
                    "deal_wins": "$2.9B",
                    "headcount": 227480,
                    "attrition": 12.8,
                    "pe_ratio": 26.3,
                }
            },
        ],
        "ranking": {
            "revenue_growth": {"Infosys": 3, "TCS": 1, "Wipro": 4, "HCL Tech": 2},
            "net_margin": {"Infosys": 2, "TCS": 1, "Wipro": 4, "HCL Tech": 3},
            "attrition": {"Infosys": 4, "TCS": 1, "Wipro": 3, "HCL Tech": 2},
        }
    }


# ── Agent Activity ────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/agent-activity")
def get_workspace_agent_activity(workspace_id: str):
    """Get detailed agent activity timeline for a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    return {
        "workspace_id": workspace_id,
        "timeline": [
            {
                "id": "act_1",
                "agent": "Document Agent",
                "agent_type": "document",
                "status": "Complete",
                "action": "Processed 3 PDF documents",
                "details": "Successfully extracted text, tables, and charts from all uploaded documents. Total 145 pages processed.",
                "timestamp": "2 minutes ago",
                "duration": "45s",
                "metadata": {"pages_processed": 145, "tables_extracted": 23, "charts_identified": 8}
            },
            {
                "id": "act_2",
                "agent": "Extraction Agent",
                "agent_type": "extraction",
                "status": "Running",
                "action": "Extracting financial metrics",
                "details": "Identifying and structuring KPIs, financial ratios, and segment data from documents.",
                "timestamp": "Just now",
                "duration": "Running",
                "metadata": {"metrics_found": 42, "completion_pct": 60}
            },
            {
                "id": "act_3",
                "agent": "Red Flag Agent",
                "agent_type": "risk",
                "status": "Complete",
                "action": "Risk analysis completed",
                "details": "Identified 4 potential risk factors ranging from High to Low severity.",
                "timestamp": "1 minute ago",
                "duration": "32s",
                "metadata": {"flags_identified": 4, "high_severity": 2, "medium_severity": 1, "low_severity": 1}
            },
            {
                "id": "act_4",
                "agent": "Research Agent",
                "agent_type": "research",
                "status": "Running",
                "action": "Answering user queries",
                "details": "Responding to chat queries with document-backed answers and citations.",
                "timestamp": "Just now",
                "duration": "Running",
                "metadata": {"queries_answered": 12, "citations_provided": 28}
            },
            {
                "id": "act_5",
                "agent": "Comparison Agent",
                "agent_type": "comparison",
                "status": "Idle",
                "action": "Waiting for peer data",
                "details": "Ready to perform peer comparison. Awaiting trigger from user.",
                "timestamp": "1 minute ago",
                "duration": "Idle",
                "metadata": {}
            },
            {
                "id": "act_6",
                "agent": "Report Agent",
                "agent_type": "report",
                "status": "Failed",
                "action": "Report generation failed",
                "details": "Encountered an error while generating the PDF report. Template rendering failed.",
                "timestamp": "30 seconds ago",
                "duration": "Failed",
                "metadata": {"error": "Template rendering error", "retry_count": 1}
            },
        ]
    }


# ── Reports ───────────────────────────────────────────────────────────────────
@router.get("/{workspace_id}/reports")
def get_workspace_reports(workspace_id: str):
    """Get generated reports for a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    reports = WORKSPACE_REPORTS.get(workspace_id, [])
    return {"reports": reports, "total": len(reports)}


class ReportGenerateRequest(BaseModel):
    title: Optional[str] = None
    report_type: Optional[str] = "Full Analysis"

@router.post("/{workspace_id}/reports/generate")
def generate_report(workspace_id: str, request: ReportGenerateRequest):
    """Trigger report generation for a workspace."""
    ws = next((w for w in MOCK_WORKSPACES if w["id"] == workspace_id), None)
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")

    report_id = str(uuid.uuid4())
    title = request.title or f"{ws['name']} — Financial Report"
    new_report = {
        "id": report_id,
        "title": title,
        "summary": "AI-generated comprehensive financial analysis based on uploaded documents.",
        "status": "generating",
        "created_at": "Just now",
        "pages": 0,
        "type": request.report_type or "Full Analysis",
    }

    if workspace_id not in WORKSPACE_REPORTS:
        WORKSPACE_REPORTS[workspace_id] = []
    WORKSPACE_REPORTS[workspace_id].insert(0, new_report)
    ws["reports"] = len(WORKSPACE_REPORTS[workspace_id])
    ws["updatedAt"] = "Just now"

    # Simulate report completion (in real app this would be async)
    import threading
    def complete_report():
        time.sleep(3)
        for r in WORKSPACE_REPORTS.get(workspace_id, []):
            if r["id"] == report_id:
                r["status"] = "completed"
                r["pages"] = 12
                break
    threading.Thread(target=complete_report, daemon=True).start()

    return {"report_id": report_id, "status": "generating", "message": "Report generation started. Check the Reports tab."}
