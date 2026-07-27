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

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, dbUser, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      // Fetch initial notification status
      fetcher<{has_unread: boolean}>("/dashboard/notifications")
        .then(res => setHasUnreadNotifications(res.has_unread))
        .catch(() => {});
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Authenticating...</p>
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
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen flex">
      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SideNavBar */}
      <nav className={cn(
        "bg-white h-screen fixed left-0 top-0 shadow-sm flex-col p-4 gap-2 z-50 border-r border-slate-200 transition-all duration-300",
        mobileMenuOpen ? "flex translate-x-0 w-64" : "hidden md:flex md:translate-x-0",
        !mobileMenuOpen && isSidebarCollapsed ? "md:w-[72px]" : "md:w-64"
      )}>
        <div className="flex flex-col gap-2 mb-8 px-1">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded bg-blue-900 flex items-center justify-center overflow-hidden shrink-0">
              <img
                alt="Company Logo"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDFEdT0NDVW_BYntxtElOJelbBp8-auEG3bLfc-GQ9nLVcLWF_FRfBWo6AV5bm2PfkkSgBOXaOcADI4z9JWbeDVVJTCBv5UHY89-ObwZWdEXOrAzbKK_gEMM6783trprL97uQlAqPn8h1SXsGNAeNFQe8Btyt6maUZ8RLWFwmXWY9b5V9fEKmLg8xrvwgmeiUlqU-1t8bgIivNM1DIUXc3lo13gcY3Hpd195W4VOjbFM8duUmmurd0-JgR1f_CU2b2quQ"
              />
            </div>
            {(!isSidebarCollapsed || mobileMenuOpen) && (
              <div className="transition-opacity duration-200 whitespace-nowrap overflow-hidden">
                <div className="text-lg font-black text-blue-950">AstraFinance</div>
                <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">Institutional Grade</div>
              </div>
            )}
          </div>
          <Link 
            href="/workspace/create" 
            suppressHydrationWarning 
            className="bg-blue-700 text-white w-full h-10 rounded-lg mt-4 hover:bg-blue-800 transition-colors shadow-sm flex items-center justify-center gap-2 overflow-hidden"
          >
            <AddIcon className="w-5 h-5 shrink-0" />
            {(!isSidebarCollapsed || mobileMenuOpen) && <span className="text-sm font-medium whitespace-nowrap">New Analysis</span>}
          </Link>
        </div>

        <div className="flex flex-col gap-1 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "rounded-lg flex items-center gap-4 px-4 py-2 transition-all active:scale-95 duration-150",
                  isActive
                    ? "bg-blue-100 text-blue-900 font-bold"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                {(!isSidebarCollapsed || mobileMenuOpen) && <span className="truncate whitespace-nowrap">{item.name}</span>}
              </Link>
            );
          })}
        </div>

        <div className="flex flex-col gap-1 mt-auto pt-4 border-t border-slate-200">
          <Link
            href="/help"
            className="text-slate-600 hover:bg-slate-100 transition-all active:scale-95 duration-150 rounded-lg flex items-center gap-4 px-4 py-2 overflow-hidden"
          >
            <HelpOutlineIcon className="w-[18px] h-[18px] shrink-0" />
            {(!isSidebarCollapsed || mobileMenuOpen) && <span className="text-sm whitespace-nowrap">Help</span>}
          </Link>
          <button suppressHydrationWarning
            onClick={() => signOut(auth).then(() => window.location.href = "/login")}
            className="text-slate-600 hover:bg-slate-100 transition-all active:scale-95 duration-150 rounded-lg flex items-center gap-4 px-4 py-2 w-full text-left overflow-hidden"
          >
            <SecurityIcon className="w-[18px] h-[18px] shrink-0" />
            {(!isSidebarCollapsed || mobileMenuOpen) && <span className="text-sm whitespace-nowrap">Sign Out</span>}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className={cn(
        "flex-1 flex flex-col min-h-screen pb-16 md:pb-0 relative transition-all duration-300",
        isSidebarCollapsed ? "md:ml-[72px]" : "md:ml-64"
      )}>
        
        {/* Global Desktop Header */}
        <header className="hidden md:flex justify-between items-center px-8 py-4 z-30 sticky top-0 bg-slate-50/80 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 -ml-2 rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
            >
              <MenuIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-6 relative">
            <button 
              suppressHydrationWarning 
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
              className="text-slate-500 hover:text-blue-900 transition-colors relative">
              <NotificationsIcon className="w-6 h-6" />
              {hasUnreadNotifications && <span className="absolute top-0.5 right-1 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></span>}
            </button>
            <button suppressHydrationWarning 
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-3 hover:bg-white px-2 py-1.5 rounded-lg transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-semibold text-sm">
                {userName.charAt(0)}
              </div>
              <span className="text-sm font-medium text-slate-700">{userName}</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
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
              onNotificationsFetched={(hasUnread) => setHasUnreadNotifications(hasUnread)}
            />
          )}
        </header>

        {/* TopAppBar Mobile */}
        <header className="w-full top-0 sticky bg-white border-b border-slate-200 shadow-sm z-30 md:hidden flex justify-between items-center px-6 h-16">
          <div className="flex items-center gap-2">
            <img
              alt="Company Logo"
              className="w-8 h-8 object-contain"
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCdEatiO6oCU9GzAufkHOsWBtA51lnaSSA1Mnw_bs7dThG2zCi1_xOC2IfRq6t1X2aGMGu9qlupRo5isXf9yWEaWUeaPKFF_gftZfL73lt_W5zHeoFEVqRTFel5GQC6XZT0jOCT186zpAhasx3unC7XtaFFa0kQ72hAwh24xw8BJtzczqN4fODmYTMzjnEw8AC9IkTmnkNukJe9nGDOLqXVIH8cpGLIlXfQFZLRvy9RcGAw4O7LYJf9EPvy_japb0zofw"
            />
            <span className="text-lg font-bold text-blue-950">AstraFinance AI</span>
          </div>
          <div className="flex gap-4 items-center relative">
            <button 
              suppressHydrationWarning 
              className="relative" 
              onClick={() => { setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}>
              <NotificationsIcon className="w-6 h-6 text-slate-500" />
              {hasUnreadNotifications && <span className="absolute top-0.5 right-1 w-2 h-2 bg-blue-600 rounded-full border-2 border-white"></span>}
            </button>
            <button suppressHydrationWarning onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              <MenuIcon className="w-6 h-6 text-slate-500" />
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
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center h-16 z-40 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full",
                isActive ? "text-blue-700" : "text-slate-500"
              )}
            >
              <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
              <span className="text-[10px] font-bold uppercase tracking-wider mt-1">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
