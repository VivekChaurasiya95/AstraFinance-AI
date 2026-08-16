import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from loguru import logger
from ..config.settings import settings

client = AsyncIOMotorClient(
    settings.MONGODB_URI, 
    tlsCAFile=certifi.where(),
    tlsAllowInvalidCertificates=True,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=10000,
    socketTimeoutMS=10000
)
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
agent_executions_collection = db["agent_executions"]
settings_collection = db["user_settings"]
sessions_collection = db["sessions"]