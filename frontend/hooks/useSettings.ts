import { useState, useEffect } from "react";
import { fetcher } from "@/lib/api";

export type Settings = {
  user_id: string;
  ai_configuration: {
    primary_provider: string;
    fallback_provider: string;
    auto_fallback: boolean;
    reasoning_mode: string;
    response_style: string;
    enforce_citations: boolean;
    risk_warnings: boolean;
  };
  notifications: {
    reports: boolean;
    agents: boolean;
    risk: boolean;
    workspace: boolean;
    email_enabled: boolean;
    in_app_enabled: boolean;
  };
  appearance: {
    theme: string;
    density: string;
    animations: string;
  };
  privacy: {
    ai_processing: boolean;
    document_processing: boolean;
    data_retention: string;
    personalization: boolean;
  };
};

export function useSettings() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetcher<Settings>("/settings");
      setSettings(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSetting = async (updates: Record<string, any>) => {
    try {
      setIsSaving(true);
      const data = await fetcher<Settings>("/settings", {
        method: "PATCH",
        body: JSON.stringify({ updates }),
      });
      setSettings(data);
      return { success: true };
    } catch (err: any) {
      console.error("Failed to update settings:", err);
      return { success: false, error: err.message };
    } finally {
      setIsSaving(false);
    }
  };

  return {
    settings,
    loading,
    error,
    isSaving,
    updateSetting,
    refresh: fetchSettings
  };
}
