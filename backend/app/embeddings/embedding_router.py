import logging
import time
from typing import List, Tuple, Dict, Any

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_google_genai import GoogleGenerativeAIEmbeddings


from ..config.settings import settings

logger = logging.getLogger(__name__)

class EmbeddingRouter:
    """
    Centralized service for generating embeddings using a Primary (Gemini) 
    and Fallback (Hugging Face) strategy.
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialize()
        return cls._instance

    def _initialize(self):
        # Initialize Primary
        self.primary_provider = settings.EMBEDDING_PRIMARY_PROVIDER
        self.primary_model_name = settings.GEMINI_EMBEDDING_MODEL
        self.primary_dim = 768
        
        try:
            self.primary_embeddings = GoogleGenerativeAIEmbeddings(
                model=self.primary_model_name,
                google_api_key=settings.GEMINI_API_KEY
            )
        except Exception as e:
            logger.error(f"Failed to initialize primary embeddings ({self.primary_provider}): {e}")
            self.primary_embeddings = None

        # Initialize Fallback
        self.fallback_provider = settings.EMBEDDING_FALLBACK_PROVIDER
        self.fallback_model_name = settings.HF_EMBEDDING_MODEL
        self.fallback_dim = 384
        
        if settings.EMBEDDING_FALLBACK_ENABLED:
            try:
                # Load locally, caches after first download
                self.fallback_embeddings = HuggingFaceEmbeddings(
                    model_name=self.fallback_model_name
                )
            except Exception as e:
                logger.error(f"Failed to initialize fallback embeddings ({self.fallback_provider}): {e}")
                self.fallback_embeddings = None
        else:
            self.fallback_embeddings = None

    def _is_retryable_error(self, e: Exception) -> bool:
        """Determine if the exception is a transient/rate-limit error."""
        error_str = str(e).lower()
        if any(keyword in error_str for keyword in [
            "429", "quota", "timeout", "503", "500", "resourceexhausted", 
            "serviceunavailable", "deadlineexceeded", "rate limit"
        ]):
            return True
            
        return False

    def embed_documents(self, texts: List[str]) -> Tuple[List[List[float]], str, str, int]:
        """
        Embeds documents using the primary provider.
        If it encounters a retryable error, it retries with exponential backoff.
        If retries are exhausted, it falls back to the secondary provider.
        
        Returns: (embeddings, provider, model_name, dimension)
        """
        max_retries = settings.EMBEDDING_GEMINI_MAX_RETRIES
        
        if self.primary_embeddings:
            for attempt in range(max_retries + 1):
                try:
                    embeddings = self.primary_embeddings.embed_documents(texts)
                    logger.info(f"[EMBEDDING] Provider={self.primary_provider} Model={self.primary_model_name} Status=success")
                    return embeddings, self.primary_provider, self.primary_model_name, self.primary_dim
                except Exception as e:
                    if self._is_retryable_error(e):
                        if attempt < max_retries:
                            backoff = 2 ** attempt
                            logger.warning(f"[EMBEDDING] Provider={self.primary_provider} Status=rate_limited Action=retry Attempt={attempt + 1}/{max_retries} Sleep={backoff}s")
                            time.sleep(backoff)
                        else:
                            logger.error(f"[EMBEDDING] Provider={self.primary_provider} Status=rate_limited Action=fallback Error='{e}'")
                    else:
                        logger.error(f"[EMBEDDING] Provider={self.primary_provider} Status=error Action=fallback Error='{e}'")
                        break # Non-retryable error, immediately break to fallback
                        
        # Fallback path
        if self.fallback_embeddings:
            try:
                embeddings = self.fallback_embeddings.embed_documents(texts)
                logger.info(f"[EMBEDDING] Provider={self.fallback_provider} Model={self.fallback_model_name} Status=success")
                return embeddings, self.fallback_provider, self.fallback_model_name, self.fallback_dim
            except Exception as e:
                logger.error(f"[EMBEDDING] Provider={self.fallback_provider} Status=error Action=fail Error='{e}'")
                raise RuntimeError(f"Embedding failed. Both {self.primary_provider} and {self.fallback_provider} are unavailable.")
                
        raise RuntimeError("Embedding providers unavailable or incorrectly configured.")

    def embed_queries(self, queries: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Generates query embeddings for all available providers so search can occur across 
        mixed-provider workspaces.
        
        Returns:
            {
                "gemini": {"embeddings": [...], "model": "...", "dimension": 768},
                "huggingface": {"embeddings": [...], "model": "...", "dimension": 384}
            }
        """
        results = {}
        
        if self.primary_embeddings:
            try:
                results[self.primary_provider] = {
                    "embeddings": self.primary_embeddings.embed_documents(queries),
                    "model": self.primary_model_name,
                    "dimension": self.primary_dim
                }
            except Exception as e:
                logger.warning(f"Failed to generate query embeddings for primary provider {self.primary_provider}: {e}")
                
        if self.fallback_embeddings:
            try:
                results[self.fallback_provider] = {
                    "embeddings": self.fallback_embeddings.embed_documents(queries),
                    "model": self.fallback_model_name,
                    "dimension": self.fallback_dim
                }
            except Exception as e:
                logger.warning(f"Failed to generate query embeddings for fallback provider {self.fallback_provider}: {e}")
                
        return results

embedding_router = EmbeddingRouter()
