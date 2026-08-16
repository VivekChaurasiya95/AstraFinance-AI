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
  "Document Agent":   { bg: "bg-blue-100",    text: "text-blue-600",    ring: "ring-blue-200" },
  "Extraction Agent": { bg: "bg-teal-100",    text: "text-teal-600",    ring: "ring-teal-200" },
  "Red Flag Agent":   { bg: "bg-orange-100",  text: "text-orange-600",  ring: "ring-orange-200" },
  "Comparison Agent": { bg: "bg-violet-100",  text: "text-violet-600",  ring: "ring-violet-200" },
  "Research Agent":   { bg: "bg-sky-100",     text: "text-sky-600",     ring: "ring-sky-200" },
  "Report Agent":     { bg: "bg-red-100",     text: "text-red-600",     ring: "ring-red-200" },
};

/* ── status badge ────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: any; cls: string; label: string }> = {
    Complete: { icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Complete" },
    Running:  { icon: Loader2,      cls: "text-blue-700 bg-blue-50 border-blue-200",          label: "Running" },
    Failed:   { icon: XCircle,      cls: "text-red-700 bg-red-50 border-red-200",            label: "Failed" },
    Blocked:  { icon: ShieldAlert,  cls: "text-amber-700 bg-amber-50 border-amber-200",      label: "Blocked" },
    Idle:     { icon: Timer,        cls: "text-slate-500 bg-slate-100 border-slate-200",     label: "Idle" },
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

  if (loading && !timeline.length && !agents.length)
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" /> 
        <p className="font-medium text-slate-600">Loading orchestration state...</p>
      </div>
    );

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
    <div className="flex-1 overflow-y-auto bg-slate-50/50">
      <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Agent Orchestration
                </h2>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Live Sync</span>
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-1">
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
                  ? "text-blue-600 bg-blue-50 border-blue-200 cursor-wait" 
                  : "text-slate-700 hover:text-blue-600 border-slate-200 hover:bg-white bg-white/50 hover:shadow"
              )}
            >
              <RotateCcw className={cn("w-4 h-4", isRefreshing && "animate-spin text-blue-600")} />
              {isRefreshing ? "Synchronizing..." : "Refresh Status"}
            </button>
            {error && (
              <span className="text-[11px] text-red-600 font-medium bg-red-50 border border-red-100 px-2 py-1 rounded-lg mt-1">{error}</span>
            )}
          </div>
        </div>

        {/* ── Pipeline Visualization ──────────────────────────────────── */}
        <div className="bg-white border border-cyan-400/50 rounded-2xl p-6 shadow-[0_0_15px_rgba(34,211,238,0.15)]">
          <h3 className="text-sm font-bold text-blue-950 mb-6 flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-500" /> Execution Pipeline
          </h3>
          <div className="flex items-start justify-between gap-0 relative pt-2">
            {agents.map((agent, index) => {
              const Icon = AGENT_ICONS[agent.name] || Bot;
              const colors = AGENT_COLORS[agent.name] || { bg: "bg-slate-100", text: "text-slate-600", ring: "ring-slate-200" };
              const isRunning = agent.status === "Running";
              const isComplete = agent.status === "Complete";
              const isFailed = agent.status === "Failed";
              const isBlocked = agent.status === "Blocked";

              return (
                <div key={agent.id} className="flex-1 flex items-center relative">
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative z-10 flex flex-col items-center gap-3 w-[100px] shrink-0"
                  >
                    <div 
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm relative",
                        isRunning ? cn(colors.bg, "ring-4 ring-offset-2", colors.ring) :
                        isComplete ? "bg-emerald-100 text-emerald-600 ring-2 ring-emerald-200 ring-offset-2" :
                        isFailed ? "bg-red-100 text-red-600 ring-2 ring-red-200 ring-offset-2" :
                        isBlocked ? "bg-amber-100 text-amber-600 border border-amber-200" :
                        "bg-slate-50 border border-slate-200 text-slate-400 grayscale"
                      )}
                    >
                      <Icon className={cn("w-5 h-5", isComplete ? "text-emerald-600" : isFailed ? "text-red-600" : isBlocked ? "text-amber-600" : isRunning ? colors.text : "text-slate-400")} />
                      
                      {isRunning && (
                        <span className="absolute -top-1 -right-1 flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500 border-2 border-white"></span>
                        </span>
                      )}
                      {isComplete && (
                        <div className="absolute -top-1 -right-1 bg-emerald-500 text-white rounded-full p-0.5 border-2 border-white">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center w-full">
                      <p className={cn("text-[11px] font-bold truncate px-1", isRunning || isComplete ? "text-blue-950" : "text-slate-500")}>
                        {agent.name.replace(" Agent", "")}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5 px-1" title={agent.details}>
                        {agent.details}
                      </p>
                      {isFailed && (
                        <button 
                          onClick={() => retryAgent(agent.id)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded-full transition-colors border border-red-200"
                        >
                          <RotateCcw className="w-3 h-3" /> Retry
                        </button>
                      )}
                    </div>
                  </motion.div>

                  {/* Connector line */}
                  {index < agents.length - 1 && (
                    <div className="flex-1 h-0.5 bg-slate-100 relative -mt-10 -ml-4 -mr-4 z-0">
                      {isComplete && (
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: "100%" }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 bg-emerald-400"
                        />
                      )}
                      {isRunning && (
                        <motion.div
                          className="absolute top-1/2 -mt-1 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                          animate={{ left: ["0%", "100%", "0%"] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Summary Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Events", value: timeline.length, icon: Activity, iconCls: "bg-cyan-50 text-cyan-500", border: "border-cyan-400/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]" },
            { label: "Running Tasks", value: runningCount, icon: Zap, iconCls: "bg-blue-50 text-blue-500", border: "border-blue-400/50 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(59,130,246,0.25)]" },
            { label: "Completed", value: completeCount, icon: CheckCircle2, iconCls: "bg-emerald-50 text-emerald-500", border: "border-emerald-400/50 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.25)]" },
            { label: "Failed", value: failedCount, icon: XCircle, iconCls: "bg-red-50 text-red-500", border: "border-red-400/50 hover:border-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.25)]" },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                key={card.label}
                className={cn("bg-white border rounded-2xl p-5 shadow-sm transition-all", card.border)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", card.iconCls)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-3xl font-black text-blue-950">
                    {card.value}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-500">
                  {card.label}
                </p>
              </motion.div>
            );
          })}
        </div>

        {/* ── Timeline ───────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          {/* table header */}
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between sticky top-0 z-20">
            <h3 className="text-sm font-bold text-blue-950 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" /> Event Logs
            </h3>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs text-slate-600 bg-white border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-48 transition-all"
                />
              </div>
              <div className="flex items-center gap-1.5 border-l border-slate-200 pl-3">
                <Filter className="w-4 h-4 text-slate-400" />
                <select 
                  value={activeFilter} 
                  onChange={e => setActiveFilter(e.target.value)}
                  className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 outline-none focus:border-blue-500"
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

          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-white text-xs font-bold text-slate-400 uppercase tracking-wider sticky top-[60px] z-20 shadow-sm">
            <div className="col-span-4">Agent</div>
            <div className="col-span-4">Action & Details</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2 text-right">Timestamp</div>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1 pb-4">
            <AnimatePresence>
              {filteredTimeline.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="py-16 flex flex-col items-center justify-center text-center px-4 h-full"
                >
                  <Bot className="w-12 h-12 text-slate-200 mb-4" />
                  <h3 className="text-base font-bold text-slate-700 mb-1">
                    {searchQuery || activeFilter !== "All" ? "No Events Found" : "No activity yet"}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
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
                      className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-blue-50/30 transition-colors group"
                    >
                      {/* Agent */}
                      <div className="col-span-4 flex items-center gap-3">
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", colors.bg)}>
                          <Icon className={cn("w-5 h-5", colors.text)} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-950">
                            {activity.agent || activity.agent_type}
                          </p>
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(activity.metadata).slice(0, 2).map(([k, v]) => (
                                <span key={k} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-medium">
                                  {k.replace(/_/g, " ")}: <span className="font-bold text-slate-700">{v as React.ReactNode}</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action */}
                      <div className="col-span-4 pr-4">
                        <p className="text-sm text-blue-950 font-semibold mb-0.5 group-hover:text-blue-700 transition-colors">
                          {activity.action}
                        </p>
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                          {activity.details}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="col-span-2">
                        <StatusBadge status={activity.status} />
                      </div>

                      {/* Time */}
                      <div className="col-span-2 text-right">
                        <span className="text-[11px] font-semibold text-slate-500 flex items-center justify-end gap-1.5">
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
