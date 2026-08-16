"use client";

import { useSettings } from "@/hooks/useSettings";
import { SettingsSection, SettingsSelect } from "@/components/settings/SettingsSection";
import { Loader2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function AppearancePage() {
  const { settings, isSaving, updateSetting, loading } = useSettings();
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (!isSaving && settings) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isSaving, settings]);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const app = settings.appearance;

  const handleUpdate = async (key: string, value: any) => {
    await updateSetting({ [`appearance.${key}`]: value });
  };

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-blue-950">Appearance</h2>
          <p className="text-slate-500 font-medium mt-1">Customize how AstraFinance AI looks and feels.</p>
        </div>
        
        <div className="h-8">
          <AnimatePresence>
            {isSaving && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </motion.div>
            )}
            {!isSaving && showSaved && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
                <Save className="w-4 h-4" /> Saved
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <SettingsSection 
        title="Theme Preferences" 
        description="Select your preferred color theme."
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          
          <button 
            onClick={() => handleUpdate("theme", "Light")}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              app.theme === "Light" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="w-full h-24 rounded-lg bg-slate-100 border border-slate-200 mb-3 overflow-hidden p-2 flex flex-col gap-2">
              <div className="w-1/2 h-3 bg-white rounded shadow-sm" />
              <div className="w-full h-12 bg-white rounded shadow-sm" />
            </div>
            <div className="font-bold text-sm text-slate-800">Light Mode</div>
          </button>
          
          <button 
            onClick={() => handleUpdate("theme", "Dark")}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              app.theme === "Dark" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="w-full h-24 rounded-lg bg-slate-900 border border-slate-800 mb-3 overflow-hidden p-2 flex flex-col gap-2">
              <div className="w-1/2 h-3 bg-slate-800 rounded shadow-sm" />
              <div className="w-full h-12 bg-slate-800 rounded shadow-sm" />
            </div>
            <div className="font-bold text-sm text-slate-800">Dark Mode</div>
          </button>
          
          <button 
            onClick={() => handleUpdate("theme", "System")}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              app.theme === "System" ? "border-blue-600 bg-blue-50/50" : "border-slate-200 hover:border-slate-300 bg-white"
            )}
          >
            <div className="w-full h-24 rounded-lg bg-gradient-to-br from-slate-100 to-slate-900 border border-slate-200 mb-3 overflow-hidden p-2 flex flex-col gap-2">
              <div className="w-1/2 h-3 bg-white/50 rounded shadow-sm" />
              <div className="w-full h-12 bg-white/50 rounded shadow-sm" />
            </div>
            <div className="font-bold text-sm text-slate-800">System Default</div>
          </button>

        </div>
      </SettingsSection>

      <SettingsSection 
        title="Interface Options" 
        description="Fine-tune how the UI renders."
      >
        <SettingsSelect
          label="Content Density"
          description="How tightly packed the information in reports and tables should be."
          value={app.density}
          options={[
            { label: "Comfortable", value: "Comfortable" },
            { label: "Compact", value: "Compact" }
          ]}
          onChange={(v) => handleUpdate("density", v)}
        />
        <SettingsSelect
          label="Animations"
          description="Reduce animations if you prefer a static experience."
          value={app.animations}
          options={[
            { label: "Full (Recommended)", value: "Full" },
            { label: "Reduced Motion", value: "Reduced" }
          ]}
          onChange={(v) => handleUpdate("animations", v)}
        />
      </SettingsSection>
    </div>
  );
}
