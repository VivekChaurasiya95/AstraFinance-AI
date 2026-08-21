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
    # 1. Init Firebase
    try:
        init_firebase()
        logger.info("✓ Firebase Admin SDK initialized")
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        
    # 2. Ping MongoDB and ensure indexes
    try:
        await db.command("ping")
        logger.info("✓ MongoDB Connected successfully")
        
        # Enforce unique index for firebase_uid to prevent duplicate users
        await db["users"].create_index("firebase_uid", unique=True)
        logger.info("✓ Unique index on firebase_uid ensured")
        
        # Ensure notification indexes
        from .repositories import notifications_repository
        await notifications_repository.ensure_indexes()
        logger.info("✓ Notification indexes ensured")
    except Exception as e:
        logger.error(f"MongoDB connection/index failed: {e}")

    yield

    # Shutdown
    try:
        from .database.mongo_client import client
        client.close()
        logger.info("✓ MongoDB connection closed")
    except Exception as e:
        logger.error(f"Error closing MongoDB connection: {e}")

app = FastAPI(
    title=settings.APP_NAME,
    description="Document Processing & RAG Pipeline API",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ],
    allow_origin_regex=".*",
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