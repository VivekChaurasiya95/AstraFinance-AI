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
    fiscal_year: Optional[int] = None
    reporting_period: Optional[str] = None
    comparison_basis: Optional[str] = None
    reporting_type: Optional[str] = None

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


def normalize_fiscal_year(value: Any) -> Optional[int]:
    """
    Normalize various fiscal year representations to a 4-digit integer (e.g. 2025).
    Handles formats like:
      - 'FY2025', 'FY 2025', 'FY-2025', 'Fiscal Year 2025'
      - 'FY2025 YOY', 'FY 2025 YOY', 'FY2025 YoY', '2025 YOY'
      - '2025', 2025
      - 'FY25', 'FY 25', 'FY-25'
      - 'FY2024-25', 'FY 2024-2025'
      - 'Q1 2025'
    Returns None if no valid 4-digit fiscal year can be extracted.
    """
    if value is None:
        return None

    s = str(value).strip()
    if not s or s.lower() in ("none", "null", "n/a", "nan", "-"):
        return None

    s_upper = s.upper()

    # Detect year ranges like 'FY2024-25' or 'FY 2024-2025' -> financial year ends in 2025
    range_match = re.search(r'(?<!\d)(19\d\d|20\d\d)\s*[-/]\s*(\d{2,4})(?!\d)', s_upper)
    if range_match:
        start_yr = int(range_match.group(1))
        end_part = range_match.group(2)
        if len(end_part) == 2:
            century = (start_yr // 100) * 100
            end_yr = century + int(end_part)
            if end_yr < start_yr:
                end_yr += 100
            return end_yr
        elif len(end_part) == 4:
            return int(end_part)

    # Detect 4-digit year (1900-2099) not immediately adjacent to other digits
    four_digit_matches = re.findall(r'(?<!\d)(19\d\d|20\d\d)(?!\d)', s_upper)
    if four_digit_matches:
        return int(four_digit_matches[0])

    # Detect 2-digit fiscal year preceded by FY/Fiscal Year, e.g. FY25, FY 25, FY-25
    two_digit_match = re.search(r'(?:FY|FISCAL\s*YEAR)[\s\-_]*(\d{2})(?!\d)', s_upper)
    if two_digit_match:
        yy = int(two_digit_match.group(1))
        return 2000 + yy if yy < 80 else 1900 + yy

    logger.debug("Could not extract fiscal year from raw value: %r", value)
    return None


def normalize_reporting_type(reporting_type: Any, raw_period: Any = None) -> Optional[str]:
    """
    Normalize reporting period type (e.g. annual, quarterly, monthly, Q1, Q2, Q3, Q4).
    Maps:
      - 'Annual', 'annual', 'FY', 'Fiscal Year', 'Full Year' -> 'annual'
      - 'Q1', '1Q', 'First Quarter' -> 'Q1'
      - 'Q2', '2Q', 'Second Quarter' -> 'Q2'
      - 'Q3', '3Q', 'Third Quarter' -> 'Q3'
      - 'Q4', '4Q', 'Fourth Quarter' -> 'Q4'
      - 'Quarterly', 'quarterly' -> 'quarterly'
      - 'Monthly', 'monthly' -> 'monthly'
    If reporting_type is not specified or is a generic scope ('Consolidated', 'Standalone'),
    infers the type from raw_period. Defaults to 'annual' for typical FY/year periods.
    """
    t_str = str(reporting_type or "").strip().lower()
    p_str = str(raw_period or "").strip().lower()

    # Direct reporting_type checks
    if t_str:
        if t_str in ("annual", "fy", "fiscal year", "full year", "12m"):
            return "annual"
        if t_str in ("q1", "1q", "first quarter"):
            return "Q1"
        if t_str in ("q2", "2q", "second quarter"):
            return "Q2"
        if t_str in ("q3", "3q", "third quarter"):
            return "Q3"
        if t_str in ("q4", "4q", "fourth quarter"):
            return "Q4"
        if t_str in ("quarterly", "quarter"):
            # Refine with quarter from period if present
            if "q1" in p_str or "1q" in p_str: return "Q1"
            if "q2" in p_str or "2q" in p_str: return "Q2"
            if "q3" in p_str or "3q" in p_str: return "Q3"
            if "q4" in p_str or "4q" in p_str: return "Q4"
            return "quarterly"
        if t_str in ("monthly", "month"):
            return "monthly"

    # Infer from raw_period
    if p_str:
        if re.search(r'\b(q1|1q|first\s*quarter)\b', p_str):
            return "Q1"
        if re.search(r'\b(q2|2q|second\s*quarter)\b', p_str):
            return "Q2"
        if re.search(r'\b(q3|3q|third\s*quarter)\b', p_str):
            return "Q3"
        if re.search(r'\b(q4|4q|fourth\s*quarter)\b', p_str):
            return "Q4"
        if re.search(r'\b(quarterly|quarter)\b', p_str):
            return "quarterly"
        if re.search(r'\b(monthly|month)\b', p_str):
            return "monthly"
        if re.search(r'\b(fy|fiscal\s*year|annual|full\s*year|\d{4})\b', p_str):
            return "annual"

    return "annual" if normalize_fiscal_year(raw_period) is not None else None


def parse_reporting_details(raw_period: Any, raw_type: Any = None) -> Dict[str, Any]:
    """
    Parse period and reporting type into structured components:
    - fiscal_year: int or None
    - reporting_period: str (canonical, e.g. 'FY2025', 'Q1 2025')
    - comparison_basis: Optional[str] (e.g. 'YOY', 'QOQ' or None)
    - reporting_type: str (e.g. 'annual', 'Q1', 'quarterly', etc.)
    """
    fiscal_year = normalize_fiscal_year(raw_period)

    raw_str = str(raw_period or "").strip()
    raw_upper = raw_str.upper()

    # Extract comparison basis if present without losing YoY info
    comparison_basis = None
    basis_match = re.search(r'\b(YOY|QOQ|MOM)\b', raw_upper)
    if basis_match:
        comparison_basis = basis_match.group(1).upper()

    reporting_type = normalize_reporting_type(raw_type, raw_period)

    # Clean reporting period label
    clean_period = raw_str
    if comparison_basis:
        clean_period = re.sub(rf'\b{comparison_basis}\b', '', clean_period, flags=re.IGNORECASE).strip()
    clean_period = re.sub(r'\s+', ' ', clean_period).strip(' -_')

    if not clean_period and fiscal_year:
        clean_period = f"FY{fiscal_year}"
    elif fiscal_year and re.match(r'^(?:FY)?\s*[-_]?\s*(?:20)?\d{2}$', clean_period, re.IGNORECASE):
        clean_period = f"FY{fiscal_year}"

    return {
        "fiscal_year": fiscal_year,
        "reporting_period": clean_period or (f"FY{fiscal_year}" if fiscal_year else raw_str),
        "comparison_basis": comparison_basis,
        "reporting_type": reporting_type,
    }


def _normalize_year(year_str: str) -> str:
    fy = normalize_fiscal_year(year_str)
    if fy is not None:
        return f"FY{fy}"
    return (year_str or "").strip().upper()


def _validate_year_and_type(companies_data: List[Dict[str, Any]]) -> bool:
    """Ensure all companies share the same canonical financial year and reporting type.
    Enriches each company dictionary with structured period metadata.
    Returns True if valid, False otherwise (and logs diagnostic details)."""
    for c in companies_data:
        company_name = c.get("company_name", "Unknown Company")
        raw_period = c.get("financial_year")
        raw_type = c.get("reporting_type")

        details = parse_reporting_details(raw_period, raw_type)
        c["fiscal_year"] = details["fiscal_year"]
        c["reporting_period"] = details["reporting_period"]
        c["comparison_basis"] = details["comparison_basis"]
        c["reporting_type"] = details["reporting_type"]

        logger.info(
            "[ComparisonAgent] Period validation\ncompany=%s\nraw_period=%s\nnormalized_year=%s",
            company_name,
            raw_period,
            details["fiscal_year"],
        )

    # 1. Missing or invalid fiscal year check
    missing_or_invalid = [c for c in companies_data if c.get("fiscal_year") is None]
    if missing_or_invalid:
        company_years = {c.get("company_name", "Unknown"): c.get("fiscal_year") for c in companies_data}
        logger.warning(
            "[ComparisonAgent] Comparison blocked\nreason=invalid_or_missing_fiscal_year\ncompany_years=%s",
            json.dumps(company_years, indent=4),
        )
        return False

    # 2. Fiscal year mismatch check
    years = {c["fiscal_year"] for c in companies_data}
    if len(years) > 1:
        company_years = {c.get("company_name", "Unknown"): c.get("fiscal_year") for c in companies_data}
        logger.warning(
            "[ComparisonAgent] Comparison blocked\nreason=fiscal_year_mismatch\ncompany_years=%s",
            json.dumps(company_years, indent=4),
        )
        return False

    # 3. Reporting type mismatch check
    types = {c["reporting_type"] for c in companies_data if c.get("reporting_type")}
    if len(types) > 1:
        company_types = {c.get("company_name", "Unknown"): c.get("reporting_type") for c in companies_data}
        logger.warning(
            "[ComparisonAgent] Comparison blocked\nreason=reporting_type_mismatch\ncompany_types=%s",
            json.dumps(company_types, indent=4),
        )
        return False

    normalized_years_list = sorted(list(years))
    logger.info(
        "[ComparisonAgent] Period validation passed\nnormalized_years=%s",
        normalized_years_list,
    )
    logger.info("[ComparisonAgent] Normalized fiscal years=%s", normalized_years_list)
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
        fiscal_year=company_data.get("fiscal_year"),
        reporting_period=company_data.get("reporting_period"),
        comparison_basis=company_data.get("comparison_basis"),
        reporting_type=company_data.get("reporting_type"),
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

    def _get_llm_analysis(self, computed_metrics_json: str, user_settings: dict | None = None) -> Dict[str, Any]:
        content = ""
        try:
            messages = COMPARISON_PROMPT.format_messages(computed_metrics=computed_metrics_json)
            router = get_llm_router()
            response = router.invoke("comparison", messages, user_settings=user_settings, temperature=0.1)
            
            content = response.content
            if isinstance(content, list):
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                content = "".join(text_parts)
            elif not isinstance(content, str):
                content = str(content)
                
            content = content.strip()
            
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

    def compare(self, companies_data: List[Dict[str, Any]], user_settings: dict | None = None) -> str:
        logger.info("[ComparisonAgent] Starting comparison for %d companies", len(companies_data))
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

        logger.info("[ComparisonAgent] Reporting periods compatible")
        logger.info("[ComparisonAgent] Comparison proceeding")

        metrics_list: List[FinancialMetrics] = []
        missing_metrics: Dict[str, List[str]] = {}
        for raw in companies_data:
            try:
                fm = calculate_metrics(raw)
                metrics_list.append(fm)
                # Track which top‑level metrics are missing for this company
                for field in FinancialMetrics.model_fields:
                    if getattr(fm, field) is None and field not in {
                        "company_name", "document", "page", "reference_id",
                        "fiscal_year", "reporting_period", "comparison_basis", "reporting_type"
                    }:
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