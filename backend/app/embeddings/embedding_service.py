import os
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from app.config.settings import settings

class DummyEmbeddings:
    def embed_documents(self, texts):
        return [[0.0] * 3072 for _ in texts]
    def embed_query(self, text):
        return [0.0] * 3072

def get_embeddings_model():
    """Returns the Google GenAI embeddings model."""
    # Prefer the pydantic-settings value (loaded from .env) over os.environ
    api_key = getattr(settings, "GEMINI_API_KEY", None) or os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "YOUR_GEMINI_API_KEY":
        print("WARNING: Valid GEMINI_API_KEY is required for embedding generation. Using DummyEmbeddings for now.")
        return DummyEmbeddings()
    
    return GoogleGenerativeAIEmbeddings(
        model="models/gemini-embedding-2",
        google_api_key=api_key
    )
