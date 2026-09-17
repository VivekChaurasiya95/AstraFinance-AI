import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from backend.app.services.cache_service import CacheService

@pytest.mark.asyncio
async def test_cache_service_set_get():
    # We will mock redis_client to avoid needing a real Redis server in tests
    with patch("backend.app.services.cache_service.redis_client") as mock_redis:
        mock_redis.setex = AsyncMock(return_value=True)
        mock_redis.get = AsyncMock(return_value='{"name": "test"}')
        
        # Test set
        result = await CacheService.set_cached_data("test_key", {"name": "test"}, 60)
        assert result is True
        mock_redis.setex.assert_called_once()
        
        # Test get
        data = await CacheService.get_cached_data("test_key")
        assert data == {"name": "test"}
        mock_redis.get.assert_called_once_with("test_key")

@pytest.mark.asyncio
async def test_cache_service_get_miss():
    with patch("backend.app.services.cache_service.redis_client") as mock_redis:
        mock_redis.get = AsyncMock(return_value=None)
        
        data = await CacheService.get_cached_data("missing_key")
        assert data is None
        mock_redis.get.assert_called_once_with("missing_key")

@pytest.mark.asyncio
async def test_cache_service_fallback():
    with patch("backend.app.services.cache_service.redis_client") as mock_redis:
        mock_redis.get = AsyncMock(side_effect=Exception("Redis connection error"))
        
        # Service should catch the exception and return None gracefully
        data = await CacheService.get_cached_data("error_key")
        assert data is None

@pytest.mark.asyncio
async def test_cache_service_invalidate():
    with patch("backend.app.services.cache_service.redis_client") as mock_redis:
        mock_redis.delete = AsyncMock(return_value=True)
        
        result = await CacheService.invalidate_cache(["key1", "key2"])
        assert result is True
        mock_redis.delete.assert_called_once_with("key1", "key2")
