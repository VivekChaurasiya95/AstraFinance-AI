import os
import json
from loguru import logger
from langchain_core.prompts import ChatPromptTemplate
from ..llm import get_llm_router
from ..embeddings.chroma_client import get_document_collection
from ..embeddings.embedding_service import get_embeddings_model

from ..config.settings import settings

from typing import List
from pydantic import BaseModel, Field

class RedFlag(BaseModel):
    severity: str = Field(description="'High', 'Medium', or 'Low'")
    title: str = Field(description="Short title of the risk")
    description: str = Field(description="Detailed explanation of the risk")
    recommendation: str = Field(description="Actionable advice to mitigate the risk")
    confidence: str = Field(description="Float between 0 and 1, as a string")
    source_page: str = Field(description="Page number as a string, e.g. '1'")
    chunk_id: str = Field(description="String, the ID of the chunk")
    citation: str = Field(description="Exact quote from the chunk supporting this risk")

class RedFlagSchema(BaseModel):
    risk_level: str = Field(description="'High', 'Medium', or 'Low'")
    red_flags: List[RedFlag]

class RedFlagAgent:
    def __init__(self):
        try:
            self.collection = get_document_collection()
        except Exception as e:
            logger.error(f"ChromaDB collection unavailable in RedFlagAgent: {e}")
            self.collection = None
        self.embeddings = get_embeddings_model()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
You are an expert Financial Risk Analysis Agent.
Analyze the provided financial document chunks and identify financial risks, warnings, or auditor concerns.

CRITICAL INSTRUCTIONS:
- Identify evidence-backed financial warning indicators (e.g. revenue decline, profit decline, margin deterioration, high/increasing debt, weak liquidity, negative cash flow, unusual financial changes).
- Each red flag must contain severity ('High', 'Medium', 'Low'), title, description (why it matters), recommendation (precautionary observation), and citation.
- Do NOT hallucinate. If no risks are found, return an empty array for red_flags and "Low" for risk_level.
"""),
            ("human", "Context chunks:\n{context}")
        ])

    def analyze(self, document_id: str, extracted_metrics: dict | None = None, user_settings: dict | None = None):
        queries = ["risk bankruptcy auditor warning debt liability lawsuit regulation downgrade"]
        context_parts = []
        
        try:
            from ..embeddings.chroma_client import get_collection_for_provider
            from ..embeddings.embedding_router import embedding_router

            router_results = embedding_router.embed_queries(queries)
            
            for provider, config in router_results.items():
                try:
                    collection = get_collection_for_provider(provider, config["model"])
                    results = collection.query(
                        query_embeddings=config["embeddings"],  # type: ignore
                        where={"document_id": document_id},
                        n_results=20
                    )
                    
                    documents = results.get("documents", [])
                    metadatas = results.get("metadatas", [])
                    ids = results.get("ids", [])
                    
                    for qi in range(len(documents or [])):
                        for i, text in enumerate(documents[qi] if documents else []):
                            meta = metadatas[qi][i] if metadatas and qi < len(metadatas) and i < len(metadatas[qi]) else {}
                            chunk_id = ids[qi][i] if ids and qi < len(ids) and i < len(ids[qi]) else f"chunk_{qi}_{i}"
                            page = meta.get("page_number", 0) if isinstance(meta, dict) else 0
                            context_parts.append(f"--- Chunk ID: {chunk_id} | Page: {page} ---\n{text}")
                except Exception as e:
                    logger.warning(f"ChromaDB retrieval failed for provider {provider}: {e}")

        except Exception as e:
            logger.error(f"Failed to fetch chunks in RedFlagAgent: {e}")
            raise RuntimeError(f"Retrieval failed: {e}")

        if not context_parts:
            logger.warning(f"No chunks found for document {document_id}")
            return {"risk_level": "Low", "red_flags": []}
            
        context = "\n\n".join(context_parts)
        
        if extracted_metrics:
            metrics_str = json.dumps(extracted_metrics.get("key_metrics", []), indent=2)
            context += f"\n\n--- Extracted Financial Metrics ---\n{metrics_str}"
            
        logger.info(f"RedFlagAgent analyzing document: {document_id}. Metrics provided: {bool(extracted_metrics)}")
        
        messages = self.prompt.format_messages(context=context)
        router = get_llm_router()
        try:
            result = router.invoke_structured("red_flag", messages, RedFlagSchema, user_settings=user_settings, temperature=0.0)
            if not result:
                logger.warning(f"RedFlagAgent returned empty result for {document_id}")
                return {"risk_level": "Low", "red_flags": []}
            return result.model_dump()
        except Exception as e:
            logger.error(f"RedFlagAgent failed for {document_id}: {e}")
            return {"risk_level": "Low", "red_flags": []}
