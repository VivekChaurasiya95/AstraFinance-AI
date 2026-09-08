from typing import Optional, Dict, Any
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

async def get_user_by_firebase_uid(firebase_uid: str) -> Optional[dict]:
    return await users_collection.find_one({"firebase_uid": firebase_uid})


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
    short_uid = firebase_uid[:8] if firebase_uid else "unknown"

    user = await users_collection.find_one({"firebase_uid": firebase_uid})
    if not user:
        # Fallback to matching by email to prevent DuplicateKeyError if the user 
        # signed in with a different provider using the same email
        user = await users_collection.find_one({"email": email})

    if user:
        needs_update = False
        updates: Dict[str, Any] = {}
        
        if user.get("firebase_uid") != firebase_uid:
            updates["firebase_uid"] = firebase_uid
            needs_update = True
            
        if user.get("provider") != provider:
            updates["provider"] = provider
            needs_update = True
            
        if user.get("email_verified") != email_verified:
            updates["email_verified"] = email_verified
            needs_update = True
            
        if needs_update:
            updates["updated_at"] = now_iso
            updates["last_login"] = now_iso
            await users_collection.update_one({"_id": user["_id"]}, {"$set": updates})
            logger.info(f"[User] Profile updated uid={short_uid}")
            return await users_collection.find_one({"_id": user["_id"]})
            
        # Update last_login even if nothing else changed
        await users_collection.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_iso}})
        logger.debug(f"[User] Existing user verified uid={short_uid}")
        user["last_login"] = now_iso
        return user

    new_user = {
        "firebase_uid": firebase_uid,
        "email": email,
        "name": name or "",
        "photo_url": picture or "",
        "provider": provider,
        "email_verified": email_verified,
        "role": "user",
        "created_at": now_iso,
        "updated_at": now_iso,
        "last_login": now_iso
    }
    
    result = await users_collection.insert_one(new_user)
    new_user["_id"] = result.inserted_id
    logger.info(f"[User] Created uid={short_uid}")
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
