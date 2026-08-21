import os
import json
from loguru import logger
from langchain_core.prompts import ChatPromptTemplate
from ..llm import get_llm_router
from ..embeddings.chroma_client import get_document_collection
from ..embeddings.embedding_service import get_embeddings_model
from ..config.settings import settings
from .research_agent import _retrieval_queries, _dedup_and_rank
from typing import List
from pydantic import BaseModel, Field

class KeyMetric(BaseModel):
    label: str = Field(description="Name of the metric (e.g. Revenue, EBITDA, Net Profit)")
    value: str = Field(description="Value with unit (e.g. 1.2B, 15%)")
    change: str = Field(description="Change from previous period (e.g. +5%)")
    trend: str = Field(description="Trend direction: up, down, or flat")
    period: str = Field(description="Time period of the metric (e.g. YoY, QoQ, FY23)")

class RevenueBreakdown(BaseModel):
    segment: str = Field(description="Segment Name")
    value: str = Field(description="Percentage value as string (e.g. 9.4%)")
    revenue: str = Field(description="Revenue string (e.g. 220.3M)")

class QuarterlyTrend(BaseModel):
    quarter: str = Field(description="Quarter name")
    revenue: str = Field(description="Revenue string (e.g. 128.4M)")
    profit: str = Field(description="Profit string (e.g. -3.2M)")
    margin: str = Field(description="Margin string (e.g. 2.5%)")

class GeographySplit(BaseModel):
    region: str = Field(description="Region name")
    percentage: str = Field(description="Percentage string (e.g. 60%)")

class ExtractionSchema(BaseModel):
    period: str = Field(description="e.g. Q1 2026")
    company: str = Field(description="Company Name")
    key_metrics: List[KeyMetric]
    revenue_breakdown: List[RevenueBreakdown]
    quarterly_trend: List[QuarterlyTrend]
    geography_split: List[GeographySplit]

class ExtractionAgent:
    def __init__(self):

        try:
            self.collection = get_document_collection()
        except Exception as e:
            logger.error(f"ChromaDB collection unavailable in ExtractionAgent: {e}")
            self.collection = None
        self.embeddings = get_embeddings_model()

        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """
You are an expert Financial Data Extraction Agent.
Extract the following data based ONLY on the provided context chunks. Make reasonable estimations if exact data is partially missing, but do not completely hallucinate.

CRITICAL INSTRUCTIONS:
- 'trend' must be "up", "down", or "flat".
- Make sure key_metrics includes as many relevant financial parameters as possible. AT A MINIMUM, if available, you MUST extract: Revenue, Gross Profit, Operating Profit, EBITDA, Net Profit, Profit Margin, Operating Margin, ROE, Debt/Equity, EPS, and Free Cash Flow.
- Ensure revenue_breakdown percentages sum up to 100.
- Ensure geography_split percentages sum up to 100.
- CRITICAL: Distinguish carefully between "Profit Before Tax (PBT)" and "Net Profit / Profit After Tax (PAT)". If a number is explicitly labeled "Profit Before Tax", do NOT report it as "Net Profit".
- CRITICAL: Revenue must be Total Revenue or Revenue from Operations. NEVER use Segment Revenue.
- Prefer Consolidated over Standalone. Do not mix reporting years.
- If data is partially available, make reasonable estimations based on the text. If completely unavailable, omit the metric or return 0.
"""),
            ("human", "Context chunks:\n{context}")
        ])

    def extract(self, document_id: str, user_settings: dict | None = None):
        queries = _retrieval_queries("", "")
        raw_chunks = []
        
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
                        n_results=10
                    )
                    
                    documents = results.get("documents", [])
                    metadatas = results.get("metadatas", [])
                    ids = results.get("ids", [])
                    
                    for qi in range(len(documents or [])):
                        for i, text in enumerate(documents[qi] if documents else []):
                            meta = metadatas[qi][i] if metadatas and qi < len(metadatas) and i < len(metadatas[qi]) else {}
                            chunk_id = ids[qi][i] if ids and qi < len(ids) and i < len(ids[qi]) else f"chunk_{qi}_{i}"
                            raw_chunks.append({
                                "content": text,
                                "chunk_id": chunk_id,
                                "metadata": meta
                            })
                except Exception as e:
                    logger.warning(f"ChromaDB retrieval failed for provider {provider}: {e}")

        except Exception as e:
            logger.error(f"Failed to fetch chunks in ExtractionAgent: {e}")
            raise RuntimeError(f"Retrieval failed: {e}")

        if not raw_chunks:
            logger.warning(f"No chunks found for document {document_id}")
            raise ValueError("No chunks found in ChromaDB for this document. Did DocumentAgent run?")
            
        ranked = _dedup_and_rank(raw_chunks, company="", limit=15)
        
        context_parts = []
        for r in ranked:
            meta = r.get("metadata", {})
            chunk_id = r.get("chunk_id", "unknown")
            page = meta.get("page_number", 0) if isinstance(meta, dict) else 0
            context_parts.append(f"--- Chunk ID: {chunk_id} | Page: {page} ---\n{r['content']}")
            
        context = "\n\n".join(context_parts)
        
        messages = self.prompt.format_messages(context=context)
        router = get_llm_router()
        result = router.invoke_structured("extraction", messages, ExtractionSchema, user_settings=user_settings, temperature=0.0)
        return result.model_dump()
