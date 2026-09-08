"""
AstraFinance AI — Live OpenRouter Connectivity Test

Sends a minimal safe request to verify OpenRouter/Nemotron connectivity.
Does NOT send any confidential data.

Usage:
    python test_openrouter_live.py
"""

import sys
import os
import time

# Ensure .env is loaded
from dotenv import load_dotenv
load_dotenv()

from app.config.settings import settings


def test_plain_text():
    """Test 1: Simple text completion."""
    print("\n-- Live Test 1: Plain text completion --")
    
    if not settings.OPENROUTER_API_KEY:
        print("  [WARN] SKIPPED: OPENROUTER_API_KEY not configured")
        return True  # Not a failure, just not configured
    
    from app.llm.openrouter_provider import OpenRouterProvider
    from langchain_core.messages import HumanMessage
    
    provider = OpenRouterProvider()
    model = settings.OPENROUTER_MODEL
    
    print(f"  Provider: openrouter")
    print(f"  Model: {model}")
    print(f"  Base URL: {settings.OPENROUTER_BASE_URL}")
    
    try:
        start = time.time()
        result = provider.invoke(
            model,
            [HumanMessage(content="Respond with exactly: AstraFinance fallback test successful.")],
            temperature=0.0
        )
        latency = int((time.time() - start) * 1000)
        
        content = result.content if hasattr(result, "content") else str(result)
        print(f"  Response: {content[:200]}")
        print(f"  Latency: {latency}ms")
        
        if "successful" in content.lower() or "astrafinance" in content.lower():
            print("  [PASS] Plain text test PASSED")
            return True
        else:
            print("  [FAIL] Plain text test: unexpected response content")
            return False
            
    except Exception as e:
        print(f"  [FAIL] Plain text test FAILED: {type(e).__name__}: {e}")
        return False


def test_structured_output():
    """Test 2: Structured JSON output with Pydantic validation."""
    print("\n-- Live Test 2: Structured output (Pydantic) --")
    
    if not settings.OPENROUTER_API_KEY:
        print("  [WARN] SKIPPED: OPENROUTER_API_KEY not configured")
        return True
    
    from pydantic import BaseModel, Field
    from app.llm.openrouter_provider import OpenRouterProvider
    from langchain_core.messages import HumanMessage, SystemMessage
    
    class TestCompany(BaseModel):
        company_name: str = Field(description="Name of the company")
        revenue: float = Field(description="Revenue in millions USD")
        sector: str = Field(description="Business sector")
    
    provider = OpenRouterProvider()
    model = settings.OPENROUTER_MODEL
    
    messages = [
        SystemMessage(content="You are a financial data assistant."),
        HumanMessage(content=(
            "Extract the following from this text:\n\n"
            "AstraCorp reported annual revenue of $42.5 million in their latest filing. "
            "The company operates in the fintech sector.\n\n"
            "Return the extracted data."
        ))
    ]
    
    try:
        start = time.time()
        result = provider.invoke_structured(model, messages, TestCompany, temperature=0.0)
        latency = int((time.time() - start) * 1000)
        
        print(f"  Type: {type(result).__name__}")
        print(f"  company_name: {result.company_name}")
        print(f"  revenue: {result.revenue}")
        print(f"  sector: {result.sector}")
        print(f"  Latency: {latency}ms")
        
        is_valid = isinstance(result, TestCompany)
        has_name = bool(result.company_name)
        has_revenue = result.revenue > 0
        
        if is_valid and has_name and has_revenue:
            print("  [PASS] Structured output test PASSED")
            return True
        else:
            print(f"  [FAIL] Structured output test: validation issues (valid={is_valid}, name={has_name}, revenue={has_revenue})")
            return False
            
    except Exception as e:
        print(f"  [FAIL] Structured output test FAILED: {type(e).__name__}: {e}")
        return False


if __name__ == "__main__":
    print("=" * 60)
    print("AstraFinance AI — Live OpenRouter Connectivity Test")
    print("=" * 60)
    
    results = []
    results.append(test_plain_text())
    results.append(test_structured_output())
    
    print("\n" + "=" * 60)
    passed = sum(1 for r in results if r)
    total = len(results)
    print(f"Results: {passed}/{total} passed")
    print("=" * 60)
    
    sys.exit(0 if all(results) else 1)
