"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  BarChart3,
  ChevronDown,
  Check,
  FileText,
  Building2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { FinancialHeroParticles } from "@/components/ui/FinancialHeroParticles";
import {
  DonutChart,
  QuarterlyTrendChart,
  GeographySplitChart,
  KeyMetricsBarChart,
  CircularGauge,
  KeyMetricsRadarChart
} from "@/components/ui/PremiumCharts";

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
  value: number | string;
  revenue: string;
}
interface Quarter {
  quarter: string;
  revenue: number | string;
  profit: number | string;
  margin: number | string;
}
interface Geo {
  region: string;
  percentage: number | string;
}
interface MetricsData {
  status?: string;
  period?: string;
  company?: string;
  key_metrics?: Metric[];
  revenue_breakdown?: Segment[];
  quarterly_trend?: Quarter[];
  geography_split?: Geo[];
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
const METRIC_ICONS: Record<string, any> = {
  Revenue: IndianRupee,
  "Net Profit": Wallet,
  "EBIT Margin": Percent,
  EPS: TrendingUp,
  "Free Cash Flow": HandCoins,
  "Deal Wins": Handshake,
};

const parseNumber = (val: string | number | undefined | null): number => {
  if (val === undefined || val === null) return NaN;
  if (typeof val === 'number') return val;
  const match = val.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
  return match ? parseFloat(match[0]) : NaN;
};



/* ── Types ─────────────────────────────────────────────────────────────── */
interface Document {
  id: string;
  name: string;
  status: "pending" | "processing" | "ready" | "failed";
  uploaded_at: string;
}

export default function MetricsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedDocumentId = searchParams.get("documentId");

  const [data, setData] = useState<MetricsData & { filename?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch available documents
  useEffect(() => {
    fetcher<{ documents: Document[] }>(`/workspaces/${workspaceId}/documents`)
      .then((res) => setDocuments(res.documents || []))
      .catch(console.error)
      .finally(() => setDocsLoading(false));
  }, [workspaceId]);

  // Fetch metrics when selectedDocumentId changes
  useEffect(() => {
    setLoading(true);
    const url = selectedDocumentId 
      ? `/workspaces/${workspaceId}/metrics?document_id=${selectedDocumentId}`
      : `/workspaces/${workspaceId}/metrics`;
      
    fetcher<MetricsData & { filename?: string }>(url)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId, selectedDocumentId]);

  const handleSelectDocument = (docId: string) => {
    setDropdownOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("documentId", docId);
    router.push(`?${params.toString()}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ready":
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Ready</span>;
      case "processing":
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Processing</span>;
      case "failed":
        return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">Failed</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  if (loading || docsLoading)
    return (
      <div className="flex-1 flex items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading metrics…
      </div>
    );

  // Identify currently displayed document name
  // Either from selected document in list, or from backend's 'filename', or fallback to 'Company'
  const selectedDoc = (documents || []).find(d => d.id === selectedDocumentId);
  const displayTitle = selectedDoc?.name || data?.filename || data?.company || "Financial Document";
  const displayCompany = data?.company || "Company";

  // Check if we should render empty states
  let emptyState = null;
  if (data?.status === "running") {
    emptyState = (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-6" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Metrics extraction is in progress</h2>
        <p className="text-sm text-slate-500 max-w-md">
          The Extraction Agent is currently analyzing your document. This may take a moment.
        </p>
      </div>
    );
  } else if (data?.status === "failed") {
    emptyState = (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mb-6">
          <Info className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Extraction Failed</h2>
        <p className="text-sm text-slate-500 max-w-md">
          Metrics could not be extracted because the Extraction Agent failed. You can retry it from the Agent Status sidebar.
        </p>
      </div>
    );
  } else if (!data || data.status !== "complete" || !data.key_metrics || data.key_metrics.length === 0 || data.key_metrics[0].label === "Data") {
    emptyState = (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-center px-6">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mb-6">
          <TrendingUp className="w-10 h-10 text-blue-400" />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">No supported financial metrics were found</h2>
        <p className="text-sm text-slate-500 max-w-md">
          {selectedDocumentId 
            ? "This document does not contain supported metrics, or extraction has not been completed."
            : "Upload supported financial documents (such as 10-K, 10-Q, or Earnings Reports) for our AI agents to automatically extract key metrics."}
        </p>
      </div>
    );
  }

  const maxRev = data?.quarterly_trend && data.quarterly_trend.length > 0 && data.quarterly_trend[0].quarter != null
    ? Math.max(...data.quarterly_trend.map((q) => parseNumber(q.revenue) || 0))
    : 0;
  const latestQuarter = data?.quarterly_trend && data.quarterly_trend.length > 0 && data.quarterly_trend[0].quarter != null
    ? data.quarterly_trend[data.quarterly_trend.length - 1]
    : null;

  return (
    <div className="flex-1 overflow-y-auto relative">
      <FinancialHeroParticles />
      <div className="max-w-[1160px] mx-auto px-6 py-6 space-y-6 relative z-10">
        {/* ── Document Selection Header ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg font-bold shadow shrink-0">
              {displayCompany.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 line-clamp-1">
                  {displayCompany} {data?.company && "Limited"}
                </h2>
                {data?.status === "complete" && <BadgeCheck className="w-5 h-5 text-blue-500 shrink-0" />}
              </div>
              <p className="text-xs text-slate-400">
                {data?.period || "Metrics Dashboard"}
              </p>
            </div>
          </div>
          
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="group flex items-center gap-3 px-2.5 py-2.5 bg-white border border-slate-200 hover:border-blue-300 hover:shadow-sm hover:shadow-blue-100/50 rounded-xl text-sm font-medium transition-all min-w-[260px] max-w-sm w-full outline-none focus:ring-4 focus:ring-blue-500/10"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-50/80 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 group-hover:text-blue-700 transition-colors">
                <FileText className="w-4 h-4" />
              </div>
              <div className="flex flex-col items-start flex-1 min-w-0 gap-0.5">
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 leading-none">
                  Source Document
                </span>
                <span className="truncate w-full text-left font-semibold text-slate-800 leading-none">
                  {displayTitle}
                </span>
              </div>
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 ml-1 group-hover:bg-blue-50 transition-colors">
                <ChevronDown className={cn("w-4 h-4 text-slate-500 group-hover:text-blue-600 transition-transform duration-200", dropdownOpen && "rotate-180")} />
              </div>
            </button>

            <AnimatePresence>
              {dropdownOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0.35, duration: 0.5 }}
                  className="absolute right-0 top-full mt-2 w-full sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[300px]"
                >
                  <div className="p-3 border-b border-slate-100 bg-slate-50/50">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Document</h3>
                  </div>
                  <div className="overflow-y-auto flex-1 p-1">
                    {documents.length === 0 ? (
                      <div className="p-4 text-center text-sm text-slate-500">No documents available</div>
                    ) : (
                      documents.map((doc) => {
                        const isSelected = selectedDocumentId === doc.id || (!selectedDocumentId && displayTitle === doc.name);
                        return (
                          <button
                            key={doc.id}
                            onClick={() => handleSelectDocument(doc.id)}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3 transition-colors",
                              isSelected ? "bg-blue-50" : "hover:bg-slate-50"
                            )}
                          >
                            <div className={cn("mt-0.5 shrink-0 w-4", isSelected ? "text-blue-600" : "text-transparent")}>
                              <Check className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className={cn("text-sm font-medium truncate", isSelected ? "text-blue-900" : "text-slate-700")}>
                                  {doc.name}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(doc.status)}
                                <span className="text-[10px] text-slate-400">
                                  {doc.uploaded_at}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {emptyState ? (
          emptyState
        ) : (
          <>

        {/* ── Key Metric Cards ──────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {data?.key_metrics?.map((m, i) => {
            const Icon = METRIC_ICONS[m.label] || TrendingUp;
            
            // Premium muted colors based on category
            const l = m.label.toLowerCase();
            let theme = { bg: "bg-slate-50/50", text: "text-slate-600", iconBg: "bg-slate-100", iconColor: "text-slate-500", border: "border-slate-200/60" };
            
            if (l.includes("revenue") || l.includes("cash") || l.includes("growth") || l.includes("sales")) {
              theme = { bg: "bg-emerald-50/30", text: "text-emerald-700", iconBg: "bg-emerald-100/50", iconColor: "text-emerald-600", border: "border-emerald-100/50" };
            } else if (l.includes("profit") || l.includes("margin") || l.includes("ebitda")) {
              theme = { bg: "bg-blue-50/30", text: "text-blue-700", iconBg: "bg-blue-100/50", iconColor: "text-blue-600", border: "border-blue-100/50" };
            } else if (l.includes("debt") || l.includes("equity") || l.includes("liability")) {
              theme = { bg: "bg-orange-50/30", text: "text-orange-700", iconBg: "bg-orange-100/50", iconColor: "text-orange-600", border: "border-orange-100/50" };
            } else if (l.includes("roe") || l.includes("eps") || l.includes("return")) {
              theme = { bg: "bg-indigo-50/30", text: "text-indigo-700", iconBg: "bg-indigo-100/50", iconColor: "text-indigo-600", border: "border-indigo-100/50" };
            }

            return (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                key={m.label}
                className={cn(
                  "relative overflow-hidden bg-white rounded-[16px] p-4 border shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] hover:shadow-[0_8px_30px_-4px_rgba(6,81,237,0.1)] transition-shadow duration-300 group flex flex-col justify-between min-h-[110px]",
                  theme.border
                )}
              >
                {/* Subtle top-right ambient light */}
                <div className={cn("absolute -top-10 -right-10 w-24 h-24 rounded-full blur-2xl opacity-40 transition-opacity group-hover:opacity-70", theme.bg)} />
                
                <div className="flex items-start justify-between relative z-10 mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest max-w-[70%] leading-tight">
                    {m.label}
                  </span>
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", theme.iconBg, theme.iconColor)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                </div>
                
                <div className="relative z-10 mt-auto">
                  <p className="text-xl font-bold text-slate-900 tracking-tight">
                    {(() => {
                      const num = parseNumber(m.value);
                      if (isNaN(num)) return m.value;
                      
                      let prefix = "";
                      let suffix = "";
                      if (typeof m.value === 'string') {
                        if (m.value.startsWith('₹')) prefix = '₹';
                        else if (m.value.startsWith('$')) prefix = '$';
                        
                        if (m.value.endsWith('%')) suffix = '%';
                        else if (m.value.endsWith('x')) suffix = 'x';
                        else if (m.value.endsWith('M')) suffix = 'M';
                        else if (m.value.endsWith('B')) suffix = 'B';
                        else if (m.value.endsWith('K') || m.value.endsWith('k')) suffix = m.value.slice(-1);
                        else if (m.value.toLowerCase().includes('cr')) suffix = ' Cr';
                      }
                      
                      return <AnimatedNumber value={num} prefix={prefix} suffix={suffix} decimals={num % 1 !== 0 ? 1 : 0} />;
                    })()}
                  </p>
                  
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={cn(
                      "flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                      m.trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {m.trend === "up" ? (
                        <ArrowUpRight className="w-3 h-3" strokeWidth={2.5} />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" strokeWidth={2.5} />
                      )}
                      <span>{m.change}</span>
                    </div>
                    <span className="text-slate-400 font-medium text-[10px] tracking-wide uppercase">
                      {m.period}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── Two-column: Donut + Margin | Geography + Quarterly ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* LEFT COLUMN */}
          <div className="space-y-5">
            {/* Revenue by Segment */}
            {data?.revenue_breakdown && data?.revenue_breakdown.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-4">
                  Revenue by Segment
                </h4>
                <div className="flex items-start gap-6">
                  <DonutChart segments={data.revenue_breakdown} />
                  <div className="flex-1 space-y-2.5 pt-2">
                    {data.revenue_breakdown.map((seg, i) => {
                      const numVal = parseNumber(seg.value);
                      return (
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
                          {isNaN(numVal) ? seg.value : `${numVal}%`}
                        </span>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            )}

            {/* Operating Margin Gauge */}
            {latestQuarter && latestQuarter.margin != null && !isNaN(parseNumber(latestQuarter.margin)) && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center justify-around">
                <CircularGauge
                  value={latestQuarter.margin}
                  label="Operating Margin"
                />
                <div className="space-y-2">
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Latest Quarter
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {latestQuarter.quarter || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wider font-bold">
                      Profit
                    </p>
                    <p className="text-sm font-bold text-slate-800">
                      {latestQuarter.profit != null
                        ? `₹${parseNumber(latestQuarter.profit).toLocaleString()} Cr`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-5">
            {/* Geography Split */}
            {data?.geography_split && data?.geography_split.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-slate-400" />
                  Geography Split
                </h4>
                <GeographySplitChart splitData={data.geography_split} />
              </div>
            )}

            {/* Quarterly Revenue Trend */}
            {data?.quarterly_trend && data?.quarterly_trend.length > 0 && data?.quarterly_trend[0].quarter != null && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Quarterly Revenue Trend
                </h4>
                <QuarterlyTrendChart trendData={data.quarterly_trend} />
              </div>
            )}
          </div>
        </div>

        {/* ── Additional Visualizations ──────────────────────────── */}
        {data?.key_metrics && data?.key_metrics.filter(m => !isNaN(parseNumber(m.value)) && parseNumber(m.value) > 0).length >= 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-slate-400" />
                Key Metrics Overview
              </h4>
              <KeyMetricsRadarChart metrics={data.key_metrics} />
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-slate-400" />
                Key Metrics Distribution (Log Scale)
              </h4>
              <KeyMetricsBarChart metrics={data.key_metrics} />
            </div>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}
