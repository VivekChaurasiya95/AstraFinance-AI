from typing import Optional
from bson import ObjectId
from app.database.mongo_client import db

users_collection = db["users"]

def get_user_by_email(email: str) -> Optional[dict]:
    return users_collection.find_one({"email": email})

def get_user_by_id(user_id: str) -> Optional[dict]:
    try:
        return users_collection.find_one({"_id": ObjectId(user_id)})
    except:
        return None

def create_user(user_data: dict) -> dict:
    result = users_collection.insert_one(user_data)
    user_data["_id"] = result.inserted_id
    return user_data

def upsert_firebase_user(firebase_uid: str, email: str, name: str, picture: str) -> dict:
    user = users_collection.find_one({"email": email})
    
    update_data = {
        "firebase_uid": firebase_uid,
        "email": email
    }
    
    if user:
        # If user doesn't have a name/picture but firebase token does, update it
        if not user.get("name") and name:
            update_data["name"] = name
        if not user.get("profile_picture") and picture:
            update_data["profile_picture"] = picture
            
        users_collection.update_one(
            {"_id": user["_id"]},
            {"$set": update_data}
        )
        return users_collection.find_one({"_id": user["_id"]})
    else:
        # Create new user
        new_user = {
            "firebase_uid": firebase_uid,
            "email": email,
            "name": name or email.split("@")[0],
            "profile_picture": picture,
        }
        result = users_collection.insert_one(new_user)
        new_user["_id"] = result.inserted_id
        return new_user

def update_user(user_id: str, update_data: dict) -> bool:
    try:
        result = users_collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        return result.modified_count > 0
    except:
        return False
