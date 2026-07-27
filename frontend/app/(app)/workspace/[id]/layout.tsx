"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Upload,
  FileBarChart2,
  MessageSquare,
  BarChart2,
  GitCompareArrows,
  ShieldAlert,
  Bot,
  FileText,
  ChevronLeft,
  MoreVertical,
  Activity,
  RotateCcw,
  Loader2,
  Check,
  X,
  FileStack,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/utils";
import { fetcher, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";


interface Workspace {
  id: string;
  name: string;
  description: string;
  docs: number;
  chats: number;
  reports: number;
  owner_name: string;
  updatedAt: string;
}

interface Agent {
  id: number;
  name: string;
  status: "Complete" | "Running" | "Idle" | "Failed";
  details: string;
}

// ── Agent Sidebar Components ──────────────────────────────────────────────────
const AGENT_ICONS: Record<string, React.ElementType> = {
  "Document Agent": FileStack,
  "Extraction Agent": TrendingUp,
  "Red Flag Agent": ShieldAlert,
  "Comparison Agent": GitCompareArrows,
  "Research Agent": MessageSquare,
  "Report Agent": FileBarChart2,
};

const AGENT_COLORS: Record<string, string> = {
  "Document Agent": "bg-blue-100 text-blue-600",
  "Extraction Agent": "bg-teal-100 text-teal-600",
  "Red Flag Agent": "bg-orange-100 text-orange-600",
  "Comparison Agent": "bg-violet-100 text-violet-600",
  "Research Agent": "bg-sky-100 text-sky-600",
  "Report Agent": "bg-red-100 text-red-600",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "Complete")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <Check className="w-3 h-3" /> Complete
      </span>
    );
  if (status === "Running")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" /> Running
      </span>
    );
  if (status === "Failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <X className="w-3 h-3" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      Idle
    </span>
  );
}

function AgentSidebar({
  workspaceId,
  collapsed,
  onToggle,
}: {
  workspaceId: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { user, loading: authLoading } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    if (authLoading || !user) return;
    try {
      const data = await fetcher<{ agents: Agent[] }>(`/workspaces/${workspaceId}/agents`);
      setAgents(data.agents);
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, authLoading, user]);

  useEffect(() => {
    if (!authLoading && user) {
      loadAgents();
      const interval = setInterval(loadAgents, 15000);
      return () => clearInterval(interval);
    }
  }, [loadAgents, authLoading, user]);

  const handleRetry = async (agentId: number) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: "Running" } : a))
    );
    await new Promise((r) => setTimeout(r, 2500));
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, status: "Complete", details: "Report generated\nJust now" }
          : a
      )
    );
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l border-slate-200 bg-white flex flex-col items-center pt-4 gap-4 shrink-0">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Expand Agent Status"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {agents.slice(0, 6).map((agent) => {
          const Icon = AGENT_ICONS[agent.name] || Bot;
          const colorClass = AGENT_COLORS[agent.name] || "bg-slate-100 text-slate-500";
          return (
            <div key={agent.id} className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative", colorClass)}>
              <Icon className="w-4 h-4" />
              {agent.status === "Running" && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
              {agent.status === "Failed" && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-bold text-slate-800">Agent Status</span>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Collapse"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))
          : agents.map((agent) => {
              const Icon = AGENT_ICONS[agent.name] || Bot;
              const colorClass = AGENT_COLORS[agent.name] || "bg-slate-100 text-slate-500";
              const detailLines = agent.details.split("\n");
              return (
                <div key={agent.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {agent.id} {agent.name}
                      </span>
                      <button className="p-0.5 text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <StatusBadge status={agent.status} />
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed whitespace-pre-line">
                      {detailLines[0]}
                    </p>
                    {detailLines[1] && (
                      <p className="text-[11px] text-slate-400">{detailLines[1]}</p>
                    )}
                    {agent.status === "Failed" && (
                      <button
                        onClick={() => handleRetry(agent.id)}
                        className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      <div className="border-t border-slate-100 px-4 py-2">
        <Link href={`/workspace/${workspaceId}/agents`} className="w-full flex items-center justify-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-800 py-1.5 transition-colors">
          <Activity className="w-3.5 h-3.5" />
          View all activity
        </Link>
      </div>
    </div>
  );
}

// ── Layout ────────────────────────────────────────────────────────────────────

type Tab = "Chat" | "Documents" | "Metrics" | "Comparison" | "Red Flags" | "Agent Activity" | "Reports";

const TABS: { id: Tab, label: string, path: string, icon: React.ElementType }[] = [
  { id: "Chat", label: "Chat", path: "", icon: MessageSquare },
  { id: "Documents", label: "Documents", path: "/documents", icon: FileText },
  { id: "Metrics", label: "Metrics", path: "/metrics", icon: BarChart2 },
  { id: "Comparison", label: "Comparison", path: "/compare", icon: GitCompareArrows },
  { id: "Red Flags", label: "Red Flags", path: "/red-flags", icon: ShieldAlert },
  { id: "Agent Activity", label: "Agent Activity", path: "/agents", icon: Activity },
  { id: "Reports", label: "Reports", path: "/reports", icon: FileBarChart2 },
];

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const workspaceId = params.id as string;

  const { user, loading: authLoading } = useAuth();
  const [ws, setWs] = useState<Workspace | null>(null);
  const [firstDocName, setFirstDocName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);

  const loadWorkspace = useCallback(async () => {
    if (authLoading || !user) return;
    try {
      const data = await fetcher<Workspace>(`/workspaces/${workspaceId}`);
      setWs(data);
      
      try {
        const docsData = await fetcher<{documents: any[]}>(`/workspaces/${workspaceId}/documents`);
        if (docsData && docsData.documents && docsData.documents.length > 0) {
          setFirstDocName(docsData.documents[0].name);
        }
      } catch (e) {
        console.error("Failed to fetch documents for breadcrumb", e);
      }
    } catch {
      router.push("/workspace");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router, authLoading, user]);

  useEffect(() => {
    if (!authLoading && user) {
      loadWorkspace();
    } else if (!authLoading && !user) {
      router.push("/login");
    }
  }, [loadWorkspace, authLoading, user, router]);

  const handleHeaderUpload = async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === "application/pdf");
    if (!pdfs.length) return;
    setUploading(true);
    const formData = new FormData();
    pdfs.forEach((f) => formData.append("files", f));
    try {
      await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/documents`, {
        method: "POST",
        body: formData,
      });
      await loadWorkspace();
      router.push(`/workspace/${workspaceId}/documents`);
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReport = () => {
    router.push(`/workspace/${workspaceId}/reports/generate`);
  };

  // Determine current active tab based on pathname
  let activeTabId: Tab = "Chat";
  for (const tab of TABS) {
    if (tab.path && (pathname.endsWith(tab.path) || pathname.includes(`${tab.path}/`))) {
      activeTabId = tab.id;
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!ws) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-56px)] overflow-hidden bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 w-full">
          <Link href="/workspace" className="hover:text-blue-600 transition-colors flex items-center gap-1 shrink-0">
            <ChevronLeft className="w-3.5 h-3.5" /> Workspaces
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <Link href={`/workspace/${workspaceId}`} className="hover:text-blue-600 transition-colors min-w-0 shrink-0">
            <span className="truncate block max-w-sm" title={firstDocName || ws.name}>{firstDocName || ws.name}</span>
          </Link>
          <ChevronRight className="w-3 h-3 shrink-0" />
          <span className="text-slate-600 font-medium shrink-0">{activeTabId}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 truncate">{ws.name}</h1>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {timeAgo(ws.updatedAt)} &bull; {ws.docs} Document{ws.docs !== 1 ? "s" : ""} &bull; {ws.chats} Chat{ws.chats !== 1 ? "s" : ""} &bull; {ws.reports} Report{ws.reports !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                handleHeaderUpload(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <button
              onClick={handleGenerateReport}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm bg-blue-600 text-white hover:bg-blue-700"
            >
              <FileText className="w-4 h-4" />
              Generate Report
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-4 -mb-4 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTabId === tab.id;
            return (
              <Link
                key={tab.id}
                href={`/workspace/${workspaceId}${tab.path}`}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {children}
        </div>

        {/* Agent Sidebar */}
        <AgentSidebar
          workspaceId={workspaceId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>


    </div>
  );
}
