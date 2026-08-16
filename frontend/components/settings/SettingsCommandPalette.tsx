"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, LayoutDashboard, User, ShieldCheck, BrainCircuit, Bell, Palette, Briefcase, Blocks, Database, Lock, ActivitySquare, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { name: "Overview", href: "/settings", icon: LayoutDashboard, keywords: ["home", "main", "dashboard"] },
  { name: "Profile", href: "/settings/profile", icon: User, keywords: ["name", "avatar", "photo", "email", "bio", "account"] },
  { name: "Security", href: "/settings/security", icon: ShieldCheck, keywords: ["password", "oauth", "sessions", "login", "auth"] },
  { name: "AI Configuration", href: "/settings/ai", icon: BrainCircuit, keywords: ["groq", "gemini", "fallback", "model", "provider", "reasoning", "risk"] },
  { name: "Notifications", href: "/settings/notifications", icon: Bell, keywords: ["alerts", "email", "push", "reports", "agents"] },
  { name: "Appearance", href: "/settings/appearance", icon: Palette, keywords: ["theme", "light", "dark", "system", "density", "animations"] },
  { name: "Workspace", href: "/settings/workspace", icon: Briefcase, keywords: ["documents", "members", "reports", "current"] },
  { name: "Integrations", href: "/settings/integrations", icon: Blocks, keywords: ["github", "google", "drive", "cloud"] },
  { name: "Data & Storage", href: "/settings/data", icon: Database, keywords: ["export", "clear", "cache", "documents", "pdf"] },
  { name: "Privacy", href: "/settings/privacy", icon: Lock, keywords: ["retention", "ai processing", "document processing"] },
  { name: "Activity", href: "/settings/activity", icon: ActivitySquare, keywords: ["history", "timeline", "logs", "audit"] },
  { name: "Danger Zone", href: "/settings/danger", icon: AlertTriangle, keywords: ["delete", "archive", "remove", "clear account"] },
];

export function SettingsCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const results = query
    ? NAV_ITEMS.filter((item) => {
        const text = item.name.toLowerCase();
        const search = query.toLowerCase();
        return text.includes(search) || item.keywords.some(k => k.includes(search));
      })
    : NAV_ITEMS.slice(0, 5); // Show first 5 by default if empty

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleSelect = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % results.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results.length > 0) {
          handleSelect(results[activeIndex].href);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, activeIndex, results]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-md"
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-[600px] max-w-[90vw] shrink-0 bg-white rounded-2xl shadow-[0_0_50px_rgba(59,130,246,0.2)] overflow-hidden border border-blue-200/60"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-4 border-b border-slate-100/80 bg-white">
              <Search className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search settings..."
                className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 outline-none text-lg font-medium"
              />
              <kbd className="hidden sm:inline-flex shrink-0 px-2 py-1 bg-slate-50 border border-slate-200 rounded text-[10px] font-black text-slate-400 font-sans shadow-sm">
                ESC
              </kbd>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center text-sm text-slate-500">
                  <Search className="w-8 h-8 text-slate-300 mb-3" />
                  <p>No settings found for <span className="font-bold text-slate-700">"{query}"</span></p>
                </div>
              ) : (
                results.map((item, i) => {
                  const isActive = i === activeIndex;
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.href}
                      onClick={() => handleSelect(item.href)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all cursor-pointer text-left relative overflow-hidden group outline-none",
                        isActive ? "bg-blue-50/80" : "hover:bg-slate-50"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="command-palette-active"
                          className="absolute inset-0 border border-blue-400/50 shadow-[inset_0_0_10px_rgba(59,130,246,0.1)] rounded-xl"
                          transition={{ type: "spring", stiffness: 350, damping: 30 }}
                        />
                      )}
                      <div className={cn(
                        "w-8 h-8 shrink-0 flex items-center justify-center rounded-lg transition-colors relative z-10",
                        isActive ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className={cn(
                        "text-sm font-medium transition-colors relative z-10",
                        isActive ? "text-blue-900 font-bold" : "text-slate-600 group-hover:text-slate-900 group-hover:font-semibold"
                      )}>
                        {item.name}
                      </span>
                      {isActive && (
                        <div className="ml-auto relative z-10 flex items-center gap-2">
                          <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Jump</span>
                          <ChevronRight className="w-4 h-4 text-blue-500" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
            
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/80 text-[11px] font-semibold text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Navigate</span>
                <div className="flex gap-1">
                  <kbd className="font-sans font-black bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-600">↑</kbd>
                  <kbd className="font-sans font-black bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-600">↓</kbd>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span>Select</span>
                <kbd className="font-sans font-black bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm text-slate-600 text-[10px]">ENTER</kbd>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
