import asyncio
from app.database.mongo_client import workspaces_collection, documents_collection, red_flags_collection, reports_collection, agent_logs_collection

async def main():
    wss = await workspaces_collection.find().to_list(length=100)
    print('Workspaces:')
    for w in wss:
        print(f"  {w['_id']} ({type(w['_id'])}): {w.get('name')}")
        
    docs = await documents_collection.find().to_list(length=100)
    print('\nDocs:')
    for d in docs:
        print(f"  {d['_id']} - ws: {d.get('workspace_id')} ({type(d.get('workspace_id'))})")

asyncio.run(main())
