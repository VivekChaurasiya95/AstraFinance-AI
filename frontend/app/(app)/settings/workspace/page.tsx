"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Folder, Users, FileText, Settings, Trash2 } from "lucide-react";

export default function WorkspacePage() {
  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-blue-950">Workspace Defaults</h2>
          <p className="text-slate-500 font-medium mt-1">Manage global settings across all your analysis projects.</p>
        </div>
      </div>

      <SettingsSection 
        title="Current Workspace" 
        description="The active workspace you are currently configuring."
      >
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Folder className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-blue-950">Vertex Analysis</h3>
              <p className="text-sm text-slate-500">Created 2 days ago</p>
            </div>
          </div>
          <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-sm font-bold text-slate-700 rounded-lg transition-colors">
            Manage
          </button>
        </div>
      </SettingsSection>

      <SettingsSection 
        title="Workspace Members" 
        description="People with access to this workspace."
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 last:pb-0 first:pt-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold text-sm">V</div>
              <div>
                <p className="text-sm font-bold text-slate-800">Vivek Chaurasiya</p>
                <p className="text-xs text-slate-500">Owner (You)</p>
              </div>
            </div>
          </div>
          
          <button className="mt-4 flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors">
            <Users className="w-4 h-4" /> Invite Members
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
