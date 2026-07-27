from motor.motor_asyncio import AsyncIOMotorClient
from loguru import logger
from app.config.settings import settings

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client[settings.DATABASE_NAME]

# Collections
users_collection = db["users"]
workspaces_collection = db["workspaces"]
documents_collection = db["documents"]
reports_collection = db["reports"]
chat_sessions_collection = db["chat_sessions"]
messages_collection = db["messages"]
metrics_collection = db["metrics"]
red_flags_collection = db["red_flags"]
agent_logs_collection = db["agent_logs"]