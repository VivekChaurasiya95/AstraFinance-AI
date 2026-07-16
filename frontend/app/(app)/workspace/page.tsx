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
import { fetcher } from "@/lib/api";
import { CreateWorkspaceModal } from "@/components/workspace/CreateWorkspaceModal";

const ICON_MAP: Record<string, React.ElementType> = {
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
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md min-w-[320px] p-7 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Delete Workspace</h2>
              <p className="text-xs text-slate-500 mt-0.5">This action cannot be undone</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <span className="text-xl leading-none">&times;</span>
          </button>
        </div>

        {/* Info box */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
          This will permanently delete{" "}
          <span className="font-semibold text-slate-900">{workspace.docs} document{workspace.docs !== 1 ? "s" : ""}</span>,{" "}
          <span className="font-semibold text-slate-900">{workspace.chats} chat message{workspace.chats !== 1 ? "s" : ""}</span>, and{" "}
          <span className="font-semibold text-slate-900">{workspace.reports} report{workspace.reports !== 1 ? "s" : ""}</span>.
        </div>

        {/* Confirmation input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm text-slate-600">
            Type <span className="font-semibold text-slate-900">"{workspace.name}"</span> to confirm deletion:
          </label>
          <input
            className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 text-sm text-slate-900 placeholder:text-slate-400 transition-colors"
            placeholder="Type workspace name here..."
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(""); }}
            autoFocus
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!confirmed || loading}
            onClick={async () => {
              setLoading(true);
              try {
                await onConfirm();
                onClose();
              } catch (e: any) {
                setError(e.message || "Failed to delete workspace");
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

// ── Workspace Card (Grid View) ─────────────────────────────────────────────────
function WorkspaceCard({ ws, onDelete }: { ws: Workspace; onDelete: (ws: Workspace) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const IconComponent = ICON_MAP[ws.icon] || FileText;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative flex flex-col cursor-pointer group">
      
      {/* Top Row: Icon, Title, Subtitle, Menu */}
      <div className="flex items-start gap-4 mb-6">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0", ws.iconBg)}>
          <IconComponent className={cn("w-6 h-6", ws.iconColor)} />
        </div>
        <div className="flex-1 min-w-0 pr-6 mt-1">
          <Link href={`/workspace/${ws.id}`}>
            <h3 className="font-bold text-slate-900 text-base leading-tight truncate group-hover:text-blue-700 transition-colors">
              {ws.name}
            </h3>
          </Link>
          <p className="text-xs text-slate-500 mt-1.5">{ws.updatedAt}</p>
        </div>
        
        {/* 3-dot Menu */}
        <div className="absolute top-4 right-3">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
              <div className="absolute right-0 top-8 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-20 animate-in fade-in slide-in-from-top-2 duration-150">
                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                  <Edit3 className="w-4 h-4 text-slate-400" /> Rename
                </button>
                <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                  <Copy className="w-4 h-4 text-slate-400" /> Duplicate
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(ws); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 text-slate-500 text-xs font-medium mb-5">
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
        <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold">
          {ws.owner_initial}
        </div>
        <span className="text-xs text-slate-600">{ws.owner_name}</span>
      </div>
    </div>
  );
}


// ── Main Page ──────────────────────────────────────────────────────────────────
export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortOpen, setSortOpen] = useState(false);
  const [sort, setSort] = useState("Recent");
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const sortOptions = ["Recent", "Name (A–Z)", "Most Documents"];

  const loadWorkspaces = async () => {
    try {
      const data = await fetcher<Workspace[]>("/workspaces");
      setWorkspaces(data);
    } catch (error) {
      console.error("Failed to load workspaces:", error);
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

  return (
    <>
      <div className="flex flex-col min-h-screen px-8 py-8 w-full max-w-[1440px] mx-auto bg-slate-50/50">
        
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Workspaces</h1>
          <p className="text-slate-500 mt-1">Manage all your financial research workspaces</p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center mb-8">
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="w-full pl-9 pr-4 h-10 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm"
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
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center justify-between w-40 h-10 px-4 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-sm text-slate-600 shadow-sm"
              >
                <span>Sort by: {sort}</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-12 w-full bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSort(opt); setSortOpen(false); }}
                        className={cn("w-full text-left px-4 py-2 text-sm", sort === opt ? "text-blue-700 bg-blue-50 font-medium" : "text-slate-600 hover:bg-slate-50")}
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
            <div className="flex items-center border border-slate-200 rounded-lg h-10 bg-white shadow-sm overflow-hidden">
              <button
                onClick={() => setView("grid")}
                className={cn("w-10 h-full flex items-center justify-center transition-colors", view === "grid" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50")}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <div className="w-px h-full bg-slate-200" />
              <button
                onClick={() => setView("list")}
                className={cn("w-10 h-full flex items-center justify-center transition-colors", view === "list" ? "bg-blue-50 text-blue-600" : "text-slate-400 hover:bg-slate-50")}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* New Workspace */}
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 h-10 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Workspace
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          {loading ? (
             <div className="flex items-center justify-center py-24 text-slate-400">Loading workspaces...</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center w-full">
              <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center">
                <Folder className="w-8 h-8 text-slate-300" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No workspaces found</h3>
              <p className="text-sm text-slate-400 max-w-md px-4">
                {search ? `No results for "${search}". Try a different keyword.` : "Create your first workspace to get started."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {paginatedWorkspaces.map((ws) => (
                <WorkspaceCard key={ws.id} ws={ws} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-slate-200 pt-6">
            <span className="text-sm text-slate-500 mb-4 sm:mb-0">
              Showing {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} workspaces
            </span>
            <div className="flex items-center gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => p - 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              {Array.from({ length: totalPages }).map((_, idx) => {
                const page = idx + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                      currentPage === page 
                        ? "bg-blue-50 text-blue-600" 
                        : "text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {page}
                  </button>
                );
              })}

              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => p + 1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </>
  );
}
