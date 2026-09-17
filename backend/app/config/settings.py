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

    # OpenRouter (Fallback 2 - Last Resort)
    OPENROUTER_API_KEY: Optional[str] = None
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "nvidia/nemotron-3-ultra-550b-a55b:free"
    
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
    REDIS_URL: str = "redis://localhost:6380/0"
    
    # Redis Cache TTLs (in seconds)
    REDIS_DASHBOARD_TTL: int = 300
    REDIS_WORKSPACE_TTL: int = 120
    REDIS_DOCUMENT_TTL: int = 180
    REDIS_METRICS_TTL: int = 600
    REDIS_COMPARISON_TTL: int = 600
    REDIS_REDFLAG_TTL: int = 600
    REDIS_AGENT_ACTIVITY_TTL: int = 30

    # JWT_SECRET_KEY: str
    # JWT_ALGORITHM: str
    # JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Embedding Configs
    GEMINI_EMBEDDING_MODEL: str = "models/gemini-embedding-001"
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