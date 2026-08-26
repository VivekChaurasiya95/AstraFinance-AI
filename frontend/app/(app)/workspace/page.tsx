"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  MoreVertical,
  LayoutGrid,
  List,
  ChevronDown,
  FileText,
  AlertTriangle,
  Trash2,
  Edit3,
  Copy,
  Folder,
  MessageSquare,
  BarChart2,
  ChevronLeft,
  ChevronRight,
  FileTextIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime } from "@/lib/timestamps";
import { fetcher } from "@/lib/api";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";
import { useAuth } from "@/components/providers/AuthProvider";

const ICON_MAP: Record<string, any> = {
  FileTextIcon,
  Folder,
};

// ── Types ──────────────────────────────────────────────────────────────────────
interface Workspace {
  id: string;
  name: string;
  description: string;
  docs: number;
  chats: number;
  reports: number;
  owner_name: string;
  owner_initial: string;
  createdAt: string;
  updatedAt: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

// ── Delete Confirmation Modal ───────────────────────────────────────────────────
// ── Delete Confirmation Modal ───────────────────────────────────────────────────
import { createPortal } from 'react-dom';

function DeleteModal({ workspace, onClose, onConfirm }: { workspace: Workspace; onClose: () => void; onConfirm: () => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const confirmed = input === workspace.name;

  useEffect(() => {
    setMounted(true);
    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md min-w-[320px] p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Delete Workspace</h2>
              <p className="text-xs text-muted-foreground mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button suppressHydrationWarning
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {/* Info box */}
        <div className="bg-destructive/10 border border-red-100 rounded-xl p-4 text-sm text-foreground leading-relaxed">
          This will permanently delete{" "}
          <span className="font-semibold text-foreground">{workspace.docs} document{workspace.docs !== 1 ? "s" : ""}</span>,{" "}
          <span className="font-semibold text-foreground">{workspace.chats} chat message{workspace.chats !== 1 ? "s" : ""}</span>, and{" "}
          <span className="font-semibold text-foreground">{workspace.reports} report{workspace.reports !== 1 ? "s" : ""}</span>.
        </div>

        {/* Confirmation input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">
            Type <span className="font-semibold text-foreground">"{workspace.name}"</span> to confirm deletion:
          </label>
          <input suppressHydrationWarning
            className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-destructive/50 text-sm text-foreground placeholder:text-muted-foreground transition-colors"
            placeholder="Type workspace name here..."
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button suppressHydrationWarning
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground bg-card border border-border hover:bg-surface transition-colors"
          >
            Cancel
          </button>
          <button suppressHydrationWarning
            disabled={!confirmed || loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onConfirm();
                onClose();
              } catch (e: any) {
                setError((e instanceof Error ? e.message : String(e)) || "Failed to delete workspace");
                setLoading(false);
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Deleting...
              </span>
            ) : "Delete Workspace"}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ── Rename Modal ───────────────────────────────────────────────────────────────
function RenameModal({ workspace, onClose, onConfirm }: { workspace: Workspace; onClose: () => void; onConfirm: (name: string) => Promise<void> }) {
  const [input, setInput] = useState(workspace.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-md min-w-[320px] p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Edit3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Rename Workspace</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Enter a new name for this workspace</p>
            </div>
          </div>
          <button suppressHydrationWarning onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-muted-foreground">Workspace Name</label>
          <input suppressHydrationWarning
            className="w-full px-3.5 py-2.5 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-primary text-sm text-foreground placeholder:text-muted-foreground transition-colors"
            placeholder="Name..."
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            autoFocus
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex gap-3 pt-1">
          <button suppressHydrationWarning onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground bg-card border border-border hover:bg-surface transition-colors">
            Cancel
          </button>
          <button suppressHydrationWarning
            disabled={!input.trim() || input === workspace.name || loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onConfirm(input.trim());
              } catch (e: any) {
                setError((e instanceof Error ? e.message : String(e)) || "Failed to rename workspace");
                setLoading(false);
              }
            }}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Renaming..." : "Rename"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

const GLOW_COLOR_MAP: Record<string, string> = {
  "text-blue-700": "#3b82f6",
  "text-emerald-700": "#10b981",
  "text-violet-700": "#8b5cf6",
  "text-orange-700": "#f97316",
  "text-teal-700": "#14b8a6",
  "text-red-700": "#ef4444",
};

// ── Workspace Card ─────────────────────────────────────────────────────────────
function WorkspaceCard({ 
  ws, 
  view,
  onDelete,
  onRename,
  onDuplicate,
  userPhoto
}: { 
  ws: Workspace; 
  view: "grid" | "list";
  onDelete: (ws: Workspace) => void;
  onRename: (ws: Workspace) => void;
  onDuplicate: (ws: Workspace) => void;
  userPhoto?: string;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const IconComponent = ICON_MAP[ws.icon] || FileText;
  const glowColor = GLOW_COLOR_MAP[ws.iconColor] || "var(--primary)";

  if (view === "list") {
    return (
      <div 
        className="bg-card border border-primary/20 animate-border-glow-pulse rounded-xl p-4 shadow-sm hover:shadow-[0_8px_30px_rgba(37,99,235,0.15)] hover:-translate-y-0.5 transition-all relative flex items-center justify-between cursor-pointer group"
        style={{ "--glow-color": glowColor } as React.CSSProperties}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0", ws.iconBg)}>
            <IconComponent className={cn("w-5 h-5", ws.iconColor)} />
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <Link href={`/workspace/${ws.id}`}>
              <h3 className="font-bold text-foreground text-base leading-tight truncate group-hover:text-primary transition-colors">
                {ws.name}
              </h3>
            </Link>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
              <span>{formatRelativeTime(ws.updatedAt)}</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{ws.docs} Docs</span>
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">{ws.reports} Reports</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 shrink-0 ml-4">
          {/* Owner avatar + name */}
          <div className="hidden md:flex items-center gap-2.5 mr-2">
            {userPhoto ? (
              <img src={userPhoto} alt={ws.owner_name} className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                {ws.owner_initial}
              </div>
            )}
            <span className="text-xs text-muted-foreground max-w-[160px] truncate">{ws.owner_name}</span>
          </div>

          {/* Inline action buttons — visible on hover */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button suppressHydrationWarning
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRename(ws); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              title="Rename"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button suppressHydrationWarning
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDuplicate(ws); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:text-blue-400 dark:hover:bg-blue-500/10 transition-colors"
              title="Duplicate"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button suppressHydrationWarning
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDelete(ws); }}
              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-card border border-primary/20 animate-border-glow-pulse rounded-2xl p-5 shadow-sm hover:shadow-[0_8px_30px_rgba(37,99,235,0.15)] hover:-translate-y-1 transition-all relative flex flex-col cursor-pointer group"
      style={{ "--glow-color": glowColor } as React.CSSProperties}
    >
      
      {/* Top Row: Icon, Title, Subtitle, Menu */}
      <div className="flex items-start gap-4 mb-6">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", ws.iconBg)}>
          <IconComponent className={cn("w-6 h-6", ws.iconColor)} />
        </div>
        <div className="flex-1 min-w-0 pr-6 mt-1">
          <Link href={`/workspace/${ws.id}`}>
            <h3 className="font-bold text-foreground text-base leading-tight truncate group-hover:text-primary transition-colors">
              {ws.name}
            </h3>
          </Link>
          <p className="text-xs text-muted-foreground mt-1.5">{formatRelativeTime(ws.updatedAt)}</p>
        </div>
        
        {/* 3-dot Menu */}
        <div className="absolute top-4 right-3">
          <button suppressHydrationWarning
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-8 w-36 bg-card border border-border rounded-xl shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                <button suppressHydrationWarning onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onRename(ws); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface flex items-center gap-2 transition-colors">
                  <Edit3 className="w-4 h-4 text-muted-foreground" /> Rename
                </button>
                <button suppressHydrationWarning onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDuplicate(ws); }} className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface flex items-center gap-2 transition-colors">
                  <Copy className="w-4 h-4 text-muted-foreground" /> Duplicate
                </button>
                <button suppressHydrationWarning
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(ws); }}
                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-destructive/10 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-muted-foreground text-xs font-medium mb-5">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4" />
          <span>{ws.docs} Documents</span>
        </div>
        <div className="flex items-center gap-1.5">
          <MessageSquare className="w-4 h-4" />
          <span>{ws.chats} Chats</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BarChart2 className="w-4 h-4" />
          <span>{ws.reports} Reports</span>
        </div>
      </div>

      {/* Avatar Row */}
      <div className="mt-auto pt-4 flex items-center gap-2">
        {userPhoto ? (
          <img src={userPhoto} alt={ws.owner_name} className="w-6 h-6 rounded-full object-cover border border-border" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold">
            {ws.owner_initial}
          </div>
        )}
        <span className="text-xs text-muted-foreground">{ws.owner_name}</span>
      </div>
    </div>
  );
}


// ── Main Page ──────────────────────────────────────────────────────────────────
export default function WorkspacesPage() {
  const { dbUser } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState("Recent");
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);
  const [renameTarget, setRenameTarget] = useState<Workspace | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = view === "grid" ? 6 : 8;

  const sortOptions = ["Recent", "Name (A–Z)", "Most Documents"];

  const loadWorkspaces = async () => {
    setError(null);
    try {
      const data = await fetcher<Workspace[]>("/workspaces");
      setWorkspaces(data);
    } catch (err: any) {
      // Only show error in UI, don't spam console with full stack traces
      const isNetworkError = err?.message?.includes("network") || err?.message?.includes("Backend error");
      setError(isNetworkError ? "Backend is currently unavailable. Please ensure the server is running." : (err?.message || "Failed to load workspaces"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const filtered = workspaces
    .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()) || w.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === "Name (A–Z)") return a.name.localeCompare(b.name);
      if (sort === "Most Documents") return b.docs - a.docs;
      return 0; // Recent = original order
    });

  // Pagination logic
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedWorkspaces = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (ws: Workspace) => {
    try {
      await fetcher(`/workspaces/${ws.id}`, { method: "DELETE" });
      setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
      setDeleteTarget(null);
      // Adjust page if current page becomes empty
      if (paginatedWorkspaces.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Failed to delete workspace:", error);
    }
  };

  const handleDuplicate = async (ws: Workspace) => {
    try {
      await fetcher(`/workspaces/${ws.id}/duplicate`, { method: "POST" });
      loadWorkspaces();
    } catch (error) {
      console.error("Failed to duplicate workspace:", error);
    }
  };

  const handleRename = async (newName: string) => {
    if (!renameTarget) return;
    try {
      await fetcher(`/workspaces/${renameTarget.id}`, { 
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newName }) 
      });
      setRenameTarget(null);
      loadWorkspaces();
    } catch (error) {
      console.error("Failed to rename workspace:", error);
      throw error;
    }
  };

  return (
    <>
      <div className="flex flex-col min-h-screen px-8 py-8 w-full max-w-[1440px] mx-auto">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground mt-1">Manage all your financial research workspaces</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input suppressHydrationWarning
                className="w-full pl-9 pr-4 h-10 rounded-lg border border-border bg-card focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-foreground placeholder:text-muted-foreground shadow-sm"
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1); // Reset to page 1 on search
                }}
              />
            </div>

            {/* Sort */}
            <div className="relative hidden md:block">
              <button suppressHydrationWarning
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center justify-between w-40 h-10 px-4 rounded-lg border border-border bg-card hover:bg-surface text-sm text-muted-foreground shadow-sm"
              >
                <span>Sort by: {sort}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-12 w-full bg-card border border-border rounded-lg shadow-lg py-1 z-20">
                    {sortOptions.map((opt) => (
                      <button suppressHydrationWarning
                        key={opt}
                        onClick={() => { setSort(opt); setSortOpen(false); }}
                        className={cn("w-full text-left px-4 py-2 text-sm", sort === opt ? "text-primary bg-primary/10 font-medium" : "text-muted-foreground hover:bg-surface")}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-lg h-10 bg-card shadow-sm overflow-hidden">
              <button suppressHydrationWarning
                onClick={() => setView("grid")}
                className={cn("w-10 h-full flex items-center justify-center transition-colors", view === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <div className="w-px h-full bg-muted" />
              <button suppressHydrationWarning
                onClick={() => setView("list")}
                className={cn("w-10 h-full flex items-center justify-center transition-colors", view === "list" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* New Workspace */}
            <button suppressHydrationWarning
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 hover:border-primary/50 transition-colors shadow-sm text-sm font-medium backdrop-blur-sm"
            >
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {loading ? (
             <div className="flex items-center justify-center py-24 text-muted-foreground">Loading workspaces...</div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center w-full">
              <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Unable to load workspaces</h3>
              <p className="text-sm text-muted-foreground max-w-md px-4">{error}</p>
              <button suppressHydrationWarning
                onClick={() => { setLoading(true); loadWorkspaces(); }}
                className="mt-2 px-5 py-2.5 rounded-xl bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 transition-colors text-sm font-medium"
              >
                Retry
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center w-full">
              <div className="w-16 h-16 rounded-2xl bg-card border border-border flex items-center justify-center">
                <Folder className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">No workspaces found</h3>
              <p className="text-sm text-muted-foreground max-w-md px-4">
                {search ? `No results for "${search}". Try a different keyword.` : "Create your first workspace to get started."}
              </p>
            </div>
          ) : (
            <div className={view === "grid" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
              {paginatedWorkspaces.map((ws) => (
                <WorkspaceCard 
                  key={ws.id} 
                  ws={ws} 
                  view={view}
                  onDelete={setDeleteTarget} 
                  onRename={setRenameTarget}
                  onDuplicate={handleDuplicate}
                  userPhoto={dbUser?.profile_picture || undefined}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-border pt-6">
            <span className="text-sm text-muted-foreground mb-4 sm:mb-0">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} workspaces
            </span>
            <div className="flex items-center gap-1">
              <button suppressHydrationWarning 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const page = idx + 1;
                return (
                  <button suppressHydrationWarning
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      currentPage === page 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-surface"
                    )}
                  >
                    {page}
                  </button>
                );
              })}

              <button suppressHydrationWarning 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* ── Modals ── */}
      {showNewModal && <CreateWorkspaceModal onClose={() => setShowNewModal(false)} onCreated={loadWorkspaces} />}
      {deleteTarget && (
        <DeleteModal workspace={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={() => handleDelete(deleteTarget)} />
      )}
      {renameTarget && (
        <RenameModal workspace={renameTarget} onClose={() => setRenameTarget(null)} onConfirm={handleRename} />
      )}
    </>
  );
}
