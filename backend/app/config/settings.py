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

    FIREBASE_SERVICE_ACCOUNT_KEY: str = "app/config/astrafinance-ai-firebase-adminsdk-fbsvc-78efa35b8d.json"

    # JWT_SECRET_KEY: str
    # JWT_ALGORITHM: str
    # JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()