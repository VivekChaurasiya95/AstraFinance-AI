from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from loguru import logger
from ..database.mongo_client import sessions_collection
from bson import ObjectId


async def create_session(
    user_id: str,
    device: str,
    browser: str,
    os: str,
) -> dict:
    """Create a new session record for the user."""
    now = datetime.now(timezone.utc).isoformat()
    session = {
        "user_id": user_id,
        "device": device,
        "browser": browser,
        "os": os,
        "created_at": now,
        "last_active_at": now,
        "is_current": True,
        "revoked_at": None,
    }
    result = await sessions_collection.insert_one(session)
    session["_id"] = result.inserted_id
    logger.info(f"✓ Session created for user {user_id} on {device}/{browser}")
    return session


async def get_active_sessions(user_id: str) -> List[dict]:
    """Get all active (non-revoked) sessions for a user."""
    try:
        cursor = sessions_collection.find(
            {"user_id": user_id, "revoked_at": None}
        ).sort("last_active_at", -1)
        sessions = await cursor.to_list(length=50)
        return sessions
    except Exception as e:
        logger.error(f"Error fetching sessions for user {user_id}: {e}")
        return []


async def touch_session(session_id: str) -> bool:
    """Update the last_active_at timestamp for a session."""
    try:
        result = await sessions_collection.update_one(
            {"_id": ObjectId(session_id)},
            {"$set": {"last_active_at": datetime.now(timezone.utc).isoformat()}}
        )
        return result.modified_count > 0
    except Exception as e:
        logger.error(f"Error touching session {session_id}: {e}")
        return False


async def revoke_session(session_id: str, user_id: str) -> bool:
    """Revoke a specific session. Enforces user ownership."""
    try:
        result = await sessions_collection.update_one(
            {"_id": ObjectId(session_id), "user_id": user_id, "revoked_at": None},
            {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat()}}
        )
        if result.modified_count > 0:
            logger.info(f"✓ Session {session_id} revoked for user {user_id}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error revoking session {session_id}: {e}")
        return False


async def revoke_all_other_sessions(user_id: str, current_session_id: str) -> int:
    """Revoke all sessions for a user except the current one."""
    try:
        result = await sessions_collection.update_many(
            {
                "user_id": user_id,
                "_id": {"$ne": ObjectId(current_session_id)},
                "revoked_at": None,
            },
            {"$set": {"revoked_at": datetime.now(timezone.utc).isoformat()}}
        )
        logger.info(f"✓ Revoked {result.modified_count} other sessions for user {user_id}")
        return result.modified_count
    except Exception as e:
        logger.error(f"Error revoking other sessions for user {user_id}: {e}")
        return 0


async def upsert_current_session(
    user_id: str,
    device: str,
    browser: str,
    os: str,
) -> dict:
    """
    Find-or-create a session for this user/device/browser combo.
    Updates last_active_at if exists, creates if not.
    """
    now = datetime.now(timezone.utc).isoformat()

    existing = await sessions_collection.find_one({
        "user_id": user_id,
        "device": device,
        "browser": browser,
        "os": os,
        "revoked_at": None,
    })

    if existing:
        await sessions_collection.update_one(
            {"_id": existing["_id"]},
            {"$set": {"last_active_at": now, "is_current": True}}
        )
        existing["last_active_at"] = now
        return existing

    return await create_session(user_id, device, browser, os)
