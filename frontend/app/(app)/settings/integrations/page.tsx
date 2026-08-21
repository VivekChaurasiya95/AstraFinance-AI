"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Blocks, Link2, Download, HardDrive } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Integrations</h2>
          <p className="text-muted-foreground font-medium mt-1">Connect external services and data sources.</p>
        </div>
      </div>

      <SettingsSection 
        title="Connected Apps" 
        description="Services authorized to interact with your AstraFinance account."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-border-subtle last:border-0 last:pb-0 first:pt-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">Google Drive</h4>
                <p className="text-xs text-muted-foreground">Not connected</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-sm font-bold text-muted-foreground bg-surface hover:bg-surface rounded-lg transition-colors">
              Connect
            </button>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-border-subtle last:border-0 last:pb-0 first:pt-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface flex items-center justify-center border border-border">
                <img src="https://github.githubassets.com/favicons/favicon.png" alt="GitHub" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground">GitHub</h4>
                <p className="text-xs text-muted-foreground">Not connected</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-sm font-bold text-muted-foreground bg-surface hover:bg-surface rounded-lg transition-colors">
              Connect
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
