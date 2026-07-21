from fastapi import FastAPI
from app.api.upload import router as upload_router

app = FastAPI(
    title="AstraFinance AI",
    description="Document Processing & RAG Pipeline API",
    version="1.0.0"
)


app.include_router(upload_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to AstraFinance AI API"
    }