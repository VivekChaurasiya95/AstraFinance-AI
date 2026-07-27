import chromadb
from chromadb.config import Settings
from app.config.settings import settings
import os

os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)

chroma_client = chromadb.PersistentClient(
    path=settings.CHROMA_DB_PATH,
    settings=Settings(anonymized_telemetry=False)
)

# Core collections
def get_document_collection():
    return chroma_client.get_or_create_collection(
        name="document_chunks_v2",
        metadata={"hnsw:space": "cosine"}
    )
