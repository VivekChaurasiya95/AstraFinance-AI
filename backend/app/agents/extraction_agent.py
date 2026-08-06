import os
import json
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from ..embeddings.chroma_client import get_document_collection
from ..embeddings.embedding_service import get_embeddings_model
from ..config.settings import settings
from .research_agent import _retrieval_queries, _dedup_and_rank

class ExtractionAgent:
    def __init__(self):
        groq_api_key = getattr(settings, "GROQ_API_KEY", None) or os.getenv("GROQ_API_KEY", "YOUR_GROQ_API_KEY")
        if not groq_api_key or groq_api_key == "YOUR_GROQ_API_KEY":
            logger.warning("Valid GROQ_API_KEY is required for ExtractionAgent. Using dummy key for startup.")
            groq_api_key = "dummy_key_to_prevent_startup_crash"
            
        self.llm = ChatGroq(
            model="llama-3.3-70b-versatile",
            api_key=groq_api_key,
            temperature=0
        )
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

Return ONLY valid JSON in this exact format:
{{
    "period": "e.g. Q1 2026",
    "company": "Company Name",
    "key_metrics": [
        {{
            "label": "Revenue",
            "value": "1.2B",
            "change": "+5%",
            "trend": "up", 
            "period": "YoY"
        }}
    ],
    "revenue_breakdown": [
        {{"segment": "Software", "value": 45, "revenue": "540M"}}
    ],
    "quarterly_trend": [
        {{"quarter": "Q1 25", "revenue": 1000, "profit": 200, "margin": 20}}
    ],
    "geography_split": [
        {{"region": "Americas", "percentage": 60}}
    ]
}}
- trend must be "up" or "down".
- Make sure key_metrics has exactly 6 items: Revenue, Net Profit, EBIT Margin, EPS, Free Cash Flow, Deal Wins (or similar metrics).
- Ensure revenue_breakdown percentages sum up to 100.
- Ensure geography_split percentages sum up to 100.
- Do not include markdown formatting like ```json.
- CRITICAL: Distinguish carefully between "Profit Before Tax (PBT)" and "Net Profit / Profit After Tax (PAT)". If a number is explicitly labeled "Profit Before Tax", do NOT report it as "Net Profit".
- CRITICAL: Revenue must be Total Revenue or Revenue from Operations. NEVER use Segment Revenue.
- Prefer Consolidated over Standalone. Do not mix reporting years.
- Only return values explicitly available. If unavailable, return null. Never guess or fabricate.
"""),
            ("human", "Context chunks:\n{context}")
        ])

        self.chain = self.prompt | self.llm

    def extract(self, document_id: str):
        # 1. Retrieve chunks relevant to financial metrics
        queries = _retrieval_queries("", "")
        import time
        query_embeddings = None
        for attempt in range(3):
            try:
                query_embeddings = self.embeddings.embed_documents(queries)
                break
            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    logger.warning(f"Rate limit hit in ExtractionAgent. Sleeping 20s... (Attempt {attempt+1}/3)")
                    time.sleep(20)
                else:
                    raise e
                    
        if not query_embeddings or self.collection is None:
            if self.collection is None:
                logger.error("Cannot extract: ChromaDB collection is not available.")
            return {"key_metrics": [], "revenue_breakdown": [], "quarterly_trend": [], "geography_split": []}
            
        results = self.collection.query(
            query_embeddings=query_embeddings,  # type: ignore
            where={"document_id": document_id},
            n_results=10
        )
        
        raw_chunks = []
        documents = results.get("documents", [])
        metadatas = results.get("metadatas", [])
        ids = results.get("ids", [])
        
        for qi in range(len(documents)):
            for i, text in enumerate(documents[qi]):
                meta = metadatas[qi][i] if metadatas and qi < len(metadatas) and i < len(metadatas[qi]) else {}
                chunk_id = ids[qi][i] if ids and qi < len(ids) and i < len(ids[qi]) else f"chunk_{qi}_{i}"
                raw_chunks.append({
                    "content": text,
                    "chunk_id": chunk_id,
                    "metadata": meta
                })
                
        if not raw_chunks:
            logger.warning(f"No chunks found for document {document_id}")
            return {"key_metrics": [], "revenue_breakdown": [], "quarterly_trend": [], "geography_split": []}
            
        ranked = _dedup_and_rank(raw_chunks, company="", limit=15)
        
        context_parts = []
        for r in ranked:
            meta = r.get("metadata", {})
            chunk_id = r.get("chunk_id", "unknown")
            page = meta.get("page_number", 0) if isinstance(meta, dict) else 0
            context_parts.append(f"--- Chunk ID: {chunk_id} | Page: {page} ---\n{r['content']}")
            
        context = "\n\n".join(context_parts)
        
        try:
            response = self.chain.invoke({"context": context})
            raw_content = response.content
            # response.content can be a list in some LangChain/provider versions
            if isinstance(raw_content, list):
                raw_content = "".join(str(part) for part in raw_content)
            output = raw_content.strip()
            
            import re
            json_match = re.search(r'\{.*\}', output, re.DOTALL)
            if json_match:
                output = json_match.group(0)
                
            return json.loads(output)
            
        except Exception as e:
            logger.error(f"ExtractionAgent failed for {document_id}: {e}")
            return {"key_metrics": [], "revenue_breakdown": [], "quarterly_trend": [], "geography_split": []}