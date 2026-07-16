from fastapi import APIRouter, UploadFile, File
import shutil
import os

from app.agents.document_agent import DocumentAgent
from app.agents.extraction_agent import ExtractionAgent
from app.agents.red_flag_agent import RedFlagAgent

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

    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    document_text = document_agent.extract_text(file_path)

    financial_data = extraction_agent.extract_financial_data(
        document_text
    )

    risk_analysis = red_flag_agent.analyze_financial_risk(
        financial_data
    )

    return {
        "financial_data": financial_data,
        "risk_analysis": risk_analysis
    }