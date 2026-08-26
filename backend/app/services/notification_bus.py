import asyncio
from typing import Dict, List, Any
from loguru import logger

class NotificationBus:
    def __init__(self):
        # Maps user_id -> List of queues (one per connection)
        self.clients: Dict[str, List[asyncio.Queue]] = {}

    async def subscribe(self, user_id: str) -> asyncio.Queue:
        """Create a new queue for the user's connection."""
        queue = asyncio.Queue()
        if user_id not in self.clients:
            self.clients[user_id] = []
        self.clients[user_id].append(queue)
        logger.debug(f"SSE subscribed user={user_id} active_connections={len(self.clients[user_id])}")
        return queue

    def unsubscribe(self, user_id: str, queue: asyncio.Queue):
        """Remove the queue when the connection is closed."""
        if user_id in self.clients:
            try:
                self.clients[user_id].remove(queue)
                active_conns = len(self.clients[user_id])
                logger.debug(f"SSE disconnected user={user_id} active_connections={active_conns}")
                if not self.clients[user_id]:
                    del self.clients[user_id]
            except ValueError:
                pass
                
    def get_connection_count(self, user_id: str) -> int:
        return len(self.clients.get(user_id, []))

    async def publish(self, user_id: str, message: Dict[str, Any]):
        """Publish a message to all active connections for the user."""
        if user_id in self.clients:
            logger.info(f"Notification published\n      user={user_id}\n      notification_id={message.get('id', 'unknown')}\n      type={message.get('category', 'unknown')}")
            for queue in self.clients[user_id]:
                await queue.put(message)
            logger.info(f"SSE notification delivered\n      user={user_id}\n      notification_id={message.get('id', 'unknown')}")

# Global singleton
notification_bus = NotificationBus()
