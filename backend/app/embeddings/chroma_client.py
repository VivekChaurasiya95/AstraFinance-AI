import chromadb
from chromadb.config import Settings
from ..config.settings import settings
import os
import logging

logger = logging.getLogger(__name__)

import threading
chroma_lock = threading.Lock()

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
    """Legacy function for older scripts/data."""
    if chroma_client is None:
        raise RuntimeError("ChromaDB is not available. Please check your chroma_db directory.")
    return chroma_client.get_or_create_collection(
        name="document_chunks_v3",
        metadata={"hnsw:space": "cosine"}
    )

def _sanitize_name(name: str) -> str:
    import re
    # ChromaDB collection names must contain 3-63 characters, start/end with alphanumeric, and only contain alphanumeric, underscores or hyphens.
    safe = re.sub(r'[^a-zA-Z0-9_-]', '-', name)
    safe = safe.strip('-')
    if not safe:
        safe = "default"
    return safe[:40] # Keep length safe

def get_collection_for_provider(provider: str, model: str):
    if chroma_client is None:
        raise RuntimeError("ChromaDB is not available.")
    
    safe_model = _sanitize_name(model)
    collection_name = f"financial_docs_{provider}_{safe_model}"
    
    return chroma_client.get_or_create_collection(
        name=collection_name,
        metadata={"hnsw:space": "cosine"}
    )
