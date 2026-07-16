"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { useState, useEffect } from "react";
import Link from "next/link";
import { fetcher } from "@/lib/api";
import { 
  FolderIcon, 
  FileTextIcon, 
  AlertTriangleIcon, 
  ActivityIcon, 
  EyeIcon, 
  MoreHorizontalIcon, 
  HistoryIcon, 
  BotIcon, 
  CheckCircleIcon, 
  GlobeIcon,
  Building2,
  Scale,
  Folder
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Building2,
  GlobeIcon,
  Scale,
  FileTextIcon,
  AlertTriangleIcon,
  Folder,
  BotIcon
};

// Types
interface AgentActivity {
  id: string;
  agent_name: string;
  agent_type: string;
  action: string;
  workspace_name: string;
  time_ago: string;
}

interface RedFlag {
  id: string;
  severity: string;
  title: string;
  time_ago: string;
}

interface DashboardStats {
  active_workspaces: number;
  documents_processed: number;
  open_red_flags: number;
  reports_generated: number;
  agent_activity: AgentActivity[];
  red_flags: RedFlag[];
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  docs: number;
  updatedAt: string;
  icon: string;
  iconColor: string;
  iconBg: string;
}

export default function DashboardPage() {
  const { user: firebaseUser, dbUser } = useAuth();
  const rawName = dbUser?.name || firebaseUser?.displayName || "User";
  const userName = rawName.split(" ")[0];

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, workspacesData] = await Promise.all([
          fetcher<DashboardStats>("/dashboard/stats"),
          fetcher<Workspace[]>("/workspaces")
        ]);
        setStats(statsData);
        setWorkspaces(workspacesData);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 md:p-8 w-full max-w-[1440px] mx-auto flex-1 flex items-center justify-center">
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 w-full max-w-[1440px] mx-auto flex-1 flex flex-col gap-8 animate-in fade-in duration-500">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 m-0">Good afternoon, {userName}</h1>
          <p className="text-sm text-slate-500 mt-1">Here&apos;s a summary of your analytical workflows.</p>
        </div>
        <Link href="/workspace" className="bg-blue-700 flex items-center justify-center text-white h-10 px-6 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors shadow-sm whitespace-nowrap">
          View Workspaces
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {/* Card 1 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Active Workspaces</span>
            <FolderIcon className="text-slate-400 w-[18px] h-[18px]" />
          </div>
          <div className="font-mono text-slate-900 text-2xl font-medium mt-2">{workspaces.length}</div>
          <div className="text-sm text-blue-700 flex items-center gap-1 mt-1 font-medium">
            <ActivityIcon className="w-3.5 h-3.5" /> <span>+2 this week</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Documents Processed</span>
            <FileTextIcon className="text-slate-400 w-[18px] h-[18px]" />
          </div>
          <div className="font-mono text-slate-900 text-2xl font-medium mt-2">{stats?.documents_processed}</div>
          <div className="text-sm text-slate-500 mt-1 font-medium">Last 30 days</div>
        </div>

        {/* Card 3 */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-red-600">Open Red Flags</span>
            <AlertTriangleIcon className="text-red-500 w-[18px] h-[18px]" />
          </div>
          <div className="font-mono text-red-600 text-2xl font-medium mt-2">{stats?.red_flags.length}</div>
          <div className="text-sm text-red-600 font-medium mt-1">High Severity</div>
        </div>

        {/* Card 4 */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col gap-1 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider uppercase text-slate-500">Reports Generated</span>
            <ActivityIcon className="text-slate-400 w-[18px] h-[18px]" />
          </div>
          <div className="font-mono text-slate-900 text-2xl font-medium mt-2">{stats?.reports_generated}</div>
          <div className="text-sm text-blue-700 flex items-center gap-1 mt-1 font-medium">
            <ActivityIcon className="w-3.5 h-3.5" /> <span>15% vs last mo</span>
          </div>
        </div>
      </div>

      {/* Risk Monitoring Band */}
      {stats?.red_flags && stats.red_flags.length > 0 && (
        <div className="bg-slate-100 rounded-xl p-5 border-l-4 border-red-500 flex flex-col gap-4">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangleIcon className="text-red-500 w-5 h-5" />
            <h2 className="text-lg font-semibold text-slate-900 m-0">Attention Needed</h2>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 px-1 snap-x scrollbar-hide">
            {stats.red_flags.map((flag) => (
              <div key={flag.id} className="min-w-[300px] bg-white rounded-lg p-4 border border-slate-200 shadow-sm flex flex-col gap-1 snap-start hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex justify-between items-start">
                  <span className={cn(
                    "text-[11px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded",
                    flag.severity === "Critical" ? "text-red-700 bg-red-100" : "text-orange-700 bg-orange-100"
                  )}>
                    {flag.severity}
                  </span>
                  <span className="text-xs text-slate-500">{flag.time_ago}</span>
                </div>
                <h3 className="text-sm font-medium text-slate-900 mt-1">{flag.title}</h3>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs font-medium text-blue-700 flex items-center gap-1">
                    <EyeIcon className="w-3.5 h-3.5" /> View details
                  </span>
                  <button className="text-slate-400 hover:text-slate-700">
                    <MoreHorizontalIcon className="w-[18px] h-[18px]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
        
        {/* 8-column Recent Workspaces */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h2 className="text-lg font-semibold text-slate-900 m-0">Recent Workspaces</h2>
            <Link href="/workspace" className="text-sm text-blue-700 hover:underline font-medium">View all</Link>
          </div>
          
          <div className="flex flex-col gap-3">
            {workspaces.slice(0, 3).map((ws) => {
              const Icon = ICON_MAP[ws.icon] || Folder;
              return (
                <Link key={ws.id} href={`/workspace/${ws.id}`} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex items-start sm:items-center gap-4">
                    <div className={cn("w-10 h-10 rounded flex items-center justify-center shrink-0", ws.iconBg, ws.iconColor)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-medium text-slate-900 group-hover:text-blue-700 transition-colors">{ws.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{ws.updatedAt}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <span className="bg-slate-100 py-0.5 px-2 rounded text-[11px] font-bold tracking-wider uppercase text-slate-600">{ws.docs} Docs</span>
                  </div>
                </Link>
              );
            })}
            
            {workspaces.length === 0 && (
              <div className="text-sm text-slate-500 text-center py-8 bg-slate-50 rounded-lg border border-slate-200 border-dashed">
                No active workspaces yet.
              </div>
            )}
          </div>
        </div>

        {/* 4-column Agent Activity */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-200 pb-2">
            <h2 className="text-lg font-semibold text-slate-900 m-0">Agent Activity</h2>
            <HistoryIcon className="text-slate-400 w-[18px] h-[18px]" />
          </div>
          
          <div className="flex flex-col gap-3 bg-slate-50 rounded-xl p-4 border border-slate-200 h-full">
            {stats?.agent_activity.map((activity, index) => {
              // Cycle colors based on index
              const colors = [
                { bar: "bg-blue-600", text: "text-blue-600", icon: <BotIcon className="w-3.5 h-3.5" /> },
                { bar: "bg-emerald-500", text: "text-emerald-600", icon: <CheckCircleIcon className="w-3.5 h-3.5" /> },
                { bar: "bg-violet-500", text: "text-violet-600", icon: <GlobeIcon className="w-3.5 h-3.5" /> },
              ];
              const color = colors[index % colors.length];

              return (
                <div key={activity.id} className="flex gap-3 p-3 bg-white rounded-lg border border-slate-200 shadow-sm relative overflow-hidden">
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1", color.bar)}></div>
                  <div className="flex-1 ml-1">
                    <div className="flex items-center justify-between">
                      <span className={cn("text-[11px] font-bold tracking-wider uppercase flex items-center gap-1", color.text)}>
                        {color.icon} {activity.agent_name}
                      </span>
                      <span className="text-[11px] text-slate-500">{activity.time_ago}</span>
                    </div>
                    <p className="text-sm text-slate-900 mt-1 font-medium">{activity.action}</p>
                    <div className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                      Workspace: {activity.workspace_name}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* AI Action Prompt */}
            <button className="mt-auto bg-violet-50 text-violet-700 border border-violet-200 rounded-lg p-2.5 text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-violet-100 transition-all shadow-sm">
              Ask Agents for Daily Summary
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}