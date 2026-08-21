import asyncio
import pprint
from app.database.mongo_client import reports_collection

async def main():
    doc = await reports_collection.find_one()
    if not doc:
        print("No documents found")
        return
    print("Found doc with ID:", doc['_id'])
    
    # Try querying by string
    doc2 = await reports_collection.find_one({"_id": doc['_id']})
    if not doc2:
        print("COULD NOT FIND BY STRING ID")
    else:
        print("FOUND BY STRING ID!")

if __name__ == "__main__":
    asyncio.run(main())
