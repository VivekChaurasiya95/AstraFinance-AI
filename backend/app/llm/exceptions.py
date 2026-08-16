class LLMError(Exception):
    """Base exception for all LLM-related errors."""
    pass

class RateLimitError(LLMError):
    """Raised when an API rate limit is hit (e.g. 429)."""
    def __init__(self, message: str, retry_after: float = 0):
        super().__init__(message)
        self.retry_after = retry_after

class ProviderUnavailableError(LLMError):
    """Raised when the provider is down or unreachable (e.g. 5xx, timeouts)."""
    pass

class AuthenticationError(LLMError):
    """Raised when API keys are invalid (e.g. 401, 403). Non-retryable."""
    pass

class InvalidRequestError(LLMError):
    """Raised for malformed requests or invalid model names (e.g. 400). Non-retryable."""
    pass

class SchemaValidationError(LLMError):
    """Raised when the LLM output fails to match the requested Pydantic schema. Non-retryable."""
    pass
