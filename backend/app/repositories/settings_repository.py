from typing import Optional, Dict, Any
from bson import ObjectId
from datetime import datetime, timezone
from loguru import logger
from ..database.mongo_client import settings_collection


# Default settings payload
DEFAULT_SETTINGS = {
    "ai_configuration": {
        "primary_provider": "Groq",
        "primary_model": "llama-3.1-8b-instant",
        "fallback_provider": "Gemini",
        "fallback_model": "gemini-1.5-flash",
        "auto_fallback": True,
        "reasoning_mode": "Balanced",
        "response_style": "Professional",
        "enforce_citations": True,
        "risk_warnings": True,
        "temperature_mode": "Conservative",
        "analysis_depth": "Standard",
        "report_intelligence": True,
        "strict_financial_mode": True,
    },
    "notifications": {
        "reports": True,
        "agents": True,
        "risk": True,
        "workspace": True,
        "email_enabled": True,
        "in_app_enabled": True,
    },
    "appearance": {
        "theme": "System",
        "density": "Comfortable",
        "animations": "Full",
    },
    "privacy": {
        "ai_processing": True,
        "document_processing": True,
        "data_retention": "30 days",
        "personalization": True,
    }
}


async def get_user_settings(user_id: str) -> dict:
    """
    Fetch the user's settings. If they don't exist, create a default settings document.
    """
    try:
        settings = await settings_collection.find_one({"user_id": user_id})
        
        if not settings:
            new_settings = {
                "user_id": user_id,
                **DEFAULT_SETTINGS,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }
            result = await settings_collection.insert_one(new_settings)
            new_settings["_id"] = result.inserted_id
            logger.info(f"Initialized default settings for user {user_id}")
            return new_settings
            
        return settings
    except Exception as e:
        logger.error(f"Error fetching user settings {user_id}: {e}")
        # Return default if failed
        return {"user_id": user_id, **DEFAULT_SETTINGS}


async def update_user_settings(user_id: str, updates: Dict[str, Any]) -> bool:
    """
    Perform a deep update of the user's settings.
    Expects updates in MongoDB dot notation (e.g. {"ai_configuration.primary_provider": "Gemini"})
    """
    try:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # We use upsert=True just in case the document doesn't exist yet
        result = await settings_collection.update_one(
            {"user_id": user_id},
            {"$set": updates},
            upsert=True
        )
        return result.modified_count > 0 or result.upserted_id is not None
    except Exception as e:
        logger.error(f"Error updating user settings {user_id}: {e}")
        return False
