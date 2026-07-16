"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Paperclip,
  Bot,
  FileText,
  Loader2,
  ShieldAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Plus,
  Square,
  Sparkles,
  ExternalLink,
  Search as SearchIcon,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Clock,
  History,
  MessageSquare,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetcher } from "@/lib/api";
import type { ChatMsg, Citation, ChatSession } from "./types";

// ── Mock Chat History Data ────────────────────────────────────────────────────
const MOCK_HISTORY: ChatSession[] = [
  {
    id: "1",
    firstQuestion: "What were the major growth drivers for Infosys in Q1 FY25?",
    messageCount: 12,
    timestamp: "10:24 AM",
    date: "Today",
  },
  {
    id: "2",
    firstQuestion: "How did Infosys perform compared to last quarter?",
    messageCount: 8,
    timestamp: "09:48 AM",
    date: "Today",
  },
  {
    id: "3",
    firstQuestion: "Show revenue breakup by segment",
    messageCount: 6,
    timestamp: "09:18 AM",
    date: "Today",
  },
  {
    id: "4",
    firstQuestion: "What are the key business risks for Infosys?",
    messageCount: 10,
    timestamp: "Yesterday, 04:32 PM",
    date: "Yesterday",
  },
  {
    id: "5",
    firstQuestion: "Compare Infosys and TCS Profitability",
    messageCount: 14,
    timestamp: "Yesterday, 11:07 AM",
    date: "Yesterday",
  },
  {
    id: "6",
    firstQuestion: "How is Infosys doing in the cloud business?",
    messageCount: 7,
    timestamp: "May 11, 2025",
    date: "Last 7 days",
  },
  {
    id: "7",
    firstQuestion: "Summarize the cash flow statement",
    messageCount: 5,
    timestamp: "May 10, 2025",
    date: "Last 7 days",
  },
  {
    id: "8",
    firstQuestion: "Any red flags in the financials?",
    messageCount: 6,
    timestamp: "May 9, 2025",
    date: "Last 7 days",
  },
  {
    id: "9",
    firstQuestion: "Give me an overview of this report",
    messageCount: 4,
    timestamp: "May 6, 2025",
    date: "Earlier",
  },
];

// ── Placeholder rotating prompts ──────────────────────────────────────────────
const EXAMPLE_PROMPTS = [
  "Compare TCS and Infosys profitability",
  "What are the major business risks?",
  "Show revenue breakup by segment",
  "What were the key growth drivers?",
  "Summarize the balance sheet highlights",
];

// ── Suggested Question Chips ──────────────────────────────────────────────────
const SUGGESTED_QUESTIONS = [
  "How did Infosys perform compared to last quarter?",
  "What are the key business risks?",
  "Show revenue breakup by segment",
];

// ── Citations Viewer Panel ────────────────────────────────────────────────────
function CitationsViewer({
  citations,
  activeCitationIdx,
  onClose,
  onChangeCitation,
}: {
  citations: Citation[];
  activeCitationIdx: number;
  onClose: () => void;
  onChangeCitation: (idx: number) => void;
}) {
  if (citations.length === 0) return null;

  const active = citations[activeCitationIdx] || citations[0];

  return (
    <div className="w-[360px] bg-white border-l border-slate-200 flex flex-col shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-800">Citations</span>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
            {citations.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Source navigation */}
      <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50">
        <p className="text-xs text-slate-500 mb-2">
          Source {activeCitationIdx + 1} of {citations.length}
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              onChangeCitation(
                (activeCitationIdx - 1 + citations.length) % citations.length
              )
            }
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-7 h-7 rounded bg-red-50 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-red-500" />
            </div>
            <span className="text-xs font-medium text-slate-700 truncate">
              {active.doc}
            </span>
          </div>
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-medium shrink-0">
            p. {active.page}
          </span>
          <button
            onClick={() =>
              onChangeCitation((activeCitationIdx + 1) % citations.length)
            }
            className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page info */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100">
        <span className="text-xs text-slate-400">
          Page {active.page} of 68
        </span>
        <div className="flex items-center gap-1">
          <button className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Document content preview */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4">
          <h4 className="text-sm font-bold text-slate-800 mb-3">
            Q1 FY25 Performance Highlights
          </h4>
          <div className="space-y-2">
            <p className="text-xs text-slate-600 leading-relaxed">
              <span className="font-semibold">
                • Strong deal wins and pipeline
              </span>
            </p>
            {active.highlightedText ? (
              <p className="text-xs text-slate-700 leading-relaxed bg-yellow-200/60 px-1.5 py-1 rounded border border-yellow-300">
                {active.highlightedText}
              </p>
            ) : (
              <p className="text-xs text-slate-700 leading-relaxed bg-yellow-200/60 px-1.5 py-1 rounded border border-yellow-300">
                Total Contract Value (TCV) for Q1 FY25 was $2.1 billion, an
                increase of 19.7% QoQ. The quarter saw strong large deal wins
                across BFSI, Manufacturing and Retail verticals.
              </p>
            )}
          </div>

          {/* Mini table */}
          <div className="mt-4 border border-slate-200 rounded-lg overflow-hidden bg-white">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-1.5 px-2 font-semibold text-slate-600">
                    Deal Wins (TCV)
                  </th>
                  <th className="text-right py-1.5 px-2 text-slate-400">
                    (USD Billion)
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 px-2 text-slate-500">Q4 FY24</td>
                  <td className="py-1.5 px-2 text-right text-slate-700 font-medium">
                    1.75
                  </td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-1.5 px-2 text-slate-500">Q1 FY25</td>
                  <td className="py-1.5 px-2 text-right text-slate-700 font-medium">
                    2.10
                  </td>
                </tr>
                <tr>
                  <td className="py-1.5 px-2 text-slate-500">QoQ Growth</td>
                  <td className="py-1.5 px-2 text-right text-emerald-600 font-bold">
                    19.7%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Highlights section */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Bookmark className="w-3 h-3" /> Highlights on this page
            </span>
            <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
              1
            </span>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-orange-800 mb-1">
              Strong deal wins and pipeline
            </p>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Total Contract Value (TCV) for Q1 FY25 was $2.1 billion, an
              increase of 19.7% QoQ.
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Page {active.page}</p>
          </div>
        </div>

        {/* Open in full document */}
        <button className="w-full mt-4 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-xl py-2.5 hover:bg-blue-50 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" />
          Open in full document
        </button>
      </div>
    </div>
  );
}

// ── Chat History Drawer (Screen 16) ───────────────────────────────────────────
function ChatHistoryDrawer({
  open,
  onClose,
  onSelectSession,
}: {
  open: boolean;
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!open) return null;

  const filtered = MOCK_HISTORY.filter((s) =>
    searchQuery
      ? s.firstQuestion.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  const grouped = filtered.reduce(
    (acc, session) => {
      if (!acc[session.date]) acc[session.date] = [];
      acc[session.date].push(session);
      return acc;
    },
    {} as Record<string, ChatSession[]>
  );

  const dateOrder = ["Today", "Yesterday", "Last 7 days", "Earlier"];

  return (
    <div className="w-[360px] bg-white border-l border-slate-200 flex flex-col shrink-0 h-full animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-slate-600" />
          <span className="text-sm font-bold text-slate-800">Chat History</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-slate-100">
        <div className="relative">
          <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-10 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 bg-slate-100 px-1.5 py-0.5 rounded">
            ⌘K
          </span>
        </div>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <MessageSquare className="w-8 h-8 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-slate-500">
              {searchQuery
                ? "No matching conversations"
                : "No conversations yet"}
            </p>
            <p className="text-xs text-slate-400 mt-1 text-center">
              {searchQuery
                ? "Try a different search term"
                : "Ask your first question"}
            </p>
          </div>
        ) : (
          dateOrder.map((dateGroup) => {
            const sessions = grouped[dateGroup];
            if (!sessions || sessions.length === 0) return null;
            return (
              <div key={dateGroup}>
                <div className="px-4 py-2 sticky top-0 bg-white z-10">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {dateGroup}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => onSelectSession(session)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-start gap-3 group"
                    >
                      <MessageSquare className="w-4 h-4 text-slate-400 mt-0.5 shrink-0 group-hover:text-blue-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate group-hover:text-blue-600 transition-colors">
                          {session.firstQuestion}
                        </p>
                      </div>
                      <div className="shrink-0 flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-slate-400">
                          {session.timestamp}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {session.messageCount}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear search
          </button>
        )}
        <span className="text-[10px] text-slate-400 ml-auto">
          {filtered.length} conversations
        </span>
      </div>
    </div>
  );
}

// ── Quick Action Suggestions ──────────────────────────────────────────────────
const QUICK_ACTIONS = [
  {
    icon: Sparkles,
    color: "bg-blue-50 text-blue-500",
    title: "Financial Overview",
    desc: "Give me a summary of Infosys Q1 FY25 performance.",
    prompt: "Give me a financial overview and summary of performance.",
  },
  {
    icon: Sparkles,
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
    icon: FileText,
    color: "bg-violet-50 text-violet-500",
    title: "Generate Report",
    desc: "Create a comprehensive report for this workspace.",
    prompt: "Generate a comprehensive financial report for this workspace.",
  },
];

// ── Main Chat Tab ─────────────────────────────────────────────────────────────
export function ChatTab({
  workspaceId,
  userName,
}: {
  workspaceId: string;
  userName: string;
}) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showCitations, setShowCitations] = useState(false);
  const [activeCitations, setActiveCitations] = useState<Citation[]>([]);
  const [activeCitationIdx, setActiveCitationIdx] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [stopVisible, setStopVisible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Rotate placeholder prompts
  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIdx((prev) => (prev + 1) % EXAMPLE_PROMPTS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Show "Stop generating" after 3s of thinking
  useEffect(() => {
    if (sending) {
      const timeout = setTimeout(() => setStopVisible(true), 3000);
      return () => clearTimeout(timeout);
    } else {
      setStopVisible(false);
    }
  }, [sending]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: ChatMsg = {
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "done",
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const data = await fetcher<{
        reply: string;
        citations: { doc: string; page: number }[];
      }>(`/workspaces/${workspaceId}/chat`, {
        method: "POST",
        body: JSON.stringify({ message: text.trim() }),
      });
      const assistantMsg: ChatMsg = {
        role: "assistant",
        content: data.reply,
        citations: data.citations,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: data.citations?.length ? "done" : "not-found",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong generating this answer. Please try again.",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "error",
        },
      ]);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const handleCitationClick = (citations: Citation[]) => {
    setActiveCitations(citations);
    setActiveCitationIdx(0);
    setShowCitations(true);
    setShowHistory(false);
  };

  const firstName = userName.split(" ")[0] || "there";

  return (
    <div className="flex h-full">
      {/* Main chat pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center pb-8 px-6 gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">
                Hello, {firstName}! 👋
              </h2>
              <p className="text-slate-500 text-sm max-w-md">
                Ask anything about the documents in this workspace — I&apos;ll
                always show you the page it came from.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
              {QUICK_ACTIONS.map((qa) => {
                const Icon = qa.icon;
                return (
                  <button
                    key={qa.title}
                    onClick={() => sendMessage(qa.prompt)}
                    className="text-left p-4 rounded-2xl border border-slate-200 bg-white hover:shadow-md hover:border-blue-200 transition-all group"
                  >
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-2.5",
                        qa.color
                      )}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="font-semibold text-slate-800 text-sm mb-0.5 group-hover:text-blue-700 transition-colors">
                      {qa.title}
                    </p>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {qa.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Chat messages */
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 max-w-3xl animate-in slide-in-from-bottom-2 fade-in duration-150",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
                    msg.role === "user"
                      ? "bg-slate-800 text-white"
                      : "bg-blue-100 text-blue-600"
                  )}
                >
                  {msg.role === "user" ? (
                    firstName.charAt(0).toUpperCase()
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                </div>

                {/* Message bubble */}
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.role === "user"
                        ? "bg-blue-600 text-white rounded-tr-sm"
                        : msg.status === "error"
                          ? "bg-red-50 border border-red-200 text-red-700 rounded-tl-sm"
                          : msg.status === "not-found"
                            ? "bg-slate-100 border border-slate-200 text-slate-600 rounded-tl-sm"
                            : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm"
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {/* Citation pills */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex flex-wrap gap-1.5">
                        {msg.citations.map((c, ci) => (
                          <button
                            key={ci}
                            onClick={() => handleCitationClick(msg.citations!)}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full hover:bg-blue-100 hover:border-blue-300 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            {ci + 1}
                            <span className="text-blue-400">
                              p.{c.page}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Error retry */}
                    {msg.status === "error" && (
                      <button
                        onClick={() => {
                          const lastUserMsg = messages
                            .filter((m) => m.role === "user")
                            .pop();
                          if (lastUserMsg)
                            sendMessage(lastUserMsg.content);
                        }}
                        className="mt-2 text-xs font-medium text-red-600 hover:text-red-800 underline"
                      >
                        Retry
                      </button>
                    )}

                    {/* Not found suggestion */}
                    {msg.status === "not-found" && (
                      <p className="mt-2 text-xs text-slate-500 italic">
                        Try rephrasing or upload a document that covers this
                        topic.
                      </p>
                    )}
                  </div>

                  {/* Message footer actions */}
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    {msg.timestamp && (
                      <span className="text-[10px] text-slate-400">
                        {msg.timestamp}
                      </span>
                    )}
                    {msg.role === "user" && msg.status === "done" && (
                      <span className="text-[10px] text-slate-400">✓</span>
                    )}
                    {msg.role === "assistant" && msg.status === "done" && (
                      <div className="flex items-center gap-0.5 ml-auto">
                        <button className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors">
                          <ThumbsUp className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors">
                          <ThumbsDown className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors">
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button className="p-1 text-slate-300 hover:text-slate-500 rounded transition-colors">
                          <Bookmark className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Thinking state */}
            {sending && (
              <div className="flex gap-3 max-w-3xl animate-in slide-in-from-bottom-2 fade-in duration-150">
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-600">
                        Thinking...
                      </span>
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0ms]" />
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:150ms]" />
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:300ms]" />
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Research Agent is analyzing your question and searching
                      through documents...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 px-1">
                    <span className="text-[10px] text-slate-400">
                      {new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {stopVisible && (
                      <button
                        onClick={() => setSending(false)}
                        className="text-xs font-medium text-red-500 border border-red-200 bg-red-50 px-2.5 py-1 rounded-lg hover:bg-red-100 transition-colors flex items-center gap-1 ml-2"
                      >
                        <Square className="w-3 h-3" /> Stop generating
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Suggested questions (shown after last answer) */}
        {messages.length > 0 && !sending && (
          <div className="px-6 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {SUGGESTED_QUESTIONS.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Composer */}
        <div className="px-6 pb-5 pt-2 border-t border-slate-100 bg-white/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            {/* Scope chip */}
            <div className="flex items-center gap-2 mb-2">
              <button className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors">
                <span className="font-medium">Scope:</span>
                <span>All documents in this workspace</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <button
                onClick={() => {
                  setShowHistory(!showHistory);
                  setShowCitations(false);
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-colors ml-auto",
                  showHistory
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                )}
              >
                <History className="w-4 h-4" />
              </button>
            </div>

            {/* Input */}
            <div className="relative flex items-end gap-2 border border-slate-300 rounded-2xl bg-white shadow-sm focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all px-4 py-3">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage(input);
                  }
                }}
                disabled={sending}
                placeholder={`Ask anything about your documents...`}
                className="flex-1 bg-transparent resize-none outline-none text-sm text-slate-800 placeholder:text-slate-400 min-h-[24px] max-h-[120px] leading-relaxed disabled:opacity-50"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="Attach file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  title="AI suggestions"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
                <span className="text-[10px] text-slate-300 hidden sm:block">
                  Press ⌘ + Enter to send
                </span>
                <button
                  disabled={!input.trim() || sending}
                  onClick={() => sendMessage(input)}
                  className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side panel: Citations or History */}
      {showCitations && (
        <CitationsViewer
          citations={activeCitations}
          activeCitationIdx={activeCitationIdx}
          onClose={() => setShowCitations(false)}
          onChangeCitation={setActiveCitationIdx}
        />
      )}
      {showHistory && (
        <ChatHistoryDrawer
          open={showHistory}
          onClose={() => setShowHistory(false)}
          onSelectSession={(session) => {
            setShowHistory(false);
            // In a real app, this would load the conversation
            console.log("Load session:", session.id);
          }}
        />
      )}
    </div>
  );
}
