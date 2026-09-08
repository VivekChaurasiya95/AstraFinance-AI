from enum import Enum
from dataclasses import dataclass
from typing import Optional
from ..config.settings import settings

class QualityTier(Enum):
    CRITICAL = "CRITICAL"
    STANDARD = "STANDARD"

@dataclass
class AgentModelConfig:
    primary_provider: str
    primary_model: str
    fallback_provider: Optional[str]
    fallback_model: Optional[str]
    quality_tier: QualityTier
    fallback_2_provider: Optional[str] = None
    fallback_2_model: Optional[str] = None

def _get_openrouter_fallback_2() -> tuple:
    """Return (provider, model) for fallback 2, or (None, None) if not configured."""
    if settings.OPENROUTER_API_KEY:
        return "openrouter", settings.OPENROUTER_MODEL
    return None, None

def get_agent_config(agent_name: str) -> AgentModelConfig:
    """Retrieve model routing configuration for a specific agent based on settings."""
    name = agent_name.upper()
    
    # Dynamically fetch from settings or fallback to defaults
    primary_provider = getattr(settings, f"{name}_PRIMARY_PROVIDER", "groq")
    primary_model = getattr(settings, f"{name}_PRIMARY_MODEL", "llama-3.1-8b-instant")
    fallback_provider = getattr(settings, f"{name}_FALLBACK_PROVIDER", "gemini")
    fallback_model = getattr(settings, f"{name}_FALLBACK_MODEL", "gemini-3.5-flash")
    
    # Fallback 2 is always OpenRouter (last resort), if configured
    fb2_provider, fb2_model = _get_openrouter_fallback_2()
    
    # Assign quality tiers
    tier = QualityTier.STANDARD
    if agent_name in ["extraction", "red_flag", "research"]:
        tier = QualityTier.CRITICAL
        
    return AgentModelConfig(
        primary_provider=primary_provider,
        primary_model=primary_model,
        fallback_provider=fallback_provider,
        fallback_model=fallback_model,
        quality_tier=tier,
        fallback_2_provider=fb2_provider,
        fallback_2_model=fb2_model,
    )

GROQ_MODELS = ["openai/gpt-oss-120b", "llama-3.1-8b-instant", "llama-3.2-90b-vision-preview"]
GEMINI_MODELS = ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.5-flash-lite"]
OPENROUTER_MODELS = ["nvidia/nemotron-3-ultra-550b-a55b:free"]

def get_user_agent_config(ai_settings: dict | None, agent_name: str) -> AgentModelConfig:
    """
    Build AgentModelConfig by resolving user's AI settings, with fallback to environment defaults.
    """
    # 1. Get environment / agent-specific defaults
    default_config = get_agent_config(agent_name)
    
    if not ai_settings:
        return default_config
        
    # 2. Extract user settings (provider names are typically stored capitalized in frontend, e.g., 'Groq', 'Gemini')
    user_primary_provider = ai_settings.get("primary_provider", "").lower()
    user_primary_model = ai_settings.get("primary_model", "")
    
    user_fallback_provider = ai_settings.get("fallback_provider", "").lower()
    user_fallback_model = ai_settings.get("fallback_model", "")
    
    auto_fallback = ai_settings.get("auto_fallback", True)
    
    # 3. Resolve and validate primary
    primary_provider = default_config.primary_provider
    primary_model = default_config.primary_model
    
    if user_primary_provider in ["groq", "gemini"]:
        primary_provider = user_primary_provider
        # Validate model
        if primary_provider == "groq" and user_primary_model in GROQ_MODELS:
            primary_model = user_primary_model
        elif primary_provider == "gemini" and user_primary_model in GEMINI_MODELS:
            primary_model = user_primary_model
            
    # 4. Resolve and validate fallback
    fallback_provider = default_config.fallback_provider
    fallback_model = default_config.fallback_model
    
    if auto_fallback:
        if user_fallback_provider in ["groq", "gemini"]:
            fallback_provider = user_fallback_provider
            if fallback_provider == "groq" and user_fallback_model in GROQ_MODELS:
                fallback_model = user_fallback_model
            elif fallback_provider == "gemini" and user_fallback_model in GEMINI_MODELS:
                fallback_model = user_fallback_model
    else:
        fallback_provider = None
        fallback_model = None
    
    # 5. Fallback 2 is always OpenRouter (not user-configurable)
    return AgentModelConfig(
        primary_provider=primary_provider,
        primary_model=primary_model,
        fallback_provider=fallback_provider,
        fallback_model=fallback_model,
        quality_tier=default_config.quality_tier,
        fallback_2_provider=default_config.fallback_2_provider,
        fallback_2_model=default_config.fallback_2_model,
    )
