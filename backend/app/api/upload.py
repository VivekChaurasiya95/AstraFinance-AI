from pathlib import Path
import shutil

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.document_processing.metadata_extractor import MetadataExtractor
from app.document_processing.pdf_parser import PDFParser
from app.document_processing.text_cleaner import clean_text
from app.document_processing.chunker import DocumentChunker
from app.document_processing.table_extractor import TableExtractor

router = APIRouter(
    prefix="/documents",
    tags=["Document Upload"]
)

UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_pdf(file: UploadFile = File(...)):
    
 
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are allowed."
        )

    save_path = UPLOAD_FOLDER / file.filename

    with open(save_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # -----------------------------
    # 1. Extract Metadata
    # -----------------------------
    metadata_extractor = MetadataExtractor()
    metadata = metadata_extractor.extract_metadata(str(save_path))

    # -----------------------------
    # 2. Parse PDF
    # -----------------------------
    parser = PDFParser()
    pages = parser.extract_text(str(save_path))

    # Combine all pages into one string
    full_text = "\n".join(page["text"] for page in pages)

    # -----------------------------
    # 3. Clean Text
    # -----------------------------
    cleaned_text = clean_text(full_text)

    # -----------------------------
    # 4. Chunk Text
    # -----------------------------
    chunker = DocumentChunker()
    chunks = chunker.chunk_text(cleaned_text)

    # -----------------------------
    # 5. Extract Tables
    # -----------------------------
    table_extractor = TableExtractor()
    tables = table_extractor.extract_tables(str(save_path))

    # -----------------------------
    # Response
    # -----------------------------
    return {
        "status": "success",
        "message": "Document processed successfully.",
        "filename": file.filename,
        "metadata": metadata,
        "pages": len(pages),
        "characters": len(cleaned_text),
        "chunks": len(chunks),
        "tables": len(tables)
    }