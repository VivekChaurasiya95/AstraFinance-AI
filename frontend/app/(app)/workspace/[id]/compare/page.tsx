"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Plus,
  Sparkles,
  TrendingUp,
  DollarSign,
  Percent
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL, uploadMultipart } from "@/lib/api";

interface FinancialMetrics {
  company_name: string;
  revenue?: string;
  expenses?: string;
  gross_profit?: string;
  operating_profit?: string;
  ebitda?: string;
  ebit?: string;
  profit_before_tax?: string;
  net_profit?: string;
  eps?: string;
  assets?: string;
  liabilities?: string;
  operating_cash_flow?: string;
  investing_cash_flow?: string;
  financing_cash_flow?: string;
  profit_margin?: string;
  expense_ratio?: string;
  debt_ratio?: string;
  current_ratio?: string;
  debt_to_equity_ratio?: string;
  roe?: string;
  roa?: string;
  roce?: string;
  operating_margin?: string;
  ebitda_margin?: string;
  net_margin?: string;
}

interface BenchmarkResults {
  highest_revenue: string;
  highest_profit: string;
  highest_profit_margin: string;
  lowest_debt: string;
  best_liquidity: string;
  overall_winner: string;
}

interface ComparisonAnalysis {
  revenue_analysis: string;
  profit_analysis: string;
  ratio_analysis: string;
  financial_health_analysis: string;
}

interface ComparisonData {
  status?: string;
  message?: string;
  documents?: string[];
  available_documents?: { id: string; filename: string }[];
  companies_compared: string[];
  financial_metrics: FinancialMetrics[];
  benchmark_results: BenchmarkResults;
  comparison_analysis: ComparisonAnalysis;
  insights: string[];
}

const METRIC_ROWS = [
  { key: "revenue",              label: "Revenue",              format: "str",  higherBetter: true },
  { key: "gross_profit",         label: "Gross Profit",         format: "str",  higherBetter: true },
  { key: "operating_profit",     label: "Operating Profit",     format: "str",  higherBetter: true },
  { key: "ebitda",               label: "EBITDA",               format: "str",  higherBetter: true },
  { key: "net_profit",           label: "Net Profit",           format: "str",  higherBetter: true },
  { key: "profit_margin",        label: "Profit Margin",        format: "%",    higherBetter: true },
  { key: "operating_margin",     label: "Operating Margin",     format: "%",    higherBetter: true },
  { key: "roe",                  label: "ROE",                  format: "%",    higherBetter: true },
  { key: "debt_to_equity_ratio", label: "Debt/Equity",          format: "x",    higherBetter: false },
];

const CHART_METRICS = [
  { key: "revenue", label: "Revenue" },
  { key: "net_profit", label: "Net Profit" },
  { key: "profit_margin", label: "Profit Margin (%)" },
  { key: "roe", label: "ROE (%)" },
];

const COLORS = [
  { bg: "bg-primary/10",    text: "text-primary",    bar: "#3B82F6" },
  { bg: "bg-violet-50",  text: "text-violet-700",  bar: "#8B5CF6" },
  { bg: "bg-orange-50",  text: "text-orange-700",  bar: "#F59E0B" },
  { bg: "bg-success/10", text: "text-success", bar: "#10B981" },
  { bg: "bg-pink-50",    text: "text-pink-700",    bar: "#EC4899" },
  { bg: "bg-cyan-50",    text: "text-cyan-700",    bar: "#06B6D4" },
];

export default function ComparePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.id as string;

  const [data, setData] = useState<ComparisonData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  
  const [availableDocs, setAvailableDocs] = useState<{id: string, filename: string, status: string}[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const loadData = () => {
    if (selectedDocIds.length < 2) return; // Must have at least 2
    setLoading(true);
    const queryStr = `?doc_ids=${selectedDocIds.join(",")}`;
    setError(null);
    fetcher<ComparisonData>(`/workspaces/${workspaceId}/comparison${queryStr}`)
      .then((d) => {
        setData(d);
        console.log("[Compare] Loaded data:", d?.companies_compared?.length, "companies,", d?.financial_metrics?.length, "metrics");
      })
      .catch((err) => {
        console.error("[Compare] Load failed:", err);
        setError((err instanceof Error ? err.message : String(err)) || "Failed to load comparison data.");
      })
      .finally(() => setLoading(false));
  };

  const loadDocuments = () => {
    setDocsLoading(true);
    fetcher<{ documents: any[] }>(`/workspaces/${workspaceId}/documents`)
      .then(res => {
        setAvailableDocs(res.documents || []);
      })
      .catch(console.error)
      .finally(() => setDocsLoading(false));
  };

  useEffect(() => {
    loadDocuments();
  }, [workspaceId]);

  const handleUploadStart = async () => {
    if (selectedFiles.length === 0) return;
    setUploading(true);
    const formData = new FormData();
    selectedFiles.forEach((f) => formData.append("files", f));
    try {
      await uploadMultipart(`/workspaces/${workspaceId}/documents`, formData);
      setSelectedFiles([]);
      setShowUpload(false);
      
      // Upload succeeded! Redirect to the Documents tab where processing will be shown natively.
      router.push(`/workspace/${workspaceId}/documents`);
      
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

  if (docsLoading || uploading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" /> 
        {uploading ? "Processing documents..." : "Loading documents..."}
      </div>
    );
  }

  const noPeers = data?.financial_metrics?.length === 0;

  const parseMetricValue = (val: string | number | undefined): number | null => {
    if (val === undefined || val === null || val === "N/A" || val === "-" || val === "None" || val === "null") return null;
    if (typeof val === "number") return val;
    // Extract the first number (allowing for negative signs and decimals)
    const match = val.match(/-?\d+(\.\d+)?/);
    return match ? parseFloat(match[0]) : null;
  };

  const fmt = (val: string | number | undefined, format: string) => {
    if (val === undefined || val === null || val === "N/A" || val === "None" || val === "null" || val === "-" || val === 0) return "-";
    // Since values can now be rich strings like "248.6M (+16%)", we return them as-is 
    // unless they are raw numbers, then we format them.
    if (typeof val === "string") return val;
    if (format === "str") return String(val);
    if (format === "%") return `${val}%`;
    if (format === "x") return `${val}x`;
    if (format === "num") return typeof val === "number" ? val.toLocaleString() : val;
    return String(val);
  };

  const bestForMetric = (key: string, higherBetter?: boolean) => {
    if (noPeers || !data?.financial_metrics) return null;
    let bestComp = null;
    let bestVal = higherBetter ? -Infinity : Infinity;
    
    for (const m of data.financial_metrics) {
      const rawVal = (m as any)[key];
      const val = parseMetricValue(rawVal);
      if (val !== null) {
        if (higherBetter && val > bestVal) {
          bestVal = val;
          bestComp = m.company_name;
        } else if (!higherBetter && val < bestVal) {
          bestVal = val;
          bestComp = m.company_name;
        }
      }
    }
    return bestComp;
  };
  
  const getTicker = (name: string) => {
    let ticker = name.substring(0, 4).toUpperCase();
    if (name.toLowerCase().includes("infosys")) ticker = "INFY";
    else if (name.toLowerCase().includes("tcs") || name.toLowerCase().includes("tata")) ticker = "TCS";
    else if (name.toLowerCase().includes("wipro")) ticker = "WIPRO";
    else if (name.toLowerCase().includes("hcl")) ticker = "HCL";
    return ticker;
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto px-6 py-6 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow">
              <GitCompareArrows className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">Company Comparison</h2>
              <p className="text-xs text-muted-foreground">
                Compare multiple company reports seamlessly.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
               onClick={() => setShowUpload(!showUpload)}
               className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
            >
               <Plus className="w-4 h-4" /> Add Company Report
            </button>
          </div>
        </div>

        {/* Document Selector */}
        {availableDocs && availableDocs.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4 shadow-sm flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <h4 className="text-sm font-semibold text-foreground">Select Documents to Compare</h4>
              <button 
                onClick={loadData}
                disabled={selectedDocIds.length < 2 || loading}
                className="px-4 py-1.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Comparing..." : selectedDocIds.length < 2 ? "Select at least 2 documents" : `Compare ${selectedDocIds.length} Documents`}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {availableDocs.map(doc => {
                const isSelected = selectedDocIds.includes(doc.id);
                const isReady = doc.status === "ready";
                return (
                  <label key={doc.id} title={!isReady ? `Status: ${doc.status}` : ''} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors", !isReady ? "opacity-50 cursor-not-allowed border-border-subtle bg-surface" : isSelected ? "border-primary bg-primary/10 text-blue-800 cursor-pointer" : "border-border hover:bg-surface cursor-pointer")}>
                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      disabled={!isReady}
                      onChange={(e) => {
                        if (!isReady) return;
                        if (e.target.checked) {
                          setSelectedDocIds(prev => [...prev, doc.id]);
                        } else {
                          setSelectedDocIds(prev => prev.filter(id => id !== doc.id));
                        }
                      }}
                      className="rounded text-primary focus:ring-blue-500 disabled:opacity-50" 
                    />
                    <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{doc.filename || (doc as any).name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Upload Section */}
        {showUpload && (
           <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div 
                className={cn("border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer relative", dragActive ? "border-primary bg-primary/10/50" : "border-border hover:border-primary hover:bg-surface")}
                onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleChange} />
                <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <h4 className="text-sm font-semibold text-foreground mb-1">Upload Annual/Quarterly Reports</h4>
                <p className="text-xs text-muted-foreground">Only PDF files are supported.</p>
              </div>

              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, i) => (
                     <div key={i} className="flex items-center justify-between bg-surface border border-border-subtle rounded-lg p-2">
                        <div className="flex items-center gap-2">
                           <FileText className="w-4 h-4 text-muted-foreground" />
                           <p className="text-xs font-medium text-foreground">{file.name}</p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, idx) => idx !== i)); }} className="p-1 text-muted-foreground hover:text-destructive"><X className="w-4 h-4"/></button>
                     </div>
                  ))}
                  <div className="flex justify-end gap-2 mt-4">
                    <button onClick={() => { setSelectedFiles([]); setShowUpload(false); }} className="px-4 py-2 text-xs font-medium text-muted-foreground bg-surface rounded-lg hover:bg-surface">Cancel</button>
                    <button onClick={handleUploadStart} className="px-4 py-2 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 flex items-center gap-2">
                      Upload & Process <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
           </div>
        )}

        {!data ? (
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24 px-6 mt-6">
               <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 border border-primary/50/50 shadow-sm">
                 <GitCompareArrows className="w-7 h-7 text-primary" />
               </div>
               <h4 className="text-foreground font-bold text-lg mb-2">Select documents to begin</h4>
               <p className="text-muted-foreground text-sm max-w-[400px] text-center mx-auto leading-relaxed">
                 Choose at least two company reports from the list above and click <span className="font-semibold text-foreground">Compare</span> to view side-by-side financial metrics.
               </p>
              {error && (
                <div className="mt-6 bg-destructive/10 border border-destructive/50 rounded-lg p-4 max-w-md w-full text-sm text-destructive flex flex-col gap-1 text-center">
                   <span className="font-semibold text-red-800">Comparison Error</span>
                   {error}
                </div>
              )}
           </div>
        ) : loading ? (
           <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24 px-6">
             <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
             <p className="text-muted-foreground text-sm">Comparing selected companies...</p>
           </div>
        ) : noPeers ? (
           <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24 px-6">
              <div className="w-16 h-16 rounded-full bg-surface flex items-center justify-center mb-4 border border-border-subtle">
                <GitCompareArrows className="w-6 h-6 text-muted-foreground" />
              </div>
              <h4 className="text-foreground font-semibold mb-1">
                {data.status === "blocked" ? "Comparison Blocked" : "No comparison data"}
              </h4>
              <p className="text-muted-foreground text-sm max-w-sm w-full text-center">
                {data.message || "Add company reports to this workspace to automatically extract metrics and compare them."}
              </p>
              {/* Show any error insights from the backend */}
              {data?.insights && data.insights.length > 0 && (
                <div className="mt-4 max-w-md w-full space-y-2">
                  {data.insights.map((insight, idx) => (
                    <div key={idx} className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-xs text-amber-800">
                      {insight}
                    </div>
                  ))}
                </div>
              )}
           </div>
        ) : (
          <>
            {/* Comparison Table */}
            <div className="bg-card border border-border rounded-2xl shadow-sm overflow-x-auto overflow-y-hidden mb-6">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-surface/30">
                    <th className="text-left px-6 pt-12 pb-5 align-bottom min-w-[180px] sticky left-0 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur z-20 border-r border-border-subtle shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                      <span className="text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest">
                        Metric
                      </span>
                    </th>
                    {data.financial_metrics?.map((p, i) => {
                      const c = COLORS[i % COLORS.length];
                      const ticker = getTicker(p.company_name);
                      const isBase = i === 0;
                      return (
                        <th
                          key={`${ticker}-${i}`}
                          className={cn(
                            "text-center py-4 px-5 min-w-[160px] relative align-bottom",
                            isBase ? "bg-primary/5" : ""
                          )}
                        >
                          {isBase && <div className="absolute inset-x-0 top-0 h-1 bg-primary" />}
                          <div className="flex flex-col items-center gap-1.5 mt-2">
                            <span
                              className={cn(
                                "text-[11px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm",
                                isBase
                                  ? "bg-primary text-white"
                                  : `${c.bg} ${c.text}`
                              )}
                            >
                              {ticker}
                            </span>
                            <span className={cn("text-xs font-bold leading-tight max-w-[140px]", isBase ? "text-primary" : "text-foreground")}>
                              {p.company_name}
                            </span>
                            {isBase && (
                              <span className="text-[10px] text-primary/80 font-semibold flex items-center gap-1 mt-0.5 bg-primary/10 px-2.5 py-0.5 rounded-full">
                                <Crown className="w-3 h-3" /> Base
                              </span>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {METRIC_ROWS.map((row, rowIdx) => {
                    const winner = bestForMetric(row.key, row.higherBetter);
                    const isLast = rowIdx === METRIC_ROWS.length - 1;
                    return (
                      <tr
                        key={row.key}
                        className={cn("hover:bg-surface/60 transition-colors group", !isLast && "border-b border-border-subtle")}
                      >
                        <td className="py-4 px-6 text-[13px] font-bold text-foreground/90 sticky left-0 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur z-10 border-r border-border-subtle shadow-[1px_0_0_0_rgba(0,0,0,0.05)] group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition-colors">
                          {row.label}
                        </td>
                        {data.financial_metrics?.map((p, i) => {
                          const val = (p as any)[row.key];
                          const display = fmt(val, row.format);
                          const isWinner = p.company_name === winner;
                          const isBase = i === 0;
                          return (
                            <td
                              key={`${p.company_name}-${i}`}
                              className={cn(
                                "py-4 px-5 text-center text-[13px]",
                                isBase ? "bg-primary/5" : "",
                                isWinner ? "font-bold text-success" : "font-semibold text-foreground/90"
                              )}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                {display}
                                {isWinner && (
                                  <Trophy className="w-3.5 h-3.5 text-amber-500 drop-shadow-sm" />
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
                const vals = data.financial_metrics?.map((p) => {
                  const rawVal = (p as any)[cm.key];
                  const numVal = parseMetricValue(rawVal);
                  return {
                    ticker: getTicker(p.company_name),
                    value: numVal !== null ? numVal : 0,
                  };
                }) || [];
                const maxAbs = Math.max(...vals.map(v => Math.abs(v.value)), 1);
                const hasNegative = vals.some(v => v.value < 0);
                
                return (
                  <div
                    key={cm.key}
                    className="bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/40 transition-colors group"
                  >
                    <h5 className="text-[12px] font-bold text-muted-foreground mb-6 text-center uppercase tracking-wider">
                      {cm.label}
                    </h5>
                    <div className="relative w-full h-32 mb-2">
                      {/* Zero Line */}
                      {hasNegative && (
                        <div className="absolute top-1/2 left-0 right-0 h-px bg-border-strong border-dashed z-0 opacity-60" />
                      )}
                      
                      <div className="absolute inset-0 flex justify-around items-end h-full">
                        {vals.map((v, i) => {
                          const c = COLORS[i % COLORS.length];
                          const isNeg = v.value < 0;
                          const baseline = hasNegative ? '50%' : '0%';
                          const heightPct = hasNegative 
                            ? (Math.abs(v.value) / maxAbs) * 40 
                            : (Math.abs(v.value) / maxAbs) * 85;
                            
                          return (
                            <div key={`${v.ticker}-${i}`} className="relative w-12 h-full flex justify-center z-10">
                              {isNeg ? (
                                <>
                                  <div
                                    className="absolute w-8 sm:w-10 rounded-b-md transition-all duration-700 shadow-sm"
                                    style={{
                                      top: '50%',
                                      height: `${Math.max(1.5, heightPct)}%`,
                                      backgroundColor: 'var(--destructive)',
                                    }}
                                  />
                                  <span
                                    className="absolute text-[11px] font-bold text-destructive"
                                    style={{ top: `calc(50% + ${Math.max(1.5, heightPct)}% + 6px)` }}
                                  >
                                    {v.value}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <div
                                    className="absolute w-8 sm:w-10 rounded-t-md transition-all duration-700 shadow-sm"
                                    style={{
                                      bottom: baseline,
                                      height: `${Math.max(1.5, heightPct)}%`,
                                      backgroundColor: c.bar,
                                    }}
                                  />
                                  <span
                                    className="absolute text-[11px] font-bold text-foreground"
                                    style={{ bottom: `calc(${baseline} + ${Math.max(1.5, heightPct)}% + 6px)` }}
                                  >
                                    {v.value}
                                  </span>
                                </>
                              )}
                              
                              <span className="absolute -bottom-6 text-[10px] font-bold text-foreground/80 uppercase tracking-widest">
                                {v.ticker}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Comparison Analysis */}
            {data.comparison_analysis && (
              <div className="bg-card border border-border rounded-2xl p-6 shadow-sm mt-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">AI Comparison Analysis</h4>
                    <p className="text-sm text-muted-foreground">Synthesized insights across key financial dimensions.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column - General Analysis */}
                  <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-5">
                    {data.comparison_analysis.revenue_analysis && (
                      <div className="bg-surface/50 border border-border-subtle rounded-xl p-5 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <TrendingUp className="w-4 h-4 text-blue-500" />
                          <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Revenue</h5>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{data.comparison_analysis.revenue_analysis}</p>
                      </div>
                    )}
                    {data.comparison_analysis.profit_analysis && (
                      <div className="bg-surface/50 border border-border-subtle rounded-xl p-5 hover:border-primary/30 transition-colors">
                        <div className="flex items-center gap-2 mb-3">
                          <DollarSign className="w-4 h-4 text-emerald-500" />
                          <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Profitability</h5>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{data.comparison_analysis.profit_analysis}</p>
                      </div>
                    )}
                    {data.comparison_analysis.ratio_analysis && (
                      <div className="bg-surface/50 border border-border-subtle rounded-xl p-5 hover:border-primary/30 transition-colors md:col-span-2">
                        <div className="flex items-center gap-2 mb-3">
                          <Percent className="w-4 h-4 text-violet-500" />
                          <h5 className="text-xs font-bold text-foreground uppercase tracking-wider">Financial Ratios</h5>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{data.comparison_analysis.ratio_analysis}</p>
                      </div>
                    )}
                  </div>

                  {/* Right Column - Summary */}
                  <div className="lg:col-span-1">
                    {data.comparison_analysis.financial_health_analysis && (
                      <div className="h-full bg-gradient-to-br from-primary/10 to-indigo-500/10 p-6 rounded-xl border border-primary/20 shadow-inner flex flex-col relative overflow-hidden">
                        <div className="absolute -right-6 -top-6 w-24 h-24 bg-primary/20 rounded-full blur-2xl" />
                        <div className="flex items-center gap-2 mb-4 relative z-10">
                          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center">
                            <Trophy className="w-4 h-4" />
                          </div>
                          <h5 className="text-sm font-bold text-primary uppercase tracking-wider">
                            Health Summary
                          </h5>
                        </div>
                        <p className="text-sm text-foreground/90 leading-relaxed relative z-10 flex-1">
                          {data.comparison_analysis.financial_health_analysis}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Dynamic Peer Insights */}
            {data.insights && data.insights.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5 shadow-sm mt-6">
                <h4 className="text-sm font-bold text-foreground mb-4 flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-500" />
                  Dynamic Peer Insights
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {data.insights.map((insight, idx) => (
                     <div
                       key={idx}
                       className="bg-amber-500/10 rounded-lg p-4 border border-amber-500/20 flex items-start gap-3"
                     >
                       <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                          <Trophy className="w-3 h-3 text-amber-500" />
                       </div>
                       <p className="text-sm font-medium text-foreground leading-snug">
                         {insight}
                       </p>
                     </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
