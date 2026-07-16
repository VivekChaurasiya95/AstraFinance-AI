"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  Upload,
  FileBarChart2,
  MessageSquare,
  BarChart2,
  GitCompareArrows,
  ShieldAlert,
  Bot,
  FileText,
  ChevronLeft,
  MoreVertical,
  Send,
  Paperclip,
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  FileStack,
  Loader2,
  Check,
  Activity,
  RotateCcw,
  X,
  Trash2,
  Download,
  PlusCircle,
  Clock,
  Zap,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";

// ── Types ────────────────────────────────────────────────────────────────────
interface Workspace {
  id: string;
  name: string;
  description: string;
  docs: number;
  chats: number;
  reports: number;
  owner_name: string;
  updatedAt: string;
}

interface Agent {
  id: number;
  name: string;
  status: "Complete" | "Running" | "Idle" | "Failed";
  details: string;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  citations?: { doc: string; page: number }[];
  attachments?: { name: string; type: string }[];
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

interface Peer {
  company: string;
  ticker: string;
  is_base: boolean;
  metrics: Record<string, string | number>;
}

interface AgentActivity {
  id: string;
  agent: string;
  agent_type: string;
  status: "Complete" | "Running" | "Idle" | "Failed";
  action: string;
  details: string;
  timestamp: string;
  duration: string;
  metadata: Record<string, string | number>;
}

interface Report {
  id: string;
  title: string;
  summary: string;
  status: "completed" | "generating" | "failed";
  created_at: string;
  pages: number;
  type: string;
}

type Tab = "Chat" | "Documents" | "Metrics" | "Comparison" | "Red Flags" | "Agent Activity" | "Reports";

const TABS: Tab[] = ["Chat", "Documents", "Metrics", "Comparison", "Red Flags", "Agent Activity", "Reports"];

const TAB_ICONS: Record<Tab, React.ElementType> = {
  Chat: MessageSquare,
  Documents: FileText,
  Metrics: BarChart2,
  Comparison: GitCompareArrows,
  "Red Flags": ShieldAlert,
  "Agent Activity": Activity,
  Reports: FileBarChart2,
};

const AGENT_ICONS: Record<string, React.ElementType> = {
  "Document Agent": FileStack,
  "Extraction Agent": TrendingUp,
  "Red Flag Agent": ShieldAlert,
  "Comparison Agent": GitCompareArrows,
  "Research Agent": MessageSquare,
  "Report Agent": FileBarChart2,
};

const AGENT_COLORS: Record<string, string> = {
  "Document Agent": "bg-blue-100 text-blue-600",
  "Extraction Agent": "bg-teal-100 text-teal-600",
  "Red Flag Agent": "bg-orange-100 text-orange-600",
  "Comparison Agent": "bg-violet-100 text-violet-600",
  "Research Agent": "bg-sky-100 text-sky-600",
  "Report Agent": "bg-red-100 text-red-600",
};

// ── Quick Actions ──────────────────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    icon: TrendingUp,
    color: "bg-blue-50 text-blue-500",
    title: "Financial Overview",
    desc: "Give me a summary of Infosys Q1 FY25 performance.",
    prompt: "Give me a financial overview and summary of performance.",
  },
  {
    icon: GitCompareArrows,
    color: "bg-emerald-50 text-emerald-500",
    title: "Compare Metrics",
    desc: "Compare revenue and profit with other workspaces.",
    prompt: "Compare the key financial metrics across available documents.",
  },
  {
    icon: ShieldAlert,
    color: "bg-orange-50 text-orange-500",
    title: "Identify Risks",
    desc: "What are the key risks mentioned in the reports?",
    prompt: "What are the key risks and red flags mentioned in the reports?",
  },
  {
    icon: FileBarChart2,
    color: "bg-violet-50 text-violet-500",
    title: "Generate Report",
    desc: "Create a comprehensive report for this workspace.",
    prompt: "Generate a comprehensive financial report for this workspace.",
  },
];

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: Agent["status"] | AgentActivity["status"] }) {
  if (status === "Complete")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
        <Check className="w-3 h-3" /> Complete
      </span>
    );
  if (status === "Running")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
        <Loader2 className="w-3 h-3 animate-spin" /> Running
      </span>
    );
  if (status === "Failed")
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        <X className="w-3 h-3" /> Failed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
      Idle
    </span>
  );
}

// ── Agent Sidebar ─────────────────────────────────────────────────────────────
function AgentSidebar({
  workspaceId,
  collapsed,
  onToggle,
}: {
  workspaceId: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAgents = useCallback(async () => {
    try {
      const data = await fetcher<{ agents: Agent[] }>(`/workspaces/${workspaceId}/agents`);
      setAgents(data.agents);
    } catch (e) {
      console.error("Failed to load agents:", e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    loadAgents();
    const interval = setInterval(loadAgents, 15000);
    return () => clearInterval(interval);
  }, [loadAgents]);

  const handleRetry = async (agentId: number) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === agentId ? { ...a, status: "Running" } : a))
    );
    await new Promise((r) => setTimeout(r, 2500));
    setAgents((prev) =>
      prev.map((a) =>
        a.id === agentId
          ? { ...a, status: "Complete", details: "Report generated\nJust now" }
          : a
      )
    );
  };

  if (collapsed) {
    return (
      <div className="w-10 border-l border-slate-200 bg-white flex flex-col items-center pt-4 gap-4 shrink-0">
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Expand Agent Status"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {agents.slice(0, 6).map((agent) => {
          const Icon = AGENT_ICONS[agent.name] || Bot;
          const colorClass = AGENT_COLORS[agent.name] || "bg-slate-100 text-slate-500";
          return (
            <div key={agent.id} className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 relative", colorClass)}>
              <Icon className="w-4 h-4" />
              {agent.status === "Running" && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
              {agent.status === "Failed" && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-72 border-l border-slate-200 bg-white flex flex-col shrink-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-bold text-slate-800">Agent Status</span>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Collapse"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-slate-100 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-3/4" />
                  <div className="h-2 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))
          : agents.map((agent) => {
              const Icon = AGENT_ICONS[agent.name] || Bot;
              const colorClass = AGENT_COLORS[agent.name] || "bg-slate-100 text-slate-500";
              const detailLines = agent.details.split("\n");
              return (
                <div key={agent.id} className="px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-700 truncate">
                        {agent.id} {agent.name}
                      </span>
                      <button className="p-0.5 text-slate-300 hover:text-slate-500 transition-colors shrink-0">
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <StatusBadge status={agent.status} />
                    <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed whitespace-pre-line">
                      {detailLines[0]}
                    </p>
                    {detailLines[1] && (
                      <p className="text-[11px] text-slate-400">{detailLines[1]}</p>
                    )}
                    {agent.status === "Failed" && (
                      <button
                        onClick={() => handleRetry(agent.id)}
                        className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-700 transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      <div className="border-t border-slate-100 px-4 py-2">
        <button className="w-full flex items-center justify-center gap-2 text-xs font-medium text-blue-600 hover:text-blue-800 py-1.5 transition-colors">
          <Activity className="w-3.5 h-3.5" />
          View all activity
        </button>
      </div>
    </div>
  );
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ workspaceId, userName }: { workspaceId: string; userName: string }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if ((!text.trim() && attachedFiles.length === 0) || sending) return;
    
    const attachments = attachedFiles.map(f => ({ name: f.name, type: f.type }));
    const userMsg: ChatMsg = { role: "user", content: text.trim(), attachments: attachments.length > 0 ? attachments : undefined };
    
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    const filesToSend = [...attachedFiles];
    setAttachedFiles([]);
    setSending(true);
    
    try {
      let fetchOptions: RequestInit;
      
      if (filesToSend.length > 0) {
        const formData = new FormData();
        formData.append("message", text.trim());
        filesToSend.forEach(file => {
          formData.append("files", file);
        });
        
        fetchOptions = {
          method: "POST",
          body: formData,
          // Browser will automatically set multipart/form-data boundary
        };
      } else {
        fetchOptions = {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message: text.trim() }),
        };
      }

      const res = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/chat`, fetchOptions);
      if (!res.ok) throw new Error("API Error");
      const data = await res.json() as { reply: string; citations: { doc: string; page: number }[] };

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, citations: data.citations },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, there was an error communicating with the Research Agent. Please try again." },
      ]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const firstName = userName.split(" ")[0] || "there";

  return (
    <div className="flex flex-col h-full relative">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center pb-8 px-6 gap-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-slate-800 mb-2">
              Hello, {firstName}! 👋
            </h2>
            <p className="text-slate-500 text-base">
              How can I help you analyze your financial reports today?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
            {QUICK_ACTIONS.map((qa) => {
              const Icon = qa.icon;
              return (
                <button
                  key={qa.title}
                  onClick={() => sendMessage(qa.prompt)}
                  className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-200 transition-all group"
                >
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center mb-3", qa.color)}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <p className="font-semibold text-slate-800 text-sm mb-1 group-hover:text-blue-700 transition-colors">
                    {qa.title}
                  </p>
                  <p className="text-xs text-slate-400 leading-relaxed">{qa.desc}</p>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                "flex gap-3 max-w-3xl",
                msg.role === "user" ? "ml-auto flex-row-reverse" : ""
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                  msg.role === "user"
                    ? "bg-slate-800 text-white"
                    : "bg-blue-100 text-blue-600"
                )}
              >
                {msg.role === "user" ? firstName.charAt(0).toUpperCase() : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm leading-relaxed max-w-[80%]",
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-tr-sm"
                    : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                )}
              >
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {msg.attachments.map((file, idx) => (
                      <div key={idx} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs", msg.role === "user" ? "bg-blue-500 text-blue-50" : "bg-slate-100 text-slate-700")}>
                        <Paperclip className="w-3 h-3" />
                        <span className="truncate max-w-[120px]">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-[11px] text-slate-400 font-medium mb-1">Sources:</p>
                    {msg.citations.map((c, ci) => (
                      <span
                        key={ci}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mr-1 mb-1"
                      >
                        <FileText className="w-3 h-3" />
                        {c.doc} · p.{c.page}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex gap-3 max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                <div className="flex gap-1.5 items-center h-5">
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-slate-300 rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input Area */}
      <div className="px-6 pb-6 pt-3 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto">
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-100 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-medium">
                  <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 transition-colors ml-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="relative flex items-end gap-2 border border-slate-300 rounded-2xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all px-4 py-3">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask anything about your financial reports..."
              className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder:text-slate-400 min-h-[24px] max-h-[120px] leading-relaxed"
            />
            <div className="flex items-center gap-2 shrink-0">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onChange={(e) => {
                  if (e.target.files) {
                    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                className="hidden"
              />
              <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-slate-600 transition-colors" title="Attach file">
                <Paperclip className="w-4 h-4" />
              </button>
              <button className="text-slate-400 hover:text-slate-600 transition-colors text-xs flex items-center gap-1" title="Add context">
                <Layers className="w-4 h-4" /> Add Context
              </button>
              <span className="text-xs text-slate-300 hidden sm:block">Press Enter to send</span>
              <button
                disabled={(!input.trim() && attachedFiles.length === 0) || sending}
                onClick={() => sendMessage(input)}
                className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-2 flex items-center justify-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            All answers are based strictly on your uploaded documents with verifiable citations.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
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

// ── Document Processing View ──────────────────────────────────────────────────
const PROCESSING_STEPS = [
  "Parsing Document",
  "Cleaning Content",
  "Chunking Text",
  "Generating Embeddings",
  "Indexing in Vector Database"
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
                   <p className="text-sm font-medium text-slate-400 mt-0.5">Step {doc.processing_step || 1} of 5</p>
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
                   style={{ width: `calc(${(((doc.processing_step || 1) - 1) / 4) * 100}% - 0px)` }}
                />
                
                <div className="relative flex justify-between">
                  {PROCESSING_STEPS.map((step, idx) => {
                    const stepNum = idx + 1;
                    const currentStep = doc.processing_step || 1;
                    let state = "pending";
                    if (stepNum < currentStep) state = "complete";
                    if (stepNum === currentStep) state = "active";
                    
                    return (
                      <div key={idx} className="flex flex-col items-center gap-3 w-28 -translate-x-1/2" style={{ left: `${(idx / 4) * 100}%`, position: idx === 0 || idx === 4 ? "relative" : "absolute", transform: idx === 0 ? "translateX(0)" : idx === 4 ? "translateX(0)" : "translateX(-50%)" }}>
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

// ── Documents Tab ─────────────────────────────────────────────────────────────
function DocumentsTab({ workspaceId, onDocCountChange }: { workspaceId: string; onDocCountChange: (n: number) => void }) {
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
      onDocCountChange(data.total);
      
      // If any doc is processing, jump to processing view
      if (data.documents.some(d => d.status === "processing")) {
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

  // Handle background upload
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
      await fetcher(`/workspaces/${workspaceId}/documents/${docId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      onDocCountChange(documents.length - 1);
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
      <div className="p-6 flex flex-col gap-3">
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
    <div className="p-6 h-full flex flex-col relative overflow-hidden">
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

// ── Metrics Tab ───────────────────────────────────────────────────────────────
function MetricsTab({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<{
    period: string;
    company: string;
    key_metrics: Metric[];
    revenue_breakdown: { segment: string; value: number; revenue: string }[];
    quarterly_trend: { quarter: string; revenue: number; profit: number; margin: number }[];
    geography_split: { region: string; percentage: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher<typeof data>(`/workspaces/${workspaceId}/metrics`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="p-6 flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading metrics...</div>;
  if (!data) return <div className="p-6 text-center text-slate-400 py-24">Failed to load metrics.</div>;

  const maxRevenue = Math.max(...data.quarterly_trend.map((q) => q.revenue));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">Financial Metrics</h3>
          <p className="text-sm text-slate-500">{data.company} • {data.period}</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">AI Extracted</span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {data.key_metrics.map((metric) => (
          <div key={metric.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{metric.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{metric.value}</p>
            <div className={cn("flex items-center gap-1 mt-2 text-xs font-semibold", metric.trend === "up" ? "text-emerald-600" : "text-red-500")}>
              {metric.trend === "up" ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              {metric.change} {metric.period}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue Trend Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h4 className="text-sm font-bold text-slate-700 mb-4">Quarterly Revenue Trend (₹ Cr)</h4>
        <div className="flex items-end gap-4 h-36">
          {data.quarterly_trend.map((q) => {
            const heightPct = (q.revenue / maxRevenue) * 100;
            const isLatest = q.quarter === data.quarterly_trend[data.quarterly_trend.length - 1].quarter;
            return (
              <div key={q.quarter} className="flex-1 flex flex-col items-center gap-2">
                <span className="text-[10px] text-slate-500 font-medium">{(q.revenue / 1000).toFixed(0)}K</span>
                <div className="w-full relative flex items-end" style={{ height: "80px" }}>
                  <div
                    className={cn("w-full rounded-t-lg transition-all duration-500", isLatest ? "bg-blue-500" : "bg-blue-200")}
                    style={{ height: `${heightPct}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 text-center leading-tight">{q.quarter}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Two-column: Revenue Breakdown + Geography */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Segment breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-4">Revenue by Segment</h4>
          <div className="space-y-3">
            {data.revenue_breakdown.map((seg) => (
              <div key={seg.segment}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{seg.segment}</span>
                  <span className="text-slate-500">{seg.revenue} ({seg.value}%)</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-700"
                    style={{ width: `${seg.value * 2}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geography split */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h4 className="text-sm font-bold text-slate-700 mb-4">
            <Globe className="w-4 h-4 inline mr-1.5 text-slate-400" />
            Geography Split
          </h4>
          <div className="space-y-3">
            {data.geography_split.map((geo, idx) => {
              const colors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-orange-400"];
              return (
                <div key={geo.region}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", colors[idx % colors.length])} />
                      <span className="text-slate-600 font-medium">{geo.region}</span>
                    </div>
                    <span className="text-slate-500 font-semibold">{geo.percentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-700", colors[idx % colors.length])}
                      style={{ width: `${geo.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Comparison Tab ────────────────────────────────────────────────────────────
function ComparisonTab({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<{
    base_company: string;
    period: string;
    peers: Peer[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetcher<typeof data>(`/workspaces/${workspaceId}/comparison`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="p-6 flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading comparison...</div>;
  if (!data) return <div className="p-6 text-center text-slate-400 py-24">Failed to load comparison data.</div>;

  const metricRows = [
    { key: "revenue", label: "Revenue" },
    { key: "revenue_growth", label: "Revenue Growth", suffix: "%" },
    { key: "net_profit", label: "Net Profit" },
    { key: "net_margin", label: "Net Margin", suffix: "%" },
    { key: "ebit_margin", label: "EBIT Margin", suffix: "%" },
    { key: "deal_wins", label: "Deal Wins" },
    { key: "headcount", label: "Headcount" },
    { key: "attrition", label: "Attrition", suffix: "%" },
    { key: "pe_ratio", label: "P/E Ratio", suffix: "x" },
  ];

  const tickerColors: Record<string, string> = {
    INFY: "bg-blue-100 text-blue-700",
    TCS: "bg-violet-100 text-violet-700",
    WIPRO: "bg-orange-100 text-orange-700",
    HCLTECH: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">Peer Comparison</h3>
          <p className="text-sm text-slate-500">{data.period} • {data.peers.length} companies</p>
        </div>
        <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          <GitCompareArrows className="w-3.5 h-3.5 inline mr-1" />AI Compared
        </span>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-36">Metric</th>
                {data.peers.map((peer) => (
                  <th key={peer.company} className={cn("text-center py-3 px-4 font-bold text-sm", peer.is_base ? "text-blue-700 bg-blue-50" : "text-slate-700")}>
                    <div className="flex flex-col items-center gap-1">
                      <span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", tickerColors[peer.ticker] || "bg-slate-100 text-slate-600")}>
                        {peer.ticker}
                      </span>
                      {peer.company}
                      {peer.is_base && <span className="text-[10px] text-blue-500 font-normal">Base</span>}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {metricRows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-xs font-semibold text-slate-500">{row.label}</td>
                  {data.peers.map((peer) => {
                    const val = peer.metrics[row.key];
                    const display = typeof val === "number" ? `${val}${row.suffix || ""}` : (val as string);
                    return (
                      <td key={peer.company} className={cn("py-3 px-4 text-center font-semibold text-sm", peer.is_base ? "text-blue-700 bg-blue-50/50" : "text-slate-700")}>
                        {display}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Data extracted from uploaded documents and supplemented with public filings. Values are approximate.
      </p>
    </div>
  );
}

// ── Red Flags Tab ─────────────────────────────────────────────────────────────
function RedFlagsTab({ workspaceId }: { workspaceId: string }) {
  const [data, setData] = useState<{
    total_flags: number;
    last_analyzed: string;
    flags: RedFlag[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetcher<typeof data>(`/workspaces/${workspaceId}/red-flags`)
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) return <div className="p-6 flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Analyzing risks...</div>;
  if (!data) return <div className="p-6 text-center text-slate-400 py-24">Failed to load risk analysis.</div>;

  const severityConfig: Record<string, { color: string; bg: string; border: string; icon: React.ElementType }> = {
    High: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: AlertTriangle },
    Medium: { color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", icon: AlertTriangle },
    Low: { color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", icon: ShieldAlert },
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">AI Risk Analysis</h3>
          <p className="text-sm text-slate-500">{data.total_flags} risk factors identified • Last analyzed {data.last_analyzed}</p>
        </div>
        <div className="flex gap-2">
          {["High", "Medium", "Low"].map((sev) => {
            const count = data.flags.filter((f) => f.severity === sev).length;
            const cfg = severityConfig[sev];
            return count > 0 ? (
              <span key={sev} className={cn("text-xs font-bold px-2.5 py-1 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
                {count} {sev}
              </span>
            ) : null;
          })}
        </div>
      </div>

      <div className="space-y-3">
        {data.flags.map((flag) => {
          const cfg = severityConfig[flag.severity] || severityConfig["Low"];
          const Icon = cfg.icon;
          const isExpanded = expanded === flag.id;

          return (
            <div
              key={flag.id}
              className={cn("bg-white border rounded-xl overflow-hidden shadow-sm transition-all", cfg.border)}
            >
              <button
                onClick={() => setExpanded(isExpanded ? null : flag.id)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cfg.bg)}>
                  <Icon className={cn("w-4 h-4", cfg.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
                      {flag.severity}
                    </span>
                    <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{flag.category}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-800">{flag.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{flag.detected_at}</p>
                </div>
                <ChevronRight className={cn("w-4 h-4 text-slate-400 shrink-0 mt-1 transition-transform duration-200", isExpanded && "rotate-90")} />
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                  <div className="space-y-3 mt-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Description</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{flag.description}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Recommendation</p>
                      <p className="text-sm text-slate-700 leading-relaxed">{flag.recommendation}</p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs text-blue-600 font-medium">{flag.source_doc} — Page {flag.source_page}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Agent Activity Tab ────────────────────────────────────────────────────────
function AgentActivityTab({ workspaceId }: { workspaceId: string }) {
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

  if (loading) return <div className="p-6 flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading activity...</div>;

  const agentTypeColors: Record<string, string> = {
    document: "bg-blue-100 text-blue-600",
    extraction: "bg-teal-100 text-teal-600",
    risk: "bg-orange-100 text-orange-600",
    comparison: "bg-violet-100 text-violet-600",
    research: "bg-sky-100 text-sky-600",
    report: "bg-red-100 text-red-600",
  };

  const agentTypeIcons: Record<string, React.ElementType> = {
    document: FileStack,
    extraction: TrendingUp,
    risk: ShieldAlert,
    comparison: GitCompareArrows,
    research: MessageSquare,
    report: FileBarChart2,
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">Agent Activity</h3>
          <p className="text-sm text-slate-500">{data?.timeline.length || 0} agents active • Auto-refreshes every 10s</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-slate-200">
          <RotateCcw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-200" />

        <div className="space-y-4">
          {data?.timeline.map((activity, idx) => {
            const Icon = agentTypeIcons[activity.agent_type] || Bot;
            const colorClass = agentTypeColors[activity.agent_type] || "bg-slate-100 text-slate-500";

            return (
              <div key={activity.id} className="relative flex gap-4 pl-4">
                {/* Timeline dot */}
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10 mt-1 ring-4 ring-white", colorClass)}>
                  <div className="w-1.5 h-1.5 bg-current rounded-full" />
                </div>

                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{activity.agent}</p>
                        <p className="text-xs text-slate-500">{activity.action}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={activity.status} />
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        {activity.timestamp}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mt-2 leading-relaxed">{activity.details}</p>

                  {Object.keys(activity.metadata).length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {Object.entries(activity.metadata).map(([k, v]) => (
                        <span key={k} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                          {k.replace(/_/g, " ")}: <span className="font-semibold">{v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Reports Tab ───────────────────────────────────────────────────────────────
function ReportsTab({ workspaceId, onReportGenerated }: { workspaceId: string; onReportGenerated: () => void }) {
  const [data, setData] = useState<{ reports: Report[]; total: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetcher<typeof data>(`/workspaces/${workspaceId}/reports`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetcher(`/workspaces/${workspaceId}/reports/generate`, {
        method: "POST",
        body: JSON.stringify({ report_type: "Full Analysis" }),
      });
      onReportGenerated();
      // Poll for new report
      setTimeout(async () => {
        await load();
        setGenerating(false);
      }, 3500);
    } catch {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-6 flex items-center justify-center py-24 text-slate-400"><Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading reports...</div>;

  const statusConfig = {
    completed: { color: "text-emerald-700", bg: "bg-emerald-50", label: "Completed" },
    generating: { color: "text-blue-700", bg: "bg-blue-50", label: "Generating..." },
    failed: { color: "text-red-700", bg: "bg-red-50", label: "Failed" },
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-800">Generated Reports</h3>
          <p className="text-sm text-slate-500">{data?.total || 0} report{(data?.total || 0) !== 1 ? "s" : ""} in this workspace</p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          {generating ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {generating && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-blue-800">Report generation in progress...</p>
            <p className="text-xs text-blue-600">AI agents are analyzing your documents. This takes about 30 seconds.</p>
          </div>
        </div>
      )}

      {data?.reports.length === 0 && !generating ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-16 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-violet-50 flex items-center justify-center">
            <FileBarChart2 className="w-6 h-6 text-violet-400" />
          </div>
          <div className="text-center">
            <p className="font-semibold text-slate-700">No reports yet</p>
            <p className="text-sm text-slate-400 mt-1">Generate an AI-powered financial report from your documents</p>
          </div>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Zap className="w-4 h-4" /> Generate First Report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {data?.reports.map((report) => {
            const cfg = statusConfig[report.status] || statusConfig.completed;
            return (
              <div key={report.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <FileBarChart2 className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800 text-sm truncate">{report.title}</p>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full shrink-0", cfg.color, cfg.bg)}>
                        {report.status === "generating" && <Loader2 className="w-3 h-3 inline animate-spin mr-1" />}
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{report.summary}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {report.created_at}
                      </span>
                      {report.pages > 0 && (
                        <span className="text-xs text-slate-400">{report.pages} pages</span>
                      )}
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{report.type}</span>
                    </div>
                  </div>
                  {report.status === "completed" && (
                    <button
                      className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-slate-200 shrink-0"
                      title="Download report"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const { user: firebaseUser, dbUser } = useAuth();
  const workspaceId = params.id as string;

  const [ws, setWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("Chat");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateSuccess, setGenerateSuccess] = useState(false);

  const uploadRef = useRef<HTMLInputElement>(null);
  const userName = dbUser?.name || firebaseUser?.displayName || "Vivek Chaurasiya";

  const loadWorkspace = useCallback(async () => {
    try {
      const data = await fetcher<Workspace>(`/workspaces/${workspaceId}`);
      setWs(data);
    } catch {
      router.push("/workspace");
    } finally {
      setLoading(false);
    }
  }, [workspaceId, router]);

  const handleDocCountChange = useCallback((n: number) => {
    setWs((prev) => (prev && prev.docs !== n ? { ...prev, docs: n } : prev));
  }, []);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  const handleHeaderUpload = async (files: File[]) => {
    const pdfs = files.filter((f) => f.type === "application/pdf");
    if (!pdfs.length) return;
    setUploading(true);
    const formData = new FormData();
    pdfs.forEach((f) => formData.append("files", f));
    try {
      await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/documents`, {
        method: "POST",
        body: formData,
      });
      await loadWorkspace();
      setActiveTab("Documents");
    } catch (e) {
      console.error("Upload failed", e);
    } finally {
      setUploading(false);
    }
  };

  const handleGenerateReport = async () => {
    setGenerating(true);
    setGenerateSuccess(false);
    try {
      await fetcher(`/workspaces/${workspaceId}/reports/generate`, {
        method: "POST",
        body: JSON.stringify({ report_type: "Full Analysis" }),
      });
      setActiveTab("Reports");
      setGenerateSuccess(true);
      setTimeout(() => setGenerateSuccess(false), 3000);
      setTimeout(loadWorkspace, 3500);
    } catch (e) {
      console.error("Generate report failed:", e);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!ws) return null;

  return (
    <div className="flex flex-col flex-1 min-h-0 h-[calc(100vh-56px)] overflow-hidden bg-slate-50">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
          <Link href="/workspace" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <ChevronLeft className="w-3.5 h-3.5" /> Workspaces
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-600 truncate max-w-xs">{ws.name}</span>
        </div>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 truncate">{ws.name}</h1>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {ws.updatedAt} &bull; {ws.docs} Document{ws.docs !== 1 ? "s" : ""} &bull; {ws.chats} Chat{ws.chats !== 1 ? "s" : ""} &bull; {ws.reports} Report{ws.reports !== 1 ? "s" : ""}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept=".pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                handleHeaderUpload(Array.from(e.target.files || []));
                e.target.value = "";
              }}
            />
            <button
              onClick={handleGenerateReport}
              disabled={generating}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm",
                generateSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              )}
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : generateSuccess ? (
                <Check className="w-4 h-4" />
              ) : (
                <FileBarChart2 className="w-4 h-4" />
              )}
              {generating ? "Generating..." : generateSuccess ? "Report Started!" : "Generate Report"}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 mt-4 -mb-4 overflow-x-auto scrollbar-none">
          {TABS.map((tab) => {
            const Icon = TAB_ICONS[tab];
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors",
                  active
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Main panel */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === "Chat" && <ChatTab workspaceId={workspaceId} userName={userName} />}
          {activeTab === "Documents" && (
            <div className="flex-1 overflow-y-auto">
              <DocumentsTab
                workspaceId={workspaceId}
                onDocCountChange={handleDocCountChange}
              />
            </div>
          )}
          {activeTab === "Metrics" && (
            <div className="flex-1 overflow-y-auto">
              <MetricsTab workspaceId={workspaceId} />
            </div>
          )}
          {activeTab === "Comparison" && (
            <div className="flex-1 overflow-y-auto">
              <ComparisonTab workspaceId={workspaceId} />
            </div>
          )}
          {activeTab === "Red Flags" && (
            <div className="flex-1 overflow-y-auto">
              <RedFlagsTab workspaceId={workspaceId} />
            </div>
          )}
          {activeTab === "Agent Activity" && (
            <div className="flex-1 overflow-y-auto">
              <AgentActivityTab workspaceId={workspaceId} />
            </div>
          )}
          {activeTab === "Reports" && (
            <div className="flex-1 overflow-y-auto">
              <ReportsTab
                workspaceId={workspaceId}
                onReportGenerated={loadWorkspace}
              />
            </div>
          )}
        </div>

        {/* Agent Sidebar */}
        <AgentSidebar
          workspaceId={workspaceId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((v) => !v)}
        />
      </div>
    </div>
  );
}