from typing import Optional
from bson import ObjectId
from datetime import datetime, timezone
from loguru import logger
from ..database.mongo_client import users_collection


async def get_user_by_email(email: str) -> Optional[dict]:
    return await users_collection.find_one({"email": email})


async def get_user_by_id(user_id: str) -> Optional[dict]:
    try:
        return await users_collection.find_one({"_id": ObjectId(user_id)})
    except Exception as e:
        logger.error(f"Error fetching user by id {user_id}: {e}")
        return None


async def create_user(user_data: dict) -> dict:
    now_iso = datetime.now(timezone.utc).isoformat()
    user_data.setdefault("created_at", now_iso)
    user_data.setdefault("updated_at", now_iso)
    user_data.setdefault("last_login", now_iso)
    user_data.setdefault("role", "user")

    result = await users_collection.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    logger.info(f"✓ User Created: {user_data.get('email')}")
    return user_data


async def upsert_firebase_user(
    firebase_uid: str,
    email: str,
    name: str,
    picture: str,
    provider: str = "email",
    email_verified: bool = False,
) -> Optional[dict]:
    now_iso = datetime.now(timezone.utc).isoformat()

    # Define fields that should be updated on every login
    set_fields = {
        "last_login": now_iso,
        "updated_at": now_iso,
        "provider": provider,
        "email_verified": email_verified,
    }
    
    # Only update name and photo if they are explicitly provided
    if name:
        set_fields["name"] = name
    if picture:
        set_fields["photo_url"] = picture

    # Define fields that should only be set when a new user is created
    set_on_insert_fields = {
        "email": email,
        "role": "user",
        "created_at": now_iso,
    }
    
    # Perform atomic upsert. The unique index on firebase_uid ensures no duplicates.
    await users_collection.update_one(
        {"firebase_uid": firebase_uid},
        {
            "$set": set_fields,
            "$setOnInsert": set_on_insert_fields
        },
        upsert=True
    )
    
    logger.info(f"✓ User Upserted: {email} (UID: {firebase_uid})")
    return await users_collection.find_one({"firebase_uid": firebase_uid})


async def update_user(user_id: str, update_data: dict) -> bool:
    try:
        update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
        result = await users_collection.update_one(
            {"_id": ObjectId(user_id)}, {"$set": update_data}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        return False
