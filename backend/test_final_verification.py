import json
import httpx
from unittest.mock import patch, MagicMock

from app.llm.openrouter_provider import OpenRouterProvider
from app.llm.exceptions import LLMErrorType
from app.llm.model_router import LLMRouter
from app.llm.config import AgentModelConfig, QualityTier

passed = 0
failed = 0

def report(name: str, ok: bool, detail: str = ""):
    global passed, failed
    if ok:
        passed += 1
        print(f"  [PASS] {name}")
    else:
        failed += 1
        print(f"  [FAIL] {name}: {detail}")

def test_3_error_types():
    print("\n-- TEST 3: OpenRouter Error Types --")
    provider = OpenRouterProvider()
    
    # 401
    err_401 = ValueError("{'message': 'Auth', 'code': 401}")
    report("401 maps to AUTH_ERROR", getattr(provider._map_error(err_401), "error_type", None) == LLMErrorType.AUTH_ERROR)

    # 429
    err_429 = ValueError("{'message': 'Rate limit', 'code': 429}")
    report("429 maps to RATE_LIMITED", getattr(provider._map_error(err_429), "error_type", None) == LLMErrorType.RATE_LIMITED)

    # 500 / 502 / 503 -> SERVER ERROR
    err_502 = ValueError("{'message': 'Service temporarily overloaded', 'code': 502}")
    report("502 maps to PROVIDER_SERVER_ERROR", getattr(provider._map_error(err_502), "error_type", None) == LLMErrorType.PROVIDER_SERVER_ERROR)

    # Timeout / Network
    class MockTimeout(httpx.RequestError):
        def __init__(self):
            super().__init__("timeout")
    report("timeout maps to NETWORK_ERROR", getattr(provider._map_error(MockTimeout()), "error_type", None) == LLMErrorType.NETWORK_ERROR)


def test_6_real_agents():
    print("\n-- TEST 6: Real Agents Fallback --")
    from app.agents.extraction_agent import ExtractionAgent
    from app.agents.red_flag_agent import RedFlagAgent
    from app.agents.comparison_agent import ComparisonAgent
    from app.agents.report_agent import ReportAgent
    
    from app.llm.exceptions import RateLimitError, ProviderUnavailableError
    groq_err = RateLimitError("Groq mock limit", retry_after=0.0, error_type=LLMErrorType.RATE_LIMITED, metadata={})
    gemini_err = ProviderUnavailableError("Gemini mock fail", error_type=LLMErrorType.PROVIDER_UNAVAILABLE, metadata={})
    
    class MockExtractionResult:
        def __init__(self):
            self.company_name = "ExtractCo"
            self.financial_metrics = []
        def model_dump(self): return {"company_name": self.company_name, "financial_metrics": self.financial_metrics}
            
    class MockRedFlagResult:
        def __init__(self):
            self.risk_level = "Medium"
            self.flags = []
        def model_dump(self): return {"risk_level": self.risk_level, "flags": self.flags}
            
    class MockComparisonResult:
        def __init__(self):
            self.winner = "CompA"
            self.reason = "Better"
        def model_dump(self): return {"winner": self.winner, "reason": self.reason}
            
    class MockReportResult:
        def __init__(self):
            self.report_title = "Report"
            self.executive_summary = "Summary"
            self.recommendations = []
        def model_dump(self): return {"report_title": self.report_title, "executive_summary": self.executive_summary, "recommendations": self.recommendations}
            
    def openrouter_side_effect(model, messages, schema, **kwargs):
        if schema.__name__ == "ExtractionSchema": return MockExtractionResult()
        if schema.__name__ == "RedFlagSchema": return MockRedFlagResult()
        if schema.__name__ == "ComparisonSchema": return MockComparisonResult()
        if schema.__name__ == "ReportOutput": return MockReportResult()
        raise ValueError(f"Unknown schema: {schema.__name__}")

    with patch("app.llm.provider_registry.ProviderRegistry.get_provider") as mock_get:
        mock_groq = MagicMock()
        mock_gemini = MagicMock()
        mock_or = MagicMock()
        
        mock_groq.invoke_structured.side_effect = groq_err
        mock_gemini.invoke_structured.side_effect = gemini_err
        mock_or.invoke_structured.side_effect = openrouter_side_effect
        
        class MockMessage:
            def __init__(self, content): self.content = content
            
        def openrouter_invoke_side_effect(agent_name, messages, **kwargs):
            return MockMessage('{"comparison_analysis": {}, "insights": [], "benchmark_results": {"overall_winner": "Test"}}')

        mock_groq.invoke.side_effect = groq_err
        mock_gemini.invoke.side_effect = gemini_err
        mock_or.invoke.side_effect = openrouter_invoke_side_effect
        
        def provider_dispatch(name):
            if name == "groq": return mock_groq
            if name == "gemini": return mock_gemini
            if name == "openrouter": return mock_or
            raise ValueError(name)
            
        mock_get.side_effect = provider_dispatch
        
        with patch("time.sleep"):
            # 1. ExtractionAgent
            agent1 = ExtractionAgent()
            with patch("app.embeddings.chroma_client.get_collection_for_provider") as mock_get_col, \
                 patch("app.embeddings.embedding_router.embedding_router.embed_queries", return_value={"mock": {"model": "m", "embeddings": [[0.1, 0.2]]}}):
                
                mock_col = MagicMock()
                mock_col.query.return_value = {"documents": [["mock chunk"]], "metadatas": [[{"page": 1}]]}
                mock_get_col.return_value = mock_col
                
                res = agent1.extract("dummy text")
                report("ExtractionAgent fallback", res["company_name"] == "ExtractCo")
                
            # 2. RedFlagAgent
            agent2 = RedFlagAgent()
            with patch("app.embeddings.chroma_client.get_collection_for_provider") as mock_get_col, \
                 patch("app.embeddings.embedding_router.embedding_router.embed_queries", return_value={"mock": {"model": "m", "embeddings": [[0.1, 0.2]]}}):
                
                mock_col = MagicMock()
                mock_col.query.return_value = {"documents": [["mock chunk"]], "metadatas": [[]]}
                mock_get_col.return_value = mock_col
                
                try:
                    res = agent2.analyze("doc_id")
                    report("RedFlagAgent fallback", res["risk_level"] == "Medium")
                except Exception as e:
                    report(f"RedFlagAgent fallback: {e}", False)
                
            # 3. ComparisonAgent
            agent3 = ComparisonAgent()
            try:
                res = agent3.compare([{"company_name": "Test", "revenue": "1M"}])
                res_dict = json.loads(res)
                report("ComparisonAgent fallback", res_dict["benchmark_results"]["overall_winner"] == "Test")
            except Exception as e:
                report(f"ComparisonAgent fallback: {e}", False)

            # 4. ReportAgent
            agent4 = ReportAgent()
            with patch("app.embeddings.chroma_client.get_collection_for_provider") as mock_get_col, \
                 patch("app.agents.report_agent.build_premium_pdf", return_value="report.pdf"), \
                 patch("app.embeddings.embedding_router.embedding_router.embed_queries", return_value={"mock": {"model": "m", "embeddings": [[0.1, 0.2]]}}):
                
                mock_col = MagicMock()
                mock_col.query.return_value = {"documents": [["mock chunk"]], "metadatas": [[]]}
                mock_get_col.return_value = mock_col
                
                try:
                    res = agent4.generate_report("test_workspace", [], [], [], [])
                    report("ReportAgent fallback", res == "report.pdf")
                except Exception as e:
                    report(f"ReportAgent fallback: {e}", False)


if __name__ == "__main__":
    print("============================================================")
    print("AstraFinance AI - Final Verification Tests")
    print("============================================================")
    test_3_error_types()
    test_6_real_agents()
    print("\n============================================================")
    print(f"Results: {passed} passed, {failed} failed")
    print("============================================================")
