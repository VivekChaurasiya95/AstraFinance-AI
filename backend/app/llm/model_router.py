import time
from typing import Any, Dict, List, Optional, Type
from pydantic import BaseModel
from loguru import logger
from langchain_core.messages import BaseMessage

from .config import get_agent_config, AgentModelConfig
from .retry_policy import RetryPolicy
from .circuit_breaker import CircuitBreaker
from .provider_registry import registry
from .exceptions import LLMError, AuthenticationError, InvalidRequestError, SchemaValidationError

class LLMRouter:
    def __init__(self):
        self.retry_policy = RetryPolicy()
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}

    def _get_circuit_breaker(self, provider_name: str, model_name: str) -> CircuitBreaker:
        key = f"{provider_name}_{model_name}"
        if key not in self.circuit_breakers:
            self.circuit_breakers[key] = CircuitBreaker()
        return self.circuit_breakers[key]

    def _attempt_call(self, provider_name: str, model_name: str, method: str, messages: List[BaseMessage], schema: Optional[Type[BaseModel]] = None, **kwargs) -> Any:
        cb = self._get_circuit_breaker(provider_name, model_name)
        if not cb.can_execute():
            raise LLMError(f"Circuit breaker is OPEN for {provider_name}/{model_name}")

        provider = registry.get_provider(provider_name)
        
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
                    
                logger.info(f"[LLM_ROUTER] SUCCESS Provider={provider_name} Model={model_name} Attempt={attempt+1} Latency={latency}ms")
                return result

            except Exception as e:
                cb.record_failure()
                
                # Handle non-retryable errors
                if isinstance(e, (AuthenticationError, InvalidRequestError, SchemaValidationError)):
                    logger.error(f"[LLM_ROUTER] FATAL Error Provider={provider_name} Model={model_name} Attempt={attempt+1}: {e}")
                    raise e
                    
                from .exceptions import RateLimitError
                if isinstance(e, RateLimitError):
                    cooldown = e.retry_after if hasattr(e, 'retry_after') and e.retry_after > 0 else 60.0
                    logger.warning(f"[LLM_ROUTER] RATE LIMIT Hit on {provider_name}/{model_name}. Tripping circuit breaker for {cooldown}s.")
                    cb.trip(cooldown)
                    # Raise immediately to route to fallback instead of blocking thread
                    raise e

                should_retry, wait_time = self.retry_policy.should_retry(e, attempt)
                if not should_retry:
                    logger.warning(f"[LLM_ROUTER] FAILED Provider={provider_name} Model={model_name} after {attempt+1} attempts: {e}")
                    raise e
                    
                logger.warning(f"[LLM_ROUTER] RETRY Provider={provider_name} Model={model_name} Attempt={attempt+1} wait={wait_time:.1f}s error={e}")
                time.sleep(wait_time)
                attempt += 1

    def _route_with_config(self, config: AgentModelConfig, agent_name: str, method: str, messages: List[BaseMessage], schema: Optional[Type[BaseModel]] = None, **kwargs) -> Any:
        # Try primary
        try:
            return self._attempt_call(config.primary_provider, config.primary_model, method, messages, schema, **kwargs)
        except Exception as e:
            # If non-retryable (like auth error), bubble up immediately
            if isinstance(e, (AuthenticationError, InvalidRequestError, SchemaValidationError)):
                raise e
            
            if not config.fallback_provider or not config.fallback_model:
                raise LLMError(f"Primary provider failed and no fallback configured for agent {agent_name}: {e}")
                
            logger.warning(f"[LLM_ROUTER] FALLBACK TRIGGERED for {agent_name} -> {config.fallback_provider}/{config.fallback_model} Reason: {e}")
            
            # Try fallback
            try:
                result = self._attempt_call(config.fallback_provider, config.fallback_model, method, messages, schema, **kwargs)
                
                # Tag result as using fallback
                if isinstance(result, BaseModel) and hasattr(result, "_llm_metadata"):
                    result._llm_metadata["fallback_used"] = True
                    result._llm_metadata["fallback_reason"] = str(e)
                    result._llm_metadata["requested_provider"] = config.primary_provider
                    result._llm_metadata["actual_provider"] = config.fallback_provider
                elif hasattr(result, "response_metadata") and "router" in result.response_metadata:
                    result.response_metadata["router"]["fallback_used"] = True
                    result.response_metadata["router"]["fallback_reason"] = str(e)
                    result.response_metadata["router"]["requested_provider"] = config.primary_provider
                    result.response_metadata["router"]["actual_provider"] = config.fallback_provider
                    
                return result
            except Exception as fallback_err:
                logger.error(f"[LLM_ROUTER] ALL PROVIDERS FAILED for {agent_name}. Primary: {e}. Fallback: {fallback_err}")
                raise LLMError(f"All LLM providers failed for agent {agent_name}. Last error: {fallback_err}")

    def invoke(self, agent_name: str, messages: List[BaseMessage], user_settings: dict = None, **kwargs) -> Any:
        from .config import get_user_agent_config
        config = get_user_agent_config(user_settings, agent_name)
        return self._route_with_config(config, agent_name, "plain", messages, None, **kwargs)

    def invoke_structured(self, agent_name: str, messages: List[BaseMessage], schema: Type[BaseModel], user_settings: dict = None, **kwargs) -> BaseModel:
        from .config import get_user_agent_config
        config = get_user_agent_config(user_settings, agent_name)
        return self._route_with_config(config, agent_name, "structured", messages, schema, **kwargs)

    def invoke_with_config(self, config: AgentModelConfig, agent_name: str, messages: List[BaseMessage], **kwargs) -> Any:
        return self._route_with_config(config, agent_name, "plain", messages, None, **kwargs)

    def invoke_structured_with_config(self, config: AgentModelConfig, agent_name: str, messages: List[BaseMessage], schema: Type[BaseModel], **kwargs) -> BaseModel:
        return self._route_with_config(config, agent_name, "structured", messages, schema, **kwargs)

router = LLMRouter()

def get_llm_router() -> LLMRouter:
    return router
