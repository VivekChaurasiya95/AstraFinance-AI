"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Upload, ChevronLeft, ChevronRight, FileText, X, Search, Filter, ChevronDown, CheckCircle2, XCircle, Trash2, Loader2, Eye, Download, TrendingUp, TrendingDown, ShieldAlert, AlertTriangle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL, uploadMultipart } from "@/lib/api";

interface Metric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  period: string;
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

interface Document {
  id: string;
  name: string;
  size_bytes: number;
  status: string;
  pages: number;
  uploaded_at: string;
  processing_step?: number;
  progress?: number;
  extracted_metrics?: Metric[];
  red_flags?: RedFlag[];
}

function UploadDocumentsModal({ onCancel, onUploadStart, workspaceId }: { onCancel: () => void, onUploadStart: (files: File[]) => void, workspaceId: string }) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
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

  return (
    <div className="p-6 max-w-3xl mx-auto w-full h-full">
      <div className="mb-6">
        <button onClick={onCancel} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Back to Documents
        </button>
        <h3 className="text-xl font-bold text-slate-800">Upload Documents</h3>
        <p className="text-sm text-slate-500">Upload PDF files for processing and analysis.</p>
      </div>

      <div 
        className={cn("border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer relative", dragActive ? "border-blue-500 bg-blue-50/50" : "border-slate-300 hover:border-blue-400 hover:bg-slate-50")}
        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" multiple accept=".pdf" className="hidden" onChange={handleChange} />
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Upload className="w-8 h-8 text-blue-600" />
        </div>
        <h4 className="text-base font-semibold text-slate-800 mb-1">Click or drag and drop to upload</h4>
        <p className="text-sm text-slate-500">Only PDF files are supported. Max size 50MB per file.</p>
      </div>

      {selectedFiles.length > 0 && (
        <div className="mt-8 space-y-3">
          <h4 className="text-sm font-semibold text-slate-700">Selected Files ({selectedFiles.length})</h4>
          {selectedFiles.map((file, i) => (
             <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                     <FileText className="w-5 h-5 text-red-500" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-slate-800 truncate max-w-[300px]">{file.name}</p>
                     <p className="text-xs text-slate-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                   </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedFiles(prev => prev.filter((_, idx) => idx !== i)); }} className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><X className="w-4 h-4"/></button>
             </div>
          ))}

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
            <button onClick={() => onUploadStart(selectedFiles)} className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center gap-2 transition-colors">
              Start Processing <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const PROCESSING_STEPS = [
  "Document Agent (Chunking)",
  "Extraction Agent (Metrics)",
  "Red Flag Agent (Risks)",
  "Comparison Agent (Baselines)",
  "Research Agent (Indexing)",
  "Report Agent (Templates)"
];

function DocumentProcessingView({ workspaceId, onComplete }: { workspaceId: string, onComplete: () => void }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  
  useEffect(() => {
    let timer = setInterval(async () => {
       try {
         const res = await fetcher<{documents: Document[]}>(`/workspaces/${workspaceId}/documents`);
         const processing = res.documents.filter(d => d.status === "processing");
         setDocuments(processing);
         if (processing.length === 0 && res.documents.length > 0) {
            clearInterval(timer);
            onComplete();
         }
       } catch(e) {
         console.error("Polling error", e);
       }
    }, 1000);
    return () => clearInterval(timer);
  }, [workspaceId, onComplete]);

  if (documents.length === 0) return <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-4 h-full justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/> Initializing processing pipeline...</div>;

  return (
    <div className="p-8 max-w-4xl mx-auto h-full flex flex-col pt-12 w-full">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-800 mb-3">Processing Documents</h2>
        <p className="text-slate-500 text-base">Our AI agents are analyzing your files. This may take a few moments.</p>
      </div>

      <div className="space-y-6 flex-1 overflow-y-auto pr-2 pb-10">
        {documents.map(doc => (
          <div key={doc.id} className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
             <div className="flex items-center justify-between mb-8">
               <div className="flex items-center gap-4">
                 <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center border border-blue-100">
                   <FileText className="w-7 h-7 text-blue-600" />
                 </div>
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">{doc.name}</h3>
                   <p className="text-sm font-medium text-slate-400 mt-0.5">Step {doc.processing_step || 1} of 6</p>
                 </div>
               </div>
               <div className="text-right">
                 <span className="text-3xl font-extrabold text-blue-600">{doc.progress || 0}%</span>
               </div>
             </div>
             
             {/* Stepper */}
             <div className="relative pt-2 pb-6 px-4">
                <div className="absolute top-5 left-4 right-4 h-1 bg-slate-100 rounded-full" />
                <div 
                   className="absolute top-5 left-4 h-1 bg-blue-500 rounded-full transition-all duration-500" 
                   style={{ width: `calc(${(((doc.processing_step || 1) - 1) / 5) * 100}% - 0px)` }}
                />
                
                <div className="relative flex justify-between">
                  {PROCESSING_STEPS.map((step, idx) => {
                    const stepNum = idx + 1;
                    const currentStep = doc.processing_step || 1;
                    let state = "pending";
                    if (stepNum < currentStep) state = "complete";
                    if (stepNum === currentStep) state = "active";
                    
                    return (
                      <div key={idx} className="flex flex-col items-center gap-3 w-28 -translate-x-1/2" style={{ left: `${(idx / 5) * 100}%`, position: idx === 0 || idx === 5 ? "relative" : "absolute", transform: idx === 0 ? "translateX(0)" : idx === 5 ? "translateX(0)" : "translateX(-50%)" }}>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 shadow-sm z-10",
                          state === "complete" ? "bg-blue-600 text-white border-2 border-blue-600" : 
                          state === "active" ? "bg-blue-50 border-2 border-blue-600 text-blue-700 shadow-md ring-4 ring-blue-50" : 
                          "bg-white border-2 border-slate-200 text-slate-300"
                        )}>
                          {state === "complete" ? <Check className="w-4 h-4" /> : stepNum}
                        </div>
                        <span className={cn(
                          "text-[11px] text-center font-semibold leading-tight",
                          state === "active" ? "text-blue-700" : 
                          state === "complete" ? "text-slate-700" : "text-slate-400"
                        )}>{step}</span>
                      </div>
                    )
                  })}
                </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function DocumentsPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  
  const [view, setView] = useState<"list" | "upload" | "processing">("list");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDocForDetail, setSelectedDocForDetail] = useState<Document | null>(null);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await fetcher<{ documents: Document[]; total: number }>(`/workspaces/${workspaceId}/documents`);
      setDocuments(data.documents);
      
      // If any doc is processing, jump to processing view
      if (data.documents.some(d => d.status === "processing")) {
        setView("processing");
      }
    } catch (e) {
      console.error("Failed to load documents:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Handle background upload
  const handleUploadStart = async (files: File[]) => {
    setView("processing");
    const formData = new FormData();
    files.forEach((f) => formData.append("files", f));
    try {
      await uploadMultipart(`/workspaces/${workspaceId}/documents`, formData);
    } catch (e) {
      console.error("Upload failed", e);
      setView("list");
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await fetcher(`/workspaces/${workspaceId}/documents/${docId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocForDetail?.id === docId) setSelectedDocForDetail(null);
    } catch (e) {
      console.error("Delete failed:", e);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleProcessingComplete = useCallback(() => {
    setView("list");
    loadDocuments();
  }, [loadDocuments]);

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 bg-white border border-slate-200 rounded-xl p-4 animate-pulse">
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
    return <UploadDocumentsModal onCancel={() => setView("list")} onUploadStart={handleUploadStart} workspaceId={workspaceId} />;
  }

  if (view === "processing") {
    return <DocumentProcessingView workspaceId={workspaceId} onComplete={handleProcessingComplete} />;
  }

  const filteredDocs = documents.filter(d => {
     if (statusFilter !== "all" && d.status !== statusFilter) {
       // if we want to include "processed" as "ready" in the frontend
       if (statusFilter === "ready" && (d.status === "ready" || d.status === "processed")) return true;
       return false;
     }
     if (searchQuery && !d.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
     return true;
  });

  return (
    <div className="flex-1 overflow-y-auto p-6 h-full flex flex-col relative overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Documents</h3>
          <p className="text-sm text-slate-500 mt-1">{documents.length} document{documents.length !== 1 ? "s" : ""} in this workspace</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="Search files..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none w-64 shadow-sm"
             />
          </div>
          <div className="relative">
             <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
             <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-700 outline-none cursor-pointer hover:bg-slate-50 shadow-sm appearance-none"
             >
                <option value="all">All Status</option>
                <option value="ready">Ready</option>
                <option value="processing">Processing</option>
             </select>
             <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
          <button
            onClick={() => setView("upload")}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Upload className="w-4 h-4" />
            Upload PDF
          </button>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
         {/* Table Header */}
         <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-5">Document Name</div>
            <div className="col-span-2">Uploaded At</div>
            <div className="col-span-2">Size / Pages</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
         </div>
         {/* Table Body */}
         <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredDocs.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                    <Search className="w-6 h-6 text-slate-300" />
                  </div>
                  <h4 className="text-slate-700 font-semibold mb-1">No documents found</h4>
                  <p className="text-slate-400 text-sm">Adjust your filters or search query.</p>
               </div>
            ) : (
               filteredDocs.map(doc => (
                  <div key={doc.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedDocForDetail(doc)}>
                     <div className="col-span-5 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                           <FileText className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="text-sm font-medium text-slate-800 truncate group-hover:text-blue-600 transition-colors">{doc.name}</span>
                     </div>
                     <div className="col-span-2 text-sm text-slate-500">{doc.uploaded_at}</div>
                     <div className="col-span-2 text-sm text-slate-500">{formatSize(doc.size_bytes)} &bull; {doc.pages} pg</div>
                     <div className="col-span-2 flex items-center">
                        {doc.status === "ready" || doc.status === "processed" ? (
                           <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shadow-sm"><CheckCircle2 className="w-3.5 h-3.5" /> Ready</span>
                        ) : doc.status === "processing" ? (
                           <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shadow-sm"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing</span>
                        ) : (
                           <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded-full shadow-sm"><XCircle className="w-3.5 h-3.5" /> Failed</span>
                        )}
                     </div>
                     <div className="col-span-1 flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleDelete(doc.id)} className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100" title="Delete">
                           <Trash2 className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>

      {/* Slide-over Panel */}
      {selectedDocForDetail && (
        <div className="absolute inset-0 z-10 flex justify-end overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity pointer-events-auto" onClick={() => setSelectedDocForDetail(null)} />
          <div className="relative w-[450px] bg-white h-full border-l border-slate-200 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                 <FileText className="w-4 h-4 text-blue-600"/> Document Details
              </h3>
              <button onClick={() => setSelectedDocForDetail(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/30">
               {/* Document Meta */}
               <div className="flex flex-col items-center text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4 shadow-sm">
                     <FileText className="w-8 h-8 text-red-500" />
                  </div>
                  <h4 className="text-lg font-bold text-slate-800 break-words w-full leading-snug">{selectedDocForDetail.name}</h4>
                  <p className="text-sm text-slate-500 mt-2">{formatSize(selectedDocForDetail.size_bytes)} &bull; {selectedDocForDetail.pages} pages &bull; {selectedDocForDetail.uploaded_at}</p>
                  
                  <div className="mt-5 flex gap-3 w-full">
                     <button className="flex-1 bg-white border border-slate-200 shadow-sm text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                        <Eye className="w-4 h-4 text-slate-400"/> View
                     </button>
                     <button className="flex-1 bg-white border border-slate-200 shadow-sm text-slate-700 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                        <Download className="w-4 h-4 text-slate-400"/> Download
                     </button>
                  </div>
               </div>

               {/* Metrics */}
               {selectedDocForDetail.extracted_metrics && selectedDocForDetail.extracted_metrics.length > 0 && (
                  <div className="mb-8">
                     <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Key Metrics Extracted
                     </h5>
                     <div className="space-y-3">
                        {selectedDocForDetail.extracted_metrics.map((m, i) => (
                           <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
                              <div>
                                 <p className="text-xs text-slate-500 font-medium mb-1">{m.label}</p>
                                 <p className="text-lg font-bold text-slate-800">{m.value}</p>
                              </div>
                              <div className={cn("flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full", m.trend === "up" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
                                 {m.trend === "up" ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                                 {m.change}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}

               {/* Red Flags */}
               {selectedDocForDetail.red_flags && selectedDocForDetail.red_flags.length > 0 && (
                  <div>
                     <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5" /> Detected Red Flags
                     </h5>
                     <div className="space-y-3">
                        {selectedDocForDetail.red_flags.map((rf, i) => (
                           <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                              <div className={cn("absolute left-0 top-0 bottom-0 w-1", rf.severity === "High" ? "bg-red-500" : rf.severity === "Medium" ? "bg-orange-500" : "bg-amber-500")} />
                              <div className="pl-2">
                                <div className="flex items-start gap-2 mb-1.5">
                                   <AlertTriangle className={cn("w-4 h-4 mt-0.5 shrink-0", rf.severity === "High" ? "text-red-500" : rf.severity === "Medium" ? "text-orange-500" : "text-amber-500")} />
                                   <p className="text-sm font-semibold text-slate-800 leading-snug">{rf.title}</p>
                                </div>
                                {rf.description && <p className="text-xs text-slate-500 mt-1 pl-6 leading-relaxed">{rf.description}</p>}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
