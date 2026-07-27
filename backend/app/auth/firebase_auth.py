import os
import firebase_admin
from firebase_admin import credentials, auth
from loguru import logger
from typing import Optional

from app.config.settings import settings

_firebase_app = None


def init_firebase():
    """Initialize Firebase Admin SDK using the service account JSON."""
    global _firebase_app

    if _firebase_app:
        logger.info("Firebase already initialized, skipping.")
        return

    cred_path = settings.FIREBASE_SERVICE_ACCOUNT_KEY

    if not os.path.isabs(cred_path):
        # Resolve relative to the backend directory (where uvicorn is run)
        cred_path = os.path.join(os.getcwd(), cred_path)

    if not os.path.exists(cred_path):
        logger.error(f"Firebase credential file not found at: {cred_path}")
        raise FileNotFoundError(f"Firebase credential file not found: {cred_path}")

    cred = credentials.Certificate(cred_path)
    _firebase_app = firebase_admin.initialize_app(cred)
    logger.info("✓ Firebase Admin SDK initialized successfully")


def verify_firebase_token(token: str) -> Optional[dict]:
    """Verify a Firebase ID token and return the decoded claims."""
    try:
        decoded_token = auth.verify_id_token(token)

        # Extract provider from the sign_in_provider field
        provider = "email"
        firebase_info = decoded_token.get("firebase", {})
        sign_in_provider = firebase_info.get("sign_in_provider", "password")

        if sign_in_provider == "google.com":
            provider = "google"
        elif sign_in_provider == "github.com":
            provider = "github"
        elif sign_in_provider == "password":
            provider = "email"

        result = {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "name": decoded_token.get("name", ""),
            "picture": decoded_token.get("picture", ""),
            "provider": provider,
            "email_verified": decoded_token.get("email_verified", False),
        }

        logger.info(f"✓ Firebase Token Verified for {result['email']} (provider: {provider})")
        return result

    except auth.ExpiredIdTokenError:
        logger.error("Firebase token has expired")
        return None
    except auth.InvalidIdTokenError:
        logger.error("Firebase token is invalid")
        return None
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        return None
