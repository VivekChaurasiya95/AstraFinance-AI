"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  User, 
  ShieldCheck, 
  BrainCircuit, 
  Bell, 
  Palette, 
  Briefcase, 
  Blocks, 
  Database, 
  Lock, 
  ActivitySquare, 
  AlertTriangle,
  LayoutDashboard,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SettingsCommandPalette } from "@/components/settings/SettingsCommandPalette";

const NAV_ITEMS = [
  { name: "Overview", href: "/settings", icon: LayoutDashboard },
  { name: "Profile", href: "/settings/profile", icon: User },
  { name: "Security", href: "/settings/security", icon: ShieldCheck },
  { name: "AI Configuration", href: "/settings/ai", icon: BrainCircuit },
  { name: "Notifications", href: "/settings/notifications", icon: Bell },
  { name: "Appearance", href: "/settings/appearance", icon: Palette },
  { name: "Workspace", href: "/settings/workspace", icon: Briefcase },
  { name: "Integrations", href: "/settings/integrations", icon: Blocks },
  { name: "Data & Storage", href: "/settings/data", icon: Database },
  { name: "Privacy", href: "/settings/privacy", icon: Lock },
  { name: "Activity", href: "/settings/activity", icon: ActivitySquare },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      <SettingsCommandPalette />
      
      {/* ── Settings Header ────────────────────────────────────────────── */}
      <header className="flex-none px-6 py-4 border-b border-border bg-card flex items-center justify-between sticky top-0 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-xl font-black text-foreground mb-0.5 tracking-tight">Settings</h1>
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-2">
            Manage your account, workspace, AI preferences and AstraFinance experience.
            <span className="inline-flex items-center gap-1.5 ml-2 px-1.5 py-0.5 rounded-md bg-success/10 text-success text-[9px] font-bold border border-emerald-100 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              All systems operational
            </span>
          </p>
        </motion.div>
        
      </header>

      {/* ── Settings Content Area ──────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Settings Navigation */}
        <aside className="w-56 border-r border-border bg-background overflow-y-auto hidden md:block">
          <div className="p-3 space-y-0.5">
            {NAV_ITEMS.map((item, index) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors group outline-none",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground font-medium hover:bg-surface"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="settings-nav-active"
                      className="absolute inset-0 bg-primary/10 border border-primary/60 shadow-[0_0_12px_rgba(67,198,188,0.3)] rounded-lg"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <Icon className={cn("w-3.5 h-3.5 relative z-10", isActive ? "text-primary" : "text-muted-foreground group-hover:text-muted-foreground")} />
                  <span className="relative z-10 text-xs tracking-wide">{item.name}</span>
                </Link>
              );
            })}

            <div className="pt-4 pb-1.5 px-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Danger Area</span>
            </div>
            
            <Link
              href="/settings/danger"
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors group outline-none",
                pathname === "/settings/danger" 
                  ? "bg-destructive/10 text-destructive font-semibold" 
                  : "text-destructive/70 hover:text-destructive font-medium hover:bg-destructive/10/50"
              )}
            >
              <AlertTriangle className={cn("w-3.5 h-3.5 relative z-10", pathname === "/settings/danger" ? "text-destructive" : "text-destructive/70 group-hover:text-destructive")} />
              <span className="relative z-10 text-xs tracking-wide">Danger Zone</span>
            </Link>
          </div>
        </aside>

        {/* Settings Viewport */}
        <main className="flex-1 overflow-y-auto bg-background p-6">
          <div className="max-w-3xl mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
