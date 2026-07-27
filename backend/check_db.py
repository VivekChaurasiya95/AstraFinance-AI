import asyncio
import json

async def run():
    try:
        from motor.motor_asyncio import AsyncIOMotorClient
        db = AsyncIOMotorClient('mongodb://localhost:27017')['astra_finance']
        workspaces = await db.workspaces.find().to_list(None)
        print(json.dumps([w.get('name') for w in workspaces]))
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    asyncio.run(run())
