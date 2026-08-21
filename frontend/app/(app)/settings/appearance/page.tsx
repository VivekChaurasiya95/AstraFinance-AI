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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const app = settings.appearance;

  const handleUpdate = async (key: string, value: any) => {
    await updateSetting({ [`appearance.${key}`]: value });
  };

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Appearance</h2>
          <p className="text-muted-foreground font-medium mt-1">Customize how AstraFinance AI looks and feels.</p>
        </div>
        
        <div className="h-8">
          <AnimatePresence>
            {isSaving && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm font-bold text-muted-foreground bg-surface px-3 py-1.5 rounded-full">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </motion.div>
            )}
            {!isSaving && showSaved && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-sm font-bold text-success bg-success/10 border border-emerald-100 px-3 py-1.5 rounded-full">
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
              app.theme === "Light" ? "border-primary bg-primary/10/50" : "border-border hover:border-border bg-card"
            )}
          >
            <div className="w-full h-24 rounded-lg bg-white border border-gray-200 mb-3 overflow-hidden p-2 flex flex-col gap-2">
              <div className="w-1/2 h-3 bg-gray-200 rounded shadow-sm" />
              <div className="w-full h-12 bg-gray-100 rounded shadow-sm" />
            </div>
            <div className="font-bold text-sm text-foreground">Light Mode</div>
          </button>
          
          <button 
            onClick={() => handleUpdate("theme", "Dark")}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              app.theme === "Dark" ? "border-primary bg-primary/10/50" : "border-border hover:border-border bg-card"
            )}
          >
            <div className="w-full h-24 rounded-lg bg-slate-950 border border-slate-800 mb-3 overflow-hidden p-2 flex flex-col gap-2">
              <div className="w-1/2 h-3 bg-slate-800 rounded shadow-sm" />
              <div className="w-full h-12 bg-slate-900 rounded shadow-sm" />
            </div>
            <div className="font-bold text-sm text-foreground">Dark Mode</div>
          </button>
          
          <button 
            onClick={() => handleUpdate("theme", "System")}
            className={cn(
              "p-4 rounded-xl border-2 text-left transition-all",
              app.theme === "System" ? "border-primary bg-primary/10/50" : "border-border hover:border-border bg-card"
            )}
          >
            <div className="w-full h-24 rounded-lg bg-gradient-to-br from-slate-100 to-slate-900 border border-border mb-3 overflow-hidden p-2 flex flex-col gap-2">
              <div className="w-1/2 h-3 bg-card/50 rounded shadow-sm" />
              <div className="w-full h-12 bg-card/50 rounded shadow-sm" />
            </div>
            <div className="font-bold text-sm text-foreground">System Default</div>
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
