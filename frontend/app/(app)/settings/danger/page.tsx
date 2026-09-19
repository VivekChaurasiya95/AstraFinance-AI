"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function DangerPage() {
  const [confirmText, setConfirmText] = useState("");
  
  return (
    <div className="space-y-8 pb-12 relative">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h2 className="text-2xl font-black text-destructive">Danger Zone</h2>
          <p className="text-muted-foreground font-medium mt-1">Irreversible actions that affect your account and data.</p>
        </div>
      </div>

      <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-destructive/20 text-destructive flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-destructive">Delete Account</h3>
            <p className="text-sm text-destructive/80">Permanently remove your account, settings, and all workspace data.</p>
          </div>
        </div>
        
        <div className="bg-card rounded-xl p-5 border border-destructive/20">
          <p className="text-sm font-bold text-foreground mb-4">
            If you are sure, type <span className="text-destructive select-all bg-destructive/10 px-1.5 py-0.5 rounded">DELETE</span> to confirm.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input 
              type="text" 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type DELETE..."
              className="w-full sm:w-auto bg-surface border border-border text-foreground text-sm rounded-lg focus:ring-red-500 focus:border-destructive/50 block p-2.5 font-bold uppercase"
            />
            <button 
              disabled={confirmText !== "DELETE"}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-colors",
                confirmText === "DELETE" 
                  ? "bg-red-600 hover:bg-red-700 text-white shadow-sm" 
                  : "bg-surface text-muted-foreground cursor-not-allowed"
              )}
            >
              <Trash2 className="w-4 h-4" /> Delete My Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
