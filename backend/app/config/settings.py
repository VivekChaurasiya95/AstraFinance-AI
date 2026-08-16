from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str
    APP_VERSION: str
    DEBUG: bool

    HOST: str
    PORT: int

    MONGODB_URI: str
    DATABASE_NAME: str

    CHROMA_DB_PATH: str

    GEMINI_API_KEY: str
    GROQ_API_KEY: str = "YOUR_GROQ_API_KEY"

    # Multi-Key Support for Fallback / Round-robin
    GROQ_API_KEY_1: Optional[str] = None
    GROQ_API_KEY_2: Optional[str] = None
    GEMINI_API_KEY_1: Optional[str] = None
    GEMINI_API_KEY_2: Optional[str] = None
    
    # Per-Agent Configs
    EXTRACTION_PRIMARY_PROVIDER: str = "groq"
    EXTRACTION_PRIMARY_MODEL: str = "llama-3.3-70b-versatile"
    EXTRACTION_FALLBACK_PROVIDER: str = "gemini"
    EXTRACTION_FALLBACK_MODEL: str = "gemini-3.5-flash"

    RED_FLAG_PRIMARY_PROVIDER: str = "groq"
    RED_FLAG_PRIMARY_MODEL: str = "llama-3.3-70b-versatile"
    RED_FLAG_FALLBACK_PROVIDER: str = "gemini"
    RED_FLAG_FALLBACK_MODEL: str = "gemini-3.5-flash"

    COMPARISON_PRIMARY_PROVIDER: str = "groq"
    COMPARISON_PRIMARY_MODEL: str = "llama-3.1-8b-instant"
    COMPARISON_FALLBACK_PROVIDER: str = "gemini"
    COMPARISON_FALLBACK_MODEL: str = "gemini-3.5-flash-lite"

    RESEARCH_PRIMARY_PROVIDER: str = "groq"
    RESEARCH_PRIMARY_MODEL: str = "llama-3.3-70b-versatile"
    RESEARCH_FALLBACK_PROVIDER: str = "gemini"
    RESEARCH_FALLBACK_MODEL: str = "gemini-3.5-flash"

    VISION_PRIMARY_PROVIDER: str = "groq"
    VISION_PRIMARY_MODEL: str = "llama-3.2-90b-vision-preview"
    VISION_FALLBACK_PROVIDER: str = "gemini"
    VISION_FALLBACK_MODEL: str = "gemini-3.5-flash"

    FIREBASE_SERVICE_ACCOUNT_KEY: str = "app/config/astrafinance-ai-firebase-adminsdk-fbsvc-78efa35b8d.json"

    # JWT_SECRET_KEY: str
    # JWT_ALGORITHM: str
    # JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Embedding Configs
    GEMINI_EMBEDDING_MODEL: str = "models/embedding-001"
    HF_EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    EMBEDDING_PRIMARY_PROVIDER: str = "gemini"
    EMBEDDING_FALLBACK_PROVIDER: str = "huggingface"
    EMBEDDING_GEMINI_MAX_RETRIES: int = 2
    EMBEDDING_FALLBACK_ENABLED: bool = True

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()