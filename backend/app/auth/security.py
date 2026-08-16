from typing import Optional
from passlib.context import CryptContext
from pydantic import BaseModel
from .firebase_auth import verify_firebase_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TokenData(BaseModel):
    uid: Optional[str] = None
    email: Optional[str] = None
    name: Optional[str] = None
    picture: Optional[str] = None
    provider: str = "email"
    email_verified: bool = False


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def verify_token(token: str) -> Optional[TokenData]:
    decoded = verify_firebase_token(token)
    if not decoded:
        return None

    return TokenData(
        uid=decoded.get("uid"),
        email=decoded.get("email"),
        name=decoded.get("name"),
        picture=decoded.get("picture"),
        provider=decoded.get("provider", "email"),
        email_verified=decoded.get("email_verified", False),
    )

