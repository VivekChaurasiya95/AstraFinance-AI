import chromadb
from chromadb.config import Settings
from app.config.settings import settings
import os
import logging

logger = logging.getLogger(__name__)

os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)

try:
    chroma_client = chromadb.PersistentClient(
        path=settings.CHROMA_DB_PATH,
        settings=Settings(anonymized_telemetry=False)
    )
except Exception as e:
    logger.error("ChromaDB initialization failed: %s. Document features will be unavailable.", e)
    chroma_client = None

# Core collections
def get_document_collection():
    if chroma_client is None:
        raise RuntimeError("ChromaDB is not available. Please check your chroma_db directory.")
    return chroma_client.get_or_create_collection(
        name="document_chunks_v2",
        metadata={"hnsw:space": "cosine"}
    )
