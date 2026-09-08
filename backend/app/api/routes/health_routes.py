from fastapi import APIRouter
from ..routes.auth_routes import get_current_user

router = APIRouter()


@router.get("/health", tags=["Health"])
def health_check():
    from ...llm.provider_registry import registry
    from ...config.settings import settings

    providers = {
        "groq": {
            "configured": registry.is_provider_configured("groq"),
        },
        "gemini": {
            "configured": registry.is_provider_configured("gemini"),
        },
        "openrouter": {
            "configured": registry.is_provider_configured("openrouter"),
            "model": settings.OPENROUTER_MODEL if registry.is_provider_configured("openrouter") else None,
        },
    }

    return {
        "status": "healthy",
        "message": "Backend is running successfully.",
        "providers": providers,
    }