import os

from langchain_community.vectorstores import FAISS

from app.embeddings.vector_store import get_embeddings
from app.agents.research_agent import _dedup_and_rank


_vector_store = None


def load_vector_store():
    global _vector_store

    if _vector_store is None:
        embeddings = get_embeddings()

        index_path = os.getenv(
            "FAISS_INDEX_PATH",
            "faiss_index"
        )

        if not os.path.exists(index_path):
            raise FileNotFoundError(
                f"FAISS index not found at {index_path}"
            )

        _vector_store = FAISS.load_local(
            index_path,
            embeddings,
            allow_dangerous_deserialization=True
        )

    return _vector_store


def similarity_search(query: str, k: int = 5):
    vector_store = load_vector_store()

    docs = vector_store.similarity_search(query=query, k=20)
    
    # Format for _dedup_and_rank
    formatted = [{"content": doc.page_content, "metadata": doc.metadata} for doc in docs]
    ranked = _dedup_and_rank(formatted, company=query, limit=k)
    
    # Convert back to Langchain Document objects to preserve existing API
    from langchain_core.documents import Document
    return [Document(page_content=r["content"], metadata=r.get("metadata", {})) for r in ranked]