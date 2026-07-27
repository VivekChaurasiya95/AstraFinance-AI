"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Bot, MessageSquare, Paperclip, Send, Layers, ShieldAlert, Loader2, FileText, TrendingUp, GitCompareArrows, FileBarChart2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  citations?: { doc: string; page: number }[];
  attachments?: { name: string; type: string }[];
}

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

export default function ChatPage() {
  const params = useParams();
  const workspaceId = params.id as string;
  const { user: firebaseUser, dbUser } = useAuth();
  const userName = dbUser?.name || firebaseUser?.displayName || "Vivek Chaurasiya";
  const firstName = userName.split(" ")[0] || "there";

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

  return (
    <div className="flex flex-col h-full relative">
      {messages.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center pb-8 px-6 gap-8 overflow-y-auto">
          <div className="text-center mt-8">
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