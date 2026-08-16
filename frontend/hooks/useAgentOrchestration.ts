import { useState, useEffect, useCallback, useRef } from 'react';
import { fetcher } from '@/lib/api';

export type AgentStatus = "Idle" | "Queued" | "Running" | "Complete" | "Failed" | "Blocked";

export interface Agent {
  id: number;
  name: string;
  status: AgentStatus;
  details: string;
  progress: number;
  duration?: string;
}

export interface AgentTimelineEvent {
  id: string;
  workspace_id: string;
  document_id: string;
  agent: string;
  agent_type: string;
  status: AgentStatus;
  action: string;
  details: string;
  duration: string;
  metadata: Record<string, any>;
  timestamp: string;
}

export interface AgentOrchestrationState {
  pipeline_status: string;
  document_id: string | null;
  document_name: string | null;
  agents: Agent[];
  timeline: AgentTimelineEvent[];
}

export function useAgentOrchestration(workspaceId: string) {
  const [state, setState] = useState<AgentOrchestrationState>({
    pipeline_status: 'idle',
    document_id: null,
    document_name: null,
    agents: [],
    timeline: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (!workspaceId) return;
    
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    }
    
    try {
      const data = await fetcher<AgentOrchestrationState>(`/workspaces/${workspaceId}/agents`);
      setState(data);
      setError(null);
    } catch (err: any) {
      console.error("Failed to load agent orchestration state:", err);
      setError(err.message || "Failed to load agent status");
    } finally {
      setLoading(false);
      if (showRefreshIndicator) {
        setIsRefreshing(false);
      }
    }
  }, [workspaceId]);

  // Initial load and polling
  useEffect(() => {
    loadData();

    // Intelligent polling: Only poll if pipeline is running/processing
    const isActive = state.agents.some(a => a.status === 'Running' || a.status === 'Queued');
    
    if (isActive) {
      pollingRef.current = setInterval(() => {
        loadData(false);
      }, 3000);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [loadData, state.agents]);

  const forceRefresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  const retryAgent = useCallback(async (agentId: number) => {
    try {
      await fetcher(`/workspaces/${workspaceId}/agents/${agentId}/retry`, {
        method: "POST"
      });
      // Optimistic update
      setState(prev => ({
        ...prev,
        agents: prev.agents.map(a => a.id === agentId ? { ...a, status: "Running" } : a)
      }));
      // Force an immediate refresh to sync with backend
      setTimeout(() => loadData(false), 500);
    } catch (err: any) {
      console.error("Failed to retry agent:", err);
      throw err;
    }
  }, [workspaceId, loadData]);

  return {
    ...state,
    loading,
    error,
    isRefreshing,
    forceRefresh,
    retryAgent
  };
}
