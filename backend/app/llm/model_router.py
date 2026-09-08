import time
from typing import Any, Dict, List, Optional, Type
from pydantic import BaseModel
from loguru import logger
from langchain_core.messages import BaseMessage

from .config import get_agent_config, AgentModelConfig
from .retry_policy import RetryPolicy
from .circuit_breaker import CircuitBreaker
from .provider_registry import registry
from .exceptions import LLMError, AuthenticationError, InvalidRequestError, SchemaValidationError, RateLimitError, ProviderUnavailableError, LLMErrorType, ModelNotFoundError


def _log_provider_config():
    """Log provider configuration at module load time."""
    from ..config.settings import settings
    
    openrouter_status = "openrouter" if settings.OPENROUTER_API_KEY else "disabled"
    
    logger.info(
        f"[LLM] Provider configuration loaded "
        f"primary=groq fallback_1=gemini fallback_2={openrouter_status}"
    )
    
    if not settings.OPENROUTER_API_KEY:
        logger.warning("[LLM] OpenRouter fallback disabled reason=OPENROUTER_API_KEY not configured")
    else:
        logger.info(f"[LLM] OpenRouter model={settings.OPENROUTER_MODEL}")


class LLMRouter:
    def __init__(self):
        self.retry_policy = RetryPolicy()
        # Use a smaller retry policy for last-resort providers
        self.last_resort_retry_policy = RetryPolicy(max_retries=2, base_delay=2.0, max_delay=8.0)
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.cache: Dict[str, Any] = {}
        import hashlib
        self._hashlib = hashlib

    def _get_circuit_breaker(self, provider_name: str, model_name: str) -> CircuitBreaker:
        key = f"{provider_name}_{model_name}"
        if key not in self.circuit_breakers:
            self.circuit_breakers[key] = CircuitBreaker()
        return self.circuit_breakers[key]

    def _get_retry_policy(self, provider_name: str) -> RetryPolicy:
        """OpenRouter (last resort) gets a smaller bounded retry policy."""
        if provider_name == "openrouter":
            return self.last_resort_retry_policy
        return self.retry_policy

    def _attempt_call(self, provider_name: str, model_name: str, method: str, messages: List[BaseMessage], schema: Optional[Type[BaseModel]] = None, agent_name: str = "unknown", **kwargs) -> Any:
        cb = self._get_circuit_breaker(provider_name, model_name)
        if not cb.can_execute():
            raise LLMError(f"Circuit breaker is OPEN for {provider_name}/{model_name}")

        # Cache key generation
        msg_str = "".join([m.content for m in messages if hasattr(m, 'content') and isinstance(m.content, str)])
        schema_str = schema.__name__ if schema else "none"
        cache_key = self._hashlib.md5(f"{provider_name}_{model_name}_{method}_{schema_str}_{msg_str}".encode()).hexdigest()
        
        if cache_key in self.cache:
            logger.info(f"[LLM_ROUTER] CACHE HIT Provider={provider_name} Model={model_name}")
            return self.cache[cache_key]

        provider = registry.get_provider(provider_name)
        retry_policy = self._get_retry_policy(provider_name)
        
        attempt = 0
        while True:
            try:
                start_time = time.time()
                if method == "structured" and schema:
                    result = provider.invoke_structured(model_name, messages, schema, **kwargs)
                else:
                    result = provider.invoke(model_name, messages, **kwargs)
                latency = int((time.time() - start_time) * 1000)
                
                cb.record_success()
                
                # Append metadata to result if it's a BaseModel (to track which provider was used)
                if isinstance(result, BaseModel) and hasattr(result, "__dict__"):
                    try:
                        object.__setattr__(result, "_llm_metadata", {
                            "provider": provider_name,
                            "model": model_name,
                            "latency_ms": latency,
                            "attempts": attempt + 1
                        })
                    except Exception:
                        pass
                elif hasattr(result, "response_metadata"):
                    # LangChain AIMessage
                    if not result.response_metadata:
                        result.response_metadata = {}
                    result.response_metadata["router"] = {
                        "provider": provider_name,
                        "model": model_name,
                        "latency_ms": latency,
                        "attempts": attempt + 1
                    }
                    
                logger.info(
                    f"[LLM_ROUTER] SUCCESS provider={provider_name} model={model_name} "
                    f"agent={agent_name} duration_ms={latency} attempt={attempt+1}"
                )
                
                # Normalize content: some providers return a list of content blocks instead of a string
                if hasattr(result, "content") and isinstance(result.content, list):
                    text_parts = []
                    for part in result.content:
                        if isinstance(part, dict) and "text" in part:
                            text_parts.append(part["text"])
                        elif isinstance(part, str):
                            text_parts.append(part)
                    result.content = "".join(text_parts)
                
                # Save to cache
                self.cache[cache_key] = result
                
                return result

            except Exception as e:
                cb.record_failure()
                
                # Handle non-retryable errors
                if isinstance(e, (AuthenticationError, InvalidRequestError, SchemaValidationError)):
                    logger.error(f"[LLM_ROUTER] FATAL Error agent={agent_name} provider={provider_name} model={model_name} Attempt={attempt+1}: {e}")
                    raise e
                    
                if isinstance(e, ModelNotFoundError):
                    logger.warning(
                        f"[LLM_ROUTER] {provider_name.capitalize()} model unavailable "
                        f"agent={agent_name} provider={provider_name} model={model_name} "
                        f"status=404 reason=model_not_found action=fallback"
                    )
                    raise e
                    
                if isinstance(e, RateLimitError):
                    status = e.metadata.get("status", 429) if hasattr(e, "metadata") and getattr(e, "metadata") else 429
                    reason = e.error_type.value if hasattr(e, "error_type") and getattr(e, "error_type") else "rate_limit"
                    if reason == "quota_exceeded":
                        logger.warning(f"[LLM_ROUTER] {provider_name.capitalize()} quota/spending limit reached provider={provider_name} model={model_name} status={status}")
                    else:
                        logger.warning(f"[LLM_ROUTER] {provider_name.capitalize()} rate limit reached provider={provider_name} model={model_name} status={status} reason={reason}")
                        
                elif isinstance(e, ProviderUnavailableError):
                    status = e.metadata.get("status", 503) if hasattr(e, "metadata") and getattr(e, "metadata") else 503
                    reason = e.metadata.get("reason", "provider_unavailable") if hasattr(e, "metadata") and getattr(e, "metadata") else "provider_unavailable"
                    logger.warning(f"[LLM_ROUTER] {provider_name.capitalize()} temporarily unavailable provider={provider_name} model={model_name} status={status} reason={reason}")

                should_retry, wait_time = retry_policy.should_retry(e, attempt)
                if not should_retry:
                    logger.warning(f"[LLM_ROUTER] FAILED Provider={provider_name} Model={model_name} after {attempt+1} attempts: {e}")
                    raise e
                    
                logger.debug(f"[LLM_ROUTER] Retry provider={provider_name} attempt={attempt+1} wait={wait_time:.1f}s")
                time.sleep(wait_time)
                attempt += 1

    def _route_with_config(self, config: AgentModelConfig, agent_name: str, method: str, messages: List[BaseMessage], schema: Optional[Type[BaseModel]] = None, **kwargs) -> Any:
        """
        3-provider fallback chain:
        primary → fallback_1 → fallback_2 → controlled error
        """
        def _get_reason(err: Exception) -> str:
            if hasattr(err, "error_type") and isinstance(err.error_type, LLMErrorType):
                return err.error_type.value
            return "unknown"
            
        def _format_meta(err: Exception) -> str:
            meta_str = ""
            if hasattr(err, "metadata") and isinstance(err.metadata, dict):
                for k, v in err.metadata.items():
                    if k != "status" and k != "reason":
                        meta_str += f" {k}={v}"
            return meta_str

        # Define the fallback chain
        providers = []
        providers.append((config.primary_provider, config.primary_model, "primary"))
        if config.fallback_provider and config.fallback_model:
            providers.append((config.fallback_provider, config.fallback_model, "fallback_1"))
        if config.fallback_2_provider and config.fallback_2_model:
            providers.append((config.fallback_2_provider, config.fallback_2_model, "fallback_2"))

        errors: Dict[str, str] = {}  # provider -> reason
        last_error: Optional[Exception] = None

        for i, (prov_name, prov_model, role) in enumerate(providers):
            try:
                result = self._attempt_call(prov_name, prov_model, method, messages, schema, agent_name=agent_name, **kwargs)
                
                # Tag result with fallback metadata if not the primary
                if i > 0:
                    fallback_meta = {
                        "fallback_used": True,
                        "fallback_reason": errors.get(providers[i-1][0], "unknown"),
                        "requested_provider": config.primary_provider,
                        "actual_provider": prov_name,
                    }
                    if isinstance(result, BaseModel):
                        try:
                            meta = getattr(result, "_llm_metadata", None)
                            if not isinstance(meta, dict):
                                meta = {}
                                object.__setattr__(result, "_llm_metadata", meta)
                            meta.update(fallback_meta)
                        except Exception:
                            pass
                    elif hasattr(result, "response_metadata"):
                        if not result.response_metadata:
                            result.response_metadata = {}
                        if "router" not in result.response_metadata:
                            result.response_metadata["router"] = {}
                        result.response_metadata["router"].update(fallback_meta)
                    
                    logger.info(f"[LLM_ROUTER] Fallback success provider={prov_name} model={prov_model} agent={agent_name}")
                
                return result

            except Exception as e:
                # If non-retryable (like auth error), bubble up immediately
                if isinstance(e, (AuthenticationError, InvalidRequestError, SchemaValidationError)):
                    raise e
                
                reason = _get_reason(e)
                errors[prov_name] = reason
                last_error = e
                
                # Log the fallback transition if there's a next provider
                if i < len(providers) - 1:
                    next_prov = providers[i + 1][0]
                    logger.warning(
                        f"[LLM_ROUTER] FALLBACK from={prov_name} to={next_prov} "
                        f"reason={reason} agent={agent_name}"
                    )

        # All providers failed
        error_details = " ".join([f"{p}={r}" for p, r in errors.items()])
        logger.error(
            f"[LLM_ROUTER] All LLM providers unavailable agent={agent_name} {error_details}"
        )
        raise LLMError(
            "All LLM providers unavailable",
            error_type=LLMErrorType.PROVIDER_UNAVAILABLE,
            metadata=errors
        )

    def invoke(self, agent_name: str, messages: List[BaseMessage], user_settings: dict | None = None, **kwargs) -> Any:
        from .config import get_user_agent_config
        config = get_user_agent_config(user_settings, agent_name)
        return self._route_with_config(config, agent_name, "plain", messages, None, **kwargs)

    def invoke_structured(self, agent_name: str, messages: List[BaseMessage], schema: Type[BaseModel], user_settings: dict | None = None, **kwargs) -> BaseModel:
        from .config import get_user_agent_config
        config = get_user_agent_config(user_settings, agent_name)
        return self._route_with_config(config, agent_name, "structured", messages, schema, **kwargs)

    def invoke_with_config(self, config: AgentModelConfig, agent_name: str, messages: List[BaseMessage], **kwargs) -> Any:
        return self._route_with_config(config, agent_name, "plain", messages, None, **kwargs)

    def invoke_structured_with_config(self, config: AgentModelConfig, agent_name: str, messages: List[BaseMessage], schema: Type[BaseModel], **kwargs) -> BaseModel:
        return self._route_with_config(config, agent_name, "structured", messages, schema, **kwargs)


# Module-level singleton
router = LLMRouter()

# Log provider configuration at startup
_log_provider_config()


def get_llm_router() -> LLMRouter:
    return router
