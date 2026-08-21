import asyncio
import pprint
from app.database.mongo_client import reports_collection

async def main():
    doc = await reports_collection.find_one()
    pprint.pprint(doc)

if __name__ == "__main__":
    asyncio.run(main())
