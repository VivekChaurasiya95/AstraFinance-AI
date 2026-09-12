import json
import logging
from typing import Any, Optional, List
from datetime import datetime
from uuid import UUID

from ..database.redis_client import redis_client
from ..config.settings import settings

logger = logging.getLogger(__name__)

def json_serial(obj):
    """JSON serializer for objects not serializable by default json code"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)
    # Handle bson.ObjectId safely
    try:
        from bson import ObjectId
        if isinstance(obj, ObjectId):
            return str(obj)
    except ImportError:
        pass
        
    raise TypeError(f"Type {type(obj)} not serializable")

class CacheService:
    @staticmethod
    async def get_cached_data(key: str) -> Optional[Any]:
        """Safely fetch and deserialize data from Redis."""
        try:
            cached = await redis_client.get(key)
            if cached:
                logger.info(f"[Redis] CACHE HIT key={key}")
                return json.loads(cached)
            else:
                logger.info(f"[Redis] CACHE MISS key={key}")
                return None
        except Exception as e:
            logger.warning(f"[Redis] CACHE ERROR operation=get error={str(e)}")
            logger.info(f"[Redis] CACHE BYPASS reason=redis_unavailable")
            return None

    @staticmethod
    async def set_cached_data(key: str, data: Any, ttl: int) -> bool:
        """Safely serialize and store data in Redis."""
        try:
            serialized_data = json.dumps(data, default=json_serial)
            await redis_client.setex(key, ttl, serialized_data)
            logger.info(f"[Redis] CACHE SET key={key} ttl={ttl}")
            return True
        except Exception as e:
            logger.warning(f"[Redis] CACHE ERROR operation=set error={str(e)}")
            return False

    @staticmethod
    async def invalidate_cache(keys: List[str]) -> bool:
        """Invalidate specific cache keys."""
        if not keys:
            return True
        try:
            if keys:
                await redis_client.delete(*keys)
                for key in keys:
                    logger.info(f"[Redis] CACHE INVALIDATE key={key}")
            return True
        except Exception as e:
            logger.warning(f"[Redis] CACHE ERROR operation=delete error={str(e)}")
            return False

    @staticmethod
    async def invalidate_by_pattern(pattern: str) -> bool:
        """Invalidate cache keys matching a pattern."""
        try:
            keys = []
            async for key in redis_client.scan_iter(match=pattern):
                keys.append(key)
            if keys:
                await redis_client.delete(*keys)
                for key in keys:
                    logger.info(f"[Redis] CACHE INVALIDATE key={key}")
            return True
        except Exception as e:
            logger.warning(f"[Redis] CACHE ERROR operation=delete_pattern error={str(e)}")
            return False
