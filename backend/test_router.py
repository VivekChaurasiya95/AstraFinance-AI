"""
AstraFinance AI — LLM Router Test Suite
Tests the 3-provider fallback chain: Groq  -> Gemini  -> OpenRouter

Tests:
  A) Groq success  -> Groq response
  B) Groq 429  -> Gemini success
  C) Groq 429  -> Gemini 503  -> OpenRouter success
  D) All three fail  -> controlled error
  E) OpenRouter key missing  -> backend starts, fallback disabled
  F) OpenRouter structured Pydantic output  -> validation succeeds
  G) OpenRouter 401  -> auth error logged
"""

import sys
import time
from unittest.mock import patch, MagicMock, PropertyMock
import httpx

from pydantic import BaseModel, Field
from typing import List

from app.llm.model_router import LLMRouter
from app.llm.config import AgentModelConfig, QualityTier
from app.llm.groq_provider import GroqProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.exceptions import LLMError, LLMErrorType


# -- Test Schema ---------------------------------------------------------------

class TestExtraction(BaseModel):
    company_name: str = Field(description="Name of the company")
    revenue: float = Field(description="Revenue in millions")


# -- Helpers -------------------------------------------------------------------

def create_mock_error(status_code: int, body: str = "", headers: dict = None) -> Exception:
    request = httpx.Request("POST", "https://api.test.com")
    response = httpx.Response(status_code, request=request, text=body, headers=headers or {})
    return httpx.HTTPStatusError("Mock Error", request=request, response=response)


def make_config(fb2_provider="openrouter", fb2_model="nvidia/nemotron-3-ultra-550b-a55b:free"):
    return AgentModelConfig(
        primary_provider="groq",
        primary_model="llama-3.3-70b-versatile",
        fallback_provider="gemini",
        fallback_model="gemini-3.5-flash",
        quality_tier=QualityTier.CRITICAL,
        fallback_2_provider=fb2_provider,
        fallback_2_model=fb2_model,
    )


def get_fresh_router():
    """Create a fresh LLMRouter with clean circuit breakers and cache."""
    r = LLMRouter()
    r.circuit_breakers = {}
    r.cache = {}
    return r


passed = 0
failed = 0


def report(name, ok, detail=""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}: {detail}")


# -- TEST A: Groq success -----------------------------------------------------

def test_a_groq_success():
    print("\n-- TEST A: Groq success --")
    router = get_fresh_router()
    config = make_config()

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_groq.invoke.return_value = MagicMock(content="Groq response", response_metadata={})
        mock_get.return_value = mock_groq

        with patch("time.sleep"):
            try:
                res = router.invoke_with_config(config, "test_agent_a", [MagicMock(content="hi")])
                report("Groq returned success", getattr(res, "content", None) == "Groq response")
            except Exception as e:
                report("Groq returned success", False, str(e))


# -- TEST B: Groq 429 -> Gemini success ----------------------------------------

def test_b_groq_429_gemini_success():
    print("\n-- TEST B: Groq 429 -> Gemini success --")
    router = get_fresh_router()
    config = make_config()

    groq_error = GroqProvider()._map_error(create_mock_error(429, "rate limit exceeded", {"retry-after": "0"}))

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()

        mock_groq.invoke.side_effect = groq_error
        mock_gemini.invoke.return_value = MagicMock(content="Gemini fallback response", response_metadata={})

        mock_get.side_effect = lambda name: mock_groq if name == "groq" else mock_gemini

        with patch("time.sleep"):
            try:
                res = router.invoke_with_config(config, "test_agent_b", [MagicMock(content="hi")])
                report("Gemini fallback worked", getattr(res, "content", None) == "Gemini fallback response")
            except Exception as e:
                report("Gemini fallback worked", False, str(e))


# -- TEST C: Groq 429 -> Gemini 503 -> OpenRouter success -----------------------

def test_c_full_fallback_chain():
    print("\n-- TEST C: Groq 429 -> Gemini 503 -> OpenRouter success --")
    router = get_fresh_router()
    config = make_config()

    groq_error = GroqProvider()._map_error(create_mock_error(429, "rate limit exceeded", {"retry-after": "0"}))
    gemini_error = GeminiProvider()._map_error(create_mock_error(503, "The model is currently experiencing high demand."))

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()
        mock_openrouter = MagicMock()

        mock_groq.invoke.side_effect = groq_error
        mock_gemini.invoke.side_effect = gemini_error
        mock_openrouter.invoke.return_value = MagicMock(content="OpenRouter Nemotron response", response_metadata={})

        def provider_dispatch(name):
            if name == "groq":
                return mock_groq
            elif name == "gemini":
                return mock_gemini
            elif name == "openrouter":
                return mock_openrouter
            raise ValueError(f"Unknown provider: {name}")

        mock_get.side_effect = provider_dispatch

        with patch("time.sleep"):
            try:
                res = router.invoke_with_config(config, "test_agent_c", [MagicMock(content="hi")])
                report("Full chain: OpenRouter fallback", getattr(res, "content", None) == "OpenRouter Nemotron response")
            except Exception as e:
                report("Full chain: OpenRouter fallback", False, str(e))


# -- TEST D: All three fail -> controlled error ---------------------------------

def test_d_all_fail():
    print("\n-- TEST D: All three fail -> controlled error --")
    router = get_fresh_router()
    config = make_config()

    groq_error = GroqProvider()._map_error(create_mock_error(429, "rate limit", {"retry-after": "0"}))
    gemini_error = GeminiProvider()._map_error(create_mock_error(503, "high demand"))
    openrouter_error = GroqProvider()._map_error(create_mock_error(429, "rate limit"))  # Reuse for mock

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()
        mock_openrouter = MagicMock()

        mock_groq.invoke.side_effect = groq_error
        mock_gemini.invoke.side_effect = gemini_error
        mock_openrouter.invoke.side_effect = openrouter_error

        def provider_dispatch(name):
            if name == "groq":
                return mock_groq
            elif name == "gemini":
                return mock_gemini
            elif name == "openrouter":
                return mock_openrouter
            raise ValueError(f"Unknown provider: {name}")

        mock_get.side_effect = provider_dispatch

        with patch("time.sleep"):
            try:
                res = router.invoke_with_config(config, "test_agent_d", [MagicMock(content="hi")])
                report("All fail  -> controlled error", False, "Expected exception not raised")
            except LLMError as e:
                is_correct = e.error_type == LLMErrorType.PROVIDER_UNAVAILABLE
                report("All fail  -> controlled error", is_correct, f"type={e.error_type}")
            except Exception as e:
                report("All fail  -> controlled error", False, f"Wrong exception: {type(e).__name__}: {e}")


# -- TEST E: OpenRouter key missing -> backend starts ---------------------------

def test_e_missing_key():
    print("\n-- TEST E: OpenRouter key missing -> backend starts --")
    router = get_fresh_router()
    # No fallback_2 configured
    config = AgentModelConfig(
        primary_provider="groq",
        primary_model="llama-3.3-70b-versatile",
        fallback_provider="gemini",
        fallback_model="gemini-3.5-flash",
        quality_tier=QualityTier.STANDARD,
        fallback_2_provider=None,
        fallback_2_model=None,
    )

    groq_error = GroqProvider()._map_error(create_mock_error(429, "rate limit", {"retry-after": "0"}))

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()

        mock_groq.invoke.side_effect = groq_error
        mock_gemini.invoke.return_value = MagicMock(content="Gemini only fallback", response_metadata={})
        mock_get.side_effect = lambda name: mock_groq if name == "groq" else mock_gemini

        with patch("time.sleep"):
            try:
                res = router.invoke_with_config(config, "test_agent_e", [MagicMock(content="hi")])
                report("Missing key: Gemini fallback only", getattr(res, "content", None) == "Gemini only fallback")
            except Exception as e:
                report("Missing key: Gemini fallback only", False, str(e))


# -- TEST F: Structured output via OpenRouter ----------------------------------

def test_f_structured_output():
    print("\n-- TEST F: Structured output via OpenRouter --")
    router = get_fresh_router()
    config = make_config()

    groq_error = GroqProvider()._map_error(create_mock_error(429, "rate limit", {"retry-after": "0"}))
    gemini_error = GeminiProvider()._map_error(create_mock_error(503, "high demand"))

    # Mock OpenRouter returning valid JSON
    valid_json = '{"company_name": "AstraCorp", "revenue": 42.5}'
    mock_structured_result = TestExtraction(company_name="AstraCorp", revenue=42.5)

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()
        mock_openrouter = MagicMock()

        mock_groq.invoke_structured.side_effect = groq_error
        mock_gemini.invoke_structured.side_effect = gemini_error
        mock_openrouter.invoke_structured.return_value = mock_structured_result

        def provider_dispatch(name):
            if name == "groq":
                return mock_groq
            elif name == "gemini":
                return mock_gemini
            elif name == "openrouter":
                return mock_openrouter
            raise ValueError(f"Unknown provider: {name}")

        mock_get.side_effect = provider_dispatch

        with patch("time.sleep"):
            try:
                res = router.invoke_structured_with_config(
                    config, "test_agent_f", [MagicMock(content="extract data")], TestExtraction
                )
                is_valid = isinstance(res, TestExtraction)
                is_correct = is_valid and res.company_name == "AstraCorp" and res.revenue == 42.5
                report("Structured output: valid Pydantic", is_correct, f"got={type(res).__name__} company={getattr(res, 'company_name', '?')}")
            except Exception as e:
                report("Structured output: valid Pydantic", False, str(e))


# -- TEST G: OpenRouter 401 -> auth error --------------------------------------

def test_g_openrouter_401():
    print("\n-- TEST G: OpenRouter 401 -> auth error --")
    router = get_fresh_router()
    config = make_config()

    groq_error = GroqProvider()._map_error(create_mock_error(429, "rate limit", {"retry-after": "0"}))
    gemini_error = GeminiProvider()._map_error(create_mock_error(503, "high demand"))

    from app.llm.openrouter_provider import OpenRouterProvider
    or_provider = OpenRouterProvider.__new__(OpenRouterProvider)
    or_provider.api_key = "test"
    or_provider._enabled = True
    or_provider.default_model = "test"
    openrouter_error = or_provider._map_error(create_mock_error(401, "invalid api key"))

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()
        mock_openrouter = MagicMock()

        mock_groq.invoke.side_effect = groq_error
        mock_gemini.invoke.side_effect = gemini_error
        mock_openrouter.invoke.side_effect = openrouter_error

        def provider_dispatch(name):
            if name == "groq":
                return mock_groq
            elif name == "gemini":
                return mock_gemini
            elif name == "openrouter":
                return mock_openrouter
            raise ValueError(f"Unknown provider: {name}")

        mock_get.side_effect = provider_dispatch

        with patch("time.sleep"):
            try:
                res = router.invoke_with_config(config, "test_agent_g", [MagicMock(content="hi")])
                report("OpenRouter 401  -> auth error", False, "Expected exception not raised")
            except Exception as e:
                from app.llm.exceptions import AuthenticationError
                is_auth = isinstance(e, AuthenticationError)
                report("OpenRouter 401  -> auth error", is_auth, f"type={type(e).__name__}")


# -- TEST H: Groq 404 model_not_found -> Gemini fallback -------------------------

def test_h_groq_404_fallback():
    print("\n-- TEST H: Groq 404 model_not_found -> Gemini fallback --")
    router = get_fresh_router()
    config = make_config()

    from app.llm.exceptions import ModelNotFoundError
    groq_error = ModelNotFoundError("Groq Model Not Found: 404", error_type=LLMErrorType.MODEL_NOT_FOUND_OR_INACCESSIBLE, metadata={"status": 404})

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()

        mock_groq.invoke.side_effect = groq_error
        mock_gemini.invoke.return_value = MagicMock(content="Gemini fallback success after 404", response_metadata={})

        mock_get.side_effect = lambda name: mock_groq if name == "groq" else mock_gemini

        with patch("time.sleep"):
            try:
                res = router.invoke_with_config(config, "test_agent_h", [MagicMock(content="hi")])
                report("Groq 404 -> Gemini fallback", getattr(res, "content", None) == "Gemini fallback success after 404")
            except Exception as e:
                report("Groq 404 -> Gemini fallback", False, str(e))

# -- Run All -------------------------------------------------------------------

if __name__ == "__main__":
    print("=" * 60)
    print("AstraFinance AI — LLM Router 3-Provider Fallback Tests")
    print("=" * 60)

    test_a_groq_success()
    test_b_groq_429_gemini_success()
    test_c_full_fallback_chain()
    test_d_all_fail()
    test_e_missing_key()
    test_f_structured_output()
    test_g_openrouter_401()
    test_h_groq_404_fallback()

    print("\n" + "=" * 60)
    print(f"Results: {passed} passed, {failed} failed, {passed + failed} total")
    print("=" * 60)

    sys.exit(0 if failed == 0 else 1)
