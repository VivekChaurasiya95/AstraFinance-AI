import threading
from typing import Any, Dict, List, Optional, Type
import httpx
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_core.messages import BaseMessage
from .exceptions import RateLimitError, ProviderUnavailableError, AuthenticationError, InvalidRequestError, SchemaValidationError, ModelNotFoundError
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
        from .exceptions import LLMErrorType
        
        status = getattr(e, "status_code", None)
        response = getattr(e, "response", None)
        
        if status is None and isinstance(e, httpx.HTTPStatusError):
            status = e.response.status_code
            response = e.response
            
        if status is not None:
            metadata = {"status": status}
            headers = getattr(response, "headers", {}) if response else {}
            
            if status == 429:
                retry_after = 0.0
                retry_header = headers.get("retry-after") if hasattr(headers, "get") else None
                if retry_header and str(retry_header).isdigit():
                    retry_after = float(retry_header)
                
                if hasattr(headers, "get"):
                    for key in ["x-ratelimit-remaining-requests", "x-ratelimit-remaining-tokens", "x-ratelimit-limit-requests", "x-ratelimit-limit-tokens", "x-ratelimit-reset"]:
                        val = headers.get(key)
                        if val is not None:
                            metadata[key.replace("x-ratelimit-", "").replace("-", "_")] = val

                error_body = str(e).lower()
                if response and hasattr(response, "text"):
                    error_body += " " + str(response.text).lower()
                elif hasattr(e, "body"):
                    error_body += " " + str(getattr(e, "body")).lower()
                    
                if "quota" in error_body or "spending" in error_body or "insufficient_quota" in error_body:
                    return RateLimitError(f"Groq Quota Exceeded: {e}", retry_after, error_type=LLMErrorType.QUOTA_EXCEEDED, metadata=metadata)
                
                return RateLimitError(f"Groq Rate Limit Hit: {e}", retry_after, error_type=LLMErrorType.RATE_LIMITED, metadata=metadata)
                
            elif status in [401, 403]:
                error_type = LLMErrorType.AUTH_ERROR if status == 401 else LLMErrorType.PERMISSION_OR_ACCESS_ERROR
                return AuthenticationError(f"Groq Auth Error: {e}", error_type=error_type, metadata=metadata)
            elif status == 400:
                return InvalidRequestError(f"Groq Bad Request: {e}", error_type=LLMErrorType.INVALID_REQUEST, metadata=metadata)
            elif status == 404:
                return ModelNotFoundError(f"Groq Model Not Found: {e}", error_type=LLMErrorType.MODEL_NOT_FOUND_OR_INACCESSIBLE, metadata=metadata)
            elif status == 408:
                return ProviderUnavailableError(f"Groq Timeout: {e}", error_type=LLMErrorType.TIMEOUT, metadata=metadata)
            elif status >= 500:
                error_type = LLMErrorType.PROVIDER_SERVER_ERROR if status in [500, 502] else LLMErrorType.PROVIDER_UNAVAILABLE
                return ProviderUnavailableError(f"Groq Server Error: {e}", error_type=error_type, metadata=metadata)
                
        if isinstance(e, httpx.RequestError) or "timeout" in str(e).lower() or "connection" in str(e).lower():
            return ProviderUnavailableError(f"Groq Connection Error: {e}", error_type=LLMErrorType.NETWORK_ERROR)
            
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
