from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from loguru import logger
from datetime import datetime

from .auth_routes import get_current_user
from ...repositories import notifications_repository

router = APIRouter(prefix="/notifications", tags=["notifications"])

class NotificationResponse(BaseModel):
    id: str
    type: str
    category: str
    priority: str
    title: str
    message: str
    agent: str | None = None
    read: bool
    workspace_id: str | None = None
    created_at: datetime
    
class NotificationListResponse(BaseModel):
    notifications: List[NotificationResponse]
    has_unread: bool

class UnreadCountResponse(BaseModel):
    count: int

@router.get("", response_model=NotificationListResponse)
async def get_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """Get notifications for the current user."""
    user_id = str(current_user["_id"])
    notifications = await notifications_repository.get_user_notifications(user_id, limit, unread_only)
    unread_count = await notifications_repository.get_unread_count(user_id)
    
    return {
        "notifications": notifications,
        "has_unread": unread_count > 0
    }

@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(current_user: dict = Depends(get_current_user)) -> Any:
    """Get the total number of unread notifications."""
    user_id = str(current_user["_id"])
    count = await notifications_repository.get_unread_count(user_id)
    return {"count": count}

@router.patch("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """Mark a single notification as read."""
    user_id = str(current_user["_id"])
    success = await notifications_repository.mark_notification_read(user_id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.post("/read-all")
async def mark_all_read(current_user: dict = Depends(get_current_user)) -> Any:
    """Mark all notifications as read."""
    user_id = str(current_user["_id"])
    count = await notifications_repository.mark_all_notifications_read(user_id)
    return {"success": True, "modified_count": count}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: dict = Depends(get_current_user)
) -> Any:
    """Delete a single notification."""
    user_id = str(current_user["_id"])
    success = await notifications_repository.delete_notification(user_id, notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.delete("")
async def delete_all(current_user: dict = Depends(get_current_user)) -> Any:
    """Clear all notifications."""
    user_id = str(current_user["_id"])
    count = await notifications_repository.delete_all_notifications(user_id)
    return {"success": True, "deleted_count": count}
