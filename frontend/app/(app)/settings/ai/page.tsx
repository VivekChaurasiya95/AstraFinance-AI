"use client";

import { useSettings } from "@/hooks/useSettings";
import { SettingsSection, SettingsToggle, SettingsSelect } from "@/components/settings/SettingsSection";
import { Loader2, Save } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

export default function AIConfigurationPage() {
  const { settings, isSaving, updateSetting, loading } = useSettings();
  const [showSaved, setShowSaved] = useState(false);

  // Show "Saved" toast/icon whenever saving completes successfully
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

  const ai = settings.ai_configuration;

  const handleUpdate = async (key: string, value: any) => {
    await updateSetting({ [`ai_configuration.${key}`]: value });
  };

  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">AI Configuration</h2>
          <p className="text-muted-foreground font-medium mt-1">Manage AI providers, reasoning styles, and guardrails.</p>
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
        title="Model Selection" 
        description="Choose the primary intelligence engines powering AstraFinance."
      >
        <SettingsSelect
          label="Primary Provider"
          description="The main LLM used for standard queries and report generation."
          value={ai.primary_provider}
          options={[
            { label: "Groq (Llama 3 70B)", value: "Groq" },
            { label: "Gemini 1.5 Pro", value: "Gemini" },
            { label: "Claude 3.5 Sonnet", value: "Claude" }
          ]}
          onChange={(v) => handleUpdate("primary_provider", v)}
        />
        <SettingsSelect
          label="Fallback Provider"
          description="The backup LLM used if the primary provider experiences rate limits."
          value={ai.fallback_provider}
          options={[
            { label: "Gemini 1.5 Flash", value: "Gemini" },
            { label: "Groq (Llama 3 8B)", value: "Groq_Fast" },
          ]}
          onChange={(v) => handleUpdate("fallback_provider", v)}
        />
        <SettingsToggle
          label="Automatic Fallback"
          description="Seamlessly switch to the fallback provider to prevent pipeline failures."
          checked={ai.auto_fallback}
          onChange={(v) => handleUpdate("auto_fallback", v)}
        />
      </SettingsSection>

      <SettingsSection 
        title="Reasoning & Style" 
        description="Tune how the AI analyzes data and communicates."
      >
        <SettingsSelect
          label="Reasoning Mode"
          description="Determines how deep the AI analyzes documents before responding."
          value={ai.reasoning_mode}
          options={[
            { label: "Balanced", value: "Balanced" },
            { label: "Deep Research", value: "Deep Research" },
            { label: "Fast Extraction", value: "Fast Extraction" }
          ]}
          onChange={(v) => handleUpdate("reasoning_mode", v)}
        />
        <SettingsSelect
          label="Response Style"
          description="The tone and format of generated reports and chat responses."
          value={ai.response_style}
          options={[
            { label: "Professional", value: "Professional" },
            { label: "Academic", value: "Academic" },
            { label: "Executive Summary", value: "Executive Summary" }
          ]}
          onChange={(v) => handleUpdate("response_style", v)}
        />
      </SettingsSection>

      <SettingsSection 
        title="Guardrails" 
        description="Enforce strict rules for financial accuracy."
      >
        <SettingsToggle
          label="Enforce Citations"
          description="Require the AI to cite specific document chunks for every claim made."
          checked={ai.enforce_citations}
          onChange={(v) => handleUpdate("enforce_citations", v)}
        />
        <SettingsToggle
          label="Financial Risk Warnings"
          description="Automatically flag high-risk anomalies in extracted financial data."
          checked={ai.risk_warnings}
          onChange={(v) => handleUpdate("risk_warnings", v)}
        />
      </SettingsSection>
    </div>
  );
}
