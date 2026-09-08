import json
import re
import threading
from typing import Any, Dict, List, Optional, Type

import httpx
from pydantic import BaseModel, ValidationError
from langchain_openai import ChatOpenAI
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage
from loguru import logger

from .exceptions import (
    RateLimitError, ProviderUnavailableError, AuthenticationError,
    InvalidRequestError, SchemaValidationError, LLMError, LLMErrorType
)
from ..config.settings import settings


class OpenRouterProvider:
    """
    OpenRouter provider using the OpenAI-compatible API.
    Used as fallback 2 (last resort) in the LLM routing chain.
    
    Does NOT assume response_format/json_schema support for free models.
    Uses prompt-based JSON generation + Pydantic validation for structured output.
    """

    def __init__(self):
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL
        self.default_model = settings.OPENROUTER_MODEL
        self.lock = threading.Lock()
        self.clients: Dict[str, Any] = {}

        self._enabled = bool(self.api_key)
        if not self._enabled:
            logger.warning("[LLM] OpenRouter fallback disabled reason=OPENROUTER_API_KEY not configured")

    @property
    def enabled(self) -> bool:
        return self._enabled

    def _get_client(self, model: str, temperature: float) -> ChatOpenAI:
        if not self._enabled:
            raise AuthenticationError(
                "OpenRouter API key not configured",
                error_type=LLMErrorType.AUTH_ERROR,
                metadata={"provider": "openrouter", "reason": "missing_api_key"}
            )

        client_key = f"{model}_{temperature}"
        if client_key not in self.clients:
            self.clients[client_key] = ChatOpenAI(
                api_key=self.api_key,
                base_url=self.base_url,
                model=model,
                temperature=temperature,
                max_retries=0,  # We handle retries in the router
                default_headers={
                    "X-Title": "AstraFinance AI",
                    "HTTP-Referer": "https://astrafinance.ai",
                },
            )
        return self.clients[client_key]

    def _map_error(self, e: Exception) -> Exception:
        """Map HTTP/provider errors to our typed exception hierarchy."""
        status = getattr(e, "status_code", None)
        response = getattr(e, "response", None)

        if status is None and isinstance(e, httpx.HTTPStatusError):
            status = e.response.status_code
            response = e.response

        if status is not None:
            metadata = {"status": status, "provider": "openrouter"}

            if status == 429:
                retry_after = 0.0
                headers = getattr(response, "headers", {}) if response else {}
                retry_header = headers.get("retry-after") if hasattr(headers, "get") else None
                if retry_header and str(retry_header).isdigit():
                    retry_after = float(retry_header)

                error_body = str(e).lower()
                if response and hasattr(response, "text"):
                    error_body += " " + str(response.text).lower()

                if "quota" in error_body or "spending" in error_body:
                    return RateLimitError(
                        f"OpenRouter Quota Exceeded: {e}", retry_after,
                        error_type=LLMErrorType.QUOTA_EXCEEDED, metadata=metadata
                    )
                return RateLimitError(
                    f"OpenRouter Rate Limit Hit: {e}", retry_after,
                    error_type=LLMErrorType.RATE_LIMITED, metadata=metadata
                )

            elif status in [401, 403]:
                error_type = LLMErrorType.AUTH_ERROR if status == 401 else LLMErrorType.PERMISSION_OR_ACCESS_ERROR
                return AuthenticationError(
                    f"OpenRouter Auth Error: {e}", error_type=error_type, metadata=metadata
                )
            elif status == 400:
                return InvalidRequestError(
                    f"OpenRouter Bad Request: {e}", error_type=LLMErrorType.INVALID_REQUEST, metadata=metadata
                )
            elif status == 404:
                return InvalidRequestError(
                    f"OpenRouter Model Not Found: {e}", error_type=LLMErrorType.MODEL_NOT_FOUND,
                    metadata={**metadata, "model": self.default_model}
                )
            elif status == 408:
                return ProviderUnavailableError(
                    f"OpenRouter Timeout: {e}", error_type=LLMErrorType.TIMEOUT, metadata=metadata
                )
            elif status >= 500:
                error_type = LLMErrorType.PROVIDER_SERVER_ERROR if status in [500, 502] else LLMErrorType.PROVIDER_UNAVAILABLE
                return ProviderUnavailableError(
                    f"OpenRouter Server Error: {e}", error_type=error_type, metadata=metadata
                )

        if isinstance(e, httpx.RequestError) or "timeout" in str(e).lower() or "connection" in str(e).lower():
            return ProviderUnavailableError(
                f"OpenRouter Connection Error: {e}", error_type=LLMErrorType.NETWORK_ERROR,
                metadata={"provider": "openrouter"}
            )

        if isinstance(e, ValueError):
            err_str = str(e)
            if "'code': 502" in err_str or "'code': 503" in err_str or "temporarily overloaded" in err_str.lower():
                return ProviderUnavailableError(
                    f"OpenRouter Upstream Error: {e}", error_type=LLMErrorType.PROVIDER_SERVER_ERROR,
                    metadata={"provider": "openrouter"}
                )
            if "'code': 429" in err_str or "rate limit" in err_str.lower():
                return RateLimitError(
                    f"OpenRouter Rate Limit Hit: {e}", 0.0,
                    error_type=LLMErrorType.RATE_LIMITED, metadata={"provider": "openrouter"}
                )
            if "'code': 401" in err_str or "auth" in err_str.lower():
                return AuthenticationError(
                    f"OpenRouter Auth Error: {e}", error_type=LLMErrorType.AUTH_ERROR,
                    metadata={"provider": "openrouter"}
                )

        return e

    def invoke(self, model: str, messages: List[BaseMessage], temperature: float = 0.1, **kwargs) -> Any:
        """Plain text invocation — same interface as Groq/Gemini providers."""
        try:
            client = self._get_client(model, temperature)
            return client.invoke(messages, **kwargs)
        except AuthenticationError:
            raise
        except Exception as e:
            raise self._map_error(e)

    def invoke_structured(self, model: str, messages: List[BaseMessage], schema: Type[BaseModel],
                          temperature: float = 0.1, **kwargs) -> BaseModel:
        """
        Structured output via prompt-based JSON extraction + Pydantic validation.
        
        Does NOT use response_format/json_schema because the Nemotron free endpoint
        is not guaranteed to support it. Instead:
        1. Constructs a strict JSON instruction prompt with the schema
        2. Invokes the model for a plain text response
        3. Extracts JSON from the response (handling markdown fences, etc.)
        4. Validates against the Pydantic schema
        5. On validation failure, retries ONCE with a correction prompt
        """
        try:
            client = self._get_client(model, temperature)
        except AuthenticationError:
            raise

        # Build the schema description for the prompt
        schema_json = json.dumps(schema.model_json_schema(), indent=2)
        
        # Construct system instruction for structured JSON output
        json_instruction = (
            "CRITICAL OUTPUT FORMAT INSTRUCTION:\n"
            "You MUST return ONLY valid JSON matching the following schema.\n"
            "Do NOT include markdown formatting.\n"
            "Do NOT include ```json fences.\n"
            "Do NOT include explanations or text outside the JSON.\n"
            "Do NOT include comments in the JSON.\n"
            "Return ONLY the raw JSON object.\n\n"
            f"JSON Schema:\n{schema_json}"
        )

        # Inject the JSON instruction into the messages
        enhanced_messages = self._inject_json_instruction(messages, json_instruction)

        try:
            # Attempt 1: invoke and parse
            result_msg = client.invoke(enhanced_messages, **kwargs)
            content = self._extract_content(result_msg)
            parsed = self._extract_and_validate_json(content, schema)
            return parsed

        except SchemaValidationError as validation_err:
            # Retry ONCE with a correction prompt
            logger.debug(f"[LLM_ROUTER] OpenRouter structured output validation failed, retrying with correction prompt")
            
            correction_messages = enhanced_messages + [
                AIMessage(content=content if 'content' in dir() else ""),
                HumanMessage(content=(
                    "The previous response was not valid JSON or did not match the required schema.\n"
                    f"Validation error: {str(validation_err)}\n\n"
                    "Please try again. Return ONLY the raw JSON object matching the schema. "
                    "No markdown, no fences, no explanations."
                ))
            ]

            try:
                retry_msg = client.invoke(correction_messages, **kwargs)
                retry_content = self._extract_content(retry_msg)
                parsed = self._extract_and_validate_json(retry_content, schema)
                return parsed
            except Exception as retry_err:
                raise SchemaValidationError(
                    f"OpenRouter structured output failed after correction retry: {retry_err}",
                    metadata={"provider": "openrouter", "model": model, "schema": schema.__name__}
                )

        except (AuthenticationError, InvalidRequestError):
            raise
        except Exception as e:
            raise self._map_error(e)

    def _inject_json_instruction(self, messages: List[BaseMessage], instruction: str) -> List[BaseMessage]:
        """
        Inject JSON formatting instructions into the message list.
        If there's already a system message, append to it. Otherwise, prepend a new one.
        """
        enhanced = list(messages)
        
        if enhanced and isinstance(enhanced[0], SystemMessage):
            # Append to existing system message
            original_content = enhanced[0].content
            enhanced[0] = SystemMessage(content=f"{original_content}\n\n{instruction}")
        else:
            # Prepend a system message
            enhanced.insert(0, SystemMessage(content=instruction))
        
        return enhanced

    def _extract_content(self, result: Any) -> str:
        """Extract text content from a LangChain response, handling list-type content blocks."""
        if hasattr(result, "content"):
            content = result.content
            if isinstance(content, list):
                text_parts = []
                for part in content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                return "".join(text_parts)
            return str(content)
        return str(result)

    def _extract_and_validate_json(self, raw_text: str, schema: Type[BaseModel]) -> BaseModel:
        """
        Extract JSON from raw model output and validate against Pydantic schema.
        Handles:
        - Clean JSON
        - Markdown-fenced JSON (```json ... ```)
        - JSON embedded in surrounding text
        """
        text = raw_text.strip()

        # Step 1: Remove markdown code fences
        # Match ```json ... ``` or ``` ... ```
        fence_pattern = r'```(?:json)?\s*\n?(.*?)\n?\s*```'
        fence_match = re.search(fence_pattern, text, re.DOTALL)
        if fence_match:
            text = fence_match.group(1).strip()

        # Step 2: Try direct JSON parse
        try:
            data = json.loads(text)
            return schema.model_validate(data)
        except (json.JSONDecodeError, ValidationError):
            pass

        # Step 3: Try to find the outermost JSON object in the text
        brace_start = text.find('{')
        brace_end = text.rfind('}')
        if brace_start != -1 and brace_end > brace_start:
            json_candidate = text[brace_start:brace_end + 1]
            try:
                data = json.loads(json_candidate)
                return schema.model_validate(data)
            except (json.JSONDecodeError, ValidationError) as e:
                raise SchemaValidationError(
                    f"OpenRouter output failed schema validation: {e}",
                    metadata={"provider": "openrouter", "schema": schema.__name__, "raw_length": len(raw_text)}
                )

        # Step 4: Complete failure
        raise SchemaValidationError(
            f"OpenRouter output is not valid JSON. Raw output starts with: {raw_text[:200]}",
            metadata={"provider": "openrouter", "schema": schema.__name__, "raw_length": len(raw_text)}
        )

    def test_connection(self, model: str) -> bool:
        """Test connectivity without making a heavy call."""
        try:
            client = self._get_client(model, 0.1)
            client.invoke([HumanMessage(content="hi")])
            return True
        except Exception:
            return False
