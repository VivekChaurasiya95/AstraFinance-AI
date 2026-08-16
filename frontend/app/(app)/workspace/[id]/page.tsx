"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { 
  Bot, MessageSquare, Paperclip, Send, Layers, ShieldAlert, Loader2, FileText, 
  TrendingUp, GitCompareArrows, FileBarChart2, X, Search, Plus, Pencil, Trash2, 
  Check, Edit, PanelLeftClose, PanelLeftOpen, Book, Folder, Clock, Blocks, Code, MoreHorizontal, 
  Pin, Store, ChevronDown, Mic, ArrowUp, Copy, RotateCcw, CheckCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher, API_BASE_URL, uploadMultipart } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";

interface ChatMsg {
  role: "user" | "assistant" | "model";
  content: string;
  citations?: { doc: string; page: number; field?: string }[];
  attachments?: { name: string; type: string }[];
}

interface ChatSession {
  _id: string;
  title: string;
  message_count: number;
  updated_at: string;
  is_pinned?: boolean;
}

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
  const [isRecording, setIsRecording] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editMessageText, setEditMessageText] = useState("");

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

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleRetry = (index: number) => {
    let lastUserMsg = "";
    for (let i = index; i >= 0; i--) {
      if (messages[i].role === "user") {
        lastUserMsg = messages[i].content;
        break;
      }
    }
    if (lastUserMsg && !sending) {
      sendMessage(lastUserMsg);
    }
  };

  const handleEditMessage = (index: number) => {
    setEditingMessageIndex(index);
    setEditMessageText(messages[index].content);
  };

  const submitEditMessage = (index: number) => {
    if (!editMessageText.trim() || sending) return;
    
    // To cleanly retry from this point, we truncate the history at this message
    const newMessages = messages.slice(0, index);
    setMessages(newMessages);
    setEditingMessageIndex(null);
    sendMessage(editMessageText.trim());
  };

  const cancelEditMessage = () => {
    setEditingMessageIndex(null);
  };

  const loadSessions = () => {
    fetcher<{ sessions: ChatSession[] }>(`/workspaces/${workspaceId}/chat_sessions`)
      .then((data) => setSessions(data.sessions))
      .catch(console.error);
  };

  const handleVoiceInput = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    
    if (isRecording) {
      return; // It handles its own stop
    }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    
    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map(result => result.transcript)
        .join("");
      
      setInput(transcript);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
      }
    };
    recognition.onerror = (e: any) => {
      console.error(e);
      setIsRecording(false);
    };
    recognition.onend = () => setIsRecording(false);
    
    recognition.start();
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

  const handleTogglePin = async (sessionId: string, currentPinned: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetcher(`/workspaces/${workspaceId}/chat_sessions/${sessionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_pinned: !currentPinned })
      });
      setSessions(prev => prev.map(s => s._id === sessionId ? { ...s, is_pinned: !currentPinned } : s));
    } catch (error) {
      console.error("Failed to toggle pin", error);
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
      if (filesToSend.length > 0) {
        // Only upload PDFs to the document library
        const pdfFiles = filesToSend.filter(f => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
        if (pdfFiles.length > 0) {
          const docFormData = new FormData();
          pdfFiles.forEach(file => {
            docFormData.append("files", file);
          });
          try {
            await uploadMultipart(`/workspaces/${workspaceId}/documents`, docFormData);
          } catch (e) {
            console.error("Failed to upload PDFs to document library", e);
          }
        }
      }

      const finalMessage = text.trim() || (filesToSend.length > 0 ? "I have just uploaded new files. Please acknowledge them." : "");
      
      const formData = new FormData();
      formData.append("message", finalMessage);
      if (activeSessionId) {
        formData.append("session_id", activeSessionId);
      }
      
      // Append all files to the chat endpoint (for image processing and acknowledgment)
      filesToSend.forEach(file => {
        formData.append("files", file);
      });
      
      const data = await uploadMultipart<{ reply: string; citations: { doc: string; page: number; field?: string }[]; session_id?: string }>(`/workspaces/${workspaceId}/chat`, formData);

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
  const pinnedSessions = filteredSessions.filter(s => s.is_pinned);
  const recentSessions = filteredSessions.filter(s => !s.is_pinned);

  // Render a chat session item (used in Recents)
  const renderSessionItem = (s: ChatSession) => {
    return (
      <div
        key={s._id}
        onClick={() => {
          setActiveSessionId(s._id);
          if(window.innerWidth < 1024) setIsHistoryOpen(false);
        }}
        className={cn(
          "w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-left transition-colors group cursor-pointer text-sm",
          activeSessionId === s._id
            ? "bg-slate-200 text-slate-900"
            : "hover:bg-slate-200/50 text-slate-700"
        )}
      >
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {editingSessionId === s._id ? (
            <div className="flex items-center gap-1 w-full" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={editTitle}
                onChange={e => setEditTitle(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleRenameSession(s._id);
                  if (e.key === "Escape") setEditingSessionId(null);
                }}
                className="flex-1 bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 outline-none focus:ring-1 focus:ring-blue-500 w-full"
              />
              <button onClick={() => handleRenameSession(s._id)} className="p-1 text-green-600 hover:bg-green-50 rounded shrink-0">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setEditingSessionId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded shrink-0">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <p className="font-medium truncate">{s.title || "New Conversation"}</p>
          )}
        </div>
        
        {/* Action icons shown on hover */}
        {editingSessionId !== s._id && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setEditingSessionId(s._id);
                setEditTitle(s.title || "New Conversation");
              }}
              className="p-1 text-slate-400 hover:text-slate-800 rounded"
              title="Rename"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => handleTogglePin(s._id, !!s.is_pinned, e)}
              className={cn("p-1 rounded", s.is_pinned ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" : "text-slate-400 hover:text-slate-800 hover:bg-slate-200")}
              title={s.is_pinned ? "Unpin" : "Pin"}
            >
              <Pin className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => handleDeleteSession(s._id, e)}
              className="p-1 text-slate-400 hover:text-red-600 rounded"
              title="Delete"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      e.preventDefault();
      setAttachedFiles(prev => [...prev, ...Array.from(e.clipboardData.files)]);
    }
  };

  return (
    <div 
      className="flex h-screen bg-[#f9f9f9]"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-all">
          <div className="bg-white rounded-3xl p-10 flex flex-col items-center shadow-2xl transform scale-105 transition-transform">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-500">
              <Plus className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-bold text-slate-800">Drop files here</h3>
            <p className="text-slate-500 mt-2 text-center max-w-sm">
              Your files will be uploaded and attached to the current chat session.
            </p>
          </div>
        </div>
      )}

      {/* Sidebar (Chat History) */}
      {isHistoryOpen && (
        <div className="w-[260px] shrink-0 bg-[#f9f9f9] border-r border-slate-200 flex flex-col h-full transition-all">
          
          {/* Top Sidebar Header */}
          <div className="p-3 flex items-center justify-between">
            <button
              onClick={() => {
                setActiveSessionId(null);
                if(window.innerWidth < 1024) setIsHistoryOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-200/50 rounded-lg transition-colors font-medium text-sm flex-1"
            >
              <div className="bg-slate-200 rounded-full p-1"><Edit className="w-3.5 h-3.5" /></div>
              New chat
            </button>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="p-2 text-slate-500 hover:bg-slate-200/50 rounded-lg transition-colors ml-1"
              title="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
          </div>



          {/* History Sections */}
          <div className="flex-1 overflow-y-auto px-3 space-y-6 pb-4">
            
            {/* Pinned Section */}
            {pinnedSessions.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 px-3 mb-2">Pinned</h4>
                <div className="space-y-0.5">
                  {pinnedSessions.map(renderSessionItem)}
                </div>
              </div>
            )}

            {/* Recents Section */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 px-3 mb-2">Recents</h4>
              <div className="space-y-0.5">
                {recentSessions.length > 0 ? (
                  recentSessions.map(renderSessionItem)
                ) : (
                  <div className="px-3 py-2 text-xs text-slate-400">No recent chats</div>
                )}
              </div>
            </div>

          </div>

          {/* User Profile Footer */}
          <div className="p-3 border-t border-slate-200 flex items-center justify-between">
            <button className="flex items-center gap-2 hover:bg-slate-200/50 px-2 py-1.5 rounded-lg transition-colors min-w-0">
              <div className="w-7 h-7 rounded-full bg-orange-200 text-orange-800 flex items-center justify-center text-xs font-bold shrink-0">
                {firstName.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-semibold text-slate-800 truncate">{userName}</span>
                <span className="text-[10px] text-slate-500 truncate">Go</span>
              </div>
            </button>
            <button className="p-1.5 text-slate-500 hover:bg-slate-200/50 rounded-lg">
              <Store className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="flex flex-col h-full flex-1 relative min-w-0 bg-white">
        
        {/* Top Header */}
        <div className="h-14 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            {!isHistoryOpen && (
              <button onClick={() => setIsHistoryOpen(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center px-3 py-1.5">
              <span className="font-semibold text-slate-800 text-lg">FinanceGPT</span>
            </div>
          </div>
        </div>

        {loadingMessages ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
            <h2 className="text-3xl font-semibold text-slate-800 mb-12">
              What's on your mind today?
            </h2>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-4 max-w-3xl mx-auto w-full group",
                  msg.role === "user" ? "flex-row-reverse" : ""
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-1",
                    msg.role === "user" ? "hidden" : "bg-white border border-slate-200 text-slate-600"
                  )}
                >
                  {msg.role !== "user" && <Bot className="w-5 h-5" />}
                </div>
                
                {/* Bubble */}
                <div
                  className={cn(
                    "px-4 py-2.5 text-[15px] leading-relaxed max-w-[85%]",
                    msg.role === "user"
                      ? "bg-slate-100 text-slate-800 rounded-3xl"
                      : "bg-transparent text-slate-800"
                  )}
                >
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {msg.attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs bg-slate-200 text-slate-700">
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {/* Bubble Content */}
                  {editingMessageIndex === i ? (
                    <div className="flex flex-col gap-2 w-full min-w-[300px]">
                      <textarea
                        value={editMessageText}
                        onChange={(e) => setEditMessageText(e.target.value)}
                        className="w-full bg-white border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none min-h-[100px]"
                        autoFocus
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={cancelEditMessage} className="px-4 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors">Cancel</button>
                        <button onClick={() => submitEditMessage(i)} className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-full transition-colors">Send</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {msg.content && <div className="whitespace-pre-wrap">{msg.content}</div>}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2">
                          {msg.citations.map((c, ci) => {
                            const colors = [
                              "bg-blue-50 border-blue-200 text-blue-700",
                              "bg-purple-50 border-purple-200 text-purple-700",
                              "bg-emerald-50 border-emerald-200 text-emerald-700",
                              "bg-amber-50 border-amber-200 text-amber-700",
                              "bg-rose-50 border-rose-200 text-rose-700"
                            ];
                            const colorClass = colors[ci % colors.length];
                            return (
                              <div
                                key={ci}
                                className={`flex items-center justify-between gap-3 text-[12px] border px-3 py-2 rounded-xl transition-all hover:shadow-sm ${colorClass}`}
                              >
                                <div className="flex items-center gap-2 overflow-hidden flex-1">
                                  <FileText className="w-4 h-4 shrink-0 opacity-75" />
                                  <span className="font-medium truncate">{c.doc}</span>
                                  {c.field && (
                                    <span className="opacity-80 italic truncate text-[11px] ml-1 shrink-0 bg-black/5 px-1.5 py-0.5 rounded">
                                      {c.field.replace(/_/g, ' ')}
                                    </span>
                                  )}
                                </div>
                                <span className="shrink-0 opacity-80 text-[11px] font-bold bg-black/5 px-2 py-0.5 rounded-md">
                                  Page {c.page}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Message Actions */}
                  {editingMessageIndex !== i && (
                    <div className={cn(
                      "mt-2 flex items-center gap-1 transition-opacity opacity-100",
                      msg.role === "user" ? "justify-end" : "justify-start"
                    )}>
                      {msg.role === "user" && (
                        <button
                          onClick={() => handleEditMessage(i)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleCopy(msg.content, i)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded transition-colors"
                        title="Copy"
                      >
                        {copiedIndex === i ? <CheckCheck className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      
                      {msg.role !== "user" && (
                        <button
                          onClick={() => handleRetry(i)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded transition-colors"
                          title="Retry"
                          disabled={sending}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-4 max-w-3xl mx-auto w-full">
                <div className="w-8 h-8 rounded-full bg-white border border-slate-200 text-slate-600 flex items-center justify-center mt-1">
                  <Bot className="w-5 h-5" />
                </div>
                <div className="bg-transparent px-4 py-3">
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

        {/* Floating Input Area */}
        <div className="px-4 pb-6 pt-2 w-full flex justify-center">
          <div className="w-full max-w-[48rem]">
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 px-2">
                {attachedFiles.map((file, idx) => (
                  <div key={idx} className="group relative flex items-center gap-3 bg-[#202123] text-white pr-4 pl-2 py-2 rounded-2xl w-fit shadow-sm border border-slate-700">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-red-500 fill-red-500/20" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="truncate max-w-[140px] text-sm font-medium leading-tight">{file.name}</span>
                      <span className="text-[11px] text-slate-400 font-medium uppercase mt-0.5">
                        {file.name.split('.').pop() || "FILE"}
                      </span>
                    </div>
                    <button 
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== idx))} 
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-slate-600 hover:bg-slate-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="relative flex items-center gap-2 border border-slate-300 rounded-[26px] bg-slate-50 shadow-sm focus-within:bg-white focus-within:ring-1 focus-within:ring-slate-400 focus-within:border-slate-400 transition-all px-2.5 py-2.5">
              
              <input
                type="file"
                multiple
                ref={fileInputRef}
                onClick={(e) => {
                  e.currentTarget.value = "";
                }}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                  }
                }}
                className="hidden"
              />
              
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()} 
                className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-full transition-colors shrink-0" 
                title="Attach file"
              >
                <Plus className="w-5 h-5" />
              </button>
              
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                onPaste={handlePaste}
                placeholder="Ask anything (or paste an image)"
                className="flex-1 bg-transparent resize-none outline-none text-[15px] text-slate-800 placeholder:text-slate-500 min-h-[24px] max-h-[200px] py-1 self-center"
              />
              
              {(!input.trim() && attachedFiles.length === 0) ? (
                <button
                  onClick={handleVoiceInput}
                  disabled={sending}
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 self-end transition-all",
                    isRecording 
                      ? "bg-red-500 text-white animate-pulse shadow-md" 
                      : "bg-slate-200 text-slate-500 hover:bg-slate-300"
                  )}
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
              ) : (
                <button
                  disabled={sending}
                  onClick={() => sendMessage(input)}
                  className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center hover:bg-slate-800 disabled:opacity-40 transition-all shrink-0 self-end shadow-sm"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
                </button>
              )}
            </div>
            
            <p className="text-center text-[11px] text-slate-400 mt-2">
              All answers are based strictly on your uploaded documents with verifiable citations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}