import os
import firebase_admin
from firebase_admin import credentials, auth
import logging

logger = logging.getLogger(__name__)

def init_firebase():
    """Initialize Firebase Admin SDK using the service account key.
    
    The key path is read from the FIREBASE_SERVICE_ACCOUNT_KEY environment
    variable, which should point to the JSON file relative to the backend
    working directory (e.g. app/config/astrafinance-ai-firebase-adminsdk-*.json).
    """
    if firebase_admin._apps:
        logger.info("Firebase Admin already initialized, skipping.")
        return

    service_account_path = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_KEY",
        os.path.join("app", "config", "astrafinance-ai-firebase-adminsdk-fbsvc-78efa35b8d.json"),
    )

    # Resolve to absolute path so it works regardless of cwd
    if not os.path.isabs(service_account_path):
        service_account_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
            service_account_path,
        )

    if not os.path.exists(service_account_path):
        raise FileNotFoundError(
            f"Firebase service account key not found at {service_account_path}. "
            "Download it from the Firebase Console and place it in backend/app/config/."
        )

    cred = credentials.Certificate(service_account_path)
    firebase_admin.initialize_app(cred)
    logger.info(f"Firebase Admin SDK initialized successfully from {service_account_path}")


def verify_firebase_token(token: str):
    """Verify a Firebase ID token and return the decoded claims, or None on failure."""
    try:
        decoded_token = auth.verify_id_token(token, clock_skew_seconds=30)
        return decoded_token
    except Exception as e:
        logger.error(f"Firebase token verification failed: {e}")
        return None
