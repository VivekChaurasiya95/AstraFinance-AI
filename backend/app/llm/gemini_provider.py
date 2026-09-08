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
        from .exceptions import LLMErrorType
        
        # Handle Google API errors
        error_msg = str(e).lower()
        metadata = {}
        
        status = getattr(e, "status_code", None)
        if status is None and isinstance(e, httpx.HTTPStatusError):
            status = e.response.status_code
            if hasattr(e.response, "text"):
                error_msg += " " + e.response.text.lower()
                
        if status:
            metadata["status"] = status

        if "429" in error_msg or "quota" in error_msg or status == 429:
            if "quota" in error_msg:
                return RateLimitError(f"Gemini Quota Exceeded: {e}", 5.0, error_type=LLMErrorType.QUOTA_EXCEEDED, metadata=metadata)
            return RateLimitError(f"Gemini Rate Limit Hit: {e}", 5.0, error_type=LLMErrorType.RATE_LIMITED, metadata=metadata)
        elif "401" in error_msg or "403" in error_msg or "unauthenticated" in error_msg or status in [401, 403]:
            error_type = LLMErrorType.AUTH_ERROR if status == 401 or "unauthenticated" in error_msg else LLMErrorType.PERMISSION_OR_ACCESS_ERROR
            return AuthenticationError(f"Gemini Auth Error: {e}", error_type=error_type, metadata=metadata)
        elif "404" in error_msg or status == 404:
            return InvalidRequestError(f"Gemini Model Not Found: {e}", error_type=LLMErrorType.MODEL_NOT_FOUND, metadata=metadata)
        elif "400" in error_msg or "invalid argument" in error_msg or status == 400:
            return InvalidRequestError(f"Gemini Bad Request: {e}", error_type=LLMErrorType.INVALID_REQUEST, metadata=metadata)
        elif "503" in error_msg or status == 503:
            if "high demand" in error_msg:
                metadata["reason"] = "high_demand"
            return ProviderUnavailableError(f"Gemini Temporarily Unavailable: {e}", error_type=LLMErrorType.PROVIDER_UNAVAILABLE, metadata=metadata)
        elif "500" in error_msg or status == 500:
            return ProviderUnavailableError(f"Gemini Server Error: {e}", error_type=LLMErrorType.PROVIDER_SERVER_ERROR, metadata=metadata)
            
        if isinstance(e, httpx.RequestError) or "timeout" in error_msg or "connection" in error_msg:
            return ProviderUnavailableError(f"Gemini Connection Error: {e}", error_type=LLMErrorType.NETWORK_ERROR, metadata=metadata)
            
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

    def test_connection(self, model: str) -> bool:
        try:
            client = self._get_client(model, 0.1)
            from langchain_core.messages import HumanMessage
            client.invoke([HumanMessage(content="hi")])
            return True
        except Exception:
            return False
