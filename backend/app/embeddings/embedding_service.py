import os
from langchain_huggingface import HuggingFaceEmbeddings

def get_embeddings_model():
    """Returns the HuggingFace embeddings model for local execution."""
    return HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )
