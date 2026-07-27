"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  GitCompareArrows,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Crown,
  Upload,
  X,
  FileText,
  ChevronRight,
  Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL } from "@/lib/api";

interface Peer {
  company: string;
  ticker: string;
  is_base: boolean;
  metrics: Record<string, string | number>;
}
interface ComparisonData {
  base_company: string;
  period: string;
  peers: Peer[];
  ranking: Record<string, Record<string, number>>;
}

const METRIC_ROWS = [
  { key: "revenue",        label: "Revenue",         format: "str" },
  { key: "revenue_growth",  label: "Revenue Growth",  format: "%",    higherBetter: true },
  { key: "net_profit",     label: "Net Profit",      format: "str" },
  { key: "net_margin",     label: "Net Margin",      format: "%",    higherBetter: true },
  { key: "ebit_margin",    label: "EBIT Margin",     format: "%",    higherBetter: true },
  { key: "deal_wins",      label: "Deal Wins",       format: "str" },
  { key: "headcount",      label: "Headcount",       format: "num" },
  { key: "attrition",      label: "Attrition",       format: "%",    higherBetter: false },
  { key: "pe_ratio",       label: "P/E Ratio",       format: "x" },
];

const CHART_METRICS = [
  { key: "revenue_growth", label: "Revenue Growth (%)" },
  { key: "ebit_margin",    label: "EBIT Margin (%)" },
  { key: "net_margin",     label: "Net Margin (%)" },
  { key: "attrition",      label: "Attrition (%)" },
];

const COLORS = [
  { bg: "bg-blue-50",    text: "text-blue-700",    bar: "#3B82F6" },
  { bg: "bg-violet-50",  text: "text-violet-700",  bar: "#8B5CF6" },
  { bg: "bg-orange-50",  text: "text-orange-700",  bar: "#F59E0B" },
  { bg: "bg-emerald-50", text: "text-emerald-700", bar: "#10B981" },
  { bg: "bg-pink-50",    text: "text-pink-700",    bar: "#EC4899" },
  { bg: "bg-cyan-50",    text: "text-cyan-700",    bar: "#06B6D4" },
];

export default function ComparePage() {
  const params = useParams();
  const workspaceId = params.id as string;

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadData = () => {
    setLoading(true);
    fetcher<ComparisonData>(`/workspaces/${workspaceId}/comparison`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const handleUploadStart = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    selectedFiles.forEach((f) => formData.append("files", f));
    try {
      await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/documents`, {
        method: "POST",
        body: formData,
      });
      // Documents uploaded, wait a bit for processing to start, then poll/reload data
      setSelectedFiles([]);
      setShowUpload(false);
      // Wait a little for processing to complete or just refresh and show what's ready
      setTimeout(() => {
        loadData();
        setUploading(false);
      }, 3000);
    } catch (e) {
      console.error("Upload failed", e);
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFiles(Array.from(e.dataTransfer.files).filter(f => f.type === "application/pdf"));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFiles(Array.from(e.target.files).filter(f => f.type === "application/pdf"));
    }
  };

  if (loading || uploading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" /> 
        {uploading ? "Processing documents..." : "Loading comparison..."}
      </div>
    );
  }

  if (!data) return <div className="flex-1 text-center text-slate-400 py-24">Failed to load comparison data.</div>;

  const noPeers = data.peers.length === 0;

  const fmt = (val: string | number | undefined, format: string) => {
    if (val === undefined || val === null || val === "N/A" || val === 0) return "-";
    if (format === "str") return val as string;
    if (format === "%") return `${val}%`;
    if (format === "x") return `${val}x`;
    if (format === "num") return typeof val === "number" ? val.toLocaleString() : val;
    return String(val);
  };

  const bestForMetric = (key: string, higherBetter?: boolean) => {
    if (noPeers || !data.ranking || !data.ranking[key]) return null;
    const rankData = data.ranking[key];
    let bestComp = null;
    let bestRank = 999;
    for (const [comp, rank] of Object.entries(rankData)) {
       if (rank < bestRank) {
           bestRank = rank;
           bestComp = comp;
       }
    }
    const peer = data.peers.find(p => p.company === bestComp);
    return peer ? peer.ticker : null;
  };
  
  const bestCompanyByMetric = (key: string) => {
     if (noPeers || !data.ranking || !data.ranking[key]) return null;
     const rankData = data.ranking[key];
     let bestComp = null;
     let bestRank = 999;
     for (const [comp, rank] of Object.entries(rankData)) {
        if (rank < bestRank) {
            bestRank = rank;
            bestComp = comp;
        }
     }
     const peer = data.peers.find(p => p.company === bestComp);
     if (!peer) return null;
     return { company: peer.company, val: peer.metrics[key] };
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow">
              <GitCompareArrows className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Company Comparison</h2>
              <p className="text-xs text-slate-400">
                Compare multiple company reports seamlessly.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
               onClick={() => setShowUpload(!showUpload)}
               className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
               <Plus className="w-4 h-4" /> Add Company Report
            </button>
          </div>
        </div>

        {/* Upload Section */}
        {showUpload && (
           <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div 
                className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative", dragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50")}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleChange} />
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-blue-600" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1">Upload Annual/Quarterly Reports</h4>
                <p className="text-xs text-slate-500">Only PDF files are supported.</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, i) => (
                     <div key={i} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                           <FileText className="w-4 h-4 text-slate-400" />
                           <p className="text-xs font-medium text-slate-700">{file.name}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, idx) => idx !== i)); }} className="p-1 text-slate-400 hover:text-red-500"><X className="w-4 h-4"/></button>
                     </div>
                  ))}
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => { setSelectedFiles([]); setShowUpload(false); }} className="px-4 py-2 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">Cancel</button>
                    <button onClick={handleUploadStart} className="px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                      Upload & Process <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
           </div>
        )}

        {noPeers ? (
           <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                <GitCompareArrows className="w-6 h-6 text-slate-300" />
              </div>
              <h4 className="text-slate-700 font-semibold mb-1">No comparison data</h4>
              <p className="text-slate-400 text-sm max-w-sm text-center">Add company reports to this workspace to automatically extract metrics and compare them.</p>
           </div>
        ) : (
          <>
            {/* Comparison Table */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80">
                    <th className="text-left py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider min-w-[160px] sticky left-0 bg-slate-50/95 backdrop-blur z-10 border-r border-slate-100">
                      Metric
                    </th>
                    {data.peers.map((p, i) => {
                      const c = COLORS[i % COLORS.length];
                      return (
                        <th
                          key={p.ticker}
                          className={cn(
                            "text-center py-3.5 px-4 font-bold text-sm min-w-[140px]",
                            p.is_base ? "bg-blue-50/60" : ""
                          )}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={cn(
                                "text-[11px] font-extrabold px-2.5 py-0.5 rounded-full",
                                p.is_base
                                  ? "bg-blue-600 text-white"
                                  : `${c.bg} ${c.text}`
                              )}
                            >
                              {p.ticker}
                            </span>
                            <span className={p.is_base ? "text-blue-700 text-xs" : "text-slate-700 text-xs"}>
                              {p.company}
                            </span>
                            {p.is_base && (
                              <span className="text-[10px] text-blue-500 font-normal flex items-center gap-0.5">
                                <Crown className="w-3 h-3" /> Base
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {METRIC_ROWS.map((row) => {
                    const winner = bestForMetric(row.key, row.higherBetter);
                    return (
                      <tr
                        key={row.key}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        <td className="py-3 px-5 text-xs font-semibold text-slate-500 sticky left-0 bg-white/95 backdrop-blur z-10 border-r border-slate-100">
                          {row.label}
                        </td>
                        {data.peers.map((p, i) => {
                          const val = p.metrics[row.key];
                          const display = fmt(val, row.format);
                          const isWinner = p.ticker === winner;
                          return (
                            <td
                              key={p.ticker}
                              className={cn(
                                "py-3 px-4 text-center font-semibold text-sm",
                                p.is_base ? "bg-blue-50/30" : "",
                                isWinner ? "text-emerald-600" : "text-slate-700"
                              )}
                            >
                              <div className="flex items-center justify-center gap-1">
                                {display}
                                {isWinner && (
                                  <Trophy className="w-3 h-3 text-amber-500" />
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Visual Comparison Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {CHART_METRICS.map((cm) => {
                const vals = data.peers.map((p) => ({
                  ticker: p.ticker,
                  value: Number(p.metrics[cm.key]) || 0,
                }));
                const maxVal = Math.max(...vals.map((v) => v.value));
                return (
                  <div
                    key={cm.key}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm"
                  >
                    <h5 className="text-xs font-bold text-slate-600 mb-3">
                      {cm.label}
                    </h5>
                    <div className="flex items-end gap-2 h-28">
                      {vals.map((v, i) => {
                        const c = COLORS[i % COLORS.length];
                        const hPct = maxVal > 0 ? (v.value / maxVal) * 100 : 0;
                        return (
                          <div
                            key={v.ticker}
                            className="flex-1 flex flex-col items-center gap-1"
                          >
                            <span className="text-[10px] font-bold text-slate-600">
                              {v.value}
                            </span>
                            <div className="w-full flex items-end" style={{ height: "72px" }}>
                              <div
                                className="w-full rounded-t-md transition-all duration-500"
                                style={{
                                  height: `${Math.max(5, hPct)}%`,
                                  backgroundColor: c.bar,
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-bold text-slate-400">
                              {v.ticker}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Peer Insights */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" />
                Dynamic Peer Insights
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(() => {
                   const insights = [];
                   const revGrowth = bestCompanyByMetric("revenue_growth");
                   if (revGrowth) insights.push({ label: "Best Revenue Growth", winner: revGrowth.company, val: `${revGrowth.val}%`, icon: ArrowUpRight });
                   const netMargin = bestCompanyByMetric("net_margin");
                   if (netMargin) insights.push({ label: "Best Net Margin", winner: netMargin.company, val: `${netMargin.val}%`, icon: ArrowUpRight });
                   const attrition = bestCompanyByMetric("attrition");
                   if (attrition) insights.push({ label: "Lowest Attrition", winner: attrition.company, val: `${attrition.val}%`, icon: ArrowDownRight });
                   
                   return insights.map((insight) => (
                     <div
                       key={insight.label}
                       className="bg-slate-50 rounded-lg p-3 border border-slate-100"
                     >
                       <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                         {insight.label}
                       </p>
                       <div className="flex items-center gap-2">
                         <span className="text-sm font-bold text-slate-800 truncate" title={insight.winner}>
                           {insight.winner}
                         </span>
                         <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 shrink-0">
                           <insight.icon className="w-3 h-3" />
                           {insight.val}
                         </span>
                       </div>
                     </div>
                   ));
                })()}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
