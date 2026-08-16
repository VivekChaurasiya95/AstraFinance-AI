import os
import json
import re
import time
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from langchain_core.prompts import ChatPromptTemplate
from ..llm import get_llm_router
from ..config.settings import settings

logger = logging.getLogger(__name__)

class FinancialMetrics(BaseModel):
    company_name: str
    revenue: Optional[str] = None
    expenses: Optional[str] = None
    gross_profit: Optional[str] = None
    operating_profit: Optional[str] = None
    ebitda: Optional[str] = None
    ebit: Optional[str] = None
    profit_before_tax: Optional[str] = None
    net_profit: Optional[str] = None
    eps: Optional[str] = None
    assets: Optional[str] = None
    liabilities: Optional[str] = None
    operating_cash_flow: Optional[str] = None
    investing_cash_flow: Optional[str] = None
    financing_cash_flow: Optional[str] = None
    profit_margin: Optional[str] = None
    expense_ratio: Optional[str] = None
    debt_ratio: Optional[str] = None
    current_ratio: Optional[str] = None
    debt_to_equity_ratio: Optional[str] = None
    roe: Optional[str] = None
    roa: Optional[str] = None
    roce: Optional[str] = None
    operating_margin: Optional[str] = None
    ebitda_margin: Optional[str] = None
    net_margin: Optional[str] = None
    # internal fields from ResearchAgent are ignored for API compatibility
    document: Optional[str] = None
    page: Optional[int] = None
    reference_id: Optional[str] = None

class BenchmarkResults(BaseModel):
    highest_revenue: str = ""
    highest_profit: str = ""
    highest_profit_margin: str = ""
    lowest_debt: str = ""
    best_liquidity: str = ""
    overall_winner: str = ""

class ComparisonAnalysis(BaseModel):
    revenue_analysis: str = ""
    profit_analysis: str = ""
    ratio_analysis: str = ""
    financial_health_analysis: str = ""

class ComparisonOutput(BaseModel):
    companies_compared: List[str] = []
    financial_metrics: List[FinancialMetrics] = []
    benchmark_results: BenchmarkResults = BenchmarkResults()
    comparison_analysis: ComparisonAnalysis = ComparisonAnalysis()
    insights: List[str] = []
    citations: List[dict] = []


def _normalize_year(year_str: str) -> str:
    if not year_str:
        return ""
    year_str = year_str.strip().upper()
    # E.g. 'FY25' -> 'FY2025', '2025' -> 'FY2025'
    match = re.match(r'^(?:FY)?(?:20)?(\d{2})$', year_str)
    if match:
        return f"FY20{match.group(1)}"
    return year_str

def _validate_year_and_type(companies_data: List[Dict[str, Any]]) -> bool:
    """Ensure all companies share the same financial year and reporting type.
    Returns True if valid, False otherwise (and logs a warning)."""
    years = set()
    for c in companies_data:
        raw_year = c.get("financial_year")
        if raw_year:
            years.add(_normalize_year(raw_year))
            
    types = {c.get("reporting_type") for c in companies_data if c.get("reporting_type")}
    
    if len(years) > 1 or len(types) > 1:
        logger.warning(
            "Comparison aborted: mismatched years or reporting types – normalized years=%s types=%s",
            years,
            types,
        )
        return False
    return True

def _score_company(m: FinancialMetrics) -> float:
    """Compute a composite score from available high‑value metrics.
    We weight profitability, liquidity and return metrics. Missing values are ignored.
    """
    score = 0.0
    weight_sum = 0.0
    rev = extract_num(m.revenue)
    marg = extract_num(m.profit_margin)
    liq = extract_num(m.current_ratio)
    debt = extract_num(m.debt_to_equity_ratio)
    roe = extract_num(m.roe)
    roa = extract_num(m.roa)

    if rev is not None:
        score += rev * 0.1
        weight_sum += 0.1
    if marg is not None:
        score += marg * 0.2
        weight_sum += 0.2
    if liq is not None:
        score += liq * 0.15
        weight_sum += 0.15
    if debt is not None and debt > 0:
        # lower debt‑to‑equity is better
        score += (1 / debt) * 0.15
        weight_sum += 0.15
    if roe is not None:
        score += roe * 0.2
        weight_sum += 0.2
    if roa is not None:
        score += roa * 0.1
        weight_sum += 0.1
    # Normalise to a 0‑100 scale when possible
    return round(score / weight_sum * 10, 2) if weight_sum > 0 else 0.0

def to_number(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)

    s = str(value).strip()
    currency_symbols = r'[$€£₹¥]'
    s = re.sub(currency_symbols, '', s)

    magnitude_map = {
        'billion': 1_000_000_000,
        'billions': 1_000_000_000,
        'million': 1_000_000,
        'millions': 1_000_000,
        'thousand': 1_000,
        'thousands': 1_000,
    }

    multiplier = 1.0
    for word, factor in magnitude_map.items():
        if word in s.lower():
            multiplier = factor
            s = re.sub(rf'\b{word}\b', '', s, flags=re.IGNORECASE)
            break

    s = s.replace(',', '').replace(' ', '')

    try:
        number = float(s)
        return number * multiplier
    except ValueError:
        return None

def extract_num(value: Any) -> Optional[float]:
    if value is None: return None
    if isinstance(value, (int, float)): return float(value)
    s = str(value)
    # find the first number pattern, optionally negative and decimal
    match = re.search(r'-?\d+(\.\d+)?', s)
    if match:
        return float(match.group())
    return None

def clean_string(value: Any) -> Optional[str]:
    if value is None: return None
    s = str(value).strip()
    if s.lower() in ("none", "null", "n/a", "-", ""):
        return None
    return s


def calculate_metrics(company_data: Dict[str, Any]) -> FinancialMetrics:
    name = company_data.get("company_name", "Unknown")
    ratios = company_data.get("financial_ratios") or {}
    meta = company_data.get("source_metadata", {})

    return FinancialMetrics(
        company_name=name,
        revenue=clean_string(company_data.get("revenue")),
        expenses=clean_string(company_data.get("expenses")),
        gross_profit=clean_string(company_data.get("gross_profit")),
        operating_profit=clean_string(company_data.get("operating_profit")),
        ebitda=clean_string(company_data.get("ebitda")),
        ebit=clean_string(company_data.get("ebit")),
        profit_before_tax=clean_string(company_data.get("profit_before_tax")),
        net_profit=clean_string(company_data.get("net_profit")),
        eps=clean_string(ratios.get("eps")),
        assets=clean_string(company_data.get("assets")),
        liabilities=clean_string(company_data.get("liabilities")),
        operating_cash_flow=clean_string(company_data.get("operating_cash_flow")),
        investing_cash_flow=clean_string(company_data.get("investing_cash_flow")),
        financing_cash_flow=clean_string(company_data.get("financing_cash_flow")),
        profit_margin=clean_string(ratios.get("net_margin")) or clean_string(company_data.get("net_margin")),
        expense_ratio=None,
        debt_ratio=None,
        current_ratio=clean_string(ratios.get("current_ratio")),
        debt_to_equity_ratio=clean_string(ratios.get("debt_to_equity_ratio")),
        roe=clean_string(ratios.get("roe")),
        roa=clean_string(ratios.get("roa")),
        roce=clean_string(ratios.get("roce")),
        operating_margin=clean_string(ratios.get("operating_margin")),
        ebitda_margin=clean_string(ratios.get("ebitda_margin")),
        net_margin=clean_string(ratios.get("net_margin")),
        document=meta.get("document"),
        page=meta.get("page"),
        reference_id=meta.get("reference_id"),
    )

def compute_benchmarks(metrics_list: List[FinancialMetrics]) -> dict:
    best_revenue = None
    best_profit = None
    best_margin = None
    lowest_debt = None
    best_liquidity = None

    for m in metrics_list:
        rev = extract_num(m.revenue)
        prof = extract_num(m.net_profit)
        marg = extract_num(m.profit_margin)
        debt = extract_num(m.debt_to_equity_ratio)
        liq = extract_num(m.current_ratio)

        if rev is not None:
            if best_revenue is None or rev > best_revenue[1]:
                best_revenue = (m.company_name, rev)
        if prof is not None:
            if best_profit is None or prof > best_profit[1]:
                best_profit = (m.company_name, prof)
        if marg is not None:
            if best_margin is None or marg > best_margin[1]:
                best_margin = (m.company_name, marg)
        if debt is not None:
            if lowest_debt is None or debt < lowest_debt[1]:
                lowest_debt = (m.company_name, debt)
        if liq is not None:
            if best_liquidity is None or liq > best_liquidity[1]:
                best_liquidity = (m.company_name, liq)

    overall_winner = ""
    if metrics_list:
        scores = {}
        for m in metrics_list:
            score = 0
            prof = extract_num(m.net_profit)
            marg = extract_num(m.profit_margin)
            debt = extract_num(m.debt_to_equity_ratio)
            
            if marg is not None:
                score += marg * 0.4
            if prof is not None:
                prof_vals = [v for x in metrics_list if (v := extract_num(x.net_profit)) is not None]
                max_profit = max(prof_vals, default=1.0)
                if max_profit > 0:
                    score += (prof / max_profit) * 0.3 * 100
            if debt is not None:
                debt_vals = [v for x in metrics_list if (v := extract_num(x.debt_to_equity_ratio)) is not None]
                max_debt = max(debt_vals, default=1.0)
                if max_debt > 0:
                    score += (1 - (debt / max_debt)) * 0.3 * 100
            scores[m.company_name] = score
        if scores:
            overall_winner = max(scores, key=lambda k: scores[k])

    return {
        "highest_revenue": best_revenue[0] if best_revenue else "",
        "highest_profit": best_profit[0] if best_profit else "",
        "highest_profit_margin": best_margin[0] if best_margin else "",
        "lowest_debt": lowest_debt[0] if lowest_debt else "",
        "best_liquidity": best_liquidity[0] if best_liquidity else "",
        "overall_winner": overall_winner,
    }

def collect_citations(metrics_list: List[FinancialMetrics]) -> List[dict]:
    citations = []
    for m in metrics_list:
        citations.append({
            "company_name": m.company_name,
            "document": m.document,
            "page": m.page,
            "reference_id": m.reference_id,
        })
    return citations

COMPARISON_PROMPT = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            """You are an expert financial analyst.
You are given a JSON object containing calculated financial metrics for several companies.
Do NOT recompute any numbers. Do NOT make any calculations.
Only explain the meaning of the data, compare the companies, and provide insights.

Return ONLY a valid JSON object with the following structure:
{{
    "comparison_analysis": {{
        "revenue_analysis": "Compare revenue figures, growth, and efficiency.",
        "profit_analysis": "Compare gross profit, operating profit, EBITDA, and net profit. Discuss margins.",
        "ratio_analysis": "Compare current ratio, debt-to-equity, ROE, ROA, ROCE. Explain liquidity, solvency, profitability, and cash flows.",
        "financial_health_analysis": "Professional executive summary of financial strength. Must include: Strengths, Weaknesses, and declare the Overall Winner based only on available metrics."
    }},
    "insights": [
        "First investor-style insight.",
        "Second insight.",
        "Third insight."
    ]
}}

Rules:
- The JSON must be valid and parseable.
- Do NOT include markdown fences.
- Do not add any extra text outside the JSON.
- If a metric is missing, mention it is missing. NEVER hallucinate or compare null values.
- Make the comparison factual, professional, and business-focused.
"""
        ),
        (
            "human",
            "{computed_metrics}"
        ),
    ]
)

class ComparisonAgent:

    def __init__(self):
        pass

    def _get_llm_analysis(self, computed_metrics_json: str, user_settings: dict = None) -> Dict[str, Any]:
        content = ""
        try:
            messages = COMPARISON_PROMPT.format_messages(computed_metrics=computed_metrics_json)
            router = get_llm_router()
            response = router.invoke("comparison", messages, user_settings=user_settings, temperature=0.1)
            content = response.content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            return json.loads(content)
        except Exception as e:
            logger.error("LLM analysis parsing failed: %s. Raw: %s", e, content)
            raise RuntimeError(f"LLM analysis failed: {e}")

    def compare(self, companies_data: List[Dict[str, Any]], user_settings: dict = None) -> str:
        logger.info("Starting comparison for %d companies.", len(companies_data))
        start_time = time.time()

        if len(companies_data) < 1:
            logger.warning("Comparison requires at least one company.")
            return ComparisonOutput().model_dump_json(indent=2)

        # Validate financial year & reporting type compatibility
        if not _validate_year_and_type(companies_data):
            return json.dumps({
                "status": "failed",
                "message": "Companies have mismatched financial years or reporting types. Comparison aborted."
            })

        metrics_list: List[FinancialMetrics] = []
        missing_metrics: Dict[str, List[str]] = {}
        for raw in companies_data:
            try:
                fm = calculate_metrics(raw)
                metrics_list.append(fm)
                # Track which top‑level metrics are missing for this company
                for field in FinancialMetrics.model_fields:
                    if getattr(fm, field) is None and field not in {"company_name", "document", "page", "reference_id"}:
                        missing_metrics.setdefault(fm.company_name, []).append(field)
            except Exception as e:
                logger.error("Failed to process company %s: %s", raw.get("company_name", "?"), e)

        if not metrics_list:
            logger.warning("No valid company data to compare after processing.")
            return ComparisonOutput().model_dump_json(indent=2)

        benchmarks = BenchmarkResults(**compute_benchmarks(metrics_list))

        # Build LLM input – we deliberately keep the original field names so the schema stays unchanged
        llm_input = {
            "companies": [m.model_dump(exclude={"document", "page", "reference_id"}) for m in metrics_list],
            "benchmarks": benchmarks.model_dump(),
            "missing_metrics": missing_metrics,
        }
        llm_json = json.dumps(llm_input, indent=2)

        try:
            llm_output = self._get_llm_analysis(llm_json, user_settings=user_settings)
        except RuntimeError as e:
            return json.dumps({
                "status": "failed",
                "message": "Comparison analysis could not be completed because all configured AI providers failed. Please try again later."
            })

        analysis = ComparisonAnalysis(**llm_output.get("comparison_analysis", {}))
        insights = llm_output.get("insights", [])

        citations = collect_citations(metrics_list)

        # Overall winner based on composite score if LLM did not provide one
        overall_winner = llm_output.get("benchmark_results", {}).get("overall_winner")
        if not overall_winner:
            scores = {m.company_name: _score_company(m) for m in metrics_list}
            if any(v > 0 for v in scores.values()):
                overall_winner = max(scores, key=lambda k: scores[k])
            else:
                overall_winner = "Unable to determine due to insufficient information."
        benchmarks.overall_winner = overall_winner

        output = ComparisonOutput(
            companies_compared=[m.company_name for m in metrics_list],
            financial_metrics=metrics_list,
            benchmark_results=benchmarks,
            comparison_analysis=analysis,
            insights=insights,
            citations=citations,
        )

        logger.info(
            "Comparison completed for %d companies in %.2fs – winner: %s",
            len(metrics_list),
            time.time() - start_time,
            overall_winner,
        )
        return output.model_dump_json(indent=2)