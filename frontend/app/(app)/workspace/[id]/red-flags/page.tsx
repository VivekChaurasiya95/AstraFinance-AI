"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
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
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";

/* ── types ──────────────────────────────────────────────────────────── */
interface Document {
  id: string;
  name: string;
  status: "pending" | "processing" | "ready" | "failed";
  uploaded_at: string;
}

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
  status?: string;
  total_flags: number;
  last_analyzed: string;
  flags: RedFlag[];
  filename?: string;
  company?: string;
}

/* ── severity config ────────────────────────────────────────────────── */
const SEV: Record<
  string,
  {
    color: string;
    bg: string;
    border: string;
    barColor: string;
    icon: any;
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
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const selectedDocumentId = searchParams.get("documentId");

  const [data, setData] = useState<FlagsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [expanded, setExpanded] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");

  useEffect(() => {
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

  useEffect(() => {
    setLoading(true);
    const url = selectedDocumentId 
      ? `/workspaces/${workspaceId}/red-flags?document_id=${selectedDocumentId}`
      : `/workspaces/${workspaceId}/red-flags`;
      
    fetcher<FlagsData>(url)
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
        Loading...
      </div>
    );

  const selectedDoc = (documents || []).find(d => d.id === selectedDocumentId);
  const displayTitle = selectedDoc?.name || data?.filename || data?.company || "Financial Document";
  const displayCompany = data?.company || "Company";

  let emptyState = null;
  if (!data || data.status === "running") {
    emptyState = (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24 px-6 mt-6">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-5" />
        <h4 className="text-slate-800 font-bold text-lg mb-2">Analyzing Risks</h4>
        <p className="text-slate-500 text-sm max-w-[400px] text-center mx-auto leading-relaxed">
          The Red Flag Agent is scanning your document for financial risks...
        </p>
      </div>
    );
  } else if (data.status === "failed") {
    emptyState = (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24 px-6 mt-6">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5 border border-red-100/50 shadow-sm">
          <Info className="w-7 h-7 text-red-500" />
        </div>
        <h4 className="text-slate-800 font-bold text-lg mb-2">Analysis Failed</h4>
        <p className="text-slate-500 text-sm max-w-[400px] text-center mx-auto leading-relaxed">
          The Red Flag Agent encountered an error. Please retry from the Agent Status sidebar.
        </p>
      </div>
    );
  } else if (data.status === "blocked" || data.status === "pending" || data.status === "empty") {
    emptyState = (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24 px-6 mt-6">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-5 border border-slate-100/50 shadow-sm">
          <ShieldAlert className="w-7 h-7 text-slate-400" />
        </div>
        <h4 className="text-slate-800 font-bold text-lg mb-2">Risk Analysis Not Ready</h4>
        <p className="text-slate-500 text-sm max-w-[400px] text-center mx-auto leading-relaxed">
          Upload and process a document to see risk flags. The agent may be waiting for prerequisite extraction steps.
        </p>
      </div>
    );
  } else if (data.status === "complete" && data.total_flags === 0) {
    emptyState = (
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col items-center justify-center py-24 px-6 mt-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5 border border-emerald-100/50 shadow-sm">
          <ShieldCheck className="w-7 h-7 text-emerald-500" />
        </div>
        <h4 className="text-slate-800 font-bold text-lg mb-2">Risk Analysis Complete</h4>
        <p className="text-slate-500 text-sm max-w-[400px] text-center mx-auto leading-relaxed">
          No significant risk flags identified. The document has been analyzed and cleared of major risks.
        </p>
      </div>
    );
  }

  const highCount = data?.flags?.filter((f) => f.severity === "High").length || 0;
  const medCount = data?.flags?.filter((f) => f.severity === "Medium").length || 0;
  const lowCount = data?.flags?.filter((f) => f.severity === "Low").length || 0;

  const filteredFlags =
    activeFilter === "all"
      ? data?.flags || []
      : data?.flags?.filter((f) => f.severity === activeFilter) || [];

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1000px] mx-auto px-6 py-6 space-y-6">
        {/* ── Header & Document Selector ───────────────────────────────── */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 line-clamp-1">
                  Risk Flag Analysis
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {data?.total_flags || 0} risk factors identified · Last analyzed{" "}
                {data?.last_analyzed || "Not analyzed"}
              </p>
            </div>
          </div>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="group flex items-center gap-3 px-2.5 py-2.5 bg-white border border-slate-200 hover:border-red-300 hover:shadow-sm hover:shadow-red-100/50 rounded-xl text-sm font-medium transition-all min-w-[260px] max-w-sm w-full outline-none focus:ring-4 focus:ring-red-500/10"
            >
              <div className="w-9 h-9 rounded-lg bg-red-50/80 text-red-600 flex items-center justify-center shrink-0 group-hover:bg-red-100 group-hover:text-red-700 transition-colors">
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
              <div className="w-7 h-7 rounded-full bg-slate-50 flex items-center justify-center shrink-0 ml-1 group-hover:bg-red-50 transition-colors">
                <ChevronDown className={cn("w-4 h-4 text-slate-500 group-hover:text-red-600 transition-transform duration-200", dropdownOpen && "rotate-180")} />
              </div>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-full sm:w-80 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[300px]">
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
                            isSelected ? "bg-red-50" : "hover:bg-slate-50"
                          )}
                        >
                          <div className={cn("mt-0.5 shrink-0 w-4", isSelected ? "text-red-600" : "text-transparent")}>
                            <Check className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={cn("text-sm font-medium truncate", isSelected ? "text-red-900" : "text-slate-700")}>
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
              </div>
            )}
          </div>
        </div>

        {emptyState ? (
          emptyState
        ) : (
          <>
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
                  width: `${(highCount / (data?.total_flags || 1)) * 100}%`,
                }}
              />
            )}
            {medCount > 0 && (
              <div
                className="bg-orange-400 transition-all duration-500"
                style={{
                  width: `${(medCount / (data?.total_flags || 1)) * 100}%`,
                }}
              />
            )}
            {lowCount > 0 && (
              <div
                className="bg-amber-300 rounded-r-full transition-all duration-500"
                style={{
                  width: `${(lowCount / (data?.total_flags || 1)) * 100}%`,
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
        {data?.status === "complete" && highCount > 0 && (
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
        )}
          </>
        )}

      </div>
    </div>
  );
}
