"""One-time script: Clear all users from MongoDB and Firebase Auth."""
import os
import firebase_admin
from firebase_admin import credentials, auth as fb_auth
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()

# --- 1. Clear MongoDB ---
uri = os.getenv("MONGODB_URI")
client = MongoClient(uri)
db = client["financial_research_db"]

users = list(db.users.find({}, {"email": 1, "firebase_uid": 1, "provider": 1}))
print(f"Found {len(users)} users in MongoDB:")
for u in users:
    print(f"  - {u.get('email', 'N/A')} (provider: {u.get('provider', 'N/A')})")

result = db.users.delete_many({})
print(f"\n✓ Deleted {result.deleted_count} users from MongoDB.")

# --- 2. Clear Firebase Auth users ---
cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "app/config/astrafinance-ai-firebase-adminsdk-fbsvc-78efa35b8d.json")
if not os.path.isabs(cred_path):
    cred_path = os.path.join(os.getcwd(), cred_path)

cred = credentials.Certificate(cred_path)
app = firebase_admin.initialize_app(cred, name="cleanup")

page = fb_auth.list_users(app=app)
deleted_count = 0
uids_to_delete = []

while page:
    for user in page.users:
        uids_to_delete.append(user.uid)
        print(f"  Queued for deletion: {user.email or user.uid}")
    page = page.get_next_page()

if uids_to_delete:
    result = fb_auth.delete_users(uids_to_delete, app=app)
    deleted_count = result.success_count
    print(f"\n✓ Deleted {deleted_count} users from Firebase Auth.")
    if result.errors:
        for err in result.errors:
            print(f"  Error: {err.reason}")
else:
    print("\n✓ No users found in Firebase Auth.")

firebase_admin.delete_app(app)
print("\n===========================")
print("All users cleared. Fresh start!")
print("===========================")
