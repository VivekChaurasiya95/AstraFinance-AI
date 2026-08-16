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

def get_agent_config(agent_name: str) -> AgentModelConfig:
    """Retrieve model routing configuration for a specific agent based on settings."""
    name = agent_name.upper()
    
    # Dynamically fetch from settings or fallback to defaults
    primary_provider = getattr(settings, f"{name}_PRIMARY_PROVIDER", "groq")
    primary_model = getattr(settings, f"{name}_PRIMARY_MODEL", "llama-3.1-8b-instant")
    fallback_provider = getattr(settings, f"{name}_FALLBACK_PROVIDER", "gemini")
    fallback_model = getattr(settings, f"{name}_FALLBACK_MODEL", "gemini-3.5-flash")
    
    # Assign quality tiers
    tier = QualityTier.STANDARD
    if agent_name in ["extraction", "red_flag", "research"]:
        tier = QualityTier.CRITICAL
        
    return AgentModelConfig(
        primary_provider=primary_provider,
        primary_model=primary_model,
        fallback_provider=fallback_provider,
        fallback_model=fallback_model,
        quality_tier=tier
    )
