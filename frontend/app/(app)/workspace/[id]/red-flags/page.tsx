"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ShieldAlert,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  Info,
  CheckCircle2,
  Filter,
  TriangleAlert,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";

/* ── types ──────────────────────────────────────────────────────────── */
interface RedFlag {
  id: string;
  severity: "High" | "Medium" | "Low";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  source_doc: string;
  source_page: number;
  detected_at: string;
}
interface FlagsData {
  total_flags: number;
  last_analyzed: string;
  flags: RedFlag[];
}

/* ── severity config ────────────────────────────────────────────────── */
const SEV: Record<
  string,
  {
    color: string;
    bg: string;
    border: string;
    barColor: string;
    icon: React.ElementType;
    label: string;
  }
> = {
  High: {
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    barColor: "bg-red-500",
    icon: AlertTriangle,
    label: "High Risk",
  },
  Medium: {
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    barColor: "bg-orange-500",
    icon: TriangleAlert,
    label: "Medium Risk",
  },
  Low: {
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    barColor: "bg-amber-400",
    icon: ShieldAlert,
    label: "Low Risk",
  },
};

/* ── Page ──────────────────────────────────────────────────────────── */
export default function RedFlagsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [data, setData] = useState<FlagsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
    fetcher<FlagsData>(`/workspaces/${workspaceId}/red-flags`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Analyzing risks…
      </div>
    );
  if (!data)
    return (
      <div className="flex-1 text-center text-slate-400 py-24">
        Failed to load risk analysis.
      </div>
    );

  const highCount = data.flags.filter((f) => f.severity === "High").length;
  const medCount = data.flags.filter((f) => f.severity === "Medium").length;
  const lowCount = data.flags.filter((f) => f.severity === "Low").length;

  const filteredFlags =
    activeFilter === "all"
      ? data.flags
      : data.flags.filter((f) => f.severity === activeFilter);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-6 py-6 space-y-6">
        {/* ── Header ───────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Risk Flag Analysis
              </h2>
              <p className="text-xs text-slate-400">
                {data.total_flags} risk factors identified · Last analyzed{" "}
                {data.last_analyzed}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Total:</span>
            <span className="text-lg font-extrabold text-slate-800">
              {data.total_flags}
            </span>
          </div>
        </div>

        {/* ── Severity Summary Cards ──────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { severity: "High", count: highCount, color: "red" },
            { severity: "Medium", count: medCount, color: "orange" },
            { severity: "Low", count: lowCount, color: "amber" },
          ].map((s) => {
            const cfg = SEV[s.severity];
            const Icon = cfg.icon;
            return (
              <button
                key={s.severity}
                onClick={() =>
                  setActiveFilter(
                    activeFilter === s.severity ? "all" : s.severity
                  )
                }
                className={cn(
                  "bg-white border rounded-xl p-4 shadow-sm text-left transition-all hover:shadow-md",
                  activeFilter === s.severity
                    ? cfg.border + " ring-2 ring-current/10"
                    : "border-slate-200"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      cfg.bg
                    )}
                  >
                    <Icon className={cn("w-4.5 h-4.5", cfg.color)} />
                  </div>
                  <span
                    className={cn(
                      "text-2xl font-extrabold",
                      cfg.color
                    )}
                  >
                    {s.count}
                  </span>
                </div>
                <p className={cn("text-xs font-bold", cfg.color)}>
                  {cfg.label}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Severity Distribution Bar ─────────────────────── */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
            Severity Distribution
          </p>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            {highCount > 0 && (
              <div
                className="bg-red-500 rounded-l-full transition-all duration-500"
                style={{
                  width: `${(highCount / data.total_flags) * 100}%`,
                }}
              />
            )}
            {medCount > 0 && (
              <div
                className="bg-orange-400 transition-all duration-500"
                style={{
                  width: `${(medCount / data.total_flags) * 100}%`,
                }}
              />
            )}
            {lowCount > 0 && (
              <div
                className="bg-amber-300 rounded-r-full transition-all duration-500"
                style={{
                  width: `${(lowCount / data.total_flags) * 100}%`,
                }}
              />
            )}
          </div>
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full" />
                <span className="text-slate-500">High ({highCount})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-orange-400 rounded-full" />
                <span className="text-slate-500">Medium ({medCount})</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-amber-300 rounded-full" />
                <span className="text-slate-500">Low ({lowCount})</span>
              </span>
            </div>
            {activeFilter !== "all" && (
              <button
                onClick={() => setActiveFilter("all")}
                className="text-[11px] text-blue-600 font-medium hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        </div>

        {/* ── Risk Cards ───────────────────────────────────── */}
        <div className="space-y-3">
          {filteredFlags.map((flag) => {
            const cfg = SEV[flag.severity] || SEV.Low;
            const Icon = cfg.icon;
            const isOpen = expanded === flag.id;

            return (
              <div
                key={flag.id}
                className={cn(
                  "bg-white rounded-xl overflow-hidden shadow-sm transition-all border-l-4",
                  flag.severity === "High"
                    ? "border-l-red-500 border border-red-100"
                    : flag.severity === "Medium"
                    ? "border-l-orange-500 border border-orange-100"
                    : "border-l-amber-400 border border-amber-100"
                )}
              >
                <button
                  onClick={() => setExpanded(isOpen ? null : flag.id)}
                  className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                      cfg.bg
                    )}
                  >
                    <Icon className={cn("w-5 h-5", cfg.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span
                        className={cn(
                          "text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wide",
                          cfg.color,
                          cfg.bg,
                          cfg.border
                        )}
                      >
                        {flag.severity}
                      </span>
                      <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                        {flag.category}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 leading-snug">
                      {flag.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {flag.detected_at}
                    </p>
                  </div>

                  <div className="shrink-0 mt-1 text-slate-400">
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 pt-0 border-t border-slate-100">
                    <div className="ml-14 space-y-4 mt-4">
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Description
                        </p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {flag.description}
                        </p>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                        <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider mb-1">
                          Recommendation
                        </p>
                        <p className="text-sm text-emerald-800 leading-relaxed">
                          {flag.recommendation}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <FileText className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs text-blue-600 font-medium hover:underline cursor-pointer">
                          {flag.source_doc} — Page {flag.source_page}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Resolved Section ──────────────────────────────── */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-emerald-800">
              Risk Mitigation in Progress
            </h4>
            <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
              All high-severity flags have been flagged for management review.
              The AI will continue monitoring documents for new risk indicators
              and update this analysis automatically.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
