"use client";

import { useState } from "react";
import { Folder, Users, FileText, Settings, Trash2, Plus, MoreHorizontal, User, Server, Paintbrush, ChevronDown } from "lucide-react";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { ManageWorkspaceModal } from "@/components/settings/ManageWorkspaceModal";
import { InviteMemberModal } from "@/components/settings/InviteMemberModal";

export default function WorkspacePage() {
  const { workspace, members, loading, error, updateWorkspace, inviteMember, updateMemberRole, removeMember } = useWorkspaceSettings();
  
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : "U";
  };
  
  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "today";
    if (diffDays === 1) return "1 day";
    return `${diffDays} days`;
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    try {
      await updateMemberRole(memberId, role);
      setActiveMenu(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (confirm("Are you sure you want to remove this member?")) {
      try {
        await removeMember(memberId);
        setActiveMenu(null);
      } catch (err) {
        console.error(err);
      }
    }
  };

  if (loading) {
    return (
      <div className="max-w-[900px] w-full animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-md mb-2"></div>
        <div className="h-4 w-72 bg-surface rounded-md mb-10"></div>
        
        <div className="h-24 bg-surface border border-border rounded-xl mb-12"></div>
        <div className="h-6 w-40 bg-muted rounded-md mb-4"></div>
        <div className="h-32 bg-surface border border-border rounded-xl"></div>
      </div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="max-w-[900px] w-full flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 bg-destructive/20 text-destructive rounded-xl flex items-center justify-center mb-4">
          <Settings className="w-6 h-6" />
        </div>
        <h3 className="text-[17px] font-bold text-foreground mb-1">Unable to load workspace</h3>
        <p className="text-[13px] text-muted-foreground mb-6">{error || "We couldn't retrieve your workspace information."}</p>
        <button 
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-foreground text-white text-[13px] font-medium rounded-lg hover:bg-foreground transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] w-full pb-12 relative" onClick={() => setActiveMenu(null)}>
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-border pb-5 mb-8">
        <div>
          <h2 className="text-[24px] font-black text-foreground flex items-center gap-3">
            Workspace Defaults
            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-success/10 text-success text-[11px] font-bold tracking-wide rounded-full border border-success/50 uppercase">
              <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
              Synced
            </span>
          </h2>
          <p className="text-muted-foreground text-[14px] font-medium mt-1.5">Manage global settings across your analysis projects.</p>
        </div>
      </div>

      {/* CURRENT WORKSPACE */}
      <div className="mb-10">
        <div className="flex items-center justify-between bg-card border border-border rounded-[14px] p-5 shadow-sm shadow-slate-200/20">
          <div className="flex items-center gap-4">
            <div className="w-[46px] h-[46px] bg-[#EFF6FF] text-[#2563EB] rounded-[12px] flex items-center justify-center">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-foreground">{workspace.name}</h3>
                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-success/10 text-success text-[11px] font-bold rounded-full border border-emerald-100">
                  <span className="w-1.5 h-1.5 bg-success rounded-full"></span>
                  Active workspace
                </span>
              </div>
              <p className="text-[12px] text-muted-foreground mt-1">
                Created {formatTimeAgo(workspace.updatedAt)} ago
              </p>
            </div>
          </div>
          <button 
            onClick={() => setIsManageOpen(true)}
            className="h-[34px] px-4 bg-card border border-border hover:bg-surface text-[13px] font-bold text-foreground rounded-lg transition-colors flex items-center gap-1.5"
            aria-label="Manage workspace"
          >
            <Settings className="w-3.5 h-3.5" /> Manage
          </button>
        </div>
      </div>

      {/* MEMBERS */}
      <div className="mb-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-4">
          <div>
            <h3 className="text-[16px] font-bold text-foreground">Workspace Members</h3>
            <p className="text-[13px] text-muted-foreground mt-0.5">{workspace.member_count} {workspace.member_count === 1 ? "person" : "people"} with access to this workspace.</p>
          </div>
          <button 
            onClick={() => setIsInviteOpen(true)}
            className="mt-3 sm:mt-0 h-[34px] px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/60 text-[13px] font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_12px_rgba(67,198,188,0.3)]"
          >
            <Plus className="w-4 h-4" /> Invite Members
          </button>
        </div>

        <div className="bg-card border border-border rounded-[14px] overflow-hidden shadow-sm shadow-slate-200/20">
          {members.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center">
              <div className="w-12 h-12 bg-surface text-muted-foreground rounded-full flex items-center justify-center mb-3">
                <Users className="w-5 h-5" />
              </div>
              <p className="text-[14px] font-semibold text-foreground">No other members yet</p>
              <p className="text-[13px] text-muted-foreground mb-4">Invite teammates to collaborate on this workspace.</p>
              <button 
                onClick={() => setIsInviteOpen(true)}
                className="h-[34px] px-4 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/60 text-[13px] font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-[0_0_12px_rgba(67,198,188,0.3)]"
              >
                <Plus className="w-3.5 h-3.5" /> Invite Members
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {members.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between px-5 py-4 hover:bg-surface/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    {member.photo_url ? (
                      <img src={member.photo_url} alt={member.name} className="w-[36px] h-[36px] rounded-full object-cover border border-border shadow-sm transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="w-[36px] h-[36px] bg-gradient-to-br from-indigo-100 to-purple-100 text-primary rounded-full flex items-center justify-center font-bold text-[13px] border border-indigo-200 shadow-sm transition-transform group-hover:scale-105">
                        {getInitials(member.name)}
                      </div>
                    )}
                    <div>
                      <p className="text-[14px] font-bold text-foreground flex items-center gap-2">
                        {member.name}
                        {member.role === "Owner" && (
                          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-bold uppercase rounded border border-indigo-100">Owner</span>
                        )}
                      </p>
                      <p className="text-[13px] text-muted-foreground">{member.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-[13px] font-medium text-muted-foreground">{member.role}</span>
                    
                    {/* Action Menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === member.user_id ? null : member.user_id); }}
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface rounded-lg transition-colors"
                        aria-label="Member actions"
                        disabled={member.role === "Owner"}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      
                      {activeMenu === member.user_id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg shadow-slate-900/5 py-1 z-10 overflow-hidden">
                          <div className="px-3 py-2 border-b border-border-subtle">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Change Role</p>
                          </div>
                          <button onClick={() => handleRoleChange(member.user_id, "Viewer")} className="w-full text-left px-4 py-2 text-[13px] font-medium text-foreground hover:bg-surface flex items-center justify-between">
                            Viewer {member.role === "Viewer" && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
                          </button>
                          <button onClick={() => handleRoleChange(member.user_id, "Editor")} className="w-full text-left px-4 py-2 text-[13px] font-medium text-foreground hover:bg-surface flex items-center justify-between">
                            Editor {member.role === "Editor" && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
                          </button>
                          <button onClick={() => handleRoleChange(member.user_id, "Admin")} className="w-full text-left px-4 py-2 text-[13px] font-medium text-foreground hover:bg-surface flex items-center justify-between border-b border-border-subtle">
                            Admin {member.role === "Admin" && <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>}
                          </button>
                          <button onClick={() => handleRemoveMember(member.user_id)} className="w-full text-left px-4 py-2 text-[13px] font-semibold text-destructive hover:bg-destructive/10 flex items-center gap-2">
                            <Trash2 className="w-3.5 h-3.5" /> Remove Member
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* WORKSPACE DEFAULTS */}
      <div>
        <h3 className="text-[16px] font-bold text-foreground mb-4">Global Preferences</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-[14px] p-5 shadow-sm shadow-slate-200/20">
            <div className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-3">
              <Server className="w-4 h-4" />
            </div>
            <h4 className="text-[14px] font-bold text-foreground">Default AI Provider</h4>
            <p className="text-[13px] font-medium text-muted-foreground mt-1">{workspace.defaults.ai_provider}</p>
          </div>
          
          <div className="bg-card border border-border rounded-[14px] p-5 shadow-sm shadow-slate-200/20">
            <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center mb-3">
              <Paintbrush className="w-4 h-4" />
            </div>
            <h4 className="text-[14px] font-bold text-foreground">Response Style</h4>
            <p className="text-[13px] font-medium text-muted-foreground mt-1">{workspace.defaults.response_style}</p>
          </div>
        </div>
      </div>

      <ManageWorkspaceModal
        isOpen={isManageOpen}
        onClose={() => setIsManageOpen(false)}
        workspace={workspace}
        onSave={updateWorkspace}
      />
      
      <InviteMemberModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        workspaceName={workspace.name}
        onInvite={inviteMember}
      />
    </div>
  );
}
