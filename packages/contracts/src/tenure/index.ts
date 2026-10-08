import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Chức danh khoa học được công nhận theo Quyết định 37/2018/QĐ-TTg
 */
export const AcademicRankTitleEnum = z.enum([
  "NONE",                 // Chưa phong chức danh
  "ASSOCIATE_PROFESSOR",  // Phó Giáo sư (PGS)
  "PROFESSOR",            // Giáo sư (GS)
]);

export type AcademicRankTitle = z.infer<typeof AcademicRankTitleEnum>;

/**
 * Hạng Chức danh nghề nghiệp Giảng viên theo Thông tư 40/2020/TT-BGDĐT
 */
export const CareerClassTitleEnum = z.enum([
  "ASSISTANT_LECTURER",  // Trợ giảng (Hạng III - V.07.01.23)
  "LECTURER",            // Giảng viên (Hạng III - V.07.01.03, Hệ số 2.34 - 4.98)
  "PRINCIPAL_LECTURER",  // Giảng viên chính (Hạng II - V.07.01.02, Hệ số 4.40 - 6.78)
  "SENIOR_LECTURER",     // Giảng viên cao cấp (Hạng I - V.07.01.01, Hệ số 6.20 - 8.00)
]);

export type CareerClassTitle = z.infer<typeof CareerClassTitleEnum>;

/**
 * Trạng thái hồ sơ xét công nhận chức danh & thăng hạng nghề nghiệp
 */
export const TenureApplicationStatusEnum = z.enum([
  "DRAFT",      // Bản nháp đang chuẩn bị hồ sơ
  "SUBMITTED",  // Đã nộp hồ sơ, chờ thẩm định
  "IN_REVIEW",  // Hội đồng chuyên ngành đang thẩm định công trình
  "VOTED",      // Hội đồng cơ sở đã bỏ phiếu biểu quyết
  "APPOINTED",  // Hiệu trưởng đã ký quyết định bổ nhiệm & ký số PKI
  "REJECTED",   // Chưa đạt tiêu chuẩn hoặc không đủ số phiếu tán thành
]);

export type TenureApplicationStatus = z.infer<typeof TenureApplicationStatusEnum>;

/**
 * Loại công trình khoa học / tác phẩm kiến trúc tính điểm quy đổi
 */
export const ScientificWorkTypeEnum = z.enum([
  "SCOPUS_WOS_PAPER",     // Bài báo tạp chí quốc tế uy tín WoS/Scopus (2.0 - 3.0 điểm)
  "DOMESTIC_JOURNAL",     // Bài báo Tạp chí Kiến trúc / HĐGSNN tính điểm (0.75 - 1.0 điểm)
  "ARCHITECTURAL_AWARD",  // Công trình đạt Giải thưởng Kiến trúc Quốc gia / Quốc tế (2.0 - 3.0 điểm)
  "BUILT_PROJECT",        // Công trình kiến trúc / quy hoạch thực tế nghiệm thu (1.0 - 1.5 điểm)
  "BOOK_ISBN",            // Sách chuyên khảo / giáo trình có mã chuẩn ISBN (1.5 - 2.0 điểm)
  "RESEARCH_PROJECT",     // Đề tài NCKH cấp Bộ / Tỉnh / Cơ sở đã nghiệm thu (1.0 - 2.0 điểm)
]);

export type ScientificWorkType = z.infer<typeof ScientificWorkTypeEnum>;

// =============================================================================
// SUB-SCHEMAS
// =============================================================================

export const ScientificWorkItemSchema = z.object({
  id: z.string().uuid().optional(),
  workType: ScientificWorkTypeEnum,
  title: z.string().min(5, "Tên công trình / bài báo tối thiểu 5 ký tự"),
  publishedYear: z.number().int().min(1980).max(2030),
  role: z.enum(["MAIN_AUTHOR", "CO_AUTHOR", "PRINCIPAL_DESIGNER", "COLLABORATOR"]),
  convertedScore: z.number().min(0),
  evidenceUrl: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

export type ScientificWorkItem = z.infer<typeof ScientificWorkItemSchema>;

export const TenureCouncilVoteRecordSchema = z.object({
  votesYes: z.number().int().min(0),
  votesNo: z.number().int().min(0),
  totalVoters: z.number().int().min(1),
  approvalRatio: z.number().min(0).max(100), // % phiếu tán thành
  isPassed: z.boolean(),                     // Tán thành >= 2/3 (66.7%)
  votedDate: z.string(),
  councilNotes: z.string().nullable().optional(),
  foreignLanguagePass: z.boolean().default(true),
});

export type TenureCouncilVoteRecord = z.infer<typeof TenureCouncilVoteRecordSchema>;

// =============================================================================
// DTO SCHEMAS
// =============================================================================

export const TenureApplicationDtoSchema = z.object({
  id: z.string(),
  employeeId: z.string(),
  employeeCode: z.string(),
  employeeName: z.string(),
  unitName: z.string(),
  currentDegree: z.string(),              // MASTER, DOCTOR
  currentCareerClass: CareerClassTitleEnum,
  currentAcademicRank: AcademicRankTitleEnum,
  currentSalaryCoeff: z.number(),
  targetCareerClass: CareerClassTitleEnum,
  targetAcademicRank: AcademicRankTitleEnum,
  teachingYears: z.number(),              // Thâm niên giảng dạy
  status: TenureApplicationStatusEnum,
  totalScientificScore: z.number(),       // Tổng điểm công trình quy đổi
  requiredScientificScore: z.number(),    // Điểm chuẩn tối thiểu theo quy định
  works: z.array(ScientificWorkItemSchema),
  councilVote: TenureCouncilVoteRecordSchema.nullable().optional(),
  appointmentResolutionNumber: z.string().nullable().optional(),
  appointedSalaryCoeff: z.number().nullable().optional(),
  pkiSignature: z.string().nullable().optional(),
  pkiSignedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type TenureApplicationDto = z.infer<typeof TenureApplicationDtoSchema>;

// =============================================================================
// REQUEST INPUT SCHEMAS
// =============================================================================

export const CreateTenureApplicationInputSchema = z.object({
  targetCareerClass: CareerClassTitleEnum,
  targetAcademicRank: AcademicRankTitleEnum.default("NONE"),
  teachingYears: z.coerce.number().min(0, "Thâm niên không được âm"),
  works: z.array(ScientificWorkItemSchema).min(1, "Hồ sơ phải có ít nhất 1 công trình khoa học hoặc tác phẩm kiến trúc"),
  dossierSummary: z.string().optional().nullable(),
});

export type CreateTenureApplicationInput = z.infer<typeof CreateTenureApplicationInputSchema>;

export const TenureCouncilVoteInputSchema = z.object({
  votesYes: z.coerce.number().int().min(0, "Số phiếu tán thành không được âm"),
  totalVoters: z.coerce.number().int().min(1, "Tổng số thành viên hội đồng tối thiểu là 1"),
  foreignLanguagePass: z.boolean().default(true),
  councilNotes: z.string().optional().nullable(),
});

export type TenureCouncilVoteInput = z.infer<typeof TenureCouncilVoteInputSchema>;

export const AppointTenureWithPkiInputSchema = z.object({
  signerName: z.string().default("GS.TS. Nguyễn Hiệu Trưởng"),
  resolutionNumber: z.string().optional(),
  effectiveDate: z.string().optional(),
  newSalaryCoeff: z.coerce.number().optional(),
});

export type AppointTenureWithPkiInput = z.infer<typeof AppointTenureWithPkiInputSchema>;

export const TenureFilterQuerySchema = z.object({
  status: TenureApplicationStatusEnum.optional(),
  targetCareerClass: CareerClassTitleEnum.optional(),
  targetAcademicRank: AcademicRankTitleEnum.optional(),
  unitName: z.string().optional(),
  search: z.string().optional(),
});

export type TenureFilterQuery = z.infer<typeof TenureFilterQuerySchema>;
