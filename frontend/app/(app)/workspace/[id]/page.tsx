"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { Bot, MessageSquare, Paperclip, Send, Layers, ShieldAlert, Loader2, FileText, TrendingUp, GitCompareArrows, FileBarChart2, X, Search, Plus, Pencil, Trash2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL, uploadMultipart } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  citations?: { doc: string; page: number }[];
  attachments?: { name: string; type: string }[];
}

interface ChatSession {
  _id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

const QUICK_ACTIONS = [
  {
    icon: TrendingUp,
    color: "bg-blue-50 text-blue-500",
    title: "Financial Overview",
    desc: "Give me a summary of the uploaded document's performance.",
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

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadSessions = () => {
    fetcher<{ sessions: ChatSession[] }>(`/workspaces/${workspaceId}/chat_sessions`)
      .then((data) => setSessions(data.sessions))
      .catch(console.error);
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this conversation?")) return;
    
    try {
      await fetcher(`/workspaces/${workspaceId}/chat_sessions/${sessionId}`, { method: "DELETE" });
      setSessions(prev => prev.filter(s => s._id !== sessionId));
      if (activeSessionId === sessionId) setActiveSessionId(null);
    } catch (error) {
      console.error("Failed to delete session", error);
    }
  };

  const handleRenameSession = async (sessionId: string) => {
    if (!editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    
    try {
      await fetcher(`/workspaces/${workspaceId}/chat_sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim() })
      });
      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, title: editTitle.trim() } : s));
      setEditingSessionId(null);
    } catch (error) {
      console.error("Failed to rename session", error);
    }
  };

  useEffect(() => {
    loadSessions();
  }, [workspaceId]);

  useEffect(() => {
    if (activeSessionId) {
      setLoadingMessages(true);
      fetcher<{ messages: ChatMsg[] }>(`/workspaces/${workspaceId}/chat_sessions/${activeSessionId}`)
        .then((data) => setMessages(data.messages))
        .catch(console.error)
        .finally(() => setLoadingMessages(false));
    } else {
      setMessages([]);
    }
  }, [activeSessionId, workspaceId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

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
      const formData = new FormData();
      formData.append("message", text.trim());
      if (activeSessionId) {
        formData.append("session_id", activeSessionId);
      }
      if (filesToSend.length > 0) {
        filesToSend.forEach(file => {
          formData.append("files", file);
        });
      }
      
      const data = await uploadMultipart<{ reply: string; citations: { doc: string; page: number }[]; session_id?: string }>(`/workspaces/${workspaceId}/chat`, formData);

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, citations: data.citations },
      ]);

      if (data.session_id && !activeSessionId) {
        setActiveSessionId(data.session_id);
      }
      loadSessions();
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, there was an error communicating with the Research Agent. Please try again." },
      ]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const filteredSessions = sessions.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const groupSessions = (sessionsList: ChatSession[]) => {
    const today: ChatSession[] = [];
    const yesterday: ChatSession[] = [];
    const last7Days: ChatSession[] = [];
    const earlier: ChatSession[] = [];

    const now = new Date();
    const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayDate = todayDate - 86400000;
    const last7DaysDate = todayDate - 7 * 86400000;

    sessionsList.forEach(s => {
      const date = new Date(s.updated_at).getTime();
      if (date >= todayDate) today.push(s);
      else if (date >= yesterdayDate) yesterday.push(s);
      else if (date >= last7DaysDate) last7Days.push(s);
      else earlier.push(s);
    });

    return { today, yesterday, last7Days, earlier };
  };

  const grouped = groupSessions(filteredSessions);

  return (
    <div className="flex h-full w-full overflow-hidden bg-white">
      {/* Main Chat Area */}
      <div className="flex flex-col h-full flex-1 relative min-w-0">
        
        {/* Mobile Sidebar Toggle Header (visible only on small screens) */}
        {!isHistoryOpen && (
           <div className="lg:hidden absolute top-4 right-4 z-10">
             <button onClick={() => setIsHistoryOpen(true)} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm text-slate-500 hover:text-slate-800">
               <MessageSquare className="w-5 h-5" />
             </button>
           </div>
        )}

        {loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center pb-8 px-6 gap-8 overflow-y-auto">
            <div className="text-center mt-8">
              <h2 className="text-3xl font-bold text-slate-800 mb-2">
                Hello, {firstName}! 👋
              </h2>
              <p className="text-slate-500 text-base">
                How can I help you analyze your financial reports today?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
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
        <div className="px-6 pb-6 pt-3 bg-white border-t border-slate-100">
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
                placeholder="Ask anything about your documents..."
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
                <span className="text-xs text-slate-300 hidden sm:block">Press ⌘ + Enter to send</span>
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

      {/* Right Sidebar for Chat History */}
      {isHistoryOpen && (
        <div className="w-80 shrink-0 border-l border-slate-100 bg-white flex flex-col h-full transition-all">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-blue-500" />
              Chat History
            </h3>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setActiveSessionId(null);
                  if(window.innerWidth < 1024) setIsHistoryOpen(false);
                }}
                className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-blue-600 rounded-lg transition-colors"
                title="New Chat"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors"
                title="Close sidebar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-xs outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1 rounded">⌘</span>
                <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1 rounded">K</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {Object.entries(grouped).map(([group, list]) => {
              if (list.length === 0) return null;
              
              const groupLabels: Record<string, string> = {
                today: "Today",
                yesterday: "Yesterday",
                last7Days: "Last 7 days",
                earlier: "Earlier"
              };

              return (
                <div key={group} className="space-y-1">
                  <h4 className="text-[11px] font-semibold text-slate-400 px-2 mb-2 uppercase tracking-wider">
                    {groupLabels[group]}
                  </h4>
                  {list.map((s) => (
                    <div
                      key={s._id}
                      onClick={() => {
                        setActiveSessionId(s._id);
                        if(window.innerWidth < 1024) setIsHistoryOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-start gap-3 p-2 rounded-lg text-left transition-colors group cursor-pointer",
                        activeSessionId === s._id
                          ? "bg-blue-50/60 text-blue-700"
                          : "hover:bg-slate-50 text-slate-700"
                      )}
                    >
                      <MessageSquare className={cn("w-3.5 h-3.5 mt-0.5 shrink-0", activeSessionId === s._id ? "text-blue-500" : "text-slate-400 group-hover:text-blue-500")} />
                      <div className="flex-1 min-w-0">
                        {editingSessionId === s._id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              autoFocus
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleRenameSession(s._id);
                                if (e.key === "Escape") setEditingSessionId(null);
                              }}
                              className="flex-1 bg-white border border-blue-300 rounded px-1.5 py-0.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button onClick={() => handleRenameSession(s._id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                              <Check className="w-3 h-3" />
                            </button>
                            <button onClick={() => setEditingSessionId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <p className="text-xs font-medium truncate pr-4">{s.title || "New Conversation"}</p>
                        )}
                        
                        <div className="flex items-center justify-between mt-1 h-4 relative">
                          {/* Timestamps and badges normally visible */}
                          <div className={cn("flex items-center justify-between w-full transition-opacity", 
                            editingSessionId !== s._id ? "group-hover:opacity-0" : ""
                          )}>
                            <span className="text-[10px] text-slate-400">
                              {new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {s.message_count > 0 && (
                              <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded-full font-medium">
                                {s.message_count}
                              </span>
                            )}
                          </div>
                          
                          {/* Action icons shown on hover */}
                          {editingSessionId !== s._id && (
                            <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-slate-50 via-slate-50 to-transparent pl-4">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingSessionId(s._id);
                                  setEditTitle(s.title || "New Conversation");
                                }}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Rename"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button 
                                onClick={(e) => handleDeleteSession(s._id, e)}
                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}

            {sessions.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">No conversations yet</p>
              </div>
            )}
            
            {filteredSessions.length === 0 && sessions.length > 0 && (
              <div className="text-center py-8 text-slate-400">
                <p className="text-xs">No results found</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            >
              <X className="w-3 h-3" /> Clear search
            </button>
            <span className="text-xs text-slate-400">{filteredSessions.length} conversations</span>
          </div>
        </div>
      )}
    </div>
  );
}