import type {
  AgentProposedAction,
  AgentToolTraceItem,
  AiChatRequest,
  AiChatResponse,
  AuthUser,
  DraftProposal,
  PolicySourceCitation,
} from "@bahau/contracts";
import { runAgentDeterministicFallback } from "./agent-fallback.js";
import { buildAgentInitialMessages } from "./agent-prompts.js";
import { agentToolExecutor, AgentToolExecutorService } from "./agent-tool-executor.service.js";
import { BAHAU_AGENT_TOOL_LABELS, getToolsForUser } from "./agent-tool-registry.js";
import { aiConfigService } from "./ai-config.service.js";
import { aiGatewayService, AiGatewayService } from "./ai-gateway.service.js";
import type { AgentStreamEvent, LlmToolMessage, LlmToolStepResult } from "./ai-types.js";
import {
  buildSmartFollowUps,
  extractInlineFollowUps,
  redactSecretsInChunk,
  sanitizeReply,
} from "./supervisor-guardrail.js";

const MAX_STEPS = 5;

function parseToolArguments(raw: string): Record<string, unknown> {
  if (!raw || !raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
}

function emitDeltaChunks(text: string, onEvent?: (event: AgentStreamEvent) => void): void {
  if (!onEvent || !text) return;
  const chunkSize = 48;
  for (let i = 0; i < text.length; i += chunkSize) {
    onEvent({ type: "delta", text: text.slice(i, i + chunkSize) });
  }
}

export type ToolStepGateway = {
  executeToolStep: (
    messages: LlmToolMessage[],
    tools: unknown[],
    onProgress?: (message: string) => void,
    onTextDelta?: (chunk: string) => void
  ) => Promise<LlmToolStepResult>;
};

export class AgentLoopService {
  constructor(
    private readonly gateway: ToolStepGateway = aiGatewayService as unknown as ToolStepGateway,
    private readonly executor: Pick<AgentToolExecutorService, "execute"> = agentToolExecutor
  ) {}

  async run(
    authUser: AuthUser,
    input: AiChatRequest,
    onEvent?: (event: AgentStreamEvent) => void
  ): Promise<AiChatResponse> {
    const startedAt = Date.now();
    const emit = (ev: AgentStreamEvent) => onEvent?.(ev);

    emit({ type: "status", message: "Trợ lý AI BAHAU đang phân tích yêu cầu..." });

    const messages: LlmToolMessage[] = buildAgentInitialMessages(
      authUser,
      input.history ?? [],
      input.message,
      input.liveContext
    );
    const tools = getToolsForUser(authUser);

    const traces: AgentToolTraceItem[] = [];
    const actions: AgentProposedAction[] = [];
    const collectedSources: PolicySourceCitation[] = [];
    let collectedProfileData: Record<string, unknown> | undefined;
    let collectedDraftProposal: DraftProposal | undefined;

    let finalRawText = "";
    let lastModelUsed = "unknown";
    let lastFallbackTier = 1;
    let streamedDirectly = false;

    const onTextDelta = (chunk: string) => {
      if (!chunk) return;
      const safeChunk = redactSecretsInChunk(chunk);
      if (safeChunk) {
        emit({ type: "delta", text: safeChunk });
        streamedDirectly = true;
      }
    };

    try {
      for (let step = 0; step < MAX_STEPS; step++) {
        streamedDirectly = false;
        const stepResult = await this.gateway.executeToolStep(
          messages,
          tools,
          (msg) => emit({ type: "status", message: msg }),
          onTextDelta
        );
        lastModelUsed = stepResult.modelUsed;
        lastFallbackTier = stepResult.fallbackTier;

        if (!stepResult.toolCalls || stepResult.toolCalls.length === 0) {
          finalRawText = stepResult.content || "";
          break;
        }

        streamedDirectly = false;

        messages.push({
          role: "assistant",
          content: stepResult.content || null,
          tool_calls: stepResult.toolCalls,
        });

        for (const call of stepResult.toolCalls) {
          const toolName = call.function.name;
          const label = BAHAU_AGENT_TOOL_LABELS[toolName] || toolName;
          const parsedArgs = parseToolArguments(call.function.arguments);
          const traceId = call.id || `trace_${Date.now()}_${traces.length + 1}`;

          const startTrace: AgentToolTraceItem = {
            id: traceId,
            tool: toolName,
            label,
            status: "running",
            input: parsedArgs,
          };
          emit({ type: "tool_start", trace: startTrace });

          const toolStartedAt = Date.now();
          let execResult;
          let traceStatus: "done" | "error" = "done";

          try {
            execResult = await this.executor.execute(toolName, parsedArgs, authUser);
            if (execResult.output && "error" in execResult.output && execResult.output.error) {
              traceStatus = "error";
            }
          } catch (err) {
            traceStatus = "error";
            execResult = {
              summary: "Lỗi thực thi công cụ",
              output: { error: err instanceof Error ? err.message : String(err) },
            };
          }

          const durationMs = Math.max(1, Date.now() - toolStartedAt);
          const doneTrace: AgentToolTraceItem = {
            id: traceId,
            tool: toolName,
            label,
            status: traceStatus,
            summary: execResult.summary,
            durationMs,
            input: parsedArgs,
            output: execResult.output,
          };
          traces.push(doneTrace);
          emit({ type: "tool_done", trace: doneTrace });

          if (execResult.sources?.length) {
            for (const src of execResult.sources) {
              if (!collectedSources.some((existing) => existing.documentNo === src.documentNo)) {
                collectedSources.push(src);
              }
            }
          }
          if (execResult.profileData) {
            collectedProfileData = {
              ...(collectedProfileData ?? {}),
              ...execResult.profileData,
            };
          }
          if (execResult.draftProposal) {
            collectedDraftProposal = execResult.draftProposal;
          }
          if (execResult.action) {
            actions.push(execResult.action);
          }

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            name: toolName,
            content: JSON.stringify(execResult.output),
          });
        }
      }

      if (!finalRawText.trim()) {
        emit({ type: "status", message: "Đang tổng hợp câu trả lời..." });
        streamedDirectly = false;
        const closingStep = await this.gateway.executeToolStep(
          messages,
          [],
          (msg) => emit({ type: "status", message: msg }),
          onTextDelta
        );
        lastModelUsed = closingStep.modelUsed;
        lastFallbackTier = closingStep.fallbackTier;
        finalRawText = closingStep.content || "";
      }

      const { reply: withoutFollowUps, inlineFollowUps } = extractInlineFollowUps(finalRawText);
      const cleanReply =
        sanitizeReply(withoutFollowUps) ||
        "Tôi đã xử lý yêu cầu của Thầy/Cô. Vui lòng xem chi tiết kết quả bên dưới.";

      if (!streamedDirectly) {
        emitDeltaChunks(cleanReply, emit);
      }

      const quickFollowUps = buildSmartFollowUps({
        inlineFollowUps,
        authUser,
        actions,
        lastUserMessage: input.message,
      });

      const cfg = aiConfigService.getConfig();
      const latencyMs = Math.max(1, Date.now() - startedAt);

      return {
        reply: cleanReply,
        ...(collectedSources.length > 0 ? { sources: collectedSources.slice(0, 3) } : {}),
        ...(collectedProfileData ? { profileData: collectedProfileData } : {}),
        ...(collectedDraftProposal ? { draftProposal: collectedDraftProposal } : {}),
        ...(traces.length > 0 ? { toolTraces: traces } : {}),
        ...(actions.length > 0 ? { proposedActions: actions } : {}),
        quickFollowUps,
        meta: {
          modelUsed: lastModelUsed,
          fallbackTier: lastFallbackTier,
          latencyMs,
          provider: cfg.provider,
        },
      };
    } catch {
      if (actions.length > 0) {
        const safeReply =
          "Tôi đã chuẩn bị xong đề xuất thao tác theo yêu cầu của Thầy/Cô. Vui lòng kiểm tra thẻ bên dưới để xác nhận.";
        emitDeltaChunks(safeReply, emit);
        const cfg = aiConfigService.getConfig();
        return {
          reply: safeReply,
          ...(collectedSources.length > 0 ? { sources: collectedSources.slice(0, 3) } : {}),
          ...(collectedProfileData ? { profileData: collectedProfileData } : {}),
          ...(collectedDraftProposal ? { draftProposal: collectedDraftProposal } : {}),
          ...(traces.length > 0 ? { toolTraces: traces } : {}),
          proposedActions: actions,
          quickFollowUps: buildSmartFollowUps({
            inlineFollowUps: [],
            authUser,
            actions,
            lastUserMessage: input.message,
          }),
          meta: {
            modelUsed: lastModelUsed !== "unknown" ? lastModelUsed : "fallback/bahau-partial",
            fallbackTier: 4,
            latencyMs: Math.max(1, Date.now() - startedAt),
            provider: cfg.provider,
          },
        };
      }

      emit({ type: "status", message: "Đang chuyển sang bộ máy tra cứu nội bộ BAHAU..." });
      return runAgentDeterministicFallback(
        authUser,
        input,
        Math.max(1, Date.now() - startedAt),
        emit
      );
    }
  }
}

export const agentLoopService = new AgentLoopService();
