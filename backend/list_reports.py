import asyncio
from app.database.mongo_client import reports_collection

async def main():
    cursor = reports_collection.find()
    count = 0
    async for doc in cursor:
        print(f"Report ID: {doc['_id']} Workspace: {doc.get('workspace_id')}")
        count += 1
    print(f"Total reports: {count}")

if __name__ == "__main__":
    asyncio.run(main())
