from dotenv import load_dotenv
load_dotenv()  # Export .env values into os.environ so os.getenv() works everywhere

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger


from app.api.upload import router as upload_router
from app.config.settings import settings
from app.auth.firebase_auth import init_firebase
from app.api.routes.health_routes import router as health_router
from app.api.routes.workspace_routes import router as workspace_router
from app.api.routes.dashboard_routes import router as dashboard_router
from app.api.routes.auth_routes import router as auth_router
from app.api.routes.report_routes import router as report_router
from app.api.routes.comparison_routes import router as comparison_router
from app.api.routes.research_routes import router as research_router
from app.database.mongo_client import db

from app.agents.extraction_agent import ExtractionAgent
from app.agents.red_flag_agent import RedFlagAgent

import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)

app = FastAPI(
    title=settings.APP_NAME,
    description="Document Processing & RAG Pipeline API",
    version=settings.APP_VERSION
)

app.include_router(upload_router)

@app.on_event("startup")
async def startup_event():
    # 1. Init Firebase
    try:
        init_firebase()
        logger.info("✓ Firebase Admin SDK initialized")
    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        
    # 2. Ping MongoDB
    try:
        await db.command("ping")
        logger.info("✓ MongoDB Connected successfully")
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}")

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


@app.get("/")
def root():
    return {
        "message": "Welcome to AstraFinance AI API"
    }

@app.get("/test")
def test_agents():
    sample_text = """
    ABC Pvt Ltd Financial Report 2025

    Revenue: 1200000
    Expenses: 800000
    Net Profit: 400000
    Assets: 3500000
    Liabilities: 1800000
    Current Ratio: 1.8
    Debt to Equity Ratio: 1.4
    """
    
    extractor = ExtractionAgent()
    red_flag = RedFlagAgent()
    extracted_data = extractor.extract(sample_text)
    risk_analysis = red_flag.analyze(extracted_data)

    return {
        "message": "Test successful",
        "extracted": extracted_data,
        "risks": risk_analysis
    }