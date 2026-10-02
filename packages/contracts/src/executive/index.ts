import { z } from "zod";

// =============================================================================
// SALARY PROMOTION & INCREMENT SCHEMAS
// =============================================================================

export const SalaryIncrementCandidateSchema = z.object({
  employeeId: z.string().uuid(),
  employeeName: z.string(),
  employeeCode: z.string(),
  unitName: z.string(),
  currentRank: z.number().int(),
  currentCoefficient: z.number(),
  nextRank: z.number().int(),
  nextCoefficient: z.number(),
  monthsInCurrentRank: z.number().int(),
  recommendationType: z.enum(["REGULAR", "EARLY"]),
  recommendationReason: z.string(),
  isEligible: z.boolean(),
  recentKpiScores: z.array(z.number()),
});

export type SalaryIncrementCandidateDto = z.infer<typeof SalaryIncrementCandidateSchema>;

// =============================================================================
// OFFICIAL RESOLUTION SCHEMAS (NGHỊ ĐỊNH 30/2020/NĐ-CP)
// =============================================================================

export const ResolutionTypeEnum = z.enum([
  "BUSINESS_TRIP",      // Quyết định cử cán bộ đi công tác / hội thảo
  "APPOINTMENT",        // Quyết định bổ nhiệm chức vụ quản lý
  "AWARD",              // Quyết định khen thưởng giảng viên tiêu biểu
  "SALARY_PROMOTION",   // Quyết định nâng bậc lương thường xuyên / trước thời hạn
]);

export type ResolutionType = z.infer<typeof ResolutionTypeEnum>;

export const GenerateResolutionInputSchema = z.object({
  type: ResolutionTypeEnum,
  recipientName: z.string().min(2),
  recipientCode: z.string().min(2),
  unitName: z.string().min(2),
  contentTitle: z.string().min(5),
  details: z.record(z.any()).optional(),
});

export type GenerateResolutionInput = z.infer<typeof GenerateResolutionInputSchema>;

export const ResolutionArticleSchema = z.object({
  articleNumber: z.number().int(),
  title: z.string(),
  content: z.string(),
});

export const OfficialResolutionResponseSchema = z.object({
  resolutionNumber: z.string(),
  organizationName: z.string().default("TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG"),
  signDate: z.string(),
  signAuthority: z.string().default("HIỆU TRƯỞNG"),
  signerName: z.string().default("GS.TS. Nguyễn Hiệu Trưởng"),
  title: z.string(),
  legalGrounds: z.array(z.string()),
  articles: z.array(ResolutionArticleSchema),
  recipients: z.array(z.string()),
  fullFormattedDocument: z.string(),
});

export type OfficialResolutionResponse = z.infer<typeof OfficialResolutionResponseSchema>;
