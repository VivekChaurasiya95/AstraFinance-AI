import random
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from app.schemas.auth_schema import UserResponse, EmailVerify
from app.repositories import user_repository
from app.auth.security import verify_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import logging

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    token_data = verify_token(token)
    if not token_data or not token_data.uid or not token_data.email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Upsert user based on Firebase token data
    user = user_repository.upsert_firebase_user(
        firebase_uid=token_data.uid,
        email=token_data.email,
        name=token_data.name,
        picture=token_data.picture
    )
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/me", response_model=UserResponse)
def get_user_me(current_user: dict = Depends(get_current_user)) -> Any:
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user.get("name", ""),
        email=current_user.get("email", ""),
        profile_picture_url=current_user.get("profile_picture")
    )

class ProfileUpdate(BaseModel):
    name: str

@router.put("/profile/name", response_model=UserResponse)
def update_profile_name(update_data: ProfileUpdate, current_user: dict = Depends(get_current_user)) -> Any:
    user_repository.update_user(str(current_user["_id"]), {"name": update_data.name})
    current_user["name"] = update_data.name
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        profile_picture_url=current_user.get("profile_picture")
    )



class PhotoUpload(BaseModel):
    photo_base64: str

@router.put("/profile/photo", response_model=UserResponse)
def update_photo(upload: PhotoUpload, current_user: dict = Depends(get_current_user)) -> Any:
    user_repository.update_user(str(current_user["_id"]), {"profile_picture": upload.photo_base64})
    current_user["profile_picture"] = upload.photo_base64
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        profile_picture_url=current_user.get("profile_picture")
    )

@router.delete("/profile/photo", response_model=UserResponse)
def delete_photo(current_user: dict = Depends(get_current_user)) -> Any:
    user_repository.update_user(str(current_user["_id"]), {"profile_picture": None})
    current_user["profile_picture"] = None
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        profile_picture_url=None
    )
