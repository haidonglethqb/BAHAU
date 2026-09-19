import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================
export const KpiPeriodStatusEnum = z.enum([
  "DRAFT",      // Bản nháp kỳ đánh giá
  "OPEN",       // Đang mở tiếp nhận phiếu tự đánh giá
  "IN_REVIEW",  // Hết hạn tự chấm, đang trong giai đoạn thẩm định & xét duyệt
  "FINALIZED",  // Đã chốt kết quả và xếp loại thi đua
]);

export type KpiPeriodStatus = z.infer<typeof KpiPeriodStatusEnum>;

export const KpiTargetTypeEnum = z.enum([
  "LECTURER",   // Giảng viên (Giảng dạy, NCKH, Phục vụ cộng đồng)
  "STAFF",      // Chuyên viên / Nhân viên hành chính (Tiến độ, Chất lượng, Kỷ luật)
]);

export type KpiTargetType = z.infer<typeof KpiTargetTypeEnum>;

export const KpiEvaluationStatusEnum = z.enum([
  "DRAFT",      // Bản nháp tự chấm của CBGV
  "SUBMITTED",  // Đã nộp lên Trưởng đơn vị thẩm định
  "IN_REVIEW",  // Trưởng đơn vị đã chấm điểm & nhận xét, chuyển Hội đồng
  "FINALIZED",  // Hội đồng / BGH đã phê duyệt chốt xếp loại thi đua
]);

export type KpiEvaluationStatus = z.infer<typeof KpiEvaluationStatusEnum>;

export const KpiRankingEnum = z.enum([
  "EXCELLENT",    // Hạng A: Hoàn thành xuất sắc nhiệm vụ (>= 90 điểm)
  "GOOD",         // Hạng B: Hoàn thành tốt nhiệm vụ (70 - 89 điểm)
  "SATISFACTORY", // Hạng C: Hoàn thành nhiệm vụ (50 - 69 điểm)
  "UNSATISFACTORY", // Hạng D: Không hoàn thành nhiệm vụ (< 50 điểm)
]);

export type KpiRanking = z.infer<typeof KpiRankingEnum>;

// =============================================================================
// DTO SCHEMAS
// =============================================================================

export const KpiCriterionDtoSchema = z.object({
  id: z.string().uuid(),
  templateId: z.string().uuid(),
  orderIndex: z.number().int(),
  category: z.string(),
  name: z.string(),
  description: z.string().nullable().optional(),
  maxScore: z.number(),
  weight: z.number(),
});

export type KpiCriterionDto = z.infer<typeof KpiCriterionDtoSchema>;

export const KpiTemplateDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  targetType: KpiTargetTypeEnum,
  description: z.string().nullable().optional(),
  totalMaxScore: z.number(),
  criteria: z.array(KpiCriterionDtoSchema).optional(),
});

export type KpiTemplateDto = z.infer<typeof KpiTemplateDtoSchema>;

export const KpiPeriodDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  academicYear: z.string(),
  semester: z.string().nullable().optional(),
  startDate: z.string(),
  endDate: z.string(),
  status: KpiPeriodStatusEnum,
  totalEvaluations: z.number().optional(),
  submittedCount: z.number().optional(),
  finalizedCount: z.number().optional(),
  createdAt: z.string(),
});

export type KpiPeriodDto = z.infer<typeof KpiPeriodDtoSchema>;

export const KpiEvaluationItemDtoSchema = z.object({
  id: z.string().uuid().optional(),
  criterionId: z.string().uuid(),
  criterionName: z.string().optional(),
  category: z.string().optional(),
  maxScore: z.number().optional(),
  selfScore: z.number().nullable().optional(),
  managerScore: z.number().nullable().optional(),
  finalScore: z.number().nullable().optional(),
  selfNote: z.string().nullable().optional(),
  evidenceUrl: z.string().nullable().optional(),
  managerNote: z.string().nullable().optional(),
});

export type KpiEvaluationItemDto = z.infer<typeof KpiEvaluationItemDtoSchema>;

export const KpiEvaluationDtoSchema = z.object({
  id: z.string().uuid(),
  periodId: z.string().uuid(),
  periodName: z.string().optional(),
  academicYear: z.string().optional(),
  templateId: z.string().uuid(),
  templateName: z.string().optional(),
  targetType: KpiTargetTypeEnum.optional(),
  employeeId: z.string().uuid(),
  employeeCode: z.string().optional(),
  employeeName: z.string().optional(),
  unitName: z.string().optional(),
  positionName: z.string().optional(),
  managerEmployeeId: z.string().uuid().nullable().optional(),
  managerName: z.string().nullable().optional(),
  status: KpiEvaluationStatusEnum,
  totalSelfScore: z.number().nullable().optional(),
  totalManagerScore: z.number().nullable().optional(),
  totalFinalScore: z.number().nullable().optional(),
  ranking: KpiRankingEnum.nullable().optional(),
  managerComment: z.string().nullable().optional(),
  councilComment: z.string().nullable().optional(),
  submittedAt: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  finalizedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type KpiEvaluationDto = z.infer<typeof KpiEvaluationDtoSchema>;

export const KpiEvaluationDetailDtoSchema = z.object({
  evaluation: KpiEvaluationDtoSchema,
  template: KpiTemplateDtoSchema,
  items: z.array(KpiEvaluationItemDtoSchema),
});

export type KpiEvaluationDetailDto = z.infer<typeof KpiEvaluationDetailDtoSchema>;

// =============================================================================
// INPUT REQUEST SCHEMAS
// =============================================================================

export const CreateKpiPeriodSchema = z.object({
  code: z.string().min(3, "Mã kỳ đánh giá tối thiểu 3 ký tự"),
  name: z.string().min(5, "Tên kỳ đánh giá tối thiểu 5 ký tự"),
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, "Năm học phải có định dạng YYYY-YYYY (ví dụ: 2025-2026)"),
  semester: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu không đúng định dạng YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc không đúng định dạng YYYY-MM-DD"),
});

export type CreateKpiPeriodInput = z.infer<typeof CreateKpiPeriodSchema>;

export const SubmitSelfEvaluationItemSchema = z.object({
  criterionId: z.string().uuid("Mã tiêu chí không hợp lệ"),
  selfScore: z.coerce.number().min(0, "Điểm tự chấm không được âm"),
  selfNote: z.string().optional().nullable(),
  evidenceUrl: z.string().optional().nullable(),
});

export const SubmitSelfEvaluationSchema = z.object({
  isDraft: z.boolean().default(false),
  items: z.array(SubmitSelfEvaluationItemSchema).min(1, "Phiếu đánh giá phải có ít nhất 1 tiêu chí"),
});

export type SubmitSelfEvaluationInput = z.infer<typeof SubmitSelfEvaluationSchema>;

export const ScoreManagerEvaluationItemSchema = z.object({
  criterionId: z.string().uuid("Mã tiêu chí không hợp lệ"),
  managerScore: z.coerce.number().min(0, "Điểm quản lý chấm không được âm"),
  managerNote: z.string().optional().nullable(),
});

export const ScoreManagerEvaluationSchema = z.object({
  items: z.array(ScoreManagerEvaluationItemSchema).min(1, "Danh sách chấm điểm tối thiểu 1 tiêu chí"),
  managerComment: z.string().min(5, "Nhận xét của cấp quản lý tối thiểu 5 ký tự"),
});

export type ScoreManagerEvaluationInput = z.infer<typeof ScoreManagerEvaluationSchema>;

export const FinalizeCouncilEvaluationSchema = z.object({
  finalScore: z.coerce.number().min(0).max(100, "Điểm tổng kết cuối cùng phải từ 0 đến 100"),
  ranking: KpiRankingEnum,
  councilComment: z.string().optional().nullable(),
});

export type FinalizeCouncilEvaluationInput = z.infer<typeof FinalizeCouncilEvaluationSchema>;

export const KpiFilterQuerySchema = z.object({
  periodId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
  targetType: KpiTargetTypeEnum.optional(),
  ranking: KpiRankingEnum.optional(),
  status: KpiEvaluationStatusEnum.optional(),
  search: z.string().optional(),
});

export type KpiFilterQuery = z.infer<typeof KpiFilterQuerySchema>;
