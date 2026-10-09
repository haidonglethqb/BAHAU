import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const PostgradDegreeLevelEnum = z.enum([
  "MASTER",   // Thạc sĩ (Định hướng nghiên cứu & định hướng ứng dụng)
  "DOCTORAL", // Tiến sĩ (Nghiên cứu sinh)
]);

export type PostgradDegreeLevel = z.infer<typeof PostgradDegreeLevelEnum>;

export const PostgradSpecializationEnum = z.enum([
  "ARCHITECTURE",       // Kiến trúc
  "URBAN_PLANNING",     // Quy hoạch Đô thị & Nông thôn
  "CIVIL_ENGINEERING",  // Kỹ thuật Xây dựng Công trình
]);

export type PostgradSpecialization = z.infer<typeof PostgradSpecializationEnum>;

export const SupervisionRoleEnum = z.enum([
  "PRIMARY_SUPERVISOR", // Người hướng dẫn chính (hoặc độc lập)
  "CO_SUPERVISOR",      // Người hướng dẫn phụ
]);

export type SupervisionRole = z.infer<typeof SupervisionRoleEnum>;

export const DefenseCouncilRoleEnum = z.enum([
  "PRESIDENT",     // Chủ tịch Hội đồng
  "REVIEWER_1",    // Phản biện 1
  "REVIEWER_2",    // Phản biện 2
  "COMMISSIONER",  // Ủy viên
  "SECRETARY",     // Thư ký Hội đồng
]);

export type DefenseCouncilRole = z.infer<typeof DefenseCouncilRoleEnum>;

export const ThesisDefenseStatusEnum = z.enum([
  "ASSIGNED",            // Đã phân công CBHD, đang nghiên cứu
  "RESEARCH_SUBMITTED",  // Đã nộp bản thảo luận văn/luận án chờ bảo vệ
  "DEFENSE_SCHEDULED",   // Đã thành lập Hội đồng và lên lịch bảo vệ
  "PASSED",              // Bảo vệ ĐẠT (>= 70 điểm và >= 4/5 phiếu tán thành)
  "REJECTED",            // Bảo vệ không đạt
  "DEGREE_AWARDED",      // Hiệu trưởng ký số QĐ cấp bằng Thạc sĩ / Tiến sĩ
]);

export type ThesisDefenseStatus = z.infer<typeof ThesisDefenseStatusEnum>;

// =============================================================================
// SUB-SCHEMAS
// =============================================================================

export const SupervisorInfoSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  academicTitle: z.string().default("TS"),
  role: SupervisionRoleEnum,
  convertedHours: z.number().min(0), // Giờ chuẩn quy đổi vào WorkloadService
  kpiPoints: z.number().min(0),      // Điểm KPI quy đổi vào KpiService
});

export type SupervisorInfo = z.infer<typeof SupervisorInfoSchema>;

export const CouncilMemberScoreSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  role: DefenseCouncilRoleEnum,
  score: z.number().min(0).max(100),
  isApproved: z.boolean(),
  honorariumAmount: z.number().min(0), // Thù lao rót vào PayrollService
});

export type CouncilMemberScore = z.infer<typeof CouncilMemberScoreSchema>;

export const ThesisDefenseRecordSchema = z.object({
  defenseDate: z.string(),
  averageScore: z.number().min(0).max(100),
  approvedVotes: z.number().min(0).max(5),
  totalMembers: z.number().default(5),
  isPassed: z.boolean(),
  ranking: z.enum(["EXCELLENT", "GOOD", "SATISFACTORY", "UNSATISFACTORY"]),
  councilNotes: z.string().optional().nullable(),
  councilResolutionNumber: z.string().optional().nullable(),
});

export type ThesisDefenseRecord = z.infer<typeof ThesisDefenseRecordSchema>;

// =============================================================================
// MAIN DTO
// =============================================================================

export const PostgradStudentDtoSchema = z.object({
  id: z.string(),
  studentCode: z.string(),
  fullName: z.string(),
  degreeLevel: PostgradDegreeLevelEnum,
  specialization: PostgradSpecializationEnum,
  thesisTitle: z.string(),
  cohortYear: z.number(),
  departmentName: z.string(),
  status: ThesisDefenseStatusEnum,
  supervisors: z.array(SupervisorInfoSchema),
  defenseMembers: z.array(CouncilMemberScoreSchema).optional(),
  defenseResult: ThesisDefenseRecordSchema.nullable().optional(),
  degreeResolutionNumber: z.string().nullable().optional(),
  pkiSignature: z.string().nullable().optional(),
  pkiSignedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PostgradStudentDto = z.infer<typeof PostgradStudentDtoSchema>;

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

export const CreatePostgradStudentInputSchema = z.object({
  studentCode: z.string().min(3),
  fullName: z.string().min(3),
  degreeLevel: PostgradDegreeLevelEnum,
  specialization: PostgradSpecializationEnum,
  thesisTitle: z.string().min(10, "Tên đề tài luận văn/luận án tối thiểu 10 ký tự"),
  cohortYear: z.coerce.number().min(2020),
  departmentName: z.string().default("Khoa Kiến trúc"),
  supervisors: z.array(
    z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      fullName: z.string(),
      academicTitle: z.string().default("TS"),
      role: SupervisionRoleEnum,
    })
  ).min(1, "Phải có ít nhất 1 người hướng dẫn khoa học"),
});

export type CreatePostgradStudentInput = z.infer<typeof CreatePostgradStudentInputSchema>;

export const ScheduleDefenseCouncilInputSchema = z.object({
  defenseDate: z.string(),
  councilMembers: z.array(
    z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      fullName: z.string(),
      role: DefenseCouncilRoleEnum,
    })
  ).length(5, "Hội đồng đánh giá luận văn/luận án phải gồm đúng 5 thành viên"),
});

export type ScheduleDefenseCouncilInput = z.infer<typeof ScheduleDefenseCouncilInputSchema>;

export const ScoreThesisDefenseInputSchema = z.object({
  memberScores: z.array(
    z.object({
      employeeId: z.string(),
      score: z.coerce.number().min(0).max(100),
      isApproved: z.boolean(),
    })
  ).length(5, "Phải chấm đủ điểm của 5 thành viên Hội đồng"),
  councilNotes: z.string().optional().nullable(),
});

export type ScoreThesisDefenseInput = z.infer<typeof ScoreThesisDefenseInputSchema>;

export const AwardPostgradDegreeWithPkiInputSchema = z.object({
  signerName: z.string().default("GS.TS. Nguyễn Hiệu Trưởng"),
  resolutionNumber: z.string().optional(),
});

export type AwardPostgradDegreeWithPkiInput = z.infer<typeof AwardPostgradDegreeWithPkiInputSchema>;

export const PostgradFilterQuerySchema = z.object({
  degreeLevel: PostgradDegreeLevelEnum.optional(),
  specialization: PostgradSpecializationEnum.optional(),
  status: ThesisDefenseStatusEnum.optional(),
  departmentName: z.string().optional(),
  search: z.string().optional(),
});

export type PostgradFilterQuery = z.infer<typeof PostgradFilterQuerySchema>;
