import { z } from "zod";

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

export const ChatMessageRoleEnum = z.enum(["user", "assistant", "system"]);
export type ChatMessageRole = z.infer<typeof ChatMessageRoleEnum>;

export const ChatMessageSchema = z.object({
  role: ChatMessageRoleEnum,
  content: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const AiChatRequestSchema = z.object({
  message: z.string().min(2, "Câu hỏi phải có ít nhất 2 ký tự").max(1000, "Câu hỏi không vượt quá 1000 ký tự"),
  history: z.array(ChatMessageSchema).optional().default([]),
  confirmDraft: z.boolean().optional().default(false),
  draftPayload: z.record(z.any()).optional(),
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
