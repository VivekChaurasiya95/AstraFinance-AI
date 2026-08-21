"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { Download, Clock, User, LogIn, ShieldAlert } from "lucide-react";

export default function ActivityPage() {
  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-foreground">Activity Log</h2>
          <p className="text-muted-foreground font-medium mt-1">Review recent actions taken on your account.</p>
        </div>
      </div>

      <SettingsSection 
        title="Recent Account Activity" 
        description="A 30-day log of security and configuration changes."
      >
        <div className="space-y-0">
          
          <div className="flex items-start gap-4 py-4 border-b border-border-subtle last:border-0">
            <div className="w-8 h-8 rounded-full bg-surface text-muted-foreground flex items-center justify-center shrink-0 mt-0.5">
              <LogIn className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">Successful Login</h4>
                <span className="text-xs font-bold text-muted-foreground">Just now</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Windows PC • Chrome • 192.168.1.100</p>
            </div>
          </div>

          <div className="flex items-start gap-4 py-4 border-b border-border-subtle last:border-0">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">Profile Updated</h4>
                <span className="text-xs font-bold text-muted-foreground">2 hours ago</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Changed profile name.</p>
            </div>
          </div>

          <div className="flex items-start gap-4 py-4 border-b border-border-subtle last:border-0">
            <div className="w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0 mt-0.5">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-foreground">Report Generated</h4>
                <span className="text-xs font-bold text-muted-foreground">Yesterday</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Completed analysis for Workspace "Vertex Analysis".</p>
            </div>
          </div>

        </div>

        <div className="pt-6 border-t border-border-subtle mt-2 flex justify-center">
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-muted-foreground bg-surface hover:bg-surface border border-border rounded-lg transition-colors">
            <Download className="w-4 h-4" /> Download Complete Log
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
