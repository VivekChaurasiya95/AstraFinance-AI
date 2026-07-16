// ── Shared Workspace Types ────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description: string;
  docs: number;
  chats: number;
  reports: number;
  owner_name: string;
  updatedAt: string;
}

export interface Agent {
  id: number;
  name: string;
  status: "Complete" | "Running" | "Idle" | "Failed";
  details: string;
}

export interface ChatMsg {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp?: string;
  citations?: Citation[];
  status?: "sending" | "thinking" | "done" | "error" | "not-found";
}

export interface Citation {
  id?: string;
  doc: string;
  page: number;
  text?: string;
  highlightedText?: string;
}

export interface Document {
  id: string;
  name: string;
  size_bytes: number;
  status: string;
  pages: number;
  uploaded_at: string;
  processing_step?: number;
  progress?: number;
  company?: string;
  doc_type?: string;
  extracted_metrics?: Metric[];
  red_flags?: RedFlag[];
}

export interface Metric {
  label: string;
  value: string;
  change: string;
  trend: "up" | "down";
  period: string;
}

export interface RedFlag {
  id: string;
  severity: "High" | "Medium" | "Low";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  source_doc: string;
  source_page: number;
  detected_at: string;
}

export interface Peer {
  company: string;
  ticker: string;
  is_base: boolean;
  metrics: Record<string, string | number>;
}

export interface AgentActivity {
  id: string;
  agent: string;
  agent_type: string;
  status: "Complete" | "Running" | "Idle" | "Failed";
  action: string;
  details: string;
  timestamp: string;
  duration: string;
  metadata: Record<string, string | number>;
}

export interface Report {
  id: string;
  title: string;
  summary: string;
  status: "completed" | "generating" | "failed";
  created_at: string;
  pages: number;
  type: string;
}

export interface ChatSession {
  id: string;
  firstQuestion: string;
  messageCount: number;
  timestamp: string;
  date: string;
}

export type Tab = "Chat" | "Documents" | "Metrics" | "Comparison" | "Red Flags" | "Agent Activity" | "Reports";
