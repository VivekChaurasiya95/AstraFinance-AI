"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { fetcher } from "@/lib/api";
import {
  ShieldCheck,
  Monitor,
  Smartphone,
  Tablet,
  LogOut,
  CheckCircle2,
  Circle,
  RefreshCw,
  Loader2,
  AlertCircle,
  Globe,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ───────────────────────────────────────────────────────────────

interface SecurityCheck {
  label: string;
  passed: boolean;
}

interface Session {
  id: string;
  device: string;
  browser: string;
  os: string;
  created_at: string;
  last_active_at: string;
  is_current: boolean;
}

interface SecurityData {
  score: number;
  label: string;
  provider: string;
  checks: SecurityCheck[];
  sessions: Session[];
}

// ── Animated Score Ring ─────────────────────────────────────────────────

function SecurityScoreRing({ score }: { score: number }) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedScore / 100) * circumference;
  const safeOffset = Number.isFinite(offset) ? offset : circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(safeScore), 100);
    return () => clearTimeout(timer);
  }, [safeScore]);

  const ringColor =
    safeScore >= 90
      ? "#10b981"
      : safeScore >= 70
      ? "#3b82f6"
      : safeScore >= 50
      ? "#f59e0b"
      : "#ef4444";

  return (
    <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke="#f1f5f9"
          strokeWidth="7"
          fill="transparent"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          stroke={ringColor}
          strokeWidth="7"
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={safeOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1.2s ease-out, stroke 0.5s ease" }}
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ transform: "rotate(0deg)" }}
      >
        <span style={{ fontSize: 18, fontWeight: 800, color: "#0f172a" }}>
          {animatedScore}
          <span style={{ fontSize: 11 }}>%</span>
        </span>
      </div>
    </div>
  );
}

// ── Device icon helper ──────────────────────────────────────────────────

function DeviceIcon({ device }: { device: string }) {
  if (device === "Mobile") return <Smartphone className="w-4 h-4" />;
  if (device === "Tablet") return <Tablet className="w-4 h-4" />;
  return <Monitor className="w-4 h-4" />;
}

// ── Time-ago helper ─────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Main Page ───────────────────────────────────────────────────────────

export default function SecurityPage() {
  const { user } = useAuth();
  const [data, setData] = useState<SecurityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const fetchedRef = useRef(false);

  const fetchSecurity = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await fetcher<SecurityData>("/settings/security");
      setData(res);
    } catch (e: any) {
      setError((e instanceof Error ? e.message : String(e)) || "Failed to load security information.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchSecurity();
    }
  }, [user, fetchSecurity]);

  const handleRevoke = useCallback(
    async (sessionId: string) => {
      setRevokingId(sessionId);
      try {
        await fetcher(`/settings/security/sessions/${sessionId}`, { method: "DELETE" });
        setData((prev) =>
          prev
            ? { ...prev, sessions: prev.sessions.filter((s) => s.id !== sessionId) }
            : prev
        );
      } catch (e: any) {
        setError((e instanceof Error ? e.message : String(e)) || "Failed to revoke session.");
      } finally {
        setRevokingId(null);
      }
    },
    []
  );

  const handleRevokeAll = useCallback(async () => {
    setRevokingAll(true);
    try {
      await fetcher("/settings/security/sessions/revoke-others", { method: "POST" });
      setData((prev) =>
        prev
          ? { ...prev, sessions: prev.sessions.filter((s) => s.is_current) }
          : prev
      );
    } catch (e: any) {
      setError((e instanceof Error ? e.message : String(e)) || "Failed to revoke other sessions.");
    } finally {
      setRevokingAll(false);
    }
  }, []);

  // ── Skeleton ──
  if (loading) {
    return (
      <div className="space-y-5 pb-8">
        <div className="border-b border-border pb-3">
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-3 w-64 bg-surface rounded animate-pulse mt-2" />
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card border border-border rounded-xl p-5">
            <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
            <div className="h-16 bg-surface rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  // ── Error ──
  if (error && !data) {
    return (
      <div className="space-y-5 pb-8">
        <div className="border-b border-border pb-3">
          <h2 className="text-xl font-extrabold text-foreground">Security</h2>
        </div>
        <div className="bg-destructive/10 border border-destructive/50 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-destructive">Security information unavailable</h4>
            <p className="text-xs text-destructive mt-1">{error}</p>
            <button
              onClick={() => { fetchedRef.current = false; fetchSecurity(); }}
              className="mt-3 text-xs font-bold text-destructive border border-destructive/50 px-3 py-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const sessions = data?.sessions || [];
  const currentSession = sessions.find((s) => s.is_current);
  const otherSessions = sessions.filter((s) => !s.is_current);

  return (
    <div className="space-y-5 pb-8 relative">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between border-b border-border pb-3"
      >
        <div>
          <h2 className="text-xl font-extrabold text-foreground">Security</h2>
          <p className="text-muted-foreground text-xs font-medium mt-0.5">
            Manage your active sessions and connected accounts.
          </p>
        </div>
        <button
          onClick={() => fetchSecurity(true)}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary px-2.5 py-1.5 rounded-lg border border-border hover:border-primary/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </motion.div>

      {/* Error banner (non-fatal) */}
      <AnimatePresence>
        {error && data && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-destructive/10 border border-destructive/50 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-destructive"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Security Status Card ─── */}
      <SettingsSection
        title="Security Status"
        description="Your account's overall security health."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 1fr",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {/* Left: Ring */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
            <SecurityScoreRing score={data?.score || 0} />
          </div>

          {/* Right: Content */}
          <div style={{ minWidth: 0 }}>
            <h4
              style={{
                fontSize: 15,
                fontWeight: 800,
                color: "#0f172a",
                marginBottom: 4,
              }}
            >
              {data?.label === "Excellent"
                ? "Looking Good!"
                : data?.label === "Good"
                ? "Doing Well"
                : data?.label === "Needs Attention"
                ? "Needs Attention"
                : "Action Required"}
            </h4>
            <p
              style={{
                fontSize: 13,
                color: "#64748b",
                lineHeight: 1.5,
                marginBottom: 12,
                maxWidth: 500,
              }}
            >
              Your account security score is{" "}
              <strong style={{ color: "#0f172a" }}>{data?.score || 0}%</strong>. You&apos;re
              using {data?.provider === "google" ? "Google SSO" : data?.provider || "email"},{" "}
              which provides strong authentication protection.
            </p>

            {/* Security checks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(data?.checks || []).map((check, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
                    color: check.passed ? "#059669" : "#94a3b8",
                    fontWeight: 600,
                  }}
                >
                  {check.passed ? (
                    <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                  ) : (
                    <Circle style={{ width: 14, height: 14, flexShrink: 0 }} />
                  )}
                  {check.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </SettingsSection>

      {/* ─── Active Sessions ─── */}
      <SettingsSection
        title="Active Sessions"
        description="Devices currently signed into your account."
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {/* Current session */}
          {currentSession && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 0",
                borderBottom: otherSessions.length > 0 ? "1px solid #f1f5f9" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DeviceIcon device={currentSession.device} />
                </div>
                <div>
                  <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                    {currentSession.os} • {currentSession.browser}
                  </h4>
                  <p style={{ fontSize: 11, color: "#94a3b8" }}>
                    {currentSession.device} • Current session
                  </p>
                </div>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "#059669",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  background: "#ecfdf5",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #d1fae5",
                }}
              >
                Active
              </span>
            </div>
          )}

          {/* Other sessions */}
          <AnimatePresence>
            {otherSessions.map((session) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 0",
                  borderBottom: "1px solid #f1f5f9",
                  opacity: 0.75,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "#f8fafc",
                      color: "#64748b",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <DeviceIcon device={session.device} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                      {session.os} • {session.browser}
                    </h4>
                    <p style={{ fontSize: 11, color: "#94a3b8" }}>
                      {session.device} • Last active {timeAgo(session.last_active_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748b",
                    background: "white",
                    border: "1px solid #e2e8f0",
                    padding: "5px 12px",
                    borderRadius: 8,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = "#dc2626";
                    e.currentTarget.style.borderColor = "#fecaca";
                    e.currentTarget.style.background = "#fef2f2";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = "#64748b";
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.background = "white";
                  }}
                >
                  {revokingId === session.id ? (
                    <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <LogOut style={{ width: 12, height: 12 }} />
                  )}
                  Revoke
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {otherSessions.length === 0 && currentSession && (
            <p
              style={{
                fontSize: 12,
                color: "#94a3b8",
                paddingTop: 12,
                textAlign: "center",
              }}
            >
              No other active sessions. You&apos;re only signed in on this device.
            </p>
          )}

          {/* Revoke all button */}
          {otherSessions.length > 0 && (
            <div style={{ paddingTop: 12, display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={handleRevokeAll}
                disabled={revokingAll}
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#dc2626",
                  background: "white",
                  border: "1px solid #fecaca",
                  padding: "6px 14px",
                  borderRadius: 8,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.15s",
                }}
              >
                {revokingAll ? (
                  <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />
                ) : (
                  <LogOut style={{ width: 12, height: 12 }} />
                )}
                Sign out all other sessions
              </button>
            </div>
          )}
        </div>
      </SettingsSection>

      {/* ─── Connected Accounts ─── */}
      <SettingsSection
        title="Connected Accounts"
        description="OAuth providers linked to your account."
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: "#f8fafc",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Globe style={{ width: 16, height: 16, color: "#3b82f6" }} />
            </div>
            <div>
              <h4 style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>
                Google
              </h4>
              <p style={{ fontSize: 11, color: "#94a3b8" }}>
                {user?.email || "Connected via Google SSO"}
              </p>
            </div>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#3b82f6",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              background: "#eff6ff",
              padding: "4px 10px",
              borderRadius: 6,
              border: "1px solid #dbeafe",
            }}
          >
            Connected
          </span>
        </div>
      </SettingsSection>
    </div>
  );
}
