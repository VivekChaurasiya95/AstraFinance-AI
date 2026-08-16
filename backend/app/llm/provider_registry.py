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
            else:
                raise ValueError(f"Unknown LLM provider: {name}")
        return self._providers[name]

registry = ProviderRegistry()
