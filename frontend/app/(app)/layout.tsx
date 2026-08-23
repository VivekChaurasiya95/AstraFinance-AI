"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { 
  DashboardIcon, 
  FolderSharedIcon, 
  DescriptionIcon, 
  SettingsIcon, 
  HelpOutlineIcon, 
  SecurityIcon,
  MenuIcon,
  NotificationsIcon,
  AddIcon
} from "@/components/dashboard/icons";

import { UserProfilePanel } from "@/components/dashboard/UserProfilePanel";
import { NotificationsPanel } from "@/components/layout/NotificationsPanel";
import { ChevronDown, Loader2 } from "lucide-react";
import { fetcher } from "@/lib/api";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useNotificationStore } from "@/hooks/useNotificationStore";
import { NotificationProvider } from "@/components/providers/NotificationProvider";
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, dbUser, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  
  const unreadCount = useNotificationStore(state => state.unreadCount);
  
  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/login";
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground font-medium">Authenticating...</p>
      </div>
    );
  }

  const userName = dbUser?.name || user?.displayName || "Vivek Chaurasiya";

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: DashboardIcon },
    { name: "Workspaces", href: "/workspace", icon: FolderSharedIcon },
    { name: "Reports", href: "/reports", icon: DescriptionIcon },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <NotificationProvider>
    <div className="bg-background text-foreground font-sans min-h-screen flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <nav className={cn(
        "bg-background h-screen fixed left-0 top-0 shadow-sm flex flex-col p-4 gap-2 z-50 border-r border-border transition-all duration-300",
        mobileMenuOpen ? "flex translate-x-0 w-64" : "hidden md:flex md:translate-x-0",
        !mobileMenuOpen && isSidebarCollapsed ? "md:w-[72px]" : "md:w-64"
      )}>
        <div className="flex flex-col gap-2 mb-8 px-1">
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-primary shadow-[0_4px_14px_0_rgb(37,99,235,0.39)] flex items-center justify-center overflow-hidden shrink-0">
              <span className="text-white font-bold text-sm tracking-tighter">AF</span>
            </div>
            {(!isSidebarCollapsed || mobileMenuOpen) && (
              <div className="transition-opacity duration-300 whitespace-nowrap overflow-hidden">
                <div className="text-[15px] font-bold text-foreground tracking-tight leading-none mb-1">AstraFinance AI</div>
                <div className="text-[10px] font-semibold tracking-widest text-muted-foreground uppercase leading-none">Intelligence</div>
              </div>
            )}
          </div>
          <Link 
            href="/workspace/create" 
            suppressHydrationWarning 
            className="bg-primary/10 border border-primary/30 text-primary w-full h-9 rounded-lg mt-4 hover:bg-primary/20 hover:border-primary/50 transition-all shadow-sm flex items-center justify-center gap-2 overflow-hidden hover:-translate-y-0.5 backdrop-blur-sm"
          >
            <AddIcon className="w-4 h-4 shrink-0" />
            {(!isSidebarCollapsed || mobileMenuOpen) && <span className="text-sm font-semibold whitespace-nowrap">New Analysis</span>}
          </Link>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 mt-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "rounded-xl flex items-center gap-3 px-3 py-2.5 transition-all duration-200 group relative",
                  isActive
                    ? "bg-primary/10 text-primary font-semibold transition-theme"
                    : "text-muted-foreground hover:bg-surface hover:text-foreground transition-theme"
                )}
              >
                {isActive && (
                  <div className="absolute left-0 w-1 h-5 bg-primary rounded-r-full transition-theme" />
                )}
                <item.icon className={cn("w-5 h-5 shrink-0 transition-all", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                {(!isSidebarCollapsed || mobileMenuOpen) && <span className="truncate whitespace-nowrap text-[13px] tracking-wide transition-theme">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-border-subtle">
          <Link
            href="/help"
            className="text-muted-foreground hover:bg-surface hover:text-foreground transition-all duration-200 rounded-xl flex items-center gap-3 px-3 py-2.5 overflow-hidden group"
          >
            <HelpOutlineIcon className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-theme" />
            {(!isSidebarCollapsed || mobileMenuOpen) && <span className="text-[13px] font-medium whitespace-nowrap tracking-wide transition-theme">Help & Support</span>}
          </Link>
          <button suppressHydrationWarning
            onClick={() => signOut(auth).then(() => window.location.href = "/login")}
            className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-xl flex items-center gap-3 px-3 py-2.5 w-full text-left overflow-hidden group"
          >
            <SecurityIcon className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-destructive transition-theme" />
            {(!isSidebarCollapsed || mobileMenuOpen) && <span className="text-[13px] font-medium whitespace-nowrap tracking-wide transition-theme">Sign Out</span>}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col min-h-screen pb-16 md:pb-0 relative transition-all duration-300 min-w-0 w-full",
        isSidebarCollapsed ? "md:ml-[72px] md:w-[calc(100%-72px)]" : "md:ml-64 md:w-[calc(100%-256px)]"
      )}>
        
        {/* Global Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-4 z-30 sticky top-0 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-surface hover:text-foreground transition-colors"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-6 relative">
            <ThemeToggle />
            <button 
              suppressHydrationWarning 
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
              className="text-muted-foreground hover:text-blue-900 transition-colors relative">
              <NotificationsIcon className="w-6 h-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button suppressHydrationWarning 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 hover:bg-primary/10 px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-border"
            >
              {dbUser?.profile_picture ? (
                <img src={dbUser.profile_picture} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-semibold text-sm transition-theme">
                  {userName.charAt(0)}
                </div>
              )}
              <span className="text-sm font-medium text-foreground transition-theme">{userName}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-theme" />
            </button>
          </div>
          {profileOpen && (
            <UserProfilePanel 
              onClose={() => setProfileOpen(false)} 
              onSignOut={() => signOut(auth).then(() => window.location.href = "/login")} 
            />
          )}
          {notificationsOpen && (
            <NotificationsPanel 
              onClose={() => setNotificationsOpen(false)}
            />
          )}
        </header>

        {/* TopAppBar Mobile */}
        <header className="w-full top-0 sticky bg-card border-b border-border shadow-sm z-30 md:hidden flex justify-between items-center px-6 h-16">
          <div className="flex items-center gap-2">
            <img
              alt="Company Logo"
              className="w-10 h-10 object-contain transition-theme"
              src="/logo.svg"
            />
            <span className="text-lg font-bold text-foreground transition-theme">AstraFinance AI</span>
          </div>
          <div className="flex gap-4 items-center relative">
            <ThemeToggle />
            <button 
              suppressHydrationWarning 
              className="relative" 
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}>
              <NotificationsIcon className="w-6 h-6 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[9px] font-bold flex items-center justify-center rounded-full border-2 border-white shadow-sm">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button suppressHydrationWarning onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <MenuIcon className="w-6 h-6 text-muted-foreground" />
            </button>
          </div>
        </header>
        {profileOpen && (
           <div className="md:hidden">
             <UserProfilePanel 
               onClose={() => setProfileOpen(false)} 
               onSignOut={() => signOut(auth).then(() => window.location.href = "/login")} 
             />
           </div>
        )}

        {/* Content */}
        {children}

      </main>

      {/* BottomNavBar Mobile */}
      <nav className="md:hidden fixed bottom-0 w-full bg-card border-t border-border flex justify-around items-center h-16 z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
    </NotificationProvider>
  );
}
