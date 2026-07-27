import os
import json
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from ..embeddings.chroma_client import get_document_collection
from ..embeddings.embedding_service import get_embeddings_model

from ..config.settings import settings

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
        self.collection = get_document_collection()
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
"""),
            ("human", "Context chunks:\n{context}")
        ])

        self.chain = self.prompt | self.llm

    def extract(self, document_id: str):
        # 1. Retrieve chunks relevant to financial metrics
        queries = ["Financial summary revenue profit margin debt assets liabilities EPS ROE"]
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
                    
        if not query_embeddings:
            return {"key_metrics": [], "revenue_breakdown": [], "quarterly_trend": [], "geography_split": []}
            
        results = self.collection.query(
            query_embeddings=query_embeddings,  # type: ignore
            where={"document_id": document_id},
            n_results=10
        )
        
        documents = results.get("documents")
        if not documents or not documents[0]:
            logger.warning(f"No chunks found for document {document_id}")
            return {"key_metrics": [], "revenue_breakdown": [], "quarterly_trend": [], "geography_split": []}
            
        context_parts = []
        metadatas = results.get("metadatas")
        ids = results.get("ids")
        
        for i, text in enumerate(documents[0]):
            meta = metadatas[0][i] if metadatas and metadatas[0] else {}
            chunk_id = ids[0][i] if ids and ids[0] else f"chunk_{i}"
            page = meta.get("page_number", 0) if isinstance(meta, dict) else 0
            context_parts.append(f"--- Chunk ID: {chunk_id} | Page: {page} ---\n{text}")
            
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