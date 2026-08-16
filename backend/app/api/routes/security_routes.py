from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Header
from pydantic import BaseModel
from loguru import logger

from .auth_routes import get_current_user
from ...repositories import session_repository

router = APIRouter(prefix="/settings/security", tags=["security"])


# ── Response Models ──────────────────────────────────────────────────────

class SessionResponse(BaseModel):
    id: str
    device: str
    browser: str
    os: str
    created_at: str
    last_active_at: str
    is_current: bool


class SecurityStatusResponse(BaseModel):
    score: int
    label: str
    provider: str
    checks: list  # list of {label, passed}
    sessions: List[SessionResponse]


class RevokeResponse(BaseModel):
    success: bool
    message: str


# ── Helpers ──────────────────────────────────────────────────────────────

def _parse_user_agent(ua: str) -> dict:
    """Extract device, browser, OS from a User-Agent string."""
    # Browser
    browser = "Browser"
    if "Edg/" in ua:
        browser = "Edge"
    elif "Chrome/" in ua:
        browser = "Chrome"
    elif "Firefox/" in ua:
        browser = "Firefox"
    elif "Safari/" in ua:
        browser = "Safari"

    # OS
    os_name = "Unknown"
    if "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS" in ua or "Macintosh" in ua:
        os_name = "macOS"
    elif "Linux" in ua:
        os_name = "Linux"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"

    # Device type
    device = "Desktop"
    if "Mobile" in ua or "Android" in ua or "iPhone" in ua:
        device = "Mobile"
    elif "iPad" in ua or "Tablet" in ua:
        device = "Tablet"

    return {"device": device, "browser": browser, "os": os_name}


def _calculate_security_score(
    provider: str,
    session_count: int,
) -> tuple:
    """Return (score, label) based on real signals."""
    score = 0

    # Authenticated = 30 pts
    score += 30

    # OAuth provider connected = 30 pts
    if provider in ("google", "github"):
        score += 30

    # Single-session bonus = 20 pts (no rogue sessions)
    if session_count <= 1:
        score += 20
    elif session_count <= 3:
        score += 10

    # Provider-level security bonus (Google has built-in 2FA ecosystem) = 20 pts
    if provider == "google":
        score += 20
    elif provider == "github":
        score += 15

    score = min(score, 100)

    if score >= 90:
        label = "Excellent"
    elif score >= 70:
        label = "Good"
    elif score >= 50:
        label = "Needs Attention"
    else:
        label = "Critical"

    return score, label


# ── Endpoints ────────────────────────────────────────────────────────────

@router.get("", response_model=SecurityStatusResponse)
async def get_security_status(
    current_user: dict = Depends(get_current_user),
    user_agent: str = Header(""),
):
    """Get security overview: score, checks, and active sessions."""
    user_id = str(current_user["_id"])
    provider = current_user.get("provider", "email")

    # Ensure current session exists
    ua_info = _parse_user_agent(user_agent)
    await session_repository.upsert_current_session(
        user_id=user_id,
        device=ua_info["device"],
        browser=ua_info["browser"],
        os=ua_info["os"],
    )

    # Fetch sessions
    raw_sessions = await session_repository.get_active_sessions(user_id)

    # Identify the current session by matching UA
    sessions = []
    for s in raw_sessions:
        is_current = (
            s.get("device") == ua_info["device"]
            and s.get("browser") == ua_info["browser"]
            and s.get("os") == ua_info["os"]
        )
        sessions.append(SessionResponse(
            id=str(s["_id"]),
            device=s.get("device", "Unknown"),
            browser=s.get("browser", "Unknown"),
            os=s.get("os", "Unknown"),
            created_at=s.get("created_at", ""),
            last_active_at=s.get("last_active_at", ""),
            is_current=is_current,
        ))

    # Calculate score
    score, label = _calculate_security_score(provider, len(sessions))

    # Build checks
    checks = [
        {"label": f"{provider.capitalize()} SSO connected", "passed": provider in ("google", "github")},
        {"label": "Authentication provider verified", "passed": True},
        {"label": "Current session active", "passed": True},
        {"label": "No suspicious sessions", "passed": len(sessions) <= 3},
    ]

    return SecurityStatusResponse(
        score=score,
        label=label,
        provider=provider,
        checks=checks,
        sessions=sessions,
    )


@router.delete("/sessions/{session_id}", response_model=RevokeResponse)
async def revoke_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Revoke a specific session. User can only revoke their own sessions."""
    user_id = str(current_user["_id"])
    success = await session_repository.revoke_session(session_id, user_id)

    if not success:
        raise HTTPException(status_code=404, detail="Session not found or already revoked.")

    return RevokeResponse(success=True, message="Session revoked successfully.")


@router.post("/sessions/revoke-others", response_model=RevokeResponse)
async def revoke_all_other_sessions(
    current_user: dict = Depends(get_current_user),
    user_agent: str = Header(""),
):
    """Revoke all sessions except the current one."""
    user_id = str(current_user["_id"])

    # Identify the current session
    ua_info = _parse_user_agent(user_agent)
    current = await session_repository.upsert_current_session(
        user_id=user_id,
        device=ua_info["device"],
        browser=ua_info["browser"],
        os=ua_info["os"],
    )

    count = await session_repository.revoke_all_other_sessions(
        user_id, str(current["_id"])
    )

    return RevokeResponse(
        success=True,
        message=f"Revoked {count} other session(s)." if count > 0 else "No other sessions to revoke.",
    )
