"""
Canonical timestamp utilities for AstraFinance AI.

All backend timestamps MUST be stored as timezone-aware UTC datetimes.
Use utc_now() everywhere instead of datetime.now() or datetime.utcnow().
Use to_iso_utc() to serialize datetimes for API responses / SSE payloads.
"""

from datetime import datetime, timezone


def utc_now() -> datetime:
    """Return the current time as a timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


def to_iso_utc(dt: datetime) -> str:
    """
    Serialize a datetime to ISO 8601 with explicit 'Z' suffix.

    This ensures JavaScript's `new Date(str)` correctly interprets
    the value as UTC, regardless of the user's local timezone.

    Examples:
        datetime(2026, 8, 26, 12, 47, 31, 428000, tzinfo=UTC)
        → "2026-08-26T12:47:31.428Z"
    """
    if dt.tzinfo is None:
        # Treat naive datetimes as UTC (safe default for our codebase)
        dt = dt.replace(tzinfo=timezone.utc)
    utc_dt = dt.astimezone(timezone.utc)
    # Format with millisecond precision and Z suffix
    return utc_dt.strftime("%Y-%m-%dT%H:%M:%S.") + f"{utc_dt.microsecond // 1000:03d}Z"
