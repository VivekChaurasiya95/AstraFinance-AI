from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from loguru import logger
from ..database.mongo_client import db

# We use a dedicated collection for notifications
notifications_collection = db["notifications"]

async def ensure_indexes():
    """Create necessary indexes for the notifications collection."""
    await notifications_collection.create_index([("user_id", 1), ("read", 1)])
    await notifications_collection.create_index([("user_id", 1), ("created_at", -1)])

async def create_notification(
    user_id: str,
    type_id: str,
    category: str,
    priority: str,
    title: str,
    message: str,
    agent: Optional[str] = None,
    workspace_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None,
    reference_id: Optional[str] = None,
) -> bool:
    """
    Creates a new notification if it passes idempotency checks.
    reference_id + type_id ensures we don't spam the user for the same event retry.
    """
    try:
        # Check idempotency if reference_id is provided
        if reference_id:
            existing = await notifications_collection.find_one({
                "user_id": user_id,
                "type": type_id,
                "reference_id": reference_id
            })
            if existing:
                logger.info(f"Notification already exists for {type_id} and ref {reference_id}. Skipping.")
                return False

        notification = {
            "_id": str(uuid.uuid4()),
            "user_id": user_id,
            "workspace_id": workspace_id,
            "type": type_id,
            "category": category,
            "priority": priority,
            "title": title,
            "message": message,
            "agent": agent,
            "metadata": metadata or {},
            "read": False,
            "reference_id": reference_id,
            "created_at": datetime.now(timezone.utc)
        }
        
        await notifications_collection.insert_one(notification)
        return True
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        return False

async def get_user_notifications(user_id: str, limit: int = 50, unread_only: bool = False) -> List[Dict[str, Any]]:
    """Retrieve notifications for a user."""
    query: Dict[str, Any] = {"user_id": user_id}
    if unread_only:
        query["read"] = False
        
    cursor = notifications_collection.find(query).sort("created_at", -1).limit(limit)
    notifications = []
    async for notif in cursor:
        notif["id"] = notif.pop("_id")
        notifications.append(notif)
        
    return notifications

async def get_unread_count(user_id: str) -> int:
    """Get total unread notifications for a user."""
    return await notifications_collection.count_documents({"user_id": user_id, "read": False})

async def mark_notification_read(user_id: str, notification_id: str) -> bool:
    """Mark a specific notification as read."""
    result = await notifications_collection.update_one(
        {"_id": notification_id, "user_id": user_id},
        {"$set": {"read": True}}
    )
    return result.modified_count > 0

async def mark_all_notifications_read(user_id: str) -> int:
    """Mark all notifications as read for a user."""
    result = await notifications_collection.update_many(
        {"user_id": user_id, "read": False},
        {"$set": {"read": True}}
    )
    return result.modified_count

async def delete_notification(user_id: str, notification_id: str) -> bool:
    """Delete a specific notification."""
    result = await notifications_collection.delete_one({"_id": notification_id, "user_id": user_id})
    return result.deleted_count > 0

async def delete_all_notifications(user_id: str) -> int:
    """Clear all notifications for a user."""
    result = await notifications_collection.delete_many({"user_id": user_id})
    return result.deleted_count
