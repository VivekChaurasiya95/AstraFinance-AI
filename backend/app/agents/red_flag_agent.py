import os
import json
from loguru import logger
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from ..embeddings.chroma_client import get_document_collection
from ..embeddings.embedding_service import get_embeddings_model

from ..config.settings import settings

class RedFlagAgent:
    def __init__(self):
        groq_api_key = getattr(settings, "GROQ_API_KEY", None) or os.getenv("GROQ_API_KEY", "YOUR_GROQ_API_KEY")
        if not groq_api_key or groq_api_key == "YOUR_GROQ_API_KEY":
            logger.warning("Valid GROQ_API_KEY is required for RedFlagAgent. Using dummy key for startup.")
            groq_api_key = "dummy_key_to_prevent_startup_crash"

        self.llm = ChatGroq(
            model=os.getenv("MODEL_NAME", "llama-3.3-70b-versatile"),
            api_key=groq_api_key,
            temperature=0
        )
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

For each red flag found, return a JSON object containing:
- severity: "High", "Medium", or "Low"
- title: (short title of the risk)
- description: (detailed explanation of the risk)
- recommendation: (actionable advice to mitigate the risk)
- confidence: (float between 0 and 1)
- source_page: (integer, from chunk metadata)
- chunk_id: (string, the ID of the chunk)
- citation: (exact quote from the chunk supporting this risk)

Return ONLY valid JSON in this format:
{{
    "risk_level": "Medium",
    "red_flags": [
        {{
            "severity": "High",
            "title": "Increasing Debt",
            "description": "Debt increased by 40%",
            "recommendation": "Monitor leverage closely",
            "confidence": 0.9,
            "source_page": 10,
            "chunk_id": "doc123_10",
            "citation": "Total debt rose from 100M to 140M"
        }}
    ]
}}
Do NOT hallucinate. If no risks are found, return an empty array for red_flags and "Low" for risk_level. Do not include markdown formatting like ```json.
"""),
            ("human", "Context chunks:\n{context}")
        ])

        self.chain = self.prompt | self.llm

    def analyze(self, document_id: str):
        # Retrieve chunks relevant to financial risks
        queries = ["risk bankruptcy auditor warning debt liability lawsuit regulation downgrade"]
        import time
        query_embeddings = None
        for attempt in range(3):
            try:
                query_embeddings = self.embeddings.embed_documents(queries)
                break
            except Exception as e:
                if "429" in str(e) and attempt < 2:
                    logger.warning(f"Rate limit hit in RedFlagAgent. Sleeping 20s... (Attempt {attempt+1}/3)")
                    time.sleep(20)
                else:
                    raise e
                    
        if not query_embeddings or self.collection is None:
            if self.collection is None:
                logger.error("Cannot analyze: ChromaDB collection is not available.")
            return {"risk_level": "Low", "red_flags": []}
            
        results = self.collection.query(
            query_embeddings=query_embeddings,  # type: ignore
            where={"document_id": document_id},
            n_results=20
        )
        
        documents = results.get("documents")
        if not documents or not documents[0]:
            logger.warning(f"No chunks found for document {document_id}")
            return {"risk_level": "Low", "red_flags": []}
            
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
            logger.error(f"RedFlagAgent failed for {document_id}: {e}")
            return {"risk_level": "Low", "red_flags": []}