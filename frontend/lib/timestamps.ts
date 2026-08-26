/**
 * Canonical timestamp utilities for AstraFinance AI frontend.
 *
 * All backend timestamps arrive as ISO 8601 UTC strings (with Z suffix).
 * These utilities convert them to the user's local timezone for display.
 *
 * IMPORTANT: Never use these to generate authoritative event timestamps.
 * Backend timestamps are authoritative; frontend "now" is only used
 * for calculating relative display text.
 */

/**
 * Format an ISO UTC timestamp as a relative time string.
 *
 * @example
 * formatRelativeTime("2026-08-26T12:47:31.428Z") // "Just now" or "3m ago"
 */
export function formatRelativeTime(isoString: string | undefined | null): string {
  if (!isoString) return "Unknown";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "Unknown";

  const now = Date.now();
  const diffMs = now - date.getTime();

  // Guard against negative diffs (clock skew)
  if (diffMs < 0) return "Just now";

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return "Just now";
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays <= 6) return `${diffDays}d ago`;

  // Older than a week — show localized date/time
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Format an ISO UTC timestamp as a local time string (e.g., "6:17:31 PM").
 *
 * @example
 * formatLocalTime("2026-08-26T12:47:31.428Z") // "6:17:31 PM" (for IST)
 */
export function formatLocalTime(isoString: string | undefined | null): string {
  if (!isoString) return "—";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

/**
 * Format an ISO UTC timestamp as a full local date+time string.
 *
 * @example
 * formatLocalDateTime("2026-08-26T12:47:31.428Z") // "Aug 26, 2026, 6:17 PM"
 */
export function formatLocalDateTime(isoString: string | undefined | null): string {
  if (!isoString) return "—";

  const date = new Date(isoString);
  if (isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
