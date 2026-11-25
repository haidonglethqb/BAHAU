import { z } from "zod";
import { LeaveTypeEnum } from "../leave/index.js";

// ============================================================================
// 1. POLICY KNOWLEDGE DTOS
// ============================================================================

export const PolicyCategoryEnum = z.enum([
  "ACADEMIC_HOURS",
  "LEAVE",
  "SALARY",
  "KPI",
  "TRAINING",
  "GENERAL",
]);
export type PolicyCategory = z.infer<typeof PolicyCategoryEnum>;

export const PolicyKnowledgeDtoSchema = z.object({
  id: z.string().uuid(),
  documentNo: z.string(),
  title: z.string(),
  category: z.string(),
  chunkText: z.string(),
  keywords: z.array(z.string()),
  metadata: z.record(z.any()).nullable().optional(),
  effectiveDate: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type PolicyKnowledgeDto = z.infer<typeof PolicyKnowledgeDtoSchema>;

// ============================================================================
// 2. AI CHAT REQUEST & RESPONSE DTOS
// ============================================================================

export const ChatMessageRoleEnum = z.enum(["user", "assistant"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleEnum>;

export const ChatMessageSchema = z.object({
  role: ChatMessageRoleEnum,
  content: z.string().max(4000, "Nội dung tin nhắn lịch sử quá dài"),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AiLeaveDraftPayloadSchema = z
  .object({
    leaveType: LeaveTypeEnum.default("ANNUAL"),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu không đúng định dạng YYYY-MM-DD"),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc không đúng định dạng YYYY-MM-DD"),
    totalDays: z.coerce
      .number()
      .min(0.5, "Số ngày nghỉ phải từ 0.5 ngày trở lên")
      .max(365, "Số ngày nghỉ không vượt quá 365 ngày")
      .refine(
        (v) => Math.abs(v * 2 - Math.round(v * 2)) < 1e-9,
        "Số ngày nghỉ phải là bội số của 0.5 ngày"
      ),
    reason: z
      .string()
      .trim()
      .min(5, "Lý do nghỉ phép tối thiểu 5 ký tự")
      .max(1000)
      .default("Nghỉ phép thường niên (Tạo qua Trợ lý ảo AI)"),
    substituteEmployeeId: z.string().uuid("Người thay thế không hợp lệ").nullable().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "Ngày kết thúc không được nhỏ hơn ngày bắt đầu",
    path: ["endDate"],
  });
export type AiLeaveDraftPayload = z.infer<typeof AiLeaveDraftPayloadSchema>;

export const AiProviderEnum = z.enum(["CODEX", "GROQ", "LOCAL_ONLY"]);
export type AiProvider = z.infer<typeof AiProviderEnum>;

export const MaskedAiConfigSchema = z.object({
  provider: AiProviderEnum,
  codexApiKeyMasked: z.string(),
  hasCodexApiKey: z.boolean(),
  codexBaseUrl: z.string(),
  codexPrimaryModel: z.string(),
  codexFallbackModel: z.string(),
  groqApiKeyMasked: z.string(),
  hasGroqApiKey: z.boolean(),
  groqPrimaryModel: z.string(),
  temperature: z.number(),
  timeoutMs: z.number(),
  defaultUserDailyLimit: z.number().nullable(),
});
export type MaskedAiConfig = z.infer<typeof MaskedAiConfigSchema>;

export const UpdateAiConfigInputSchema = z.object({
  provider: AiProviderEnum.optional(),
  codexApiKey: z.string().max(500).optional(),
  codexBaseUrl: z.string().max(500).optional(),
  codexPrimaryModel: z.string().min(1).max(120).optional(),
  codexFallbackModel: z.string().min(1).max(120).optional(),
  groqApiKey: z.string().max(500).optional(),
  groqPrimaryModel: z.string().min(1).max(120).optional(),
  temperature: z.coerce.number().min(0).max(2).optional(),
  timeoutMs: z.coerce.number().int().min(3000).max(180000).optional(),
  defaultUserDailyLimit: z.union([z.coerce.number().int().min(0).max(100000), z.null()]).optional(),
});
export type UpdateAiConfigInput = z.infer<typeof UpdateAiConfigInputSchema>;

export const TestAiConnectionInputSchema = z.object({
  provider: z.enum(["CODEX", "GROQ"]).optional(),
  apiKey: z.string().max(500).optional(),
  baseUrl: z.string().max(500).optional(),
  model: z.string().max(120).optional(),
});
export type TestAiConnectionInput = z.infer<typeof TestAiConnectionInputSchema>;

export const TestAiConnectionResultSchema = z.object({
  ok: z.boolean(),
  status: z.number().optional(),
  latencyMs: z.number().optional(),
  model: z.string().optional(),
  sampleReply: z.string().optional(),
  error: z.string().optional(),
});
export type TestAiConnectionResult = z.infer<typeof TestAiConnectionResultSchema>;

export const AgentToolTraceItemSchema = z.object({
  id: z.string(),
  tool: z.string(),
  label: z.string(),
  status: z.enum(["running", "done", "error"]),
  summary: z.string().optional(),
  durationMs: z.number().optional(),
  input: z.record(z.any()).optional(),
  output: z.record(z.any()).optional(),
});
export type AgentToolTraceItem = z.infer<typeof AgentToolTraceItemSchema>;

export const AgentProposedActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("LEAVE_DRAFT"),
    title: z.string(),
    subtitle: z.string(),
    summary: z.string(),
    payload: z.record(z.any()),
    status: z.enum(["CONFIRMATION_REQUIRED", "SUBMITTED", "CANCELLED"]).default("CONFIRMATION_REQUIRED"),
    createdRecordId: z.string().optional(),
  }),
  z.object({
    type: z.literal("ATTENDANCE_ADJUSTMENT_DRAFT"),
    title: z.string(),
    subtitle: z.string(),
    summary: z.string(),
    payload: z.object({
      workDate: z.string(),
      requestedCheckIn: z.string().optional(),
      requestedCheckOut: z.string().optional(),
      reason: z.string(),
    }),
    status: z.enum(["CONFIRMATION_REQUIRED", "SUBMITTED", "CANCELLED"]).default("CONFIRMATION_REQUIRED"),
    createdRecordId: z.string().optional(),
  }),
  z.object({
    type: z.literal("NAVIGATE"),
    title: z.string(),
    subtitle: z.string(),
    href: z.string(),
  }),
]);
export type AgentProposedAction = z.infer<typeof AgentProposedActionSchema>;

export const AgentMetaSchema = z.object({
  modelUsed: z.string(),
  fallbackTier: z.number(),
  latencyMs: z.number(),
  provider: AiProviderEnum.optional(),
});
export type AgentMeta = z.infer<typeof AgentMetaSchema>;

export const AiLiveContextSchema = z.object({
  currentPath: z.string().max(200).optional(),
});
export type AiLiveContext = z.infer<typeof AiLiveContextSchema>;

export const AiEscalationRequestSchema = z.object({
  sessionId: z.string().max(128).optional(),
  reason: z.string().trim().min(2).max(1000).optional(),
  contact: z.string().trim().max(200).optional(),
});
export type AiEscalationRequest = z.infer<typeof AiEscalationRequestSchema>;

export const AiChatRequestSchema = z
  .object({
    message: z.string().min(2, "Câu hỏi phải có ít nhất 2 ký tự").max(2000, "Câu hỏi không vượt quá 2000 ký tự"),
    history: z.array(ChatMessageSchema).max(50, "Lịch sử hội thoại tối đa 50 tin nhắn").optional().default([]),
    sessionId: z.string().max(128).optional(),
    liveContext: AiLiveContextSchema.optional(),
    confirmDraft: z.boolean().optional().default(false),
    draftPayload: z.record(z.any()).optional(),
    confirmAction: z
      .object({
        type: z.literal("ATTENDANCE_ADJUSTMENT_DRAFT"),
        payload: z.record(z.any()),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.confirmDraft) {
      if (!data.draftPayload) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["draftPayload"],
          message: "Thiếu dữ liệu dự thảo đơn khi xác nhận gửi đơn",
        });
        return;
      }
      const parsed = AiLeaveDraftPayloadSchema.safeParse(data.draftPayload);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ["draftPayload", ...issue.path],
          });
        }
      }
    }
  });
export type AiChatRequest = z.infer<typeof AiChatRequestSchema>;

export const PolicySourceCitationSchema = z.object({
  documentNo: z.string(),
  title: z.string(),
  category: z.string(),
  excerpt: z.string(),
  relevanceScore: z.number().optional(),
});
export type PolicySourceCitation = z.infer<typeof PolicySourceCitationSchema>;

export const DraftProposalSchema = z.object({
  type: z.enum(["LEAVE", "TRAINING"]),
  summary: z.string(),
  payload: z.record(z.any()),
  status: z.enum(["CONFIRMATION_REQUIRED", "SUBMITTED"]),
  createdRecordId: z.string().optional(),
});
export type DraftProposal = z.infer<typeof DraftProposalSchema>;

export const AiChatResponseSchema = z.object({
  reply: z.string(),
  sources: z.array(PolicySourceCitationSchema).optional(),
  profileData: z.record(z.any()).optional(),
  draftProposal: DraftProposalSchema.optional(),
  toolTraces: z.array(AgentToolTraceItemSchema).optional(),
  proposedActions: z.array(AgentProposedActionSchema).optional(),
  quickFollowUps: z.array(z.string()).optional(),
  meta: AgentMetaSchema.optional(),
});
export type AiChatResponse = z.infer<typeof AiChatResponseSchema>;
