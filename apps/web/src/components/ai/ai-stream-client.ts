export interface AgentToolTraceItem {
  id: string;
  tool: string;
  label: string;
  status: "running" | "done" | "error";
  summary?: string;
  durationMs?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export type AgentProposedAction =
  | {
      type: "LEAVE_DRAFT";
      title: string;
      subtitle: string;
      summary: string;
      payload: Record<string, unknown>;
      status?: "CONFIRMATION_REQUIRED" | "SUBMITTED" | "CANCELLED";
      createdRecordId?: string;
    }
  | {
      type: "ATTENDANCE_ADJUSTMENT_DRAFT";
      title: string;
      subtitle: string;
      summary: string;
      payload: {
        workDate: string;
        requestedCheckIn?: string;
        requestedCheckOut?: string;
        reason: string;
      };
      status?: "CONFIRMATION_REQUIRED" | "SUBMITTED" | "CANCELLED";
      createdRecordId?: string;
    }
  | {
      type: "NAVIGATE";
      title: string;
      subtitle: string;
      href: string;
    };

export interface AgentMeta {
  modelUsed: string;
  fallbackTier: number;
  latencyMs: number;
  provider?: "CODEX" | "GROQ" | "LOCAL_ONLY";
}

export interface PolicySourceCitation {
  documentNo: string;
  title: string;
  category?: string;
  excerpt: string;
  relevanceScore?: number;
}

export interface DraftProposal {
  type: "LEAVE" | "TRAINING";
  summary: string;
  payload: Record<string, unknown>;
  status: "CONFIRMATION_REQUIRED" | "SUBMITTED" | "CANCELLED";
  createdRecordId?: string;
}

export interface AiChatResponsePayload {
  reply: string;
  sources?: PolicySourceCitation[];
  profileData?: Record<string, unknown>;
  draftProposal?: DraftProposal;
  toolTraces?: AgentToolTraceItem[];
  proposedActions?: AgentProposedAction[];
  quickFollowUps?: string[];
  meta?: AgentMeta;
}

export interface StreamAiChatParams {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  sessionId: string;
  currentPath?: string;
}

export interface StreamAiChatCallbacks {
  onStatus: (msg: string) => void;
  onToolStart: (trace: AgentToolTraceItem) => void;
  onToolDone: (trace: AgentToolTraceItem) => void;
  onDelta: (chunk: string) => void;
}

export type StreamAiChatResult =
  | { kind: "ok"; data: AiChatResponsePayload }
  | { kind: "quota"; error: string }
  | { kind: "error"; error: string };

export function getAiAuthHeaders(includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("bahau_session_id");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function normalizeProposedActions(raw: unknown): AgentProposedAction[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  return raw.map((item: any) => {
    if (item?.type === "LEAVE_DRAFT" || item?.type === "ATTENDANCE_ADJUSTMENT_DRAFT") {
      return {
        ...item,
        status: item.status || "CONFIRMATION_REQUIRED",
      } as AgentProposedAction;
    }
    return item as AgentProposedAction;
  });
}

function normalizeResponsePayload(raw: any): AiChatResponsePayload {
  return {
    reply: String(raw?.reply ?? ""),
    sources: Array.isArray(raw?.sources) ? raw.sources : undefined,
    profileData: raw?.profileData,
    draftProposal: raw?.draftProposal,
    toolTraces: Array.isArray(raw?.toolTraces) ? raw.toolTraces : undefined,
    proposedActions: normalizeProposedActions(raw?.proposedActions),
    quickFollowUps: Array.isArray(raw?.quickFollowUps) ? raw.quickFollowUps : undefined,
    meta: raw?.meta,
  };
}

async function fallbackNonStreamingChat(
  params: StreamAiChatParams
): Promise<StreamAiChatResult> {
  try {
    const res = await fetch("/api/v1/ai/chat", {
      method: "POST",
      credentials: "include",
      headers: getAiAuthHeaders(true),
      body: JSON.stringify({
        message: params.message.slice(0, 2000),
        history: params.history,
        sessionId: params.sessionId,
        liveContext: params.currentPath ? { currentPath: params.currentPath } : undefined,
      }),
    });

    const json = await res.json().catch(() => null);

    if (res.status === 429) {
      return {
        kind: "quota",
        error:
          json?.error?.message ||
          "Bạn đã đạt giới hạn lượt sử dụng Trợ lý AI trong ngày. Vui lòng thử lại vào ngày mai hoặc liên hệ Quản trị viên.",
      };
    }

    if (!res.ok || json?.success === false || !json?.data) {
      return {
        kind: "error",
        error:
          json?.error?.message ||
          `Trợ lý AI gặp lỗi khi xử lý yêu cầu (HTTP ${res.status}).`,
      };
    }

    return {
      kind: "ok",
      data: normalizeResponsePayload(json.data),
    };
  } catch (err) {
    return {
      kind: "error",
      error:
        err instanceof Error
          ? err.message
          : "Không thể kết nối máy chủ Trợ lý AI.",
    };
  }
}

export async function streamAiChat(
  params: StreamAiChatParams,
  callbacks: StreamAiChatCallbacks
): Promise<StreamAiChatResult> {
  try {
    const res = await fetch("/api/ai-stream", {
      method: "POST",
      credentials: "include",
      headers: getAiAuthHeaders(true),
      body: JSON.stringify({
        message: params.message.slice(0, 2000),
        history: params.history,
        sessionId: params.sessionId,
        liveContext: params.currentPath ? { currentPath: params.currentPath } : undefined,
      }),
    });

    if (res.status === 429) {
      const json = await res.json().catch(() => null);
      return {
        kind: "quota",
        error:
          json?.error?.message ||
          "Bạn đã đạt giới hạn lượt sử dụng Trợ lý AI trong ngày.",
      };
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();

    if (!res.ok) {
      // Fall back to non-stream endpoint if proxy/stream failed
      return fallbackNonStreamingChat(params);
    }

    if (contentType.includes("application/json")) {
      const json = await res.json().catch(() => null);
      if (json?.success !== false && json?.data) {
        return {
          kind: "ok",
          data: normalizeResponsePayload(json.data),
        };
      }
      return fallbackNonStreamingChat(params);
    }

    if (!res.body) {
      return fallbackNonStreamingChat(params);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let completedData: AiChatResponsePayload | null = null;
    let quotaError: string | null = null;
    let streamError = false;

    const processEventBlock = (block: string) => {
      const lines = block.split(/\r?\n/);
      let eventName = "";
      const dataLines: string[] = [];

      for (const line of lines) {
        if (line.startsWith(":")) continue;
        if (line.startsWith("event:")) {
          eventName = line.slice(6).trim();
        } else if (line.startsWith("data:")) {
          dataLines.push(line.slice(5).trimStart());
        }
      }

      if (dataLines.length === 0) return;
      const rawData = dataLines.join("\n").trim();
      if (!rawData || rawData === "[DONE]") return;

      let parsed: any;
      try {
        parsed = JSON.parse(rawData);
      } catch {
        return;
      }

      const type = String(parsed?.type || parsed?.event || eventName || "").trim();

      switch (type) {
        case "status": {
          const msg = String(parsed?.message ?? parsed?.status ?? "");
          if (msg) callbacks.onStatus(msg);
          break;
        }
        case "tool_start": {
          const trace = (parsed?.trace ?? parsed) as AgentToolTraceItem;
          if (trace?.id) callbacks.onToolStart({ ...trace, status: trace.status || "running" });
          break;
        }
        case "tool_done": {
          const trace = (parsed?.trace ?? parsed) as AgentToolTraceItem;
          if (trace?.id) callbacks.onToolDone(trace);
          break;
        }
        case "delta": {
          const chunk = String(parsed?.chunk ?? parsed?.delta ?? parsed?.content ?? "");
          if (chunk) callbacks.onDelta(chunk);
          break;
        }
        case "complete": {
          const payload = parsed?.data ?? parsed?.response ?? parsed;
          completedData = normalizeResponsePayload(payload);
          break;
        }
        case "error": {
          if (
            parsed?.status === 429 ||
            parsed?.code === "AI_QUOTA_EXCEEDED"
          ) {
            quotaError =
              parsed?.message ||
              "Bạn đã đạt giới hạn lượt sử dụng Trợ lý AI trong ngày.";
          } else {
            streamError = true;
          }
          break;
        }
        default: {
          // Handle generic payload carrying reply directly
          if (typeof parsed?.reply === "string") {
            completedData = normalizeResponsePayload(parsed);
          }
          break;
        }
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let sepIndex = buffer.search(/\r?\n\r?\n/);
      while (sepIndex !== -1) {
        const block = buffer.slice(0, sepIndex);
        const match = buffer.slice(sepIndex).match(/^\r?\n\r?\n/);
        const skipLen = match ? match[0].length : 2;
        buffer = buffer.slice(sepIndex + skipLen);

        if (block.trim()) {
          processEventBlock(block);
        }
        if (quotaError || streamError) break;
        sepIndex = buffer.search(/\r?\n\r?\n/);
      }

      if (quotaError || streamError) {
        await reader.cancel().catch(() => undefined);
        break;
      }
    }

    if (quotaError) {
      return { kind: "quota", error: quotaError };
    }

    if (buffer.trim() && !completedData && !streamError) {
      processEventBlock(buffer);
    }

    if (completedData && !streamError) {
      return { kind: "ok", data: completedData };
    }

    return fallbackNonStreamingChat(params);
  } catch {
    return fallbackNonStreamingChat(params);
  }
}
