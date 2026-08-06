import os
import json
import re
import logging
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

logger = logging.getLogger(__name__)

class FinancialMetrics(BaseModel):
    company_name: str
    revenue: Optional[float] = None
    expenses: Optional[float] = None
    gross_profit: Optional[float] = None
    operating_profit: Optional[float] = None
    ebitda: Optional[float] = None
    ebit: Optional[float] = None
    profit_before_tax: Optional[float] = None
    net_profit: Optional[float] = None
    eps: Optional[float] = None
    assets: Optional[float] = None
    liabilities: Optional[float] = None
    operating_cash_flow: Optional[float] = None
    investing_cash_flow: Optional[float] = None
    financing_cash_flow: Optional[float] = None
    profit_margin: Optional[float] = None
    expense_ratio: Optional[float] = None
    debt_ratio: Optional[float] = None
    current_ratio: Optional[float] = None
    debt_to_equity_ratio: Optional[float] = None
    roe: Optional[float] = None
    roa: Optional[float] = None
    roce: Optional[float] = None
    operating_margin: Optional[float] = None
    ebitda_margin: Optional[float] = None
    net_margin: Optional[float] = None
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


def _validate_year_and_type(companies_data: List[Dict[str, Any]]) -> bool:
    """Ensure all companies share the same financial year and reporting type.
    Returns True if valid, False otherwise (and logs a warning)."""
    years = {c.get("financial_year") for c in companies_data if c.get("financial_year")}
    types = {c.get("reporting_type") for c in companies_data if c.get("reporting_type")}
    if len(years) > 1 or len(types) > 1:
        logger.warning(
            "Comparison aborted: mismatched years or reporting types – years=%s types=%s",
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
    if m.revenue is not None:
        score += m.revenue * 0.1
        weight_sum += 0.1
    if m.profit_margin is not None:
        score += m.profit_margin * 0.2
        weight_sum += 0.2
    if m.current_ratio is not None:
        score += m.current_ratio * 0.15
        weight_sum += 0.15
    if m.debt_to_equity_ratio is not None:
        # lower debt‑to‑equity is better
        score += (1 / m.debt_to_equity_ratio) * 0.15
        weight_sum += 0.15
    if m.roe is not None:
        score += m.roe * 0.2
        weight_sum += 0.2
    if m.roa is not None:
        score += m.roa * 0.1
        weight_sum += 0.1
    # Normalise to a 0‑100 scale when possible
    return round(score / weight_sum * 10, 2) if weight_sum > 0 else 0.0

    if isinstance(value, (int, float)):
        return float(value)

    s = str(value).strip()
    currency_symbols = r'[\$\€\£\₹\¥]'
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
        logger.warning("Could not convert value '%s' to number.", value)
        return None


def calculate_metrics(company_data: Dict[str, Any]) -> FinancialMetrics:
    name = company_data.get("company_name", "Unknown")
    revenue = to_number(company_data.get("revenue"))
    expenses = to_number(company_data.get("expenses"))
    gross_profit = to_number(company_data.get("gross_profit"))
    operating_profit = to_number(company_data.get("operating_profit"))
    ebitda = to_number(company_data.get("ebitda"))
    ebit = to_number(company_data.get("ebit"))
    profit_before_tax = to_number(company_data.get("profit_before_tax"))
    net_profit = to_number(company_data.get("net_profit"))
    assets = to_number(company_data.get("assets"))
    liabilities = to_number(company_data.get("liabilities"))
    operating_cash_flow = to_number(company_data.get("operating_cash_flow"))
    investing_cash_flow = to_number(company_data.get("investing_cash_flow"))
    financing_cash_flow = to_number(company_data.get("financing_cash_flow"))
    ratios = company_data.get("financial_ratios") or {}
    meta = company_data.get("source_metadata", {})

    profit_margin = None
    if revenue and net_profit is not None:
        profit_margin = round((net_profit / revenue) * 100, 2)

    expense_ratio = None
    if revenue and expenses is not None:
        expense_ratio = round((expenses / revenue) * 100, 2)

    debt_ratio = None
    if assets and liabilities is not None and assets > 0:
        debt_ratio = round((liabilities / assets) * 100, 2)

    current_ratio = to_number(ratios.get("current_ratio"))
    debt_to_equity = to_number(ratios.get("debt_to_equity_ratio"))
    roe = to_number(ratios.get("roe"))
    roa = to_number(ratios.get("roa"))

    return FinancialMetrics(
        company_name=name,
        revenue=revenue,
        expenses=expenses,
        gross_profit=gross_profit,
        operating_profit=operating_profit,
        ebitda=ebitda,
        ebit=ebit,
        profit_before_tax=profit_before_tax,
        net_profit=net_profit,
        eps=to_number(ratios.get("eps")),
        assets=assets,
        liabilities=liabilities,
        operating_cash_flow=operating_cash_flow,
        investing_cash_flow=investing_cash_flow,
        financing_cash_flow=financing_cash_flow,
        profit_margin=profit_margin,
        expense_ratio=expense_ratio,
        debt_ratio=debt_ratio,
        current_ratio=current_ratio,
        debt_to_equity_ratio=debt_to_equity,
        roe=roe,
        roa=roa,
        roce=to_number(ratios.get("roce")),
        operating_margin=to_number(ratios.get("operating_margin")),
        ebitda_margin=to_number(ratios.get("ebitda_margin")),
        net_margin=to_number(ratios.get("net_margin")),
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
        if m.revenue is not None:
            if best_revenue is None or m.revenue > best_revenue[1]:
                best_revenue = (m.company_name, m.revenue)
        if m.net_profit is not None:
            if best_profit is None or m.net_profit > best_profit[1]:
                best_profit = (m.company_name, m.net_profit)
        if m.profit_margin is not None:
            if best_margin is None or m.profit_margin > best_margin[1]:
                best_margin = (m.company_name, m.profit_margin)
        if m.debt_to_equity_ratio is not None:
            if lowest_debt is None or m.debt_to_equity_ratio < lowest_debt[1]:
                lowest_debt = (m.company_name, m.debt_to_equity_ratio)
        if m.current_ratio is not None:
            if best_liquidity is None or m.current_ratio > best_liquidity[1]:
                best_liquidity = (m.company_name, m.current_ratio)

    overall_winner = ""
    if metrics_list:
        scores = {}
        for m in metrics_list:
            score = 0
            if m.profit_margin is not None:
                score += m.profit_margin * 0.4
            if m.net_profit is not None:
                max_profit = max((x.net_profit for x in metrics_list if x.net_profit is not None), default=1)
                if max_profit > 0:
                    score += (m.net_profit / max_profit) * 0.3 * 100
            if m.debt_to_equity_ratio is not None:
                max_debt = max((x.debt_to_equity_ratio for x in metrics_list if x.debt_to_equity_ratio is not None), default=1)
                if max_debt > 0:
                    score += (1 - (m.debt_to_equity_ratio / max_debt)) * 0.3 * 100
            scores[m.company_name] = score
        if scores:
            overall_winner = max(scores, key=scores.get)

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
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment variables.")
        model_name = os.getenv("MODEL_NAME", "llama-3.3-70b-versatile")

        self.llm = ChatGroq(
            model=model_name,
            api_key=api_key,
            temperature=0,
        )
        self.chain = COMPARISON_PROMPT | self.llm

    def _get_llm_analysis(self, computed_metrics_json: str) -> Dict[str, Any]:
        try:
            response = self.chain.invoke({"computed_metrics": computed_metrics_json})
            content = response.content.strip()
            if content.startswith("```"):
                lines = content.split("\n")
                lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                content = "\n".join(lines).strip()
            return json.loads(content)
        except (json.JSONDecodeError, Exception) as e:
            logger.error("LLM analysis parsing failed: %s. Raw: %s", e, content if 'content' in locals() else "no response")
            return {
                "comparison_analysis": {
                    "revenue_analysis": "",
                    "profit_analysis": "",
                    "ratio_analysis": "",
                    "financial_health_analysis": "",
                },
                "insights": [],
            }

    def compare(self, companies_data: List[Dict[str, Any]]) -> str:
        logger.info("Starting comparison for %d companies.", len(companies_data))
        start_time = time.time()

        if len(companies_data) < 2:
            logger.warning("Comparison requires at least two companies.")
            return ComparisonOutput().model_dump_json(indent=2)

        # Validate financial year & reporting type compatibility
        if not _validate_year_and_type(companies_data):
            # Return minimal output with a clear insight about mismatch
            empty_output = ComparisonOutput(
                companies_compared=[c.get("company_name", "?") for c in companies_data],
                insights=["Cannot compare: companies have different financial years or reporting types."],
                citations=[],
                financial_metrics=[],
                benchmark_results=BenchmarkResults(),
                comparison_analysis=ComparisonAnalysis(),
            )
            logger.info("Comparison aborted due to year/type mismatch (%.2fs).", time.time() - start_time)
            return empty_output.model_dump_json(indent=2)

        metrics_list: List[FinancialMetrics] = []
        missing_metrics: Dict[str, List[str]] = {}
        for raw in companies_data:
            try:
                fm = calculate_metrics(raw)
                metrics_list.append(fm)
                # Track which top‑level metrics are missing for this company
                for field in fm.__fields__:
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

        llm_output = self._get_llm_analysis(llm_json)
        analysis = ComparisonAnalysis(**llm_output.get("comparison_analysis", {}))
        insights = llm_output.get("insights", [])

        citations = collect_citations(metrics_list)

        # Overall winner based on composite score if LLM did not provide one
        overall_winner = llm_output.get("benchmark_results", {}).get("overall_winner")
        if not overall_winner:
            scores = {m.company_name: _score_company(m) for m in metrics_list}
            if any(v > 0 for v in scores.values()):
                overall_winner = max(scores, key=scores.get)
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