"use client";

import { useSettings } from "@/hooks/useSettings";
import { SettingsSection, SettingsToggle, SettingsSelect } from "@/components/settings/SettingsSection";
import { Loader2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function PrivacyPage() {
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

  const priv = settings.privacy;

  const handleUpdate = async (key: string, value: any) => {
    await updateSetting({ [`privacy.${key}`]: value });
  };

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Privacy</h2>
          <p className="text-muted-foreground font-medium mt-1">Control how your data is used and stored.</p>
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
        title="Data Processing" 
        description="Configure how AstraFinance and partner LLMs handle your data."
      >
        <SettingsToggle
          label="AI Model Training"
          description="Allow your anonymized queries to be used to improve the underlying models. (Opting out does not affect functionality)."
          checked={priv.ai_processing}
          onChange={(v) => handleUpdate("ai_processing", v)}
        />
        <SettingsToggle
          label="Document Indexing"
          description="Keep your uploaded PDFs indexed in vector storage for fast retrieval."
          checked={priv.document_processing}
          onChange={(v) => handleUpdate("document_processing", v)}
        />
        <SettingsToggle
          label="Personalization"
          description="Allow AstraFinance to learn your preferred report style over time."
          checked={priv.personalization}
          onChange={(v) => handleUpdate("personalization", v)}
        />
      </SettingsSection>

      <SettingsSection 
        title="Data Retention" 
        description="How long we keep your data before automatic deletion."
      >
        <SettingsSelect
          label="Retention Period"
          description="Unused documents will be permanently deleted after this period."
          value={priv.data_retention}
          options={[
            { label: "7 days", value: "7 days" },
            { label: "30 days", value: "30 days" },
            { label: "90 days", value: "90 days" },
            { label: "Keep indefinitely", value: "Keep indefinitely" }
          ]}
          onChange={(v) => handleUpdate("data_retention", v)}
        />
      </SettingsSection>
    </div>
  );
}
