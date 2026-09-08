from typing import Any, Dict
from .groq_provider import GroqProvider
from .gemini_provider import GeminiProvider

class ProviderRegistry:
    def __init__(self):
        self._providers: Dict[str, Any] = {}
        
    def get_provider(self, name: str) -> Any:
        name = name.lower()
        if name not in self._providers:
            if name == "groq":
                self._providers[name] = GroqProvider()
            elif name == "gemini":
                self._providers[name] = GeminiProvider()
            elif name == "openrouter":
                from .openrouter_provider import OpenRouterProvider
                self._providers[name] = OpenRouterProvider()
            else:
                raise ValueError(f"Unknown LLM provider: {name}")
        return self._providers[name]

    def test_provider(self, name: str, model: str) -> bool:
        provider = self.get_provider(name)
        if hasattr(provider, "test_connection"):
            return provider.test_connection(model)
        return False

    def is_provider_configured(self, name: str) -> bool:
        """Check if a provider has valid configuration (keys present) without instantiating it."""
        name = name.lower()
        from ..config.settings import settings
        if name == "groq":
            return bool(settings.GROQ_API_KEY_1 or settings.GROQ_API_KEY_2 or
                        (settings.GROQ_API_KEY and settings.GROQ_API_KEY != "YOUR_GROQ_API_KEY"))
        elif name == "gemini":
            return bool(settings.GEMINI_API_KEY_1 or settings.GEMINI_API_KEY_2 or
                        getattr(settings, "GEMINI_API_KEY", None))
        elif name == "openrouter":
            return bool(settings.OPENROUTER_API_KEY)
        return False

registry = ProviderRegistry()
