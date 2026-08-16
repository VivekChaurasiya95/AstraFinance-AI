"use client";

import { useSettings } from "@/hooks/useSettings";
import { SettingsSection, SettingsToggle } from "@/components/settings/SettingsSection";
import { Loader2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function NotificationsPage() {
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

  const notifs = settings.notifications;

  const handleUpdate = async (key: string, value: any) => {
    await updateSetting({ [`notifications.${key}`]: value });
  };

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-blue-950">Notifications</h2>
          <p className="text-slate-500 font-medium mt-1">Choose what we notify you about and how.</p>
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
        title="Delivery Methods" 
        description="How would you like to receive your notifications?"
      >
        <SettingsToggle
          label="In-App Notifications"
          description="Receive a ping in the dashboard when background tasks complete."
          checked={notifs.in_app_enabled}
          onChange={(v) => handleUpdate("in_app_enabled", v)}
        />
        <SettingsToggle
          label="Email Notifications"
          description="We'll send you an email for high-priority alerts and finished reports."
          checked={notifs.email_enabled}
          onChange={(v) => handleUpdate("email_enabled", v)}
        />
      </SettingsSection>

      <SettingsSection 
        title="Alert Types" 
        description="Select the specific events you want to be notified about."
      >
        <SettingsToggle
          label="Report Generation"
          description="When an AI financial report has finished generating."
          checked={notifs.reports}
          onChange={(v) => handleUpdate("reports", v)}
        />
        <SettingsToggle
          label="Agent Activity"
          description="When background pipeline agents start, fail, or complete."
          checked={notifs.agents}
          onChange={(v) => handleUpdate("agents", v)}
        />
        <SettingsToggle
          label="Risk Anomalies"
          description="Immediate alerts if the Red Flag agent spots severe anomalies."
          checked={notifs.risk}
          onChange={(v) => handleUpdate("risk", v)}
        />
        <SettingsToggle
          label="Workspace Updates"
          description="When new documents are added or processed in your workspaces."
          checked={notifs.workspace}
          onChange={(v) => handleUpdate("workspace", v)}
        />
      </SettingsSection>
    </div>
  );
}
