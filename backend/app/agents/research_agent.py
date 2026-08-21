import json
import os
import time
import re
import hashlib
import logging
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from langchain_core.messages import HumanMessage
from ..llm import get_llm_router

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings

load_dotenv()

logger = logging.getLogger(__name__)


def _extract_text_content(content: Any) -> str:
    """Safely extract a string from an LLM response content field.
    Some providers (e.g. Gemini via LangChain) return a list of content blocks
    instead of a plain string."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
            elif isinstance(part, str):
                parts.append(part)
        return "".join(parts)
    return str(content)

records: List[Dict[str, Any]] = []

def add_record(data: Dict[str, Any]) -> None:
    records.append(data)


ALIASES = {
    "company_name": ["company_name", "company", "name", "company_title"],
    "revenue": ["revenue", "total_revenue", "gross_revenue", "sales"],
    "expenses": ["expenses", "total_expenses", "operating_expenses", "costs"],
    "net_profit": ["net_profit", "profit", "net_income", "net_earnings"],
    "financial_ratios": ["financial_ratios", "ratios", "financial_ratio"],
    "source_metadata": ["source_metadata", "metadata", "source"],
}


def clean_record(raw: Dict[str, Any]) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    for key, options in ALIASES.items():
        for name in options:
            if name in raw:
                result[key] = raw[name]
                break
        else:
            result[key] = None
    for k, v in raw.items():
        if k not in result:
            result[k] = v
    return result


def load_records(source: Any) -> int:
    if isinstance(source, str):
        if not os.path.exists(source):
            raise FileNotFoundError(f"File not found: {source}")
        with open(source, "r", encoding="utf-8") as f:
            raw_list = json.load(f)
    elif isinstance(source, list):
        raw_list = source
    else:
        raise TypeError("source must be a JSON file path or a list of dicts.")

    if not isinstance(raw_list, list):
        raise ValueError("JSON file must contain a list of records.")

    count = 0
    for raw in raw_list:
        add_record(clean_record(raw))
        count += 1
    return count





# --- Chunk Ranking & Deduplication Helpers ---

_FINANCIAL_KW = re.compile(
    r'\b(?:revenue|sales|income|profit|loss|ebitda|ebit|pat|pbt|expenses?|costs?|margin|eps|'
    r'earnings|dividend|assets?|liabilities|equity|reserves|net\s*worth|capital|debt|'
    r'cash\s*flow|ratio|roe|roa|roce|turnover)\b', re.IGNORECASE
)

_STATEMENT_RE = re.compile(
    r'statement of profit and loss|profit and loss|income statement|'
    r'balance sheet|statement of financial position|'
    r'cash flow statement|statement of cash flows|'
    r'financial highlights|key financial indicators|financial ratios',
    re.IGNORECASE
)


def _score_chunk(text: str, company_name: str) -> int:
    """Score a chunk for financial relevance. Higher = more relevant."""
    score = 0
    text_lower = text.lower()
    # Company name match (+3)
    first_word = company_name.split()[0].lower() if company_name else ""
    if first_word and len(first_word) > 2 and first_word in text_lower:
        score += 3
    # Financial keyword density (capped at +5)
    score += min(len(_FINANCIAL_KW.findall(text_lower)), 5)
    # Primary statements get huge boost (+10), regular headings (+3)
    if re.search(r'consolidated statement of profit|balance sheet|cash flow statement', text_lower):
        score += 10
    elif _STATEMENT_RE.search(text_lower):
        score += 3
    # Penalize segment reporting to avoid metric confusion (-5)
    if re.search(r'segment revenue|segment reporting|segment profit', text_lower):
        score -= 5
    # Tabular numeric content (+2) or large numbers (+1)
    if re.search(r'[\d,]+\.?\d*\s*(?:cr|crore|lakh|million|billion|mn|bn|₹|\$|€|£)', text_lower):
        score += 2
    elif re.search(r'[\d,]{4,}', text):
        score += 1
    # Current reporting years (+3)
    if re.search(r'\b(?:2024|2025|fy24|fy25)\b', text_lower):
        score += 3
    return score


def _dedup_and_rank(chunks: List[Dict], company: str, limit: int = 20) -> List[Dict]:
    """Deduplicate chunks by content hash, rank by relevance, return top N."""
    seen = set()
    unique = []
    for c in chunks:
        content = c.get("content", "")
        h = hashlib.md5(content[:500].encode()).hexdigest()
        if h not in seen:
            seen.add(h)
            c["_score"] = _score_chunk(content, company)
            unique.append(c)
    unique.sort(key=lambda x: x["_score"], reverse=True)
    logger.info("Chunks: %d raw -> %d unique -> top %d selected",
                len(chunks), len(unique), min(len(unique), limit))
    return unique[:limit]


def _retrieval_queries(company: str, question: str) -> List[str]:
    """Generate 6-8 focused retrieval queries covering all financial areas."""
    prefix = f"{company} " if company and company != "Workspace Context" else ""
    queries = [
        f"{prefix}Revenue from Operations Total Revenue",
        f"{prefix}Statement of Profit and Loss Net Profit PAT",
        f"{prefix}EBITDA EBIT Operating Profit",
        f"{prefix}Balance Sheet Total Assets Liabilities",
        f"{prefix}Cash Flow Statement",
        f"{prefix}Financial Ratios EPS",
    ]
    if question.strip():
        queries.append(f"{prefix}{question}")
    return queries


def call_document_agent(company_name: str, question: str = "", workspace_id: str | None = None) -> Optional[List[Dict[str, Any]]]:
    results = []
    queries = _retrieval_queries(company_name, question)
    logger.info("Retrieval: %d queries for '%s'", len(queries), company_name)

    # 1. Search ChromaDB (primary store for user-uploaded documents)
    try:
        from ..embeddings.chroma_client import get_collection_for_provider
        from ..embeddings.embedding_router import embedding_router

        router_results = embedding_router.embed_queries(queries)
        where_filter = {"workspace_id": workspace_id} if workspace_id else None

        for provider, config in router_results.items():
            try:
                collection = get_collection_for_provider(provider, config["model"])
                
                if where_filter:
                    chroma_results = collection.query(
                        query_embeddings=config["embeddings"],
                        n_results=8,
                        where=where_filter  # type: ignore
                    )
                else:
                    chroma_results = collection.query(
                        query_embeddings=config["embeddings"],
                        n_results=8
                    )

                documents = chroma_results.get("documents") or []
                metadatas = chroma_results.get("metadatas") or []

                for qi in range(len(documents)):
                    for i, text in enumerate(documents[qi]):
                        meta = metadatas[qi][i] if qi < len(metadatas) and i < len(metadatas[qi]) else {}
                        results.append(
                            {
                                "company_name": meta.get("company_name", company_name),
                                "content": text,
                                "source_metadata": {
                                    "document": meta.get("file_name") or meta.get("document", "Uploaded Document"),
                                    "page": meta.get("page_number") or meta.get("page"),
                                    "reference_id": meta.get("chunk_index") or meta.get("chunk_id"),
                                },
                            }
                        )
            except Exception as e:
                logger.warning("ChromaDB retrieval failed for %s: %s", provider, e)
                
        logger.info("ChromaDB returned %d total chunks across %d queries", len(results), len(queries))
    except Exception as e:
        logger.warning("ChromaDB retrieval failed or not available: %s", e)



    # Deduplicate, rank, and return top chunks
    if results:
        ranked = _dedup_and_rank(results, company_name)
        for r in ranked:
            r.pop("_score", None)
        logger.info("Returning %d ranked chunks for '%s'", len(ranked), company_name)
        return ranked

    # 3. Fallback to static records if no vector results
    if records:
        target = company_name.strip().lower()
        first_word = target.split()[0]
        filtered = [r for r in records if first_word in str(r.get("company_name", "")).lower()]
        if filtered:
            logger.info("Returning %d static records for %s", len(filtered), company_name)
            return filtered

    logger.info("No matching documents found for '%s'", company_name)
    return None



def search_company(company_name: str, question: str, workspace_id: str | None = None) -> str:
    """Search the vector store for financial information about a company.

    Args:
        company_name: The exact name of the company to search for.
        question: The full user query or question to focus the retrieval on.
    """
    logger.info("Tool search_company called for '%s' with question: '%s'", company_name, question)

    try:
        document_results = call_document_agent(company_name, question, workspace_id)
    except Exception as e:
        logger.error("Unexpected error during document retrieval: %s", e)
        document_results = None

    if document_results:
        for rec in document_results:
            if "company_name" not in rec:
                rec["company_name"] = company_name
        return json.dumps(document_results)

    return f"NO_DATA: No records found for '{company_name}'."


class ResearchAgent:
    def __init__(self):
        pass

    def _extract_company_names(self, user_query: str, user_settings: dict | None = None) -> List[str]:
        """Use the LLM to extract company names from the user query."""
        prompt = (
            "Extract all company names from the following user query. "
            "Return ONLY a JSON array of company name strings. "
            "Do not include any extra text, markdown fences, or explanations.\n\n"
            "Examples:\n"
            '  Query: "What is the revenue of Apple?" -> ["Apple"]\n'
            '  Query: "Compare Microsoft and Google financials" -> ["Microsoft", "Google"]\n'
            '  Query: "Tell me about Tesla debt ratio" -> ["Tesla"]\n\n'
            f'Query: "{user_query}"'
        )
        try:
            router = get_llm_router()
            response = router.invoke("research", [HumanMessage(content=prompt)], user_settings=user_settings, temperature=0.0)
            content = _extract_text_content(response.content).strip()
            # Strip markdown fences if present
            if content.startswith("```"):
                content = re.sub(r'^```(?:json)?\s*', '', content)
                content = re.sub(r'\s*```$', '', content)
            names = json.loads(content)
            if isinstance(names, list):
                return [str(n).strip() for n in names if str(n).strip()]
        except Exception as e:
            logger.warning("LLM company extraction failed: %s, falling back to regex", e)

        # Fallback: simple regex-based extraction (capitalize words that look like names)
        words = re.findall(r'\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*\b', user_query)
        stop_words = {
            "What", "Where", "When", "How", "Why", "Which", "Who",
            "Tell", "Show", "Give", "Compare", "Find", "Get", "Is",
            "The", "And", "For", "Net", "Total", "Revenue", "Income",
            "Profit", "Expenses", "Ratio", "Debt", "Financial",
        }
        return [w for w in words if w not in stop_words]

    def _resolve_company_name(self, name: str, docs: List[Dict]) -> str:
        """Resolve the actual company name from chunk metadata.
        Priority: 1) metadata company_name  2) user-provided name.
        Never returns a filename."""
        for doc in docs:
            meta_name = doc.get("company_name", "")
            if not meta_name:
                continue
            # Skip filename-like strings (e.g. "RIL-Integrated-Annual-Report-2024.pdf")
            if re.search(r'\.\w{2,4}$', meta_name):
                continue
            if meta_name.count('-') > 2:
                continue
            return meta_name
        return name

    def _safe_json_parse(self, raw_output: str) -> str:
        cleaned = raw_output.strip()
        json_match = re.search(r'```(?:json)?\s*(.*?)\s*```', cleaned, re.DOTALL)
        if json_match:
            cleaned = json_match.group(1).strip()

        # Try to extract JSON object if LLM added surrounding text
        if not cleaned.startswith("{"):
            obj_match = re.search(r'\{.*\}', cleaned, re.DOTALL)
            if obj_match:
                cleaned = obj_match.group(0)

        cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)

        try:
            json.loads(cleaned)
            return cleaned
        except json.JSONDecodeError as e:
            logger.warning("JSON parsing failed: %s. Raw output: %s", e, raw_output[:200])
            return json.dumps({
                "companies": [],
                "analysis": "Failed to parse agent response.",
                "comparison": "",
                "insights": [],
                "citations": [],
                "missing_companies": [],
                "raw_response": raw_output,
            })

    def _build_final_response(self, raw_output: str) -> str:
        parsed_str = self._safe_json_parse(raw_output)
        try:
            data = json.loads(parsed_str)
        except json.JSONDecodeError:
            return parsed_str
        
        if "companies" not in data: return parsed_str
        
        final_citations = []
        ratio_keys = {"current_ratio", "quick_ratio", "debt_to_equity_ratio", "roe", "roa", "roce", "operating_margin", "ebitda_margin", "net_margin", "eps"}
        
        metrics_found, metrics_missed = 0, 0
        
        for comp in data.get("companies", []):
            internal = comp.pop("_internal_metrics", {})
            ratios = {}
            for key, metric in internal.items():
                if not isinstance(metric, dict): continue
                val = metric.get("value")
                if val and metric.get("confidence") == "High":
                    metrics_found += 1
                    if metric.get("document"):
                        final_citations.append({
                            "company_name": comp.get("company_name", ""),
                            "field": key, "document": metric.get("document"),
                            "page": metric.get("page"), "reference_id": metric.get("reference_id")
                        })
                    if key in ratio_keys: ratios[key] = val
                    else: comp[key] = val
                else:
                    metrics_missed += 1
                    if key in ratio_keys: ratios[key] = None
                    else: comp[key] = None
            comp["financial_ratios"] = ratios
            logger.info("Company '%s' (%s - %s): Extracted %d High-confidence metrics, filtered %d",
                        comp.get("company_name"), comp.get("financial_year"), comp.get("reporting_type"),
                        metrics_found, metrics_missed)
            
        data["citations"] = final_citations
        return json.dumps(data)

    def analyze(self, user_query: str, workspace_id: str | None = None, user_settings: dict | None = None) -> str:
        start_time = time.time()
        logger.info("=== Research Agent Query: %s ===", user_query)

        # Step 1: Extract company names from the query
        company_names = self._extract_company_names(user_query, user_settings=user_settings)
        logger.info("Detected companies: %s", company_names)

        if not company_names and not workspace_id:
            return json.dumps({
                "companies": [],
                "analysis": "No company names could be identified in your query. Please mention a specific company name.",
                "comparison": "",
                "insights": [],
                "citations": [],
                "missing_companies": [],
            })

        if not company_names and workspace_id:
            company_names = ["Workspace Context"]

        # Step 2: Retrieve data for each company
        retrieval_start = time.time()
        all_results = {}
        missing_companies = []

        for name in company_names:
            logger.info("Retrieving data for: %s", name)
            try:
                data = call_document_agent(name, user_query, workspace_id)
            except Exception as e:
                logger.error("Error retrieving data for %s: %s", name, e)
                data = None

            if data:
                resolved = self._resolve_company_name(name, data)
                if resolved != name:
                    logger.info("Company name resolved: '%s' -> '%s'", name, resolved)
                all_results[resolved] = data
            else:
                missing_companies.append(name)

        retrieval_time = time.time() - retrieval_start
        logger.info("Retrieval completed in %.2fs for %d companies", retrieval_time, len(all_results))

        # Step 3: Build optimized context from ranked chunks
        context_parts = []
        for company, docs in all_results.items():
            context_parts.append(f"=== Data for {company} ===")
            for doc in docs:
                meta = doc.get("source_metadata", {})
                pg = f" | Page: {meta.get('page')}" if meta.get("page") else ""
                context_parts.append(
                    f"[Source: {meta.get('document', 'N/A')}{pg}]\n{doc.get('content', '')}"
                )

        if not context_parts:
            return json.dumps({
                "companies": [{"company_name": n, "found": False} for n in company_names],
                "analysis": "No financial data found for the requested companies.",
                "comparison": "",
                "insights": [],
                "citations": [],
                "missing_companies": company_names,
            })

        retrieved_data = "\n\n".join(context_parts)

        # Step 4: Comprehensive LLM analysis with strict metric validation
        analysis_prompt = f"""You are an expert Financial Research Agent assisting a user with their documents.

User query: "{user_query}"

Retrieved data:
{retrieved_data}

INSTRUCTIONS:
1. Answer the user's query DIRECTLY in the "analysis" field based on the Retrieved data.
2. If the user asks a general conversational question (like "hello", "how are you"), respond politely in the "analysis" field and leave financial arrays empty.
3. If the user asks for financial data, metrics, or comparisons, extract and populate the "companies" array.
4. If there is no relevant financial data for the query, just provide your textual answer in the "analysis" field.
5. IF the user's query contains an "Image description", base your answer about the image ENTIRELY on that description. Do NOT falsely claim the image is a financial report just because financial data was retrieved.

Return a valid JSON object with this structure:
{{
  "companies": [{{ // Only include if relevant financial data is extracted
    "company_name": "Actual company name from report (NEVER use filename)", "found": true,
    "financial_year": "e.g. FY2025 or null", "reporting_type": "Consolidated or Standalone or null",
    "_internal_metrics": {{
      "revenue": {{"value": "...", "source_label": "...", "page": "...", "document": "...", "reference_id": "...", "confidence": "High/Medium/Low"}},
      "expenses": {{"value": "...", "confidence": "High/Medium/Low"}},
      "net_profit": {{"value": "...", "confidence": "High/Medium/Low"}},
      "gross_profit": {{"value": "...", "confidence": "High/Medium/Low"}},
      "operating_profit": {{"value": "...", "confidence": "High/Medium/Low"}},
      "ebitda": {{"value": "...", "confidence": "High/Medium/Low"}},
      "ebit": {{"value": "...", "confidence": "High/Medium/Low"}},
      "profit_before_tax": {{"value": "...", "confidence": "High/Medium/Low"}},
      "total_assets": {{"value": "...", "confidence": "High/Medium/Low"}},
      "total_liabilities": {{"value": "...", "confidence": "High/Medium/Low"}},
      "shareholders_equity": {{"value": "...", "confidence": "High/Medium/Low"}},
      "operating_cash_flow": {{"value": "...", "confidence": "High/Medium/Low"}},
      "investing_cash_flow": {{"value": "...", "confidence": "High/Medium/Low"}},
      "financing_cash_flow": {{"value": "...", "confidence": "High/Medium/Low"}},
      "current_ratio": {{"value": "...", "confidence": "High/Medium/Low"}},
      "quick_ratio": {{"value": "...", "confidence": "High/Medium/Low"}},
      "debt_to_equity_ratio": {{"value": "...", "confidence": "High/Medium/Low"}},
      "roe": {{"value": "...", "confidence": "High/Medium/Low"}},
      "roa": {{"value": "...", "confidence": "High/Medium/Low"}},
      "roce": {{"value": "...", "confidence": "High/Medium/Low"}},
      "operating_margin": {{"value": "...", "confidence": "High/Medium/Low"}},
      "ebitda_margin": {{"value": "...", "confidence": "High/Medium/Low"}},
      "net_margin": {{"value": "...", "confidence": "High/Medium/Low"}},
      "eps": {{"value": "...", "confidence": "High/Medium/Low"}}
    }}
  }}],
  "analysis": "Direct answer to the User query. Be conversational if they just said hello. Be detailed if they asked a question.",
  "comparison": "Side-by-side comparison if multiple companies, else empty string.",
  "insights": ["2-4 concise data-driven insights if applicable, else empty."],
  "missing_companies": {json.dumps(missing_companies)}
}}

CONFIDENCE SCORING (CRITICAL):
- High: Exact label match in a clear table, same company, same year.
- Medium: Inferred value or somewhat unclear table structure.
- Low: Found in a paragraph, ambiguous year, or uncertain label.
(Note: Include source_label, page, document, reference_id for ALL metrics).

METRIC LABEL VALIDATION & STATEMENT PRIORITY (CRITICAL):
- PRIORITY: 1) Consolidated Statement of Profit & Loss / Balance Sheet / Cash Flow, 2) Notes. NEVER use Segment Reporting if primary statements exist.
- revenue ONLY from: Revenue, Revenue from Operations, Total Revenue. NEVER from Segment Revenue.
- net_profit ONLY from: Net Profit, Profit After Tax, PAT. NEVER from PBT/EBIT/EBITDA or Segment Profit.
- ebitda ONLY from explicit EBITDA labels.
- profit_before_tax ONLY from: Profit Before Tax, PBT.
- operating_profit from: Operating Profit, Profit from Operations.

CONSISTENCY RULES:
- Prefer Consolidated over Standalone.
- ALL metrics must be from SAME financial year and reporting period. NEVER mix years.
- company_name = official legal name from report, NEVER a filename.
- If metric not found, set null. NEVER fabricate.

Return ONLY the JSON object. No markdown fences."""

        llm_start = time.time()
        try:
            router = get_llm_router()
            response = router.invoke("research", [HumanMessage(content=analysis_prompt)], user_settings=user_settings, temperature=0.0)
            raw_output = _extract_text_content(response.content)
        except Exception as e:
            logger.error("LLM analysis failed: %s", e)
            return json.dumps({
                "companies": [],
                "analysis": "",
                "comparison": "",
                "insights": [],
                "citations": [],
                "missing_companies": missing_companies,
                "error": f"LLM analysis failed: {str(e)}",
            })

        llm_time = time.time() - llm_start
        total_time = time.time() - start_time
        logger.info("Timing: retrieval=%.2fs LLM=%.2fs total=%.2fs | Context=%d chars Response=%d chars",
                     retrieval_time, llm_time, total_time, len(retrieved_data), len(raw_output))

        return self._build_final_response(raw_output)