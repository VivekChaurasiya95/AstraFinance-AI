import { useState, useEffect, useCallback } from "react";
import { fetcher } from "@/lib/api";

export interface WorkspaceDefaults {
  ai_provider: string;
  response_style: string;
}

export interface WorkspaceMember {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: string;
  photo_url?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  docs: number;
  chats: number;
  reports: number;
  owner_name: string;
  owner_initial: string;
  updatedAt: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  member_count: number;
  defaults: WorkspaceDefaults;
}

export function useWorkspaceSettings() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspaceAndMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch the current (most recent) workspace
      const currentWs = await fetcher<Workspace>("/workspaces/current");
      setWorkspace(currentWs);
      
      // Fetch members for this workspace
      const wsMembers = await fetcher<WorkspaceMember[]>(`/workspaces/${currentWs.id}/members`);
      setMembers(wsMembers);
    } catch (err: unknown) {
      console.error(err);
      setError((err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) || "Unable to load workspace. We couldn't retrieve your workspace information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    queueMicrotask(() => { fetchWorkspaceAndMembers(); });
  }, [fetchWorkspaceAndMembers]);

  const updateWorkspace = async (updates: { name?: string; description?: string; defaults?: WorkspaceDefaults }) => {
    if (!workspace) return;
    try {
      const updatedWs = await fetcher<Workspace>(`/workspaces/${workspace.id}`, {
        method: "PATCH",
        body: JSON.stringify(updates),
      });
      setWorkspace(updatedWs);
      return updatedWs;
    } catch (err: unknown) {
      throw new Error((err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) || "Failed to update workspace.");
    }
  };

  const inviteMember = async (email: string, role: string) => {
    if (!workspace) return;
    try {
      await fetcher(`/workspaces/${workspace.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email, role }),
      });
      // Refresh members after invitation
      const wsMembers = await fetcher<WorkspaceMember[]>(`/workspaces/${workspace.id}/members`);
      setMembers(wsMembers);
      // Also refresh workspace to update member count
      const updatedWs = await fetcher<Workspace>(`/workspaces/${workspace.id}`);
      setWorkspace(updatedWs);
    } catch (err: unknown) {
      throw new Error((err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) || "Unable to send invitation.");
    }
  };

  const updateMemberRole = async (memberId: string, role: string) => {
    if (!workspace) return;
    try {
      await fetcher(`/workspaces/${workspace.id}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      // Update local state instead of full refetch for snappiness
      setMembers(members.map(m => m.user_id === memberId ? { ...m, role } : m));
    } catch (err: unknown) {
      throw new Error((err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) || "Failed to update role.");
    }
  };

  const removeMember = async (memberId: string) => {
    if (!workspace) return;
    try {
      await fetcher(`/workspaces/${workspace.id}/members/${memberId}`, {
        method: "DELETE",
      });
      setMembers(members.filter(m => m.user_id !== memberId));
      
      const updatedWs = await fetcher<Workspace>(`/workspaces/${workspace.id}`);
      setWorkspace(updatedWs);
    } catch (err: unknown) {
      throw new Error((err instanceof Error ? (err instanceof Error ? err.message : String(err)) : String(err)) || "Unable to remove member.");
    }
  };

  return {
    workspace,
    members,
    loading,
    error,
    refreshWorkspace: fetchWorkspaceAndMembers,
    updateWorkspace,
    inviteMember,
    updateMemberRole,
    removeMember
  };
}
