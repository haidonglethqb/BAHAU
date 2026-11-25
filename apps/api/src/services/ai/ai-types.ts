import type {
  AgentProposedAction,
  AgentToolTraceItem,
  AiProvider,
  MaskedAiConfig,
  PolicySourceCitation,
} from "@bahau/contracts";

export type { AgentProposedAction, AgentToolTraceItem, AiProvider, MaskedAiConfig, PolicySourceCitation };

export type AgentToolName =
  | "search_dau_policies"
  | "get_my_leave_balance"
  | "get_my_attendance_summary"
  | "get_my_payslip"
  | "get_my_profile_summary"
  | "get_hr_overview_alerts"
  | "get_payroll_period_summary"
  | "get_pending_approvals"
  | "propose_leave_request"
  | "propose_navigation";

export interface AiSystemConfig {
  provider: AiProvider;
  codexApiKey: string;
  codexBaseUrl: string;
  codexPrimaryModel: string;
  codexFallbackModel: string;
  groqApiKey: string;
  groqPrimaryModel: string;
  temperature: number;
  timeoutMs: number;
  defaultUserDailyLimit: number | null;
  userDailyLimits: Record<string, number>;
}

export type LlmContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface LlmToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface LlmToolMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | LlmContentPart[] | null;
  tool_calls?: LlmToolCall[];
  tool_call_id?: string;
  name?: string;
}

export interface LlmToolStepResult {
  content: string;
  toolCalls: LlmToolCall[];
  modelUsed: string;
  fallbackTier: number;
  latencyMs: number;
}

export type AgentStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool_start"; trace: AgentToolTraceItem }
  | { type: "tool_done"; trace: AgentToolTraceItem }
  | { type: "delta"; text: string }
  | { type: "complete"; response: unknown }
  | { type: "error"; message: string };

export interface CandidateSpec {
  id: string;
  endpoint: string;
  apiKey: string;
  timeoutMs: number;
}

export interface AdminReplyItem {
  id: string;
  timestamp: string;
  sender: string;
  message: string;
}

export interface AiSessionTurn {
  id: string;
  turnIndex: number;
  timestamp: string;
  userMessage: string;
  modelUsed: string;
  fallbackTier: number;
  latencyMs: number;
  assistantReply: string;
  toolTraces?: AgentToolTraceItem[];
  proposedActions?: AgentProposedAction[];
  sources?: PolicySourceCitation[];
}

export interface AiConversationSession {
  sessionId: string;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  createdAt: string;
  updatedAt: string;
  turnsCount: number;
  lastModelUsed: string;
  turns: AiSessionTurn[];
  needsHumanSupport: boolean;
  escalatedAt: string | null;
  escalationReason: string | null;
  customerContact: string | null;
  adminReplies: AdminReplyItem[];
}
