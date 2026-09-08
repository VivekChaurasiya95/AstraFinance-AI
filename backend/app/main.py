from dotenv import load_dotenv
load_dotenv()  # Export .env values into os.environ so os.getenv() works everywhere
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
# Trigger reload
from loguru import logger


from .config.settings import settings
from .auth.firebase_auth import init_firebase
from .api.routes.health_routes import router as health_router
from .api.routes.workspace_routes import router as workspace_router
from .api.routes.dashboard_routes import router as dashboard_router
from .api.routes.auth_routes import router as auth_router
from .api.routes.report_routes import router as report_router
from .api.routes.comparison_routes import router as comparison_router
from .api.routes.research_routes import router as research_router
from .api.routes.settings_routes import router as settings_router
from .api.routes.security_routes import router as security_router
from .api.routes.notification_routes import router as notification_router
from .database.mongo_client import db

from .agents.extraction_agent import ExtractionAgent
from .agents.red_flag_agent import RedFlagAgent

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("[Startup] AstraFinance AI starting")
    # 1. Init Firebase
    try:
        init_firebase()
        logger.info("[Firebase] Connected")
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        
    # 2. Ping MongoDB and ensure indexes
    try:
        await db.command("ping")
        logger.info("[MongoDB] Connected")
        
        # Enforce unique index for firebase_uid to prevent duplicate users
        await db["users"].create_index("firebase_uid", unique=True)
        
        # Ensure notification indexes
        from .repositories import notifications_repository
        await notifications_repository.ensure_indexes()
        logger.info("[Notifications] Ready")
        logger.info("[API] Listening on http://127.0.0.1:8000")
    except Exception as e:
        logger.error(f"MongoDB connection/index failed: {e}")

    # 3. Init Redis
    from .database.redis_client import init_redis
    await init_redis()

    logger.info("[Startup] Ready")

    yield

    # Shutdown
    try:
        from .database.mongo_client import client
        client.close()
        logger.info("✓ MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {e}")

    try:
        from .database.redis_client import close_redis
        await close_redis()
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")

app = FastAPI(
    title=settings.APP_NAME,
    description="Document Processing & RAG Pipeline API",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

import re

class UvicornAccessLogFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if hasattr(record, "args") and isinstance(record.args, tuple) and len(record.args) >= 5:
            method = record.args[1]
            path = record.args[2]
            status = record.args[4]
            
            new_args = list(record.args)
            if isinstance(path, str) and "token=" in path:
                new_args[2] = re.sub(r'token=[^& ]+', 'token=[REDACTED]', path)
                record.args = tuple(new_args)
                
            # Filter out routine polling and common GET requests to reduce log spam
            if isinstance(status, int) and status < 400 and method == "GET" and isinstance(path, str):
                if any(x in path for x in ["/agents", "/me", "/documents", "/notifications", "/dashboard", "/workspaces"]):
                    return False
                    
        return True

uvicorn_access_logger = logging.getLogger("uvicorn.access")
if uvicorn_access_logger:
    uvicorn_access_logger.addFilter(UvicornAccessLogFilter())

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://10.23.69.37:3000",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(workspace_router, prefix="/api/v1")
app.include_router(dashboard_router, prefix="/api/v1")
app.include_router(auth_router, prefix="/api/v1")
app.include_router(report_router, prefix="/api/v1")
app.include_router(comparison_router, prefix="/api/v1")
app.include_router(research_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(security_router, prefix="/api/v1")
app.include_router(notification_router, prefix="/api/v1")


@app.get("/")
def root():
    return {
        "message": "Welcome to AstraFinance AI API"
    }

from fastapi import Response

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

@app.get("/test")
def test_agents():
    sample_doc_id = "test_document_123"
    
    extractor = ExtractionAgent()
    red_flag = RedFlagAgent()
    extracted_data = extractor.extract(sample_doc_id)
    risk_analysis = red_flag.analyze(sample_doc_id, extracted_metrics=extracted_data)

    return {
        "message": "Test successful",
        "extracted": extracted_data,
        "risks": risk_analysis
    }

from fastapi import Request
from fastapi.responses import JSONResponse
from .llm.exceptions import LLMError, LLMErrorType

@app.exception_handler(LLMError)
async def llm_error_handler(request: Request, exc: LLMError):
    if exc.error_type == LLMErrorType.RATE_LIMITED:
        return JSONResponse(
            status_code=429,
            content={
                "error": "LLM_RATE_LIMITED",
                "message": "AI request capacity has temporarily been reached. Please try again shortly."
            }
        )
    elif exc.error_type == LLMErrorType.QUOTA_EXCEEDED:
        return JSONResponse(
            status_code=429,
            content={
                "error": "LLM_QUOTA_EXCEEDED",
                "message": "AI service quota has been exceeded. Please try again later."
            }
        )
    elif exc.error_type in [LLMErrorType.PROVIDER_UNAVAILABLE, LLMErrorType.PROVIDER_SERVER_ERROR]:
        return JSONResponse(
            status_code=503,
            content={
                "error": "LLM_PROVIDER_UNAVAILABLE",
                "message": "AI service is temporarily unavailable. Please try again shortly."
            }
        )
    else:
        return JSONResponse(
            status_code=500,
            content={
                "error": "LLM_INTERNAL_ERROR",
                "message": "An internal error occurred with the AI service. Please try again later."
            }
        )