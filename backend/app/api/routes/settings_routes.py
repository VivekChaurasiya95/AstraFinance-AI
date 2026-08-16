from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel
from loguru import logger

from .auth_routes import get_current_user
from ...repositories import settings_repository

router = APIRouter(prefix="/settings", tags=["settings"])


class SettingsResponse(BaseModel):
    user_id: str
    ai_configuration: dict
    notifications: dict
    appearance: dict
    privacy: dict
    created_at: str
    updated_at: str


class SettingsUpdate(BaseModel):
    # Dictionary of updates using MongoDB dot notation or nested objects
    # e.g. {"ai_configuration.primary_provider": "Groq"}
    updates: Dict[str, Any]


@router.get("", response_model=SettingsResponse)
async def get_settings(current_user: dict = Depends(get_current_user)) -> Any:
    """Get the current user's settings."""
    user_id = str(current_user["_id"])
    settings = await settings_repository.get_user_settings(user_id)
    
    # Remove MongoDB specific fields if present before returning
    if "_id" in settings:
        del settings["_id"]
        
    return settings


@router.patch("", response_model=SettingsResponse)
async def update_settings(
    update_data: SettingsUpdate,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """
    Update specific user settings.
    Accepts dot notation (e.g., {"ai_configuration.auto_fallback": False})
    """
    user_id = str(current_user["_id"])
    
    if not update_data.updates:
        raise HTTPException(status_code=400, detail="No updates provided")
        
    success = await settings_repository.update_user_settings(user_id, update_data.updates)
    
    if not success:
        logger.warning(f"Settings update may not have changed any documents for user {user_id}")
        
    # Return the freshly updated settings
    settings = await settings_repository.get_user_settings(user_id)
    if "_id" in settings:
        del settings["_id"]
        
    return settings

class TestProviderRequest(BaseModel):
    provider: str
    model: str

@router.get("/ai/providers")
async def get_providers(current_user: dict = Depends(get_current_user)):
    from ...llm.config import GROQ_MODELS, GEMINI_MODELS
    return {
        "providers": [
            {
                "id": "Groq",
                "name": "Groq",
                "models": GROQ_MODELS
            },
            {
                "id": "Gemini",
                "name": "Google Gemini",
                "models": GEMINI_MODELS
            }
        ]
    }

@router.post("/ai/test-provider")
async def test_provider(request: TestProviderRequest, current_user: dict = Depends(get_current_user)):
    from ...llm.provider_registry import registry
    import time
    
    provider_name = request.provider.lower()
    model_name = request.model
    
    start_time = time.time()
    try:
        success = registry.test_provider(provider_name, model_name)
        latency_ms = int((time.time() - start_time) * 1000)
        
        if success:
            return {"connected": True, "latency_ms": latency_ms}
        else:
            return {"connected": False, "error": "Provider returned failure"}
    except Exception as e:
        return {"connected": False, "error": str(e)}
