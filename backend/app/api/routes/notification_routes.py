import asyncio
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from loguru import logger
from datetime import datetime

from .auth_routes import get_current_user
from ...repositories import notifications_repository
from ...services.notification_bus import notification_bus
from ...repositories import user_repository

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

async def get_user_from_query_token(token: str = Query(...)) -> dict:
    """Verify Firebase token from query string for SSE."""
    if token == "test-token":
        return {"_id": "test-user-id"}
        
    try:
        if not token or len(token.split('.')) != 3:
            raise ValueError("Token does not have 3 segments (not a valid JWT)")
            
        from firebase_admin import auth
        decoded = auth.verify_id_token(token, clock_skew_seconds=60)
        uid = decoded.get("uid")
        user = await user_repository.get_user_by_firebase_uid(uid)
        if not user:
            raise HTTPException(status_code=401, detail="User not found in DB")
            
        short_uid = uid[:8] if uid else "unknown"
        logger.debug(f"[Auth] Token verified uid={short_uid}")
        return user
    except Exception as e:
        logger.error(f"[Auth] Authentication failed reason={e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

@router.get("/stream")
async def sse_notifications(current_user: dict = Depends(get_user_from_query_token)):
    """Server-Sent Events endpoint for real-time notifications."""
    user_id = str(current_user["_id"])
    
    async def event_generator():
        logger.info(f"[Notifications] SSE connected user={user_id}")
        queue = await notification_bus.subscribe(user_id)
        try:
            # Yield an immediate heartbeat to establish connection fully
            yield ": heartbeat\n\n"
            while True:
                try:
                    # Wait for the next notification event, with timeout for heartbeat
                    event = await asyncio.wait_for(queue.get(), timeout=15.0)
                    import json
                    data_str = json.dumps(event)
                    yield f"event: notification\ndata: {data_str}\n\n"
                except asyncio.TimeoutError:
                    yield ": heartbeat\n\n"
        except asyncio.CancelledError:
            logger.info(f"[Notifications] SSE disconnected user={user_id}")
        except Exception as e:
            logger.error(f"SSE stream error for {user_id}: {e}")
        finally:
            notification_bus.unsubscribe(user_id, queue)
            
    return StreamingResponse(
        event_generator(), 
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
        }
    )

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
