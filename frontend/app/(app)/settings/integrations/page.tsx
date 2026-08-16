"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Blocks, Link2, Download, HardDrive } from "lucide-react";

export default function IntegrationsPage() {
  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-blue-950">Integrations</h2>
          <p className="text-slate-500 font-medium mt-1">Connect external services and data sources.</p>
        </div>
      </div>

      <SettingsSection 
        title="Connected Apps" 
        description="Services authorized to interact with your AstraFinance account."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 last:pb-0 first:pt-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Google Drive</h4>
                <p className="text-xs text-slate-500">Not connected</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Connect
            </button>
          </div>

          <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0 last:pb-0 first:pt-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                <img src="https://github.githubassets.com/favicons/favicon.png" alt="GitHub" className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">GitHub</h4>
                <p className="text-xs text-slate-500">Not connected</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
              Connect
            </button>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
