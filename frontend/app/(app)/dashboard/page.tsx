"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { fetcher, API_BASE_URL } from "@/lib/api";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { 
  FolderIcon, 
  FileTextIcon, 
  AlertTriangleIcon, 
  ActivityIcon, 
  EyeIcon, 
  MoreHorizontalIcon, 
  HistoryIcon, 
  BotIcon, 
  CheckCircleIcon, 
  GlobeIcon,
  Building2,
  Scale,
  Folder,
  PinIcon,
  Trash2Icon,
  Loader2,
  DownloadIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const ICON_MAP: Record<string, any> = {
  Building2,
  GlobeIcon,
  Scale,
  FileTextIcon,
  AlertTriangleIcon,
  Folder,
  BotIcon
};

import { formatRelativeTime } from "@/lib/timestamps";
// Types
interface AgentActivity {
  id: string;
  agent_name: string;
  agent_type: string;
  action: string;
  workspace_name: string;
  time_ago: string;
  timestamp: string;
}

interface RedFlag {
  id: string;
  workspace_id: string;
  severity: string;
  title: string;
  time_ago: string;
  detected_at?: string;
  pinned?: boolean;
}

interface DashboardStats {
  active_workspaces: number;
  active_workspaces_trend: string;
  documents_processed: number;
  documents_processed_trend: string;
  open_red_flags: number;
  reports_generated: number;
  reports_generated_trend: string;
  agent_activity: AgentActivity[];
  red_flags: RedFlag[];
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  docs: number;
  updatedAt: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

export default function DashboardPage() {
  const { user: firebaseUser, dbUser } = useAuth();
  const rawName = dbUser?.name || firebaseUser?.displayName || "User";
  const userName = rawName.split(" ")[0];

  const router = useRouter();

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  // Time state for relative timestamps
  const [currentTime, setCurrentTime] = useState<number | null>(null);

  useEffect(() => {
    setCurrentTime(Date.now());
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Daily Summary State
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);
  const [summaryError, setSummaryError] = useState("");

  const handleGenerateSummary = async () => {
    setSummaryOpen(true);
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const res = await fetcher<any>("/dashboard/daily-summary", { method: "POST" });
      setSummaryData(res);
    } catch (err) {
      setSummaryError("Failed to generate summary. Please try again later.");
    } finally {
      setSummaryLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const user = auth.currentUser;
      const token = user ? await getIdToken(user) : "";
      const response = await fetch(`${API_BASE_URL}/dashboard/daily-summary/pdf`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error("Failed to generate PDF");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      // Get filename from Content-Disposition if possible, else default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "agent_activity_summary.pdf";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename=(.+)/);
        if (filenameMatch && filenameMatch.length === 2) {
          filename = filenameMatch[1];
        }
      }
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("Failed to download PDF summary.");
    }
  };

  const handleDismissFlag = async (flagId: string) => {
    // Optimistic UI update
    if (stats) {
      setStats({
        ...stats,
        red_flags: stats.red_flags.filter(f => f.id !== flagId)
      });
    }
    try {
      await fetcher(`/dashboard/red-flags/${flagId}/dismiss`, { method: "POST" });
    } catch (err) {
      console.error("Failed to dismiss flag:", err);
    }
  };

  const handlePinFlag = async (flagId: string) => {
    // Optimistic UI update
    if (stats) {
      setStats({
        ...stats,
        red_flags: stats.red_flags.map(f => 
          f.id === flagId ? { ...f, pinned: !f.pinned } : f
        ).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) // Re-sort putting pinned first
      });
    }
    try {
      await fetcher(`/dashboard/red-flags/${flagId}/pin`, { method: "POST" });
    } catch (err) {
      console.error("Failed to pin flag:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, workspacesData] = await Promise.all([
          fetcher<DashboardStats>("/dashboard/stats"),
          fetcher<Workspace[]>("/workspaces")
        ]);
        setStats(statsData);
        setWorkspaces(workspacesData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8 w-full max-w-[1440px] mx-auto flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-[1440px] mx-auto flex-1 flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground m-0">Good afternoon, {userName}</h1>
          <p className="text-sm text-muted-foreground mt-1">Here&apos;s a summary of your analytical workflows.</p>
        </div>
        <Link href="/workspace" className="bg-primary/10 border border-primary/30 text-primary flex items-center justify-center h-10 px-6 rounded-lg text-sm font-medium hover:bg-primary/20 hover:border-primary/50 transition-colors shadow-sm whitespace-nowrap backdrop-blur-sm">
          View Workspaces
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1 */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-[0_8px_30px_rgba(249,115,22,0.15)] hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-orange-500">Active Workspaces</span>
            <FolderIcon className="text-orange-500 w-[18px] h-[18px] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="font-mono text-orange-500 text-2xl font-medium mt-2">{workspaces.length}</div>
          <div className="text-sm text-orange-500 flex items-center gap-1 mt-1 font-medium opacity-80">
            <ActivityIcon className="w-3.5 h-3.5" /> <span>{stats?.active_workspaces_trend}</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)] hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-violet-500">Documents Processed</span>
            <FileTextIcon className="text-violet-500 w-[18px] h-[18px] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="font-mono text-violet-500 text-2xl font-medium mt-2">{stats?.documents_processed}</div>
          <div className="text-sm text-violet-500 mt-1 font-medium opacity-80">{stats?.documents_processed_trend}</div>
        </div>

        {/* Card 3 */}
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-[0_8px_30px_rgba(220,38,38,0.15)] hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-destructive">Open Red Flags</span>
            <AlertTriangleIcon className="text-destructive w-[18px] h-[18px] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="font-mono text-destructive text-2xl font-medium mt-2">{stats?.red_flags.length}</div>
          <div className="text-sm text-destructive font-medium mt-1 opacity-80">High Severity</div>
        </div>

        {/* Card 4 */}
        <div className="bg-success/10 border border-success/30 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-[0_8px_30px_rgba(22,163,74,0.15)] hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-success">Reports Generated</span>
            <ActivityIcon className="text-success w-[18px] h-[18px] group-hover:scale-110 transition-transform duration-300" />
          </div>
          <div className="font-mono text-success text-2xl font-medium mt-2">{stats?.reports_generated}</div>
          <div className="text-sm text-success flex items-center gap-1 mt-1 font-medium opacity-80">
            <ActivityIcon className="w-3.5 h-3.5" /> <span>{stats?.reports_generated_trend}</span>
          </div>
        </div>
      </div>

      {/* Risk Monitoring Band */}
      {stats?.red_flags && stats.red_flags.length > 0 && (
        <div className="bg-surface rounded-xl p-5 border-l-4 border-destructive/50 flex flex-col gap-4">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangleIcon className="text-destructive w-5 h-5" />
            <h2 className="text-lg font-semibold text-foreground m-0">Attention Needed</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-1">
            {stats.red_flags.map((flag, index) => (
              <div key={`flag-${flag.id || index}`} className="min-w-0 bg-card rounded-lg p-4 border border-border shadow-sm flex flex-col gap-1 hover:bg-surface transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[11px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded",
                      flag.severity === "Critical" ? "text-destructive bg-destructive/20" : "text-orange-700 bg-orange-100"
                    )}>
                      {flag.severity}
                    </span>
                    {flag.pinned && <PinIcon className="w-3.5 h-3.5 text-primary fill-blue-100" />}
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-semibold text-foreground">
                      {flag.detected_at 
                        ? new Date(flag.detected_at).toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' •')
                        : "Unknown"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Detected {currentTime && formatRelativeTime(flag.detected_at)}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-foreground mt-1">{flag.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <button 
                    onClick={() => router.push(`/workspace/${flag.workspace_id}/red-flags`)}
                    className="text-xs font-medium text-primary flex items-center gap-1 hover:underline">
                    <EyeIcon className="w-3.5 h-3.5" /> View details
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground p-1 outline-none">
                      <MoreHorizontalIcon className="w-[18px] h-[18px]" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handlePinFlag(flag.id); }}>
                        <PinIcon className="w-4 h-4 mr-2" /> {flag.pinned ? "Unpin" : "Pin"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDismissFlag(flag.id); }} className="text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2Icon className="w-4 h-4 mr-2" /> Dismiss
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* 8-column Recent Workspaces */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h2 className="text-lg font-semibold text-foreground m-0">Recent Workspaces</h2>
            <Link href="/workspace" className="text-sm text-primary hover:underline font-medium">View all</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {workspaces.slice(0, 3).map((ws, index) => {
              const Icon = ICON_MAP[ws.icon] || Folder;
              return (
                <Link key={`ws-${ws.id || index}`} href={`/workspace/${ws.id}`} className="bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0", ws.iconBg, ws.iconColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-foreground group-hover:text-primary transition-colors">{ws.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{ws.updatedAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <span className="bg-surface py-0.5 px-2 rounded text-[11px] font-bold tracking-wider uppercase text-muted-foreground">{ws.docs} Docs</span>
                  </div>
                </Link>
              );
            })}
            
            {workspaces.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-8 bg-surface rounded-lg border border-border border-dashed">
                No active workspaces yet.
              </div>
            )}
          </div>
        </div>

        {/* 4-column Agent Activity */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-border pb-2">
            <h2 className="text-lg font-semibold text-foreground m-0">Agent Activity</h2>
            <HistoryIcon className="text-muted-foreground w-[18px] h-[18px]" />
          </div>
          
          <div className="flex flex-col gap-3 bg-surface rounded-xl p-4 border border-border h-full">
            {stats?.agent_activity.map((activity, index) => {
              // Cycle colors based on index
              const colors = [
                { bar: "bg-primary", text: "text-primary", icon: <BotIcon className="w-3.5 h-3.5" /> },
                { bar: "bg-success", text: "text-success", icon: <CheckCircleIcon className="w-3.5 h-3.5" /> },
                { bar: "bg-violet-500", text: "text-violet-600", icon: <GlobeIcon className="w-3.5 h-3.5" /> },
              ];
              const color = colors[index % colors.length];

              return (
                <div key={`activity-${activity.id || index}`} className="flex gap-3 p-3 bg-card rounded-lg border border-border shadow-sm relative overflow-hidden">
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", color.bar)}></div>
                  <div className="flex-1 ml-1">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[11px] font-bold tracking-wider uppercase flex items-center gap-1", color.text)}>
                        {color.icon} {activity.agent_name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{formatRelativeTime(activity.timestamp)}</span>
                    </div>
                    <p className="text-sm text-foreground mt-1 font-medium">{activity.action}</p>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-surface text-muted-foreground text-[10px] font-medium">
                      Workspace: {activity.workspace_name}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Action Prompt */}
            <button 
              onClick={handleGenerateSummary}
              className="mt-auto bg-violet-50 text-violet-700 border border-violet-200 rounded-lg p-2.5 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-violet-100 transition-all shadow-sm">
              <BotIcon className="w-4 h-4" /> Ask Agents for Daily Summary
            </button>
          </div>
        </div>
      </div>

      {/* Daily Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="w-[92vw] sm:w-[560px] sm:max-w-[560px] max-h-[85vh] bg-card p-0 border-0 shadow-2xl rounded-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-6 pb-4 border-b border-border-subtle shrink-0 flex flex-row items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-3 text-violet-700 text-lg font-bold">
                <div className="p-2 bg-violet-100 rounded-xl">
                  <BotIcon className="w-5 h-5" />
                </div>
                Agent Activity Summary
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                {summaryData?.date ? `Report for ${summaryData.date}` : "Loading..."}
              </DialogDescription>
            </div>
            {summaryData && !summaryLoading && (
              <button
                onClick={handleDownloadPdf}
                className="flex items-center gap-2 bg-card border border-border text-foreground hover:bg-surface hover:text-violet-700 hover:border-violet-200 transition-colors px-3 py-1.5 rounded-md text-sm font-medium shadow-sm"
              >
                <DownloadIcon className="w-4 h-4" />
                <span>PDF</span>
              </button>
            )}
          </DialogHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-5">
            {summaryLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 text-violet-600 py-16">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm font-semibold">Compiling agent summary...</span>
              </div>
            ) : summaryError ? (
              <div className="text-center text-destructive py-12 text-sm">{summaryError}</div>
            ) : summaryData ? (
              <>
                {/* Overview */}
                <p className="text-sm text-muted-foreground leading-relaxed bg-surface rounded-xl p-4 border border-border">
                  {summaryData.overview}
                </p>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Agent Actions", value: summaryData.total_agent_actions, color: "text-violet-600", bg: "bg-violet-50" },
                    { label: "Docs Processed", value: summaryData.total_docs_processed, color: "text-primary", bg: "bg-primary/10" },
                    { label: "Risks Found", value: summaryData.total_risks_found, color: "text-destructive", bg: "bg-destructive/10" },
                    { label: "Reports", value: summaryData.total_reports, color: "text-success", bg: "bg-success/10" }
                  ].map((s, index) => (
                    <div key={`stat-${s.label || index}`} className={cn("rounded-xl p-3 text-center border", s.bg, "border-transparent")}>
                      <div className={cn("text-2xl font-bold", s.color)}>{s.value}</div>
                      <div className="text-[11px] text-muted-foreground font-medium mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Per-Agent Breakdown */}
                {summaryData.agents?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Agent Breakdown</h3>
                    <div className="space-y-2">
                      {summaryData.agents.map((agent: any, index: number) => (
                        <div key={`agent-${agent.agent_name || index}`} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0"></div>
                            <span className="text-sm font-semibold text-foreground truncate">{agent.agent_name}</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                            <span className="text-success font-medium">{agent.completed} done</span>
                            {agent.failed > 0 && <span className="text-destructive font-medium">{agent.failed} failed</span>}
                            <span className="text-muted-foreground">{agent.latest_time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Per-Workspace Breakdown */}
                {summaryData.workspaces?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Workspace Overview</h3>
                    <div className="space-y-2">
                      {summaryData.workspaces.map((ws: any, index: number) => (
                        <div key={`summ-ws-${ws.id || index}`} className="bg-card border border-border rounded-lg p-3">
                          <div className="text-sm font-semibold text-foreground truncate mb-1.5">{ws.name}</div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span><span className="font-bold text-primary">{ws.docs_processed}</span> docs</span>
                            <span><span className="font-bold text-destructive">{ws.risks_found}</span> risks</span>
                            <span><span className="font-bold text-success">{ws.reports_generated}</span> reports</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity Timeline */}
                {summaryData.recent_activity?.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Recent Activity</h3>
                    <div className="space-y-1">
                      {summaryData.recent_activity.map((act: any, i: number) => {
                        const statusColor = act.status === "Complete" ? "bg-success" : act.status === "Failed" ? "bg-destructive" : "bg-amber-500";
                        return (
                          <div key={`rec-${act.id || i}`} className="flex gap-3 py-2 border-b border-border-subtle last:border-0">
                            <div className="flex flex-col items-center pt-1.5 shrink-0">
                              <div className={cn("w-2 h-2 rounded-full", statusColor)}></div>
                              {i < summaryData.recent_activity.length - 1 && <div className="w-px flex-1 bg-muted mt-1"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-foreground truncate">{act.agent_name}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">{act.time_ago}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{act.action} — {act.details}</p>
                              <span className="text-[10px] text-muted-foreground">{act.workspace_name}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}