"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Search,
  Upload,
  FileText,
  Loader2,
  Check,
  X,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  LayoutGrid,
  LayoutList,
  BarChart2,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Eye,
  CheckCircle2,
  XCircle,
  MoreVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL } from "@/lib/api";
import type { Document, Metric, RedFlag } from "./types";
import { DocumentProcessingView } from "./DocumentProcessingView";

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadDocumentsModal({
  onCancel,
  onUploadStart,
}: {
  onCancel: () => void;
  onUploadStart: (files: File[]) => void;
  workspaceId: string;
}) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setSelectedFiles(
        Array.from(e.dataTransfer.files).filter(
          (f) => f.type === "application/pdf"
        )
      );
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFiles(
        Array.from(e.target.files).filter((f) => f.type === "application/pdf")
      );
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto w-full h-full">
      <div className="mb-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Documents
        </button>
        <h3 className="text-xl font-bold text-slate-800">Upload Documents</h3>
        <p className="text-sm text-slate-500">
          Upload PDF files for processing and analysis.
        </p>
      </div>

      <div
        className={cn(
          "border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer relative",
          dragActive
            ? "border-blue-500 bg-blue-50/50"
            : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf"
          className="hidden"
          onChange={handleChange}
        />
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <h4 className="text-base font-semibold text-slate-800 mb-1">
          Click or drag and drop to upload
        </h4>
        <p className="text-sm text-slate-500">
          Only PDF files are supported. Max size 50MB per file.
        </p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-8 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">
            Selected Files ({selectedFiles.length})
          </h4>
          {selectedFiles.map((file, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800 truncate max-w-[300px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-slate-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFiles((prev) =>
                    prev.filter((_, idx) => idx !== i)
                  );
                }}
                className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => onUploadStart(selectedFiles)}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              Start Processing <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Document Detail Side Panel ────────────────────────────────────────────────
function DocumentDetailPanel({
  doc,
  onClose,
}: {
  doc: Document;
  onClose: () => void;
}) {
  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const fileExt = doc.name.split(".").pop()?.toUpperCase() || "PDF";

  return (
    <div className="w-[380px] bg-white h-full border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800 truncate pr-2 flex-1">
          {doc.name}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Status */}
        <div className="mb-4">
          {doc.status === "ready" || doc.status === "processed" ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          ) : doc.status === "processing" ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
              <XCircle className="w-3.5 h-3.5" /> Failed
            </span>
          )}
          <p className="text-xs text-slate-400 mt-2">
            Indexed on {doc.uploaded_at}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{doc.pages}</p>
            <p className="text-[10px] text-slate-500 font-medium">Pages</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-800">
              {formatSize(doc.size_bytes)}
            </p>
            <p className="text-[10px] text-slate-500 font-medium">Size</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-slate-800">{fileExt}</p>
            <p className="text-[10px] text-slate-500 font-medium">Type</p>
          </div>
        </div>

        {/* Extracted Metrics */}
        {doc.extracted_metrics && doc.extracted_metrics.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold text-slate-700">
                Key Financial Metrics
              </h5>
              <span className="text-[10px] text-slate-400">(Extracted)</span>
            </div>
            <div className="space-y-2">
              {doc.extracted_metrics.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <span className="text-xs text-slate-600">{m.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-800">
                      {m.value}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        m.trend === "up"
                          ? "text-emerald-600"
                          : "text-red-500"
                      )}
                    >
                      {m.trend === "up" ? "↑" : "↓"} {m.change}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2 flex items-center gap-1">
              View all metrics →
            </button>
          </div>
        )}

        {/* Red Flags */}
        {doc.red_flags && doc.red_flags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h5 className="text-xs font-bold text-slate-700">
                Red Flags Summary
              </h5>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-600">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                (High Priority)
              </span>
            </div>
            <div className="space-y-2">
              {doc.red_flags.slice(0, 3).map((rf, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-1.5"
                >
                  <span className="text-xs text-slate-600 truncate pr-2">
                    {rf.title}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0",
                      rf.severity === "High"
                        ? "bg-red-50 text-red-700"
                        : rf.severity === "Medium"
                          ? "bg-orange-50 text-orange-700"
                          : "bg-yellow-50 text-yellow-700"
                    )}
                  >
                    {rf.severity}
                  </span>
                </div>
              ))}
            </div>
            <button className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2 flex items-center gap-1">
              View all red flags →
            </button>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button className="flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-3 py-2.5 rounded-xl hover:bg-blue-100 transition-colors">
            <BarChart2 className="w-3.5 h-3.5" />
            Open in Metrics
          </button>
          <button className="flex items-center justify-center gap-1.5 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-3 py-2.5 rounded-xl hover:bg-orange-100 transition-colors">
            <ShieldAlert className="w-3.5 h-3.5" />
            Open in Red Flags
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirmation Modal ─────────────────────────────────────────────────
function DeleteConfirmModal({
  doc,
  onClose,
  onConfirm,
}: {
  doc: Document;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Delete Document
            </h3>
          </div>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed mb-1">
          This will permanently delete{" "}
          <span className="font-semibold text-slate-800">
            &quot;{doc.name}&quot;
          </span>
          .
        </p>
        <p className="text-xs text-slate-500 mb-6">
          All associated metrics, red flags, chat citations, and embeddings tied
          only to this document will be removed.
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main DocumentsTab ─────────────────────────────────────────────────────────
export function DocumentsTab({
  workspaceId,
  onDocCountChange,
}: {
  workspaceId: string;
  onDocCountChange: (n: number) => void;
}) {
  const [view, setView] = useState<"list" | "upload" | "processing">("list");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");
  const [layoutMode, setLayoutMode] = useState<"table" | "grid">("table");
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [deleteDoc, setDeleteDoc] = useState<Document | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await fetcher<{ documents: Document[]; total: number }>(
        `/workspaces/${workspaceId}/documents`
      );
      setDocuments(data.documents);
      onDocCountChange(data.total);
      if (data.documents.some((d) => d.status === "processing")) {
        setView("processing");
      }
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId, onDocCountChange]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadStart = async (files: File[]) => {
    setView("processing");
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/documents`, {
        method: "POST",
        body: formData,
      });
    } catch (e) {
      console.error("Upload failed", e);
      setView("list");
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await fetcher(`/workspaces/${workspaceId}/documents/${docId}`, {
        method: "DELETE",
      });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      onDocCountChange(documents.length - 1);
      if (selectedDoc?.id === docId) setSelectedDoc(null);
      setDeleteDoc(null);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const handleProcessingComplete = useCallback(() => {
    setView("list");
    loadDocuments();
  }, [loadDocuments]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="p-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 animate-pulse"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-slate-100 rounded w-2/3" />
              <div className="h-2 bg-slate-100 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (view === "upload") {
    return (
      <UploadDocumentsModal
        onCancel={() => setView("list")}
        onUploadStart={handleUploadStart}
        workspaceId={workspaceId}
      />
    );
  }

  if (view === "processing") {
    return (
      <DocumentProcessingView
        workspaceId={workspaceId}
        onComplete={handleProcessingComplete}
      />
    );
  }

  const filteredDocs = documents.filter((d) => {
    if (statusFilter !== "all" && d.status !== statusFilter) {
      if (
        statusFilter === "ready" &&
        (d.status === "ready" || d.status === "processed")
      )
        return true;
      return false;
    }
    if (
      searchQuery &&
      !d.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  return (
    <div className="flex h-full relative overflow-hidden">
      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Documents</h3>
            <p className="text-sm text-slate-500 mt-0.5">
              {documents.length} document{documents.length !== 1 ? "s" : ""} in
              this workspace
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-56 shadow-sm"
              />
            </div>

            {/* Status filter */}
            <div className="relative">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 outline-none cursor-pointer hover:bg-slate-50 shadow-sm appearance-none"
              >
                <option value="all">Status: All</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
                <option value="failed">Failed</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Company filter */}
            <div className="relative">
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 outline-none cursor-pointer hover:bg-slate-50 shadow-sm appearance-none"
              >
                <option value="all">Company: All</option>
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Layout toggle */}
            <div className="flex border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <button
                onClick={() => setLayoutMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  layoutMode === "grid"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-white text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLayoutMode("table")}
                className={cn(
                  "p-2 transition-colors",
                  layoutMode === "table"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-white text-slate-400 hover:text-slate-600"
                )}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>

            {/* Upload button */}
            <button
              onClick={() => setView("upload")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload PDF
            </button>
          </div>
        </div>

        {/* Table view */}
        {layoutMode === "table" ? (
          <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
            {/* Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <div className="col-span-4">Document</div>
              <div className="col-span-1">Pages</div>
              <div className="col-span-2">Uploaded</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-3 text-right">Actions</div>
            </div>
            {/* Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredDocs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <h4 className="text-slate-700 font-semibold mb-1">
                    No documents found
                  </h4>
                  <p className="text-slate-400 text-sm">
                    Adjust your filters or search query.
                  </p>
                </div>
              ) : (
                filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors cursor-pointer group"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    {/* Document info */}
                    <div className="col-span-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">
                          {doc.name}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {doc.company && (
                            <span className="text-[10px] text-slate-400">
                              {doc.company}
                            </span>
                          )}
                          {doc.doc_type && (
                            <span className="text-[10px] text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded">
                              {doc.doc_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Pages */}
                    <div className="col-span-1 text-sm text-slate-600 font-medium">
                      {doc.pages}
                    </div>

                    {/* Uploaded */}
                    <div className="col-span-2 text-sm text-slate-500">
                      {doc.uploaded_at}
                    </div>

                    {/* Status */}
                    <div className="col-span-2">
                      {doc.status === "ready" ||
                      doc.status === "processed" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                          </span>
                          <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Check className="w-3 h-3" /> Indexed
                          </p>
                        </div>
                      ) : doc.status === "processing" ? (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />{" "}
                            Processing
                          </span>
                          <div className="mt-1.5">
                            <p className="text-[10px] text-slate-400 mb-1">
                              {doc.processing_step || 1} of 5 steps
                            </p>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden w-24">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{
                                  width: `${doc.progress || ((doc.processing_step || 1) / 5) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                            <XCircle className="w-3.5 h-3.5" /> Failed
                          </span>
                          <p className="text-[10px] text-red-400 mt-1 italic">
                            Parsing failed
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div
                      className="col-span-3 flex items-center justify-end gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {(doc.status === "ready" ||
                        doc.status === "processed") && (
                        <>
                          <button className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg hover:bg-blue-100 transition-colors">
                            <BarChart2 className="w-3 h-3" /> View Metrics
                          </button>
                          <button className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 border border-orange-200 px-2.5 py-1.5 rounded-lg hover:bg-orange-100 transition-colors">
                            <ShieldAlert className="w-3 h-3" /> View Red Flags
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setDeleteDoc(doc)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {filteredDocs.length > 0 && (
              <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 bg-slate-50/50">
                <span className="text-xs text-slate-400">
                  Showing 1–{filteredDocs.length} of {filteredDocs.length}{" "}
                  documents
                </span>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="w-8 h-8 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <button className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Grid view */
          <div className="flex-1 overflow-y-auto">
            {filteredDocs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                  <Search className="w-6 h-6 text-slate-300" />
                </div>
                <h4 className="text-slate-700 font-semibold mb-1">
                  No documents found
                </h4>
                <p className="text-slate-400 text-sm">
                  Adjust your filters or search query.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group hover:border-blue-200"
                    onClick={() => setSelectedDoc(doc)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                        <FileText className="w-6 h-6 text-red-500" />
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDoc(doc);
                        }}
                        className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-800 truncate mb-1 group-hover:text-blue-600 transition-colors">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-slate-400 mb-3">
                      {doc.pages} pages · {formatSize(doc.size_bytes)}
                    </p>

                    {/* Status with mini progress */}
                    {doc.status === "processing" ? (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-semibold text-blue-600">
                            Processing
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {doc.progress || 0}%
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-500"
                            style={{
                              width: `${doc.progress || ((doc.processing_step || 1) / 5) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    ) : doc.status === "ready" ||
                      doc.status === "processed" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Failed
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedDoc && (
        <DocumentDetailPanel
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      {/* Delete modal */}
      {deleteDoc && (
        <DeleteConfirmModal
          doc={deleteDoc}
          onClose={() => setDeleteDoc(null)}
          onConfirm={() => handleDelete(deleteDoc.id)}
        />
      )}
    </div>
  );
}
