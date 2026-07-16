from fastapi import APIRouter, UploadFile, File
import shutil
import os

from app.agents.document_agent import DocumentAgent
from app.agents.extraction_agent import ExtractionAgent

router = APIRouter(
    prefix="/extract",
    tags=["Extraction Agent"]
)

document_agent = DocumentAgent()
extraction_agent = ExtractionAgent()


@router.post("/")
async def extract(file: UploadFile = File(...)):

    os.makedirs("uploads", exist_ok=True)

    file_path = f"uploads/{file.filename}"

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    document_text = document_agent.extract_text(file_path)

    financial_data = extraction_agent.extract_financial_data(
        document_text
    )

    return {
        "financial_data": financial_data
    }