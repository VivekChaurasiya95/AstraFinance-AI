import redis.asyncio as redis
import logging

from ..config.settings import settings

logger = logging.getLogger(__name__)

# Create an async redis client pool
redis_client = redis.from_url(
    settings.REDIS_URL,
    encoding="utf8",
    decode_responses=True
)

async def init_redis():
    """Ping Redis to ensure connection is valid."""
    try:
        await redis_client.ping()
        logger.info("[Redis] Connected")
    except Exception as e:
        logger.error(f"Redis connection failed: {e}")

async def close_redis():
    """Close Redis connection."""
    try:
        await redis_client.aclose()
        logger.info("✓ Redis connection closed")
    except Exception as e:
        logger.error(f"Error closing Redis connection: {e}")
