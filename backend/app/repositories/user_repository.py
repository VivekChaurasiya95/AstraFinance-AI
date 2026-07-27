from typing import Optional
from bson import ObjectId
from datetime import datetime, timezone
from loguru import logger
from app.database.mongo_client import users_collection


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
) -> dict:
    # First try to find by firebase_uid, then by email (to handle legacy data)
    user = await users_collection.find_one({"firebase_uid": firebase_uid})
    if not user:
        user = await users_collection.find_one({"email": email})

    now_iso = datetime.now(timezone.utc).isoformat()

    if user:
        update_data = {
            "firebase_uid": firebase_uid,
            "last_login": now_iso,
            "updated_at": now_iso,
            "provider": provider,
            "email_verified": email_verified,
        }

        # Always update name and photo if they are provided
        if name:
            update_data["name"] = name
        if picture:
            update_data["photo_url"] = picture

        await users_collection.update_one(
            {"_id": user["_id"]}, {"$set": update_data}
        )
        logger.info(f"✓ User Updated: {email}")
        return await users_collection.find_one({"_id": user["_id"]})
    else:
        # Create new user
        new_user = {
            "firebase_uid": firebase_uid,
            "email": email,
            "name": name or email.split("@")[0],
            "photo_url": picture,
            "provider": provider,
            "email_verified": email_verified,
            "role": "user",
            "created_at": now_iso,
            "updated_at": now_iso,
            "last_login": now_iso,
        }
        result = await users_collection.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        logger.info(f"✓ User Created: {email}")
        return new_user


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
