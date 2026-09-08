from enum import Enum
from typing import Optional, Dict, Any

class LLMErrorType(Enum):
    RATE_LIMITED = "rate_limit"
    QUOTA_EXCEEDED = "quota_exceeded"
    AUTH_ERROR = "authentication_error"
    PERMISSION_OR_ACCESS_ERROR = "permission_or_access_error"
    MODEL_NOT_FOUND = "model_not_found"
    MODEL_NOT_FOUND_OR_INACCESSIBLE = "model_not_found"
    INVALID_REQUEST = "invalid_request"
    PROVIDER_SERVER_ERROR = "provider_server_error"
    PROVIDER_UNAVAILABLE = "provider_unavailable"
    TIMEOUT = "timeout"
    NETWORK_ERROR = "network_error"
    UNKNOWN = "unknown"

class LLMError(Exception):
    """Base exception for all LLM-related errors."""
    def __init__(self, message: str, error_type: LLMErrorType = LLMErrorType.UNKNOWN, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(message)
        self.error_type = error_type
        self.metadata = metadata or {}

class RateLimitError(LLMError):
    """Raised when an API rate limit is hit (e.g. 429)."""
    def __init__(self, message: str, retry_after: float = 0.0, error_type: LLMErrorType = LLMErrorType.RATE_LIMITED, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_type=error_type, metadata=metadata)
        self.retry_after = retry_after

class ProviderUnavailableError(LLMError):
    """Raised when the provider is down or unreachable (e.g. 5xx, timeouts)."""
    def __init__(self, message: str, error_type: LLMErrorType = LLMErrorType.PROVIDER_UNAVAILABLE, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_type=error_type, metadata=metadata)

class AuthenticationError(LLMError):
    """Raised when API keys are invalid (e.g. 401, 403). Non-retryable."""
    def __init__(self, message: str, error_type: LLMErrorType = LLMErrorType.AUTH_ERROR, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_type=error_type, metadata=metadata)

class InvalidRequestError(LLMError):
    """Raised for malformed requests or invalid model names (e.g. 400). Non-retryable."""
    def __init__(self, message: str, error_type: LLMErrorType = LLMErrorType.INVALID_REQUEST, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_type=error_type, metadata=metadata)

class ModelNotFoundError(LLMError):
    """Raised when the requested model does not exist or is inaccessible (e.g. 404). Non-retryable but triggers fallback."""
    def __init__(self, message: str, error_type: LLMErrorType = LLMErrorType.MODEL_NOT_FOUND_OR_INACCESSIBLE, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_type=error_type, metadata=metadata)

class SchemaValidationError(LLMError):
    """Raised when the LLM output fails to match the requested Pydantic schema. Non-retryable."""
    def __init__(self, message: str, error_type: LLMErrorType = LLMErrorType.INVALID_REQUEST, metadata: Optional[Dict[str, Any]] = None):
        super().__init__(message, error_type=error_type, metadata=metadata)
