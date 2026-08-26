import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

client = AsyncIOMotorClient(os.getenv('MONGODB_URI'))
db = client[os.getenv('DATABASE_NAME')]

async def main():
    doc = await db.documents.find_one({"_id": "3733cc2e-146d-42be-b626-a609b9dd8cb1"})
    print("Found doc by UUID string:")
    print(doc)
    
    # Try finding it if it was stored as ObjectId
    from bson import ObjectId
    try:
        doc2 = await db.documents.find_one({"_id": ObjectId("3733cc2e-146d-42be-b626-a609b9dd8cb1")})
        print("Found by ObjectId:")
        print(doc2)
    except Exception:
        pass
        
    print("Listing all docs in workspace:")
    async for d in db.documents.find({"workspace_id": "796a2d1b-5503-4cc5-8b84-8c9e7211a144"}):
        print(f"_id type: {type(d['_id'])}, val: {d['_id']}")

asyncio.run(main())
