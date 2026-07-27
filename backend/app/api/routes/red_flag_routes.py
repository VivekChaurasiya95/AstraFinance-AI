from fastapi import APIRouter, UploadFile, File
import shutil
import os
import uuid

from ...agents.document_agent import DocumentAgent
from ...agents.extraction_agent import ExtractionAgent
from ...agents.red_flag_agent import RedFlagAgent

router = APIRouter(
    prefix="/red-flag",
    tags=["Red Flag Agent"]
)

document_agent = DocumentAgent()
extraction_agent = ExtractionAgent()
red_flag_agent = RedFlagAgent()


@router.post("/")
async def analyze(file: UploadFile = File(...)):

    os.makedirs("uploads", exist_ok=True)

    document_id = str(uuid.uuid4())
    file_name = file.filename or "unnamed.pdf"
    file_path = f"uploads/{document_id}_{file_name}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Step 1: Parse, chunk, embed and index into ChromaDB
    workspace_id = "standalone"
    stats = document_agent.process_and_index(file_path, workspace_id, document_id, file_name)

    # Step 2: Extract financial metrics from indexed chunks
    financial_data = extraction_agent.extract(document_id)

    # Step 3: Analyze for red flags from indexed chunks
    risk_analysis = red_flag_agent.analyze(document_id)

    # Cleanup uploaded file
    if os.path.exists(file_path):
        os.remove(file_path)

    return {
        "financial_data": financial_data,
        "risk_analysis": risk_analysis
    }