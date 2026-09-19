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
        <span className="text-slate-900 dark:text-slate-100" style={{ fontSize: 18, fontWeight: 800 }}>
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
              className="text-slate-900 dark:text-slate-100"
              style={{
                fontSize: 15,
                fontWeight: 800,
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
              className="text-slate-500 dark:text-slate-400"
              style={{
                fontSize: 13,
                lineHeight: 1.5,
                marginBottom: 12,
                maxWidth: 500,
              }}
            >
              Your account security score is{" "}
              <strong className="text-slate-900 dark:text-slate-100">{data?.score || 0}%</strong>. You&apos;re
              using {data?.provider === "google" ? "Google SSO" : data?.provider || "email"},{" "}
              which provides strong authentication protection.
            </p>

            {/* Security checks */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {(data?.checks || []).map((check, i) => (
                <div
                  key={i}
                  className={check.passed ? "text-emerald-600 dark:text-emerald-500" : "text-slate-400 dark:text-slate-500"}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 12,
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
                  className="bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <DeviceIcon device={currentSession.device} />
                </div>
                <div>
                  <h4 className="text-slate-800 dark:text-slate-200" style={{ fontSize: 13, fontWeight: 700 }}>
                    {currentSession.os} • {currentSession.browser}
                  </h4>
                  <p className="text-slate-400 dark:text-slate-500" style={{ fontSize: 11 }}>
                    {currentSession.device} • Current session
                  </p>
                </div>
              </div>
              <span
                className="text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/20"
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  padding: "4px 10px",
                  borderRadius: 6,
                  borderWidth: "1px",
                  borderStyle: "solid",
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
                    className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <DeviceIcon device={session.device} />
                  </div>
                  <div>
                    <h4 className="text-slate-800 dark:text-slate-200" style={{ fontSize: 13, fontWeight: 700 }}>
                      {session.os} • {session.browser}
                    </h4>
                    <p className="text-slate-400 dark:text-slate-500" style={{ fontSize: 11 }}>
                      {session.device} • Last active {timeAgo(session.last_active_at)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleRevoke(session.id)}
                  disabled={revokingId === session.id}
                  className="text-slate-500 bg-white border-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:border-slate-800 hover:text-red-600 hover:border-red-200 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/20 dark:hover:border-red-900/50"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "5px 12px",
                    borderRadius: 8,
                    borderWidth: "1px",
                    borderStyle: "solid",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    transition: "all 0.15s",
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
              className="text-slate-400 dark:text-slate-500"
              style={{
                fontSize: 12,
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
                className="text-red-600 bg-white border-red-200 dark:text-red-400 dark:bg-slate-900 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "6px 14px",
                  borderRadius: 8,
                  borderWidth: "1px",
                  borderStyle: "solid",
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
              className="bg-slate-50 dark:bg-slate-800"
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Globe style={{ width: 16, height: 16, color: "#3b82f6" }} />
            </div>
            <div>
              <h4 className="text-slate-800 dark:text-slate-200" style={{ fontSize: 13, fontWeight: 700 }}>
                Google
              </h4>
              <p className="text-slate-400 dark:text-slate-500" style={{ fontSize: 11 }}>
                {user?.email || "Connected via Google SSO"}
              </p>
            </div>
          </div>
          <span
            className="text-blue-500 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-500/10 dark:border-blue-500/20"
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "4px 10px",
              borderRadius: 6,
              borderWidth: "1px",
              borderStyle: "solid",
            }}
          >
            Connected
          </span>
        </div>
      </SettingsSection>
    </div>
  );
}
