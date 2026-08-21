"use client";

import { useSettings } from "@/hooks/useSettings";
import { SettingsSection, SettingsToggle } from "@/components/settings/SettingsSection";
import { Loader2, Save, BellRing, MonitorSmartphone, Mail, CheckCircle2, Clock, ShieldAlert, Zap, LayoutDashboard, BrainCircuit, ShieldCheck, Database, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { settings, isSaving, updateSetting, loading } = useSettings();
  const [showSaved, setShowSaved] = useState(false);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | "default">("default");
  
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("Browser notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    setBrowserPermission(permission);
    if (permission === "granted") {
      toast.success("Browser notifications enabled!");
      handleUpdate("browser", true);
    } else {
      toast.error("Permission denied for browser notifications.");
      handleUpdate("browser", false);
    }
  };

  useEffect(() => {
    if (!isSaving && settings) {
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [isSaving, settings]);

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const notifs: any = settings.notifications || {};

  const handleUpdate = async (key: string, value: any) => {
    await updateSetting({ [`notifications.${key}`]: value });
  };

  // Compact Toggle Item Component
  const NotificationSettingRow = ({ 
    title, 
    desc, 
    icon: Icon, 
    checked, 
    onChange, 
    iconColor = "text-muted-foreground", 
    bgColor = "bg-transparent" 
  }: any) => (
    <div className={cn(
      "grid items-center p-3.5 sm:p-4 hover:bg-surface transition-colors border-b border-border-subtle last:border-0 group gap-[14px]",
      Icon ? "grid-cols-[36px_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"
    )}>
      {Icon && (
        <div className={cn("w-[36px] h-[36px] rounded-lg flex items-center justify-center shrink-0 shadow-sm", bgColor, iconColor)}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      )}
      <div className="min-w-0 w-full">
        <h4 className="text-[14px] sm:text-[15px] font-semibold text-foreground leading-tight">{title}</h4>
        <p className="text-[13px] text-muted-foreground mt-1 leading-[1.45] whitespace-normal break-words overflow-wrap-break-word">{desc}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-2">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked || false} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className="w-[44px] h-[24px] bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-transform after:duration-200 peer-checked:bg-primary"></div>
      </label>
    </div>
  );

  const CustomRadio = ({ checked, label, desc, onClick }: any) => (
    <div onClick={onClick} className="flex items-start gap-[14px] p-3.5 sm:p-4 hover:bg-surface transition-colors border-b border-border-subtle last:border-0 cursor-pointer group">
      <div className="flex items-center justify-center h-5 mt-0.5 shrink-0">
        <div className={cn(
          "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
          checked ? "border-primary" : "border-border group-hover:border-primary"
        )}>
          {checked && <div className="w-2 h-2 rounded-full bg-primary" />}
        </div>
      </div>
      <div className="min-w-0 w-full">
        <span className={cn(
          "text-[14px] sm:text-[15px] font-semibold capitalize leading-tight transition-colors",
          checked ? "text-primary" : "text-foreground"
        )}>
          {label}
        </span>
        <p className="text-[13px] text-muted-foreground mt-1 leading-[1.45] whitespace-normal break-words overflow-wrap-break-word">
          {desc}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-12 relative max-w-[1000px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border pb-4 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-[24px] font-bold text-foreground tracking-tight">Notifications</h2>
            <div className={cn(
              "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider shadow-sm border",
              notifs.in_app !== false ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]" : "bg-surface text-muted-foreground border-border"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", notifs.in_app !== false ? "bg-[#10B981] animate-pulse" : "bg-muted")} />
              {notifs.in_app !== false ? "ENABLED" : "PAUSED"}
            </div>
          </div>
          <p className="text-[14px] text-muted-foreground font-medium mt-1">Choose what AstraFinance should notify you about and where.</p>
        </div>
        
        <div className="h-8 flex items-center shrink-0">
          <AnimatePresence mode="wait">
            {isSaving ? (
              <motion.div key="saving" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="flex items-center gap-2 text-[13px] font-semibold text-muted-foreground bg-surface px-3 py-1.5 rounded-full">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
              </motion.div>
            ) : showSaved ? (
              <motion.div key="saved" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[13px] font-semibold text-success bg-success/10 border border-emerald-100 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Delivery Methods */}
      <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border-subtle bg-surface/50">
          <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
            <BellRing className="w-4 h-4 text-primary" />
            Delivery Methods
          </h3>
        </div>
        <div className="divide-y divide-border">
          <NotificationSettingRow
            title="In-App Notifications"
            desc="Receive notifications inside the AstraFinance dashboard."
            icon={LayoutDashboard}
            iconColor="text-primary"
            bgColor="bg-primary/10"
            checked={notifs.in_app !== false}
            onChange={(v: boolean) => handleUpdate("in_app", v)}
          />
          <NotificationSettingRow
            title="Email Notifications"
            desc="Receive important alerts and finished reports via email."
            icon={Mail}
            iconColor="text-purple-600"
            bgColor="bg-purple-50"
            checked={notifs.email !== false}
            onChange={(v: boolean) => handleUpdate("email", v)}
          />
          <div className="grid items-center p-3.5 sm:p-4 hover:bg-surface transition-colors border-b border-border-subtle last:border-0 group gap-[14px] grid-cols-[36px_minmax(0,1fr)_auto]">
            <div className="w-[36px] h-[36px] rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-primary/10 text-primary">
              <MonitorSmartphone className="w-[18px] h-[18px]" />
            </div>
            <div className="min-w-0 w-full">
              <h4 className="text-[14px] sm:text-[15px] font-semibold text-foreground leading-tight">Browser Notifications</h4>
              <p className="text-[13px] text-muted-foreground mt-1 leading-[1.45] whitespace-normal break-words overflow-wrap-break-word">Native desktop notifications when AstraFinance is in the background.</p>
            </div>
            <div className="shrink-0 flex items-center justify-end ml-2">
              {browserPermission === "granted" ? (
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={notifs.browser || false} onChange={(e) => handleUpdate("browser", e.target.checked)} />
                  <div className="w-[44px] h-[24px] bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-transform after:duration-200 peer-checked:bg-primary"></div>
                </label>
              ) : (
                <button 
                  onClick={requestBrowserPermission}
                  disabled={browserPermission === "denied"}
                  className="px-3 py-1.5 text-[13px] font-semibold bg-card border border-border shadow-sm hover:bg-surface text-foreground rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {browserPermission === "denied" ? "Blocked" : "Enable"}
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Column */}
        <div className="space-y-6">
          <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle bg-surface/50">
              <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-[#10B981]" />
                AI & Reports
              </h3>
            </div>
            <div className="divide-y divide-border">
              <NotificationSettingRow
                title="Report Generation"
                desc="Notify me when a financial report is ready."
                checked={notifs.report_generation !== false}
                onChange={(v: boolean) => handleUpdate("report_generation", v)}
              />
              <NotificationSettingRow
                title="Report Failed"
                desc="Notify me when report generation fails."
                checked={notifs.report_failed !== false}
                onChange={(v: boolean) => handleUpdate("report_failed", v)}
              />
              <NotificationSettingRow
                title="Research Complete"
                desc="Notify me when research processing completes."
                checked={notifs.research_complete !== false}
                onChange={(v: boolean) => handleUpdate("research_complete", v)}
              />
            </div>
          </section>

          <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle bg-surface/50">
              <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#EF4444]" />
                Risk & Financial Intelligence
              </h3>
            </div>
            <div className="divide-y divide-border">
              <NotificationSettingRow
                title="Risk Anomalies"
                desc="Notify me when the Red Flag Agent detects significant anomalies."
                checked={notifs.risk_anomalies !== false}
                onChange={(v: boolean) => handleUpdate("risk_anomalies", v)}
              />
              <NotificationSettingRow
                title="High Risk Finding"
                desc="Notify me when a high-severity financial risk is detected."
                checked={notifs.high_risk_finding !== false}
                onChange={(v: boolean) => handleUpdate("high_risk_finding", v)}
              />
            </div>
          </section>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle bg-surface/50">
              <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#F59E0B]" />
                Agent Orchestration
              </h3>
            </div>
            <div className="divide-y divide-border">
              <NotificationSettingRow
                title="Agent Started"
                desc="Notify me when an agent begins processing."
                checked={notifs.agent_started === true} // Default false
                onChange={(v: boolean) => handleUpdate("agent_started", v)}
              />
              <NotificationSettingRow
                title="Agent Completed"
                desc="Notify me when an agent completes."
                checked={notifs.agent_completed !== false}
                onChange={(v: boolean) => handleUpdate("agent_completed", v)}
              />
              <NotificationSettingRow
                title="Agent Failed"
                desc="Notify me when an agent fails."
                checked={notifs.agent_failed !== false}
                onChange={(v: boolean) => handleUpdate("agent_failed", v)}
              />
              <NotificationSettingRow
                title="Pipeline Completed"
                desc="Notify me when the complete analysis pipeline finishes."
                checked={notifs.pipeline_completed !== false}
                onChange={(v: boolean) => handleUpdate("pipeline_completed", v)}
              />
            </div>
          </section>

          <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="px-5 py-3 border-b border-border-subtle bg-surface/50">
              <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
                <Database className="w-4 h-4 text-[#0891B2]" />
                Workspace
              </h3>
            </div>
            <div className="divide-y divide-border">
              <NotificationSettingRow
                title="Document Processed"
                desc="Notify me when uploaded documents finish processing."
                checked={notifs.document_processed !== false}
                onChange={(v: boolean) => handleUpdate("document_processed", v)}
              />
              <NotificationSettingRow
                title="Workspace Updates"
                desc="Notify me about important workspace activity."
                checked={notifs.workspace_updates === true}
                onChange={(v: boolean) => handleUpdate("workspace_updates", v)}
              />
            </div>
          </section>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border-subtle bg-surface/50">
            <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              Alert Priority
            </h3>
          </div>
          <div className="divide-y divide-border">
            <CustomRadio
              checked={(notifs.priority || "important") === "all"}
              label="All Alerts"
              desc="Receive all enabled notifications."
              onClick={() => handleUpdate("priority", "all")}
            />
            <CustomRadio
              checked={(notifs.priority || "important") === "important"}
              label="Important Only"
              desc="Suppress low-priority activity."
              onClick={() => handleUpdate("priority", "important")}
            />
            <CustomRadio
              checked={(notifs.priority || "important") === "critical"}
              label="Critical Only"
              desc="Only show security, severe risk and failed pipeline alerts."
              onClick={() => handleUpdate("priority", "critical")}
            />
          </div>
        </section>

        <section className={cn("bg-card rounded-xl shadow-sm border border-border overflow-hidden transition-all duration-300", !notifs.quiet_hours?.enabled && "opacity-60 grayscale-[0.2]")}>
          <div className="px-5 py-3 border-b border-border-subtle bg-surface/50 flex items-center justify-between">
            <h3 className="text-[15px] font-semibold text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Quiet Hours
            </h3>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={notifs.quiet_hours?.enabled || false} 
                onChange={(e) => handleUpdate("quiet_hours.enabled", e.target.checked)} 
              />
              <div className="w-[44px] h-[24px] bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500/30 rounded-full peer peer-checked:after:translate-x-[20px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-[20px] after:w-[20px] after:transition-transform after:duration-200 peer-checked:bg-primary"></div>
            </label>
          </div>
          
          <div className="p-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">Start Time</label>
                <div className="relative">
                  <input
                    type="time"
                    disabled={!notifs.quiet_hours?.enabled}
                    className="w-full text-[14px] rounded-lg border-border bg-surface focus:bg-card text-foreground shadow-sm disabled:opacity-50"
                    value={notifs.quiet_hours?.start || "22:00"}
                    onChange={(e) => handleUpdate("quiet_hours.start", e.target.value)}
                  />
                  <Clock className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-muted-foreground mb-1.5">End Time</label>
                <div className="relative">
                  <input
                    type="time"
                    disabled={!notifs.quiet_hours?.enabled}
                    className="w-full text-[14px] rounded-lg border-border bg-surface focus:bg-card text-foreground shadow-sm disabled:opacity-50"
                    value={notifs.quiet_hours?.end || "08:00"}
                    onChange={(e) => handleUpdate("quiet_hours.end", e.target.value)}
                  />
                  <Clock className="w-4 h-4 text-muted-foreground absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            <label className={cn("flex items-start gap-3 mt-5", !notifs.quiet_hours?.enabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
              <div className="flex items-center h-5 mt-0.5">
                <input
                  type="checkbox"
                  disabled={!notifs.quiet_hours?.enabled}
                  className="w-4 h-4 text-[#2563EB] border-border rounded focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50"
                  checked={notifs.quiet_hours?.allow_critical ?? true}
                  onChange={(e) => handleUpdate("quiet_hours.allow_critical", e.target.checked)}
                />
              </div>
              <div>
                <span className="text-[14px] font-semibold text-foreground leading-tight">Allow critical alerts</span>
                <p className="text-[13px] text-muted-foreground leading-[1.45] mt-1 whitespace-normal break-words overflow-wrap-break-word">
                  Critical security and failure alerts bypass quiet hours.
                </p>
              </div>
            </label>
          </div>
        </section>
      </div>
    </div>
  );
}
