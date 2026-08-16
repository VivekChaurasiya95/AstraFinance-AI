import threading
from typing import Any, Dict, List, Optional, Type
import httpx
from pydantic import BaseModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import BaseMessage
from .exceptions import RateLimitError, ProviderUnavailableError, AuthenticationError, InvalidRequestError, SchemaValidationError
from ..config.settings import settings

class GeminiProvider:
    def __init__(self):
        self.keys = []
        if settings.GEMINI_API_KEY_1:
            self.keys.append(settings.GEMINI_API_KEY_1)
        if settings.GEMINI_API_KEY_2:
            self.keys.append(settings.GEMINI_API_KEY_2)
        if not self.keys and getattr(settings, "GEMINI_API_KEY", None):
            self.keys.append(settings.GEMINI_API_KEY)
            
        self.key_index = 0
        self.lock = threading.Lock()
        self.clients: Dict[str, Any] = {}

    def _get_next_key(self) -> Optional[str]:
        if not self.keys:
            return None
        with self.lock:
            key = self.keys[self.key_index]
            self.key_index = (self.key_index + 1) % len(self.keys)
            return key

    def _get_client(self, model: str, temperature: float) -> ChatGoogleGenerativeAI:
        key = self._get_next_key()
        if not key:
            raise AuthenticationError("No Gemini API keys configured.")
            
        client_key = f"{model}_{temperature}_{key[-4:] if len(key)>4 else key}"
        if client_key not in self.clients:
            self.clients[client_key] = ChatGoogleGenerativeAI(
                google_api_key=key,
                model=model,
                temperature=temperature,
                max_retries=0 # We handle retries manually
            )
        return self.clients[client_key]

    def _map_error(self, e: Exception) -> Exception:
        # Handle Google API errors
        error_msg = str(e).lower()
        if "429" in error_msg or "quota" in error_msg:
            return RateLimitError(f"Gemini Rate Limit Hit: {e}", 5.0) # Default to 5s retry
        elif "401" in error_msg or "403" in error_msg or "unauthenticated" in error_msg:
            return AuthenticationError(f"Gemini Auth Error: {e}")
        elif "400" in error_msg or "invalid argument" in error_msg:
            return InvalidRequestError(f"Gemini Bad Request: {e}")
        elif "500" in error_msg or "503" in error_msg:
            return ProviderUnavailableError(f"Gemini Server Error: {e}")
            
        if isinstance(e, httpx.RequestError):
            return ProviderUnavailableError(f"Gemini Connection Error: {e}")
            
        return e

    def invoke(self, model: str, messages: List[BaseMessage], temperature: float = 0.1, **kwargs) -> Any:
        try:
            client = self._get_client(model, temperature)
            return client.invoke(messages, **kwargs)
        except Exception as e:
            raise self._map_error(e)

    def invoke_structured(self, model: str, messages: List[BaseMessage], schema: Type[BaseModel], temperature: float = 0.1, **kwargs) -> BaseModel:
        try:
            client = self._get_client(model, temperature)
            structured_llm = client.with_structured_output(schema)
            result = structured_llm.invoke(messages, **kwargs)
            if not isinstance(result, schema):
                raise SchemaValidationError(f"Expected {schema.__name__}, got {type(result)}")
            return result
        except Exception as e:
            raise self._map_error(e)
