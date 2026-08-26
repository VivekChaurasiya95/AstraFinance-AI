from pymongo import MongoClient
import pprint

c = MongoClient('mongodb://localhost:27017')
db = c['astra_finance']

ws_id = "796a2d1b-5503-4cc5-8b84-8c9e7211a144"
print(f"Documents in workspace {ws_id}:")
for doc in db.documents.find({"workspace_id": ws_id}):
    print(f" _id: {repr(doc['_id'])}")
    print(f" workspace_id: {repr(doc['workspace_id'])}")
    print("---")
