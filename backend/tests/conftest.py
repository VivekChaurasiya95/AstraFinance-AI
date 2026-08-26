import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock
from app.main import app  # type: ignore
from app.api.routes.auth_routes import get_current_user  # type: ignore

# Mock User Data
MOCK_USER = {
    "uid": "test_user_uid",
    "_id": "test_user_uid",
    "email": "test@example.com",
    "name": "Test User",
    "role": "user"
}

# Override FastAPI dependency
async def override_get_current_user():
    return MOCK_USER

@pytest.fixture
def client():
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as client:
        yield client
    app.dependency_overrides = {}

@pytest.fixture
def mock_mongo(monkeypatch):
    """Mocks MongoDB collections for isolation."""
    mock_db = MagicMock()
    
    # Setup async mock for collection methods
    async_collection_mock = AsyncMock()
    async_collection_mock.find_one.return_value = None
    
    # Mock MongoClient
    monkeypatch.setattr("app.database.mongo_client.db", mock_db)
    monkeypatch.setattr("app.database.mongo_client.workspaces_collection", async_collection_mock)
    monkeypatch.setattr("app.database.mongo_client.users_collection", async_collection_mock)
    monkeypatch.setattr("app.database.mongo_client.documents_collection", async_collection_mock)
    return async_collection_mock

@pytest.fixture
def mock_redis(monkeypatch):
    """Mocks async Redis client."""
    mock_redis_client = AsyncMock()
    mock_redis_client.get.return_value = None
    mock_redis_client.set.return_value = True
    mock_redis_client.ping.return_value = True
    
    monkeypatch.setattr("app.database.redis_client.redis_client", mock_redis_client)
    return mock_redis_client

@pytest.fixture
def mock_firebase_admin(monkeypatch):
    """Mocks Firebase Admin Auth verification."""
    mock_auth = MagicMock()
    mock_auth.verify_id_token.return_value = {
        "uid": "test_user_uid",
        "email": "test@example.com",
        "name": "Test User",
        "email_verified": True
    }
    monkeypatch.setattr("firebase_admin.auth", mock_auth)
    return mock_auth
