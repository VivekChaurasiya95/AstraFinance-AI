"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { HardDrive, Download, Trash2, Database } from "lucide-react";

export default function DataStoragePage() {
  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Data & Storage</h2>
          <p className="text-muted-foreground font-medium mt-1">Manage your document storage and data footprint.</p>
        </div>
      </div>

      <SettingsSection 
        title="Storage Usage" 
        description="Your current data usage across workspaces."
      >
        <div className="mb-6">
          <div className="flex items-end justify-between mb-2">
            <div className="text-sm font-bold text-foreground">145 MB <span className="text-muted-foreground font-medium text-xs">/ 1 GB</span></div>
            <div className="text-xs font-bold text-muted-foreground">14% Used</div>
          </div>
          <div className="w-full h-3 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[14%] rounded-full" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm font-medium text-foreground">PDF Documents</span>
            </div>
            <span className="text-sm font-bold text-foreground">120 MB</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-sm font-medium text-foreground">Generated Reports</span>
            </div>
            <span className="text-sm font-bold text-foreground">25 MB</span>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection 
        title="Data Management" 
        description="Export or clear your data."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 last:pb-0 first:pt-0">
            <div>
              <h4 className="text-sm font-bold text-foreground">Export All Data</h4>
              <p className="text-xs text-muted-foreground">Download a JSON archive of your settings and reports.</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-muted-foreground bg-surface hover:bg-surface rounded-lg transition-colors">
              <Download className="w-4 h-4" /> Export
            </button>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0 last:pb-0 first:pt-0">
            <div>
              <h4 className="text-sm font-bold text-foreground">Clear Cache</h4>
              <p className="text-xs text-muted-foreground">Free up local browser storage.</p>
            </div>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm font-bold text-muted-foreground bg-surface hover:bg-surface rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
