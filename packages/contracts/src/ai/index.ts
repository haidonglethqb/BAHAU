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

export const AiChatRequestSchema = z
  .object({
    message: z.string().min(2, "Câu hỏi phải có ít nhất 2 ký tự").max(1000, "Câu hỏi không vượt quá 1000 ký tự"),
    history: z.array(ChatMessageSchema).max(50, "Lịch sử hội thoại tối đa 50 tin nhắn").optional().default([]),
    confirmDraft: z.boolean().optional().default(false),
    draftPayload: z.record(z.any()).optional(),
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
});
export type AiChatResponse = z.infer<typeof AiChatResponseSchema>;
