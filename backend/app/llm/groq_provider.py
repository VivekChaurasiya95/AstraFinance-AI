import threading
from typing import Any, Dict, List, Optional, Type
import httpx
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage
from .exceptions import RateLimitError, ProviderUnavailableError, AuthenticationError, InvalidRequestError, SchemaValidationError
from ..config.settings import settings

class GroqProvider:
    def __init__(self):
        self.keys = []
        if settings.GROQ_API_KEY_1:
            self.keys.append(settings.GROQ_API_KEY_1)
        if settings.GROQ_API_KEY_2:
            self.keys.append(settings.GROQ_API_KEY_2)
        if not self.keys and settings.GROQ_API_KEY and settings.GROQ_API_KEY != "YOUR_GROQ_API_KEY":
            self.keys.append(settings.GROQ_API_KEY)
            
        self.key_index = 0
        self.lock = threading.Lock()
        self.clients: Dict[str, Any] = {} # (model, key) -> client

    def _get_next_key(self) -> Optional[str]:
        if not self.keys:
            return None
        with self.lock:
            key = self.keys[self.key_index]
            self.key_index = (self.key_index + 1) % len(self.keys)
            return key

    def _get_client(self, model: str, temperature: float) -> ChatGroq:
        key = self._get_next_key()
        if not key:
            raise AuthenticationError("No Groq API keys configured.")
            
        client_key = f"{model}_{temperature}_{key[-4:] if len(key)>4 else key}"
        if client_key not in self.clients:
            self.clients[client_key] = ChatGroq(
                api_key=key,
                model=model,
                temperature=temperature,
                max_retries=0 # We handle retries manually
            )
        return self.clients[client_key]

    def _map_error(self, e: Exception) -> Exception:
        if isinstance(e, httpx.HTTPStatusError):
            status = e.response.status_code
            if status == 429:
                retry_after = 0.0
                retry_header = e.response.headers.get("retry-after")
                if retry_header and retry_header.isdigit():
                    retry_after = float(retry_header)
                return RateLimitError(f"Groq Rate Limit Hit: {e}", retry_after)
            elif status in [401, 403]:
                return AuthenticationError(f"Groq Auth Error: {e}")
            elif status == 400:
                return InvalidRequestError(f"Groq Bad Request: {e}")
            elif status >= 500:
                return ProviderUnavailableError(f"Groq Server Error: {e}")
                
        if isinstance(e, httpx.RequestError):
            return ProviderUnavailableError(f"Groq Connection Error: {e}")
            
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
