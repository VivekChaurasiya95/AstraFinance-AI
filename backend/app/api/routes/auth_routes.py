from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from ...schemas.auth_schema import UserResponse, EmailVerify
from ...repositories import user_repository
from ...auth.security import TokenData
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from loguru import logger

router = APIRouter(prefix="/auth", tags=["auth"])
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    token = credentials.credentials

    # E2E Test Bypass
    if token == "test-token":
        return {
            "_id": "test-user-id",
            "email": "test@example.com",
            "name": "Test User",
            "photo_url": ""
        }

    # Verify Firebase ID token using the Admin SDK directly
    try:
        from firebase_admin import auth

        # Add clock skew allowance to handle "Token used too early" errors 
        # when the system clock is slightly behind Google's servers.
        decoded = auth.verify_id_token(token, clock_skew_seconds=60)
    except Exception as e:
        logger.error(f"Firebase Token Verification Failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Parse provider from Firebase sign-in info
    provider = "email"
    firebase_info = decoded.get("firebase", {})
    sign_in_provider = firebase_info.get("sign_in_provider", "password")

    if sign_in_provider == "google.com":
        provider = "google"
    elif sign_in_provider == "github.com":
        provider = "github"
    elif sign_in_provider == "password":
        provider = "email"

    uid = decoded.get("uid")
    email = decoded.get("email")

    if not uid or not email:
        logger.error("Firebase Token missing uid or email")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials: missing uid or email",
            headers={"WWW-Authenticate": "Bearer"},
        )

    short_uid = uid[:8] if uid else "unknown"
    logger.debug(f"[Auth] Token verified uid={short_uid}")

    # Upsert user in MongoDB (ASYNC – must be awaited)
    user = await user_repository.upsert_firebase_user(
        firebase_uid=uid,
        email=email,
        name=decoded.get("name", "") or "",
        picture=decoded.get("picture", "") or "",
        provider=provider,
        email_verified=decoded.get("email_verified", False),
    )

    if user is None:
        logger.error("User creation/update failed in MongoDB")
        raise HTTPException(status_code=500, detail="User sync failed")
    return user


@router.post("/sync", response_model=UserResponse)
async def sync_user(current_user: dict = Depends(get_current_user)) -> Any:
    logger.info("✓ User Sync Endpoint Called")
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user.get("name", ""),
        email=current_user.get("email", ""),
        profile_picture_url=current_user.get("photo_url"),
    )


@router.get("/me", response_model=UserResponse)
async def get_user_me(current_user: dict = Depends(get_current_user)) -> Any:
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user.get("name", ""),
        email=current_user.get("email", ""),
        profile_picture_url=current_user.get("photo_url"),
    )


class ProfileUpdate(BaseModel):
    name: str


@router.put("/profile/name", response_model=UserResponse)
async def update_profile_name(
    update_data: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
) -> Any:
    clean_name = update_data.name.strip()
    if not clean_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty.")
    if len(clean_name) > 100:
        raise HTTPException(status_code=400, detail="Name must be under 100 characters.")

    await user_repository.update_user(
        str(current_user["_id"]), {"name": clean_name}
    )
    current_user["name"] = clean_name
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        profile_picture_url=current_user.get("photo_url"),
    )


class PhotoUpload(BaseModel):
    photo_base64: str


# Max ~5MB file. Base64 inflates by ~33%, so 5MB file ≈ 6.67MB base64 string.
_MAX_BASE64_LENGTH = 7 * 1024 * 1024  # ~7MB base64 chars


@router.put("/profile/photo", response_model=UserResponse)
async def update_photo(
    upload: PhotoUpload,
    current_user: dict = Depends(get_current_user),
) -> Any:
    if len(upload.photo_base64) > _MAX_BASE64_LENGTH:
        raise HTTPException(status_code=400, detail="Image is too large. Maximum 5 MB.")

    # Validate that the string looks like a data URI for an image
    valid_prefixes = (
        "data:image/png",
        "data:image/jpeg",
        "data:image/gif",
        "data:image/webp",
    )
    if not upload.photo_base64.startswith(valid_prefixes):
        raise HTTPException(status_code=400, detail="Invalid image format. Supported: PNG, JPG, GIF, WEBP.")

    await user_repository.update_user(
        str(current_user["_id"]), {"photo_url": upload.photo_base64}
    )
    current_user["photo_url"] = upload.photo_base64
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        profile_picture_url=current_user.get("photo_url"),
    )


@router.delete("/profile/photo", response_model=UserResponse)
async def delete_photo(
    current_user: dict = Depends(get_current_user),
) -> Any:
    await user_repository.update_user(
        str(current_user["_id"]), {"photo_url": None}
    )
    current_user["photo_url"] = None
    return UserResponse(
        id=str(current_user["_id"]),
        name=current_user["name"],
        email=current_user["email"],
        profile_picture_url=None,
    )
