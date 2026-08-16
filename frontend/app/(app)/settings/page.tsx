"use client";

import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { User, ShieldCheck, BrainCircuit, Briefcase, Loader2, ChevronRight } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/components/providers/AuthProvider";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
};

const item: Variants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function SettingsOverviewPage() {
  const { settings, loading } = useSettings();
  const { user, dbUser } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
        <p className="font-medium text-slate-600">Loading settings...</p>
      </div>
    );
  }

  const userName = dbUser?.name || user?.displayName || "Vivek Chaurasiya";
  const userInitials = userName.charAt(0);

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="mb-8">
        <h2 className="text-xl font-bold text-blue-950 mb-2">Settings Overview</h2>
        <p className="text-slate-500 text-sm">Quick access to your most important configuration areas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Profile Card */}
        <Link href="/settings/profile" className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl group">
          <motion.div variants={item} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 h-full relative overflow-hidden group-hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <User className="w-3.5 h-3.5 text-blue-500" />
                Profile
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-base ring-4 ring-white shadow-sm">
                {userInitials}
              </div>
              <div>
                <h3 className="text-sm font-bold text-blue-950">{userName}</h3>
                <p className="text-xs text-emerald-600 font-medium flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Account active
                </p>
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Security Card */}
        <Link href="/settings/security" className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl group">
          <motion.div variants={item} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 h-full relative overflow-hidden group-hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                Security
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-600 mb-0.5">Security Score</p>
                <h3 className="text-xl font-black text-blue-950">92%</h3>
              </div>
              <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center relative shadow-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-500 relative z-10" />
              </div>
            </div>
          </motion.div>
        </Link>

        {/* AI Configuration Card */}
        <Link href="/settings/ai" className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl group">
          <motion.div variants={item} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 h-full relative overflow-hidden group-hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <BrainCircuit className="w-3.5 h-3.5 text-blue-500" />
                AI Configuration
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Primary Provider</span>
                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 px-2 py-0.5 rounded uppercase">{settings?.ai_configuration?.primary_provider || "Groq"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Fallback</span>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded uppercase">{settings?.ai_configuration?.fallback_provider || "Gemini"}</span>
              </div>
            </div>
          </motion.div>
        </Link>

        {/* Workspace Card */}
        <Link href="/settings/workspace" className="block focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl group">
          <motion.div variants={item} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-300 h-full relative overflow-hidden group-hover:-translate-y-0.5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-widest">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                Workspace
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors group-hover:translate-x-1" />
            </div>
            
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Current Workspace</span>
                <span className="text-xs font-bold text-blue-950">Vertex Analysis</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Documents</span>
                <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">3</span>
              </div>
            </div>
          </motion.div>
        </Link>

      </div>
    </motion.div>
  );
}