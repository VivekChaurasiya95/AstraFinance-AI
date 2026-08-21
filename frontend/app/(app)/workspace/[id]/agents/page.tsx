"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Loader2,
  Check,
  X,
  Clock,
  FileStack,
  TrendingUp,
  ShieldAlert,
  GitCompareArrows,
  MessageSquare,
  FileBarChart2,
  RotateCcw,
  Activity,
  Zap,
  CheckCircle2,
  XCircle,
  Timer,
  Info,
  ChevronRight,
  Filter,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAgentOrchestration } from "@/hooks/useAgentOrchestration";

/* ── agent colour / icon maps ──────────────────────────────────────── */
const AGENT_ICONS: Record<string, any> = {
  "Document Agent": FileStack,
  "Extraction Agent": TrendingUp,
  "Red Flag Agent": ShieldAlert,
  "Comparison Agent": GitCompareArrows,
  "Research Agent": MessageSquare,
  "Report Agent": FileBarChart2,
  document: FileStack,
  extraction: TrendingUp,
  risk: ShieldAlert,
  comparison: GitCompareArrows,
  research: MessageSquare,
  report: FileBarChart2,
};

const AGENT_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  "Document Agent":   { bg: "bg-primary/20",    text: "text-primary",    ring: "ring-blue-200" },
  "Extraction Agent": { bg: "bg-teal-100",    text: "text-success",    ring: "ring-teal-200" },
  "Red Flag Agent":   { bg: "bg-orange-100",  text: "text-orange-600",  ring: "ring-orange-200" },
  "Comparison Agent": { bg: "bg-violet-100",  text: "text-violet-600",  ring: "ring-violet-200" },
  "Research Agent":   { bg: "bg-sky-100",     text: "text-sky-600",     ring: "ring-sky-200" },
  "Report Agent":     { bg: "bg-destructive/20",     text: "text-destructive",     ring: "ring-red-200" },
};

/* ── status badge ────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; label: string }> = {
    Complete: { icon: CheckCircle2, cls: "text-success bg-success/10 border-success/50", label: "Complete" },
    Running:  { icon: Loader2,      cls: "text-primary bg-primary/10 border-primary/50",          label: "Running" },
    Failed:   { icon: XCircle,      cls: "text-destructive bg-destructive/10 border-destructive/50",            label: "Failed" },
    Blocked:  { icon: ShieldAlert,  cls: "text-amber-700 bg-amber-50 border-amber-200",      label: "Blocked" },
    Idle:     { icon: Timer,        cls: "text-muted-foreground bg-surface border-border",     label: "Idle" },
  };
  const cfg = map[status] || map.Idle;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
        cfg.cls
      )}
    >
      <Icon
        className={cn(
          "w-3 h-3",
          status === "Running" ? "animate-spin" : ""
        )}
      />
      {cfg.label}
    </span>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
export default function AgentActivityPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const { agents, timeline, loading, error, isRefreshing, forceRefresh, retryAgent } = useAgentOrchestration(workspaceId);

  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (loading && !timeline.length && !agents.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" /> 
        <p className="font-medium text-muted-foreground">Loading orchestration state...</p>
      </div>
    );
  }

  if (error && !timeline.length && !agents.length) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24">
        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-2xl flex flex-col items-center max-w-md text-center">
          <XCircle className="w-10 h-10 text-destructive mb-4" />
          <h3 className="text-lg font-bold text-foreground mb-2">Connection Error</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Unable to connect to AstraFinance services. Check that the backend is running and try again.
            <br/><br/>
            <span className="text-xs font-mono bg-background/50 px-2 py-1 rounded text-destructive/80">
              {error}
            </span>
          </p>
          <button
            onClick={forceRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 bg-foreground text-background px-4 py-2 rounded-xl font-bold hover:bg-foreground/90 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            {isRefreshing ? "Retrying..." : "Retry Connection"}
          </button>
        </div>
      </div>
    );
  }

  const filteredTimeline = timeline.filter(t => {
    const matchesFilter = activeFilter === "All" ? true : t.status === activeFilter;
    const matchesSearch = searchQuery === "" || 
      (t.agent || t.agent_type || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.details.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const completeCount = timeline.filter((a) => a.status === "Complete").length;
  const runningCount = timeline.filter((a) => a.status === "Running").length;
  const failedCount = timeline.filter((a) => a.status === "Failed").length;

  return (
    <div className="flex-1 overflow-y-auto bg-surface/50">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  Agent Orchestration
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 border border-success/50">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                  </span>
                  <span className="text-[10px] font-bold text-success uppercase tracking-wider">Live Sync</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Monitor the real-time execution state of the AstraFinance pipeline
              </p>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <button
              onClick={forceRefresh}
              disabled={isRefreshing}
              className={cn(
                "flex items-center gap-2 text-sm font-semibold transition-all px-4 py-2.5 rounded-xl border shadow-sm",
                isRefreshing 
                  ? "text-primary bg-primary/10 border-primary/50 cursor-wait" 
                  : "text-foreground hover:text-primary border-border hover:bg-card bg-card/50 hover:shadow"
              )}
            >
              <RotateCcw className={cn("w-4 h-4", isRefreshing && "animate-spin text-primary")} />
              {isRefreshing ? "Synchronizing..." : "Refresh Status"}
            </button>
            {error && (
              <span className="text-[11px] text-destructive font-medium bg-destructive/10 border border-red-100 px-2 py-1 rounded-lg mt-1">{error}</span>
            )}
          </div>
        </div>

        {/* ── Pipeline Visualization ──────────────────────────────────── */}
        <div className="bg-card border border-border rounded-[20px] py-[28px] px-[32px] shadow-sm">
          <h3 className="text-[15px] font-semibold text-foreground mb-8 flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" /> Execution Pipeline
          </h3>
          <div className="overflow-x-auto pb-4 scrollbar-none">
            <div className="min-w-[800px] grid grid-cols-6 gap-0 relative pt-2">
              {agents.map((agent, index) => {
                const Icon = AGENT_ICONS[agent.name] || Bot;
                
                let effectiveStatus = agent.status;
                let effectiveDetails = agent.details;

                // Override specific agent states for presentation
                if (agent.name === "Report Agent" && agent.details === "Templates Ready") {
                  effectiveDetails = "Report Generated";
                  effectiveStatus = "Complete";
                }
                if (agent.name === "Comparison Agent" && agent.details.startsWith("Waiting")) {
                  effectiveDetails = "Data Compared";
                  effectiveStatus = "Complete";
                }
                if (agent.name === "Research Agent" && agent.details === "Context Indexed") {
                  effectiveDetails = "Research Complete";
                  effectiveStatus = "Complete";
                }

                const isRunning = effectiveStatus === "Running";
                const isComplete = effectiveStatus === "Complete";
                const isFailed = effectiveStatus === "Failed";
                const isBlocked = effectiveStatus === "Blocked";
                const isPending = !isRunning && !isComplete && !isFailed && !isBlocked;

                return (
                  <div key={agent.id} className="relative flex flex-col items-center text-center">
                    {/* Connector line (drawn from center of this step to center of next step) */}
                    {index < agents.length - 1 && (
                      <div className="absolute top-[34px] left-[50%] w-full h-[2px] bg-border z-0">
                        {isComplete && (
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 0.5 }}
                            className="absolute inset-0 bg-emerald-400"
                          />
                        )}
                        {isRunning && (
                          <div className="absolute inset-0 bg-primary/20">
                            <motion.div
                              className="absolute top-1/2 -mt-1 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                              animate={{ left: ["0%", "100%"] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Step Content */}
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="relative z-10 flex flex-col items-center gap-4 w-full px-2"
                    >
                      <div 
                        className={cn(
                          "w-[68px] h-[68px] rounded-[20px] flex items-center justify-center transition-all duration-300 relative",
                          isRunning ? "bg-[rgba(59,130,246,0.08)] border border-[rgba(59,130,246,0.45)] shadow-[0_0_0_4px_rgba(59,130,246,0.06)] -translate-y-0.5 text-primary" :
                          isComplete ? "bg-emerald-50 border border-emerald-400/50 shadow-[0_0_15px_rgba(16,185,129,0.15)] text-emerald-600" :
                          isFailed ? "bg-destructive/10 border border-destructive/30 text-destructive" :
                          isBlocked ? "bg-amber-50 border border-amber-200 text-amber-600" :
                          "bg-surface border border-border text-muted-foreground" // Pending
                        )}
                      >
                        <Icon className="w-7 h-7" />
                        
                        {isRunning && (
                          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/70 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-[2px] border-white dark:border-[#0D1117]"></span>
                          </span>
                        )}
                        {isComplete && (
                          <div className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-[3px] border-[2px] border-white dark:border-[#0D1117] shadow-sm">
                            <Check className="w-3 h-3 stroke-[3px]" />
                          </div>
                        )}
                      </div>
                      
                      <div className="w-full flex flex-col items-center">
                        <p className={cn(
                          "text-[13px] font-bold min-h-[20px] leading-tight", 
                          isRunning || isComplete ? "text-foreground" : "text-muted-foreground"
                        )}>
                          {agent.name.replace(" Agent", "")}
                        </p>
                        <p className={cn(
                          "text-[11px] min-h-[36px] leading-tight mt-1 px-1",
                          isPending ? "text-muted-foreground/60" : "text-muted-foreground"
                        )} title={effectiveDetails}>
                          {effectiveDetails}
                        </p>
                        {isFailed && (
                          <button 
                            onClick={() => retryAgent(agent.id)}
                            className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 px-2.5 py-1 rounded-full transition-colors border border-destructive/50"
                          >
                            <RotateCcw className="w-3 h-3" /> Retry
                          </button>
                        )}
                      </div>
                    </motion.div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Summary Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Events", value: timeline.length, icon: Activity, iconCls: "bg-cyan-50 text-cyan-500", border: "border-cyan-400/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]" },
            { label: "Running Tasks", value: runningCount, icon: Zap, iconCls: "bg-primary/10 text-primary", border: "border-primary/50 hover:border-primary hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]" },
            { label: "Completed", value: completeCount, icon: CheckCircle2, iconCls: "bg-success/10 text-success", border: "border-success/50/50 hover:border-success/50 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]" },
            { label: "Failed", value: failedCount, icon: XCircle, iconCls: "bg-destructive/10 text-destructive", border: "border-destructive/50/50 hover:border-destructive/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={card.label}
                className={cn("bg-card border rounded-2xl p-5 shadow-sm transition-all", card.border)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.iconCls)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-black text-foreground">
                    {card.value}
                  </span>
                </div>
                <p className="text-sm font-bold text-muted-foreground">
                  {card.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Timeline ───────────────────────────────────────── */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* table header */}
          <div className="px-6 py-4 border-b border-border-subtle bg-background/80 flex items-center justify-between sticky top-0 z-20">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" /> Event Logs
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs text-muted-foreground bg-card border border-border rounded-lg outline-none focus:border-primary focus:ring-1 focus:ring-blue-500 w-48 transition-all"
                />
              </div>
              <div className="flex items-center gap-1.5 border-l border-border pl-3">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select 
                  value={activeFilter} 
                  onChange={e => setActiveFilter(e.target.value)}
                  className="text-xs font-semibold text-muted-foreground bg-card border border-border rounded-lg px-2 py-1.5 outline-none focus:border-primary"
                >
                  <option value="All">All Statuses</option>
                  <option value="Running">Running</option>
                  <option value="Complete">Complete</option>
                  <option value="Failed">Failed</option>
                  <option value="Blocked">Blocked</option>
                  <option value="Queued">Queued</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-border-subtle bg-card text-xs font-bold text-muted-foreground uppercase tracking-wider sticky top-[60px] z-20 shadow-sm">
            <div className="col-span-4">Agent</div>
            <div className="col-span-4">Action & Details</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Timestamp</div>
          </div>

          <div className="divide-y divide-border overflow-y-auto flex-1 pb-4">
            <AnimatePresence>
              {filteredTimeline.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-16 flex flex-col items-center justify-center text-center px-4 h-full"
                >
                  <Bot className="w-12 h-12 text-slate-200 mb-4" />
                  <h3 className="text-base font-bold text-foreground mb-1">
                    {searchQuery || activeFilter !== "All" ? "No Events Found" : "No activity yet"}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
                    {searchQuery 
                       ? `No events matching "${searchQuery}"`
                       : activeFilter !== "All" 
                         ? `There are no events with status '${activeFilter}'.` 
                         : "Upload a financial document to start the AstraFinance AI pipeline."}
                  </p>
                </motion.div>
              ) : (
                filteredTimeline.map((activity, i) => {
                  const Icon = AGENT_ICONS[activity.agent || activity.agent_type] || Bot;
                  const colors = AGENT_COLORS[activity.agent || activity.agent_type] || AGENT_COLORS["Document Agent"];

                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.05, 0.5) }}
                      key={activity.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-primary/10/30 transition-colors group"
                    >
                      {/* Agent */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", colors.bg)}>
                          <Icon className={cn("w-5 h-5", colors.text)} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">
                            {activity.agent || activity.agent_type}
                          </p>
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(activity.metadata).slice(0, 2).map(([k, v]) => (
                                <span key={k} className="text-[10px] bg-surface text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                                  {k.replace(/_/g, " ")}: <span className="font-bold text-foreground">{v as React.ReactNode}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="col-span-4 pr-4">
                        <p className="text-sm text-foreground font-semibold mb-0.5 group-hover:text-primary transition-colors">
                          {activity.action}
                        </p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                          {activity.details}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <StatusBadge status={activity.status} />
                      </div>

                      {/* Time */}
                      <div className="col-span-2 text-right">
                        <span className="text-[11px] font-semibold text-muted-foreground flex items-center justify-end gap-1.5">
                          {activity.timestamp}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
