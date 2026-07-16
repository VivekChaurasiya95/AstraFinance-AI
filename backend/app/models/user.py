from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class User(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    email: str
    hashed_password: str
    profile_picture: Optional[str] = None
    email_verification_code: Optional[str] = None
    new_email_pending: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    profile_picture: Optional[str] = None
