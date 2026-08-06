from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
import os

_embeddings = None


def get_embeddings():
    global _embeddings

    if _embeddings is None:
        _embeddings = HuggingFaceEmbeddings(
            model_name=os.getenv(
                "EMBEDDING_MODEL",
                "sentence-transformers/all-MiniLM-L6-v2"
            ),
            model_kwargs={"local_files_only": True}
        )

    return _embeddings


def create_vector_store(documents):
    embeddings = get_embeddings()

    db = FAISS.from_documents(
        documents,
        embeddings
    )

    db.save_local("faiss_index")

    return db