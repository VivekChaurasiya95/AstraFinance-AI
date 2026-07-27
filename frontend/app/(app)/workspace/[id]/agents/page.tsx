"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";

/* ── types ──────────────────────────────────────────────────────────── */
interface AgentActivity {
  id: string;
  agent?: string;
  agent_name?: string;
  agent_type: string;
  status: "Complete" | "Running" | "Idle" | "Failed";
  action: string;
  details: string;
  timestamp: string;
  duration: string;
  metadata: Record<string, string | number>;
}

/* ── agent colour / icon maps ──────────────────────────────────────── */
const AGENT_ICONS: Record<string, React.ElementType> = {
  document: FileStack,
  extraction: TrendingUp,
  risk: ShieldAlert,
  comparison: GitCompareArrows,
  research: MessageSquare,
  report: FileBarChart2,
};

const AGENT_COLORS: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  document:   { bg: "bg-blue-100",    text: "text-blue-600",    ring: "ring-blue-200" },
  extraction: { bg: "bg-teal-100",    text: "text-teal-600",    ring: "ring-teal-200" },
  risk:       { bg: "bg-orange-100",  text: "text-orange-600",  ring: "ring-orange-200" },
  comparison: { bg: "bg-violet-100",  text: "text-violet-600",  ring: "ring-violet-200" },
  research:   { bg: "bg-sky-100",     text: "text-sky-600",     ring: "ring-sky-200" },
  report:     { bg: "bg-red-100",     text: "text-red-600",     ring: "ring-red-200" },
};

/* ── status badge ────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: AgentActivity["status"] }) {
  const map: Record<string, { icon: React.ElementType; cls: string; label: string }> = {
    Complete: { icon: CheckCircle2, cls: "text-emerald-700 bg-emerald-50 border-emerald-200", label: "Complete" },
    Running:  { icon: Loader2,      cls: "text-blue-700 bg-blue-50 border-blue-200",          label: "Running" },
    Failed:   { icon: XCircle,      cls: "text-red-700 bg-red-50 border-red-200",            label: "Failed" },
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

  const [data, setData] = useState<{ timeline: AgentActivity[] } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    fetcher<typeof data>(`/workspaces/${workspaceId}/agent-activity`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading activity…
      </div>
    );

  const timeline = data?.timeline || [];
  const completeCount = timeline.filter((a) => a.status === "Complete").length;
  const runningCount = timeline.filter((a) => a.status === "Running").length;
  const failedCount = timeline.filter((a) => a.status === "Failed").length;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-6 py-6 space-y-6">
        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Agent Activity Monitor
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Auto-refreshes every 10 seconds
              </p>
            </div>
          </div>

          <button
            onClick={load}
            className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-2 rounded-lg border border-slate-200 hover:bg-blue-50 bg-white shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>

        {/* ── Summary Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Total Agents",
              value: timeline.length,
              icon: Bot,
              iconCls: "bg-slate-100 text-slate-600",
            },
            {
              label: "Running",
              value: runningCount,
              icon: Zap,
              iconCls: "bg-blue-50 text-blue-600",
            },
            {
              label: "Completed",
              value: completeCount,
              icon: CheckCircle2,
              iconCls: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Failed",
              value: failedCount,
              icon: XCircle,
              iconCls: "bg-red-50 text-red-600",
            },
          ].map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.label}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      card.iconCls
                    )}
                  >
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-2xl font-extrabold text-slate-800">
                    {card.value}
                  </span>
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {card.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* ── Timeline ───────────────────────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {/* table header */}
          <div className="grid grid-cols-12 gap-4 px-5 py-3 border-b border-slate-100 bg-slate-50/80 text-xs font-bold text-slate-500 uppercase tracking-wider">
            <div className="col-span-4">Agent</div>
            <div className="col-span-3">Action</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Duration</div>
            <div className="col-span-1 text-right">Time</div>
          </div>

          <div className="divide-y divide-slate-100">
            {timeline.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center px-4">
                <Bot className="w-10 h-10 text-slate-300 mb-3" />
                <h3 className="text-sm font-bold text-slate-700 mb-1">No Agent Activity Yet</h3>
                <p className="text-xs text-slate-500">Upload a document to the workspace to start seeing agent activities.</p>
              </div>
            ) : (
              timeline.map((activity) => {
                const Icon =
                AGENT_ICONS[activity.agent_type] || Bot;
              const colors =
                AGENT_COLORS[activity.agent_type] || AGENT_COLORS.document;

              return (
                <div
                  key={activity.id}
                  className="grid grid-cols-12 gap-4 px-5 py-4 items-center hover:bg-slate-50/60 transition-colors"
                >
                  {/* Agent */}
                  <div className="col-span-4 flex items-center gap-3">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        colors.bg
                      )}
                    >
                      <Icon className={cn("w-5 h-5", colors.text)} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">
                        {activity.agent || activity.agent_name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                        {activity.details}
                      </p>
                    </div>
                  </div>

                  {/* Action */}
                  <div className="col-span-3">
                    <p className="text-sm text-slate-700 font-medium">
                      {activity.action}
                    </p>
                    {/* metadata tags */}
                    {Object.keys(activity.metadata).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {Object.entries(activity.metadata)
                          .slice(0, 3)
                          .map(([k, v]) => (
                            <span
                              key={k}
                              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium"
                            >
                              {k.replace(/_/g, " ")}:{" "}
                              <span className="font-bold">{v}</span>
                            </span>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="col-span-2">
                    <StatusBadge status={activity.status} />
                  </div>

                  {/* Duration */}
                  <div className="col-span-2">
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        activity.status === "Running"
                          ? "text-blue-600"
                          : activity.status === "Failed"
                          ? "text-red-500"
                          : "text-slate-700"
                      )}
                    >
                      {activity.duration}
                    </span>
                  </div>

                  {/* Time */}
                  <div className="col-span-1 text-right">
                    <span className="text-xs text-slate-400 flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      {activity.timestamp}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          </div>
        </div>

      </div>
    </div>
  );
}
