from fastapi import APIRouter
from ..routes.auth_routes import get_current_user

router = APIRouter()


@router.get("/health", tags=["Health"])
async def health_check():
    from ...llm.provider_registry import registry
    from ...config.settings import settings
    from ...database.redis_client import redis_client

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
    
    redis_status = "disconnected"
    try:
        await redis_client.ping()
        redis_status = "connected"
    except Exception:
        pass

    return {
        "status": "healthy",
        "message": "Backend is running successfully.",
        "providers": providers,
        "redis": redis_status
    }