import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const RecruitmentRoundStatusEnum = z.enum([
  "SUBMITTED",           // Hồ sơ mới nộp, chờ thẩm định Vòng 1
  "ROUND_1_REVIEW",      // Đang thẩm định e-Portfolio Vòng 1
  "ROUND_1_PASSED",      // Đạt Vòng 1 (>= 50đ), được vào Vòng 2 Giảng thử
  "ROUND_1_FAILED",      // Không đạt Vòng 1 (< 50đ)
  "ROUND_2_AUDITION",    // Đang chuẩn bị / tiến hành Giảng thử Studio Vòng 2
  "PASSED",              // Trúng tuyển (Vòng 2 >= 50đ và trong chỉ tiêu)
  "FAILED",              // Không trúng tuyển
  "APPOINTED_PROBATION", // Đã có Quyết định Tuyển dụng Tập sự & Ký số PKI
]);

export type RecruitmentRoundStatus = z.infer<typeof RecruitmentRoundStatusEnum>;

export const RecruitmentPositionTitleEnum = z.enum([
  "LECTURER_ARCHITECTURE",     // Giảng viên Bộ môn Kiến trúc Công trình
  "LECTURER_URBAN_PLANNING",   // Giảng viên Bộ môn Quy hoạch Đô thị
  "LECTURER_CIVIL_ENG",        // Giảng viên Khoa Xây dựng
  "LECTURER_INTERIOR_DESIGN",  // Giảng viên Thiết kế Nội thất
]);

export type RecruitmentPositionTitle = z.infer<typeof RecruitmentPositionTitleEnum>;

export const RecruitmentDegreeEnum = z.enum([
  "MASTER",  // Thạc sĩ (Hưởng 85% lương bậc 1 = 2.34 x 85%)
  "DOCTOR",  // Tiến sĩ (Miễn thi kiến thức chung, hưởng 100% bậc 2 = 2.67 theo NĐ 115)
]);

export type RecruitmentDegree = z.infer<typeof RecruitmentDegreeEnum>;

// =============================================================================
// SUB-SCHEMAS (VÒNG 1 & VÒNG 2)
// =============================================================================

/**
 * Thẩm định e-Portfolio Sáng tác & Hồ sơ Khoa học Vòng 1 (Thang điểm 100)
 */
export const PortfolioReviewScoreSchema = z.object({
  academicRecordScore: z.number().min(0).max(25),      // Kết quả học tập / văn bằng (Tối đa 25đ)
  architecturalProjectsScore: z.number().min(0).max(40),// Đồ án kiến trúc / công trình sáng tác (Tối đa 40đ)
  scientificPapersScore: z.number().min(0).max(20),     // Bài báo WoS/Scopus/Tạp chí chuyên ngành (Tối đa 20đ)
  foreignLanguageScore: z.number().min(0).max(15),      // Ngoại ngữ chuyên môn (Tối đa 15đ)
  totalScore: z.number().min(0).max(100),               // Tổng điểm Vòng 1 (>= 50đ là ĐẠT)
  isPassed: z.boolean(),
  reviewerName: z.string().optional().nullable(),
  reviewNotes: z.string().optional().nullable(),
  reviewedAt: z.string(),
});

export type PortfolioReviewScore = z.infer<typeof PortfolioReviewScoreSchema>;

/**
 * Giảng thử Đồ án Studio & Phỏng vấn Chuyên môn Vòng 2 (Thang điểm 100)
 */
export const StudioAuditionScoreSchema = z.object({
  pedagogyScore: z.number().min(0).max(30),          // Phương pháp sư phạm & truyền đạt (Tối đa 30đ)
  studioPracticalScore: z.number().min(0).max(30),   // Hướng dẫn đồ án xưởng thực tế (Tối đa 30đ)
  liveSketchingScore: z.number().min(0).max(20),     // Kỹ năng phác thảo nhanh / Live Sketching (Tối đa 20đ)
  defenseInterviewScore: z.number().min(0).max(20),  // Phỏng vấn xử lý tình huống chuyên môn (Tối đa 20đ)
  totalScore: z.number().min(0).max(100),            // Tổng điểm Vòng 2 (>= 50đ là ĐẠT)
  isPassed: z.boolean(),
  councilPresidentName: z.string().optional().nullable(),
  auditionNotes: z.string().optional().nullable(),
  auditionDate: z.string(),
});

export type StudioAuditionScore = z.infer<typeof StudioAuditionScoreSchema>;

// =============================================================================
// CANDIDATE DTO
// =============================================================================

export const RecruitmentCandidateDtoSchema = z.object({
  id: z.string(),
  candidateCode: z.string(),
  fullName: z.string(),
  email: z.string().email(),
  phone: z.string(),
  birthYear: z.number(),
  degree: RecruitmentDegreeEnum,
  graduatedSchool: z.string(),
  applyingPosition: RecruitmentPositionTitleEnum,
  targetDepartment: z.string(),
  portfolioUrl: z.string().nullable().optional(),
  cvUrl: z.string().nullable().optional(),
  portfolioSummary: z.string().nullable().optional(),
  status: RecruitmentRoundStatusEnum,
  portfolioScore: PortfolioReviewScoreSchema.nullable().optional(),
  auditionScore: StudioAuditionScoreSchema.nullable().optional(),
  appointmentResolutionNumber: z.string().nullable().optional(),
  probationSalaryCoeff: z.number().nullable().optional(),
  appointedEmployeeCode: z.string().nullable().optional(),
  pkiSignature: z.string().nullable().optional(),
  pkiSignedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RecruitmentCandidateDto = z.infer<typeof RecruitmentCandidateDtoSchema>;

// =============================================================================
// INPUT REQUEST SCHEMAS
// =============================================================================

export const CreateCandidateApplicationInputSchema = z.object({
  fullName: z.string().min(2, "Họ tên ứng viên tối thiểu 2 ký tự"),
  email: z.string().email("Email không hợp lệ"),
  phone: z.string().min(8, "Số điện thoại không hợp lệ"),
  birthYear: z.coerce.number().int().min(1960).max(2010),
  degree: RecruitmentDegreeEnum,
  graduatedSchool: z.string().min(3, "Trường đào tạo tối thiểu 3 ký tự"),
  applyingPosition: RecruitmentPositionTitleEnum,
  targetDepartment: z.string().min(2, "Khoa / Bộ môn ứng tuyển không được để trống"),
  portfolioUrl: z.string().optional().nullable(),
  cvUrl: z.string().optional().nullable(),
  portfolioSummary: z.string().optional().nullable(),
});

export type CreateCandidateApplicationInput = z.infer<typeof CreateCandidateApplicationInputSchema>;

export const ScoreRound1InputSchema = z.object({
  academicRecordScore: z.coerce.number().min(0).max(25),
  architecturalProjectsScore: z.coerce.number().min(0).max(40),
  scientificPapersScore: z.coerce.number().min(0).max(20),
  foreignLanguageScore: z.coerce.number().min(0).max(15),
  reviewerName: z.string().optional().nullable(),
  reviewNotes: z.string().optional().nullable(),
});

export type ScoreRound1Input = z.infer<typeof ScoreRound1InputSchema>;

export const ScoreRound2InputSchema = z.object({
  pedagogyScore: z.coerce.number().min(0).max(30),
  studioPracticalScore: z.coerce.number().min(0).max(30),
  liveSketchingScore: z.coerce.number().min(0).max(20),
  defenseInterviewScore: z.coerce.number().min(0).max(20),
  councilPresidentName: z.string().optional().nullable(),
  auditionNotes: z.string().optional().nullable(),
});

export type ScoreRound2Input = z.infer<typeof ScoreRound2InputSchema>;

export const ApproveRecruitmentWithPkiInputSchema = z.object({
  signerName: z.string().default("GS.TS. Nguyễn Hiệu Trưởng"),
  resolutionNumber: z.string().optional(),
  effectiveDate: z.string().optional(),
  appointedEmployeeCode: z.string().optional(),
});

export type ApproveRecruitmentWithPkiInput = z.infer<typeof ApproveRecruitmentWithPkiInputSchema>;

export const RecruitmentFilterQuerySchema = z.object({
  status: RecruitmentRoundStatusEnum.optional(),
  applyingPosition: RecruitmentPositionTitleEnum.optional(),
  targetDepartment: z.string().optional(),
  search: z.string().optional(),
});

export type RecruitmentFilterQuery = z.infer<typeof RecruitmentFilterQuerySchema>;
