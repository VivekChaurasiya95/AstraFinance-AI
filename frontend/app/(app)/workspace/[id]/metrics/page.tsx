"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  ArrowUpRight,
  ArrowDownRight,
  Globe,
  Loader2,
  BadgeCheck,
  TrendingUp,
  IndianRupee,
  Percent,
  Wallet,
  HandCoins,
  Handshake,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";

/* ── types ─────────────────────────────────────────────────────────────── */
interface Metric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  period: string;
}
interface Segment {
  segment: string;
  value: number;
  revenue: string;
}
interface Quarter {
  quarter: string;
  revenue: number;
  profit: number;
  margin: number;
}
interface Geo {
  region: string;
  percentage: number;
}
interface MetricsData {
  period: string;
  company: string;
  key_metrics: Metric[];
  revenue_breakdown: Segment[];
  quarterly_trend: Quarter[];
  geography_split: Geo[];
}

/* ── colour palette for segments ────────────────────────────────────── */
const SEG_COLORS = [
  "#3B82F6",
  "#8B5CF6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
];

const GEO_COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B"];

/* small icon map matching the screenshot cards */
const METRIC_ICONS: Record<string, React.ElementType> = {
  Revenue: IndianRupee,
  "Net Profit": Wallet,
  "EBIT Margin": Percent,
  EPS: TrendingUp,
  "Free Cash Flow": HandCoins,
  "Deal Wins": Handshake,
};

/* ── SVG Donut ─────────────────────────────────────────────────────────── */
function DonutChart({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 200 200" className="w-full max-w-[200px] mx-auto">
      {segments.map((seg, i) => {
        const pct = seg.value / total;
        const dash = circumference * pct;
        const gap = circumference - dash;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={seg.segment}
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={SEG_COLORS[i % SEG_COLORS.length]}
            strokeWidth="28"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="butt"
            transform="rotate(-90 100 100)"
            className="transition-all duration-700"
          />
        );
      })}
      {/* center text */}
      <text
        x="100"
        y="94"
        textAnchor="middle"
        className="fill-slate-800 text-lg font-bold"
        fontSize="22"
        fontWeight="700"
      >
        100%
      </text>
      <text
        x="100"
        y="114"
        textAnchor="middle"
        className="fill-slate-400"
        fontSize="11"
      >
        Total Revenue
      </text>
    </svg>
  );
}

/* ── Circular Gauge ─────────────────────────────────────────────────── */
function CircularGauge({ value, label }: { value: number; label: string }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const pct = value / 100;
  const dash = circumference * pct;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 100" className="w-24 h-24">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#E2E8F0"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#3B82F6"
          strokeWidth="8"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
        <text
          x="50"
          y="52"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="700"
          className="fill-slate-800"
        >
          {value}%
        </text>
      </svg>
      <span className="text-xs font-semibold text-slate-500 mt-1">
        {label}
      </span>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────────── */
export default function MetricsPage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher<MetricsData>(`/workspaces/${workspaceId}/metrics`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading)
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading metrics…
      </div>
    );
  const hasData = data.quarterly_trend.length > 0 && data.key_metrics.length > 0 
    && data.key_metrics[0].label !== "Data";

  if (!hasData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
          <TrendingUp className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No Metrics Available Yet</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Upload financial documents to this workspace and our AI agents will automatically 
          extract key metrics, revenue breakdowns, and quarterly trends.
        </p>
      </div>
    );
  }

  const maxRev = Math.max(...data.quarterly_trend.map((q) => q.revenue));
  const latestQuarter = data.quarterly_trend[data.quarterly_trend.length - 1];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1160px] mx-auto px-6 py-6 space-y-6">
        {/* ── Company Header ────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow">
              {data.company.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {data.company} Limited
                </h2>
                <BadgeCheck className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-xs text-slate-400">{data.period}</p>
            </div>
          </div>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1">
            <Info className="w-3.5 h-3.5" /> AI Extracted
          </span>
        </div>

        {/* ── Key Metric Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data.key_metrics.map((m) => {
            const Icon = METRIC_ICONS[m.label] || TrendingUp;
            return (
              <div
                key={m.label}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-1"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    {m.label}
                  </span>
                  <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-500 flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                <p className="text-xl font-extrabold text-slate-900 leading-none">
                  {m.value}
                </p>
                <div
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-semibold mt-0.5",
                    m.trend === "up" ? "text-emerald-600" : "text-red-500"
                  )}
                >
                  {m.trend === "up" ? (
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  ) : (
                    <ArrowDownRight className="w-3.5 h-3.5" />
                  )}
                  {m.change}{" "}
                  <span className="text-slate-400 font-normal ml-0.5">
                    {m.period}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Two-column: Donut + Margin | Geography + Quarterly ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* Revenue by Segment */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4">
                Revenue by Segment
              </h4>
              <div className="flex items-start gap-6">
                <DonutChart segments={data.revenue_breakdown} />
                <div className="flex-1 space-y-2.5 pt-2">
                  {data.revenue_breakdown.map((seg, i) => (
                    <div key={seg.segment} className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{
                          backgroundColor:
                            SEG_COLORS[i % SEG_COLORS.length],
                        }}
                      />
                      <span className="text-xs text-slate-600 flex-1 truncate">
                        {seg.segment}
                      </span>
                      <span className="text-xs font-bold text-slate-700">
                        {seg.value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Operating Margin Gauge */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-around">
              <CircularGauge
                value={data.quarterly_trend[data.quarterly_trend.length - 1].margin}
                label="Operating Margin"
              />
              <div className="space-y-2">
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                    Latest Quarter
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    {data.quarterly_trend[data.quarterly_trend.length - 1].quarter}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                    Profit
                  </p>
                  <p className="text-sm font-bold text-slate-800">
                    ₹{data.quarterly_trend[data.quarterly_trend.length - 1].profit.toLocaleString()} Cr
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">
            {/* Geography Split */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-slate-400" />
                Geography Split
              </h4>
              <div className="space-y-4">
                {data.geography_split.map((geo, idx) => (
                  <div key={geo.region}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              GEO_COLORS[idx % GEO_COLORS.length],
                          }}
                        />
                        <span className="text-sm text-slate-700 font-medium">
                          {geo.region}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {geo.percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${geo.percentage}%`,
                          backgroundColor:
                            GEO_COLORS[idx % GEO_COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quarterly Revenue Trend */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                Quarterly Revenue Trend
              </h4>
              <div className="flex items-end gap-3 h-40 pt-4">
                {data.quarterly_trend.map((q, i) => {
                  const hPct = (q.revenue / maxRev) * 100;
                  const isLatest =
                    i === data.quarterly_trend.length - 1;
                  return (
                    <div
                      key={q.quarter}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-[10px] font-semibold text-slate-500">
                        {(q.revenue / 1000).toFixed(1)}K
                      </span>
                      <div
                        className="w-full relative flex items-end"
                        style={{ height: "100px" }}
                      >
                        <div
                          className={cn(
                            "w-full rounded-t-lg transition-all duration-500",
                            isLatest
                              ? "bg-emerald-500"
                              : "bg-blue-500"
                          )}
                          style={{ height: `${hPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 text-center whitespace-nowrap">
                        {q.quarter}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
