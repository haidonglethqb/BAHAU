import { z } from "zod";

// =============================================================================
// ACADEMIC WORKLOAD ENUMS
// =============================================================================

export const WorkloadTypeEnum = z.enum([
  "THEORY",              // Giảng dạy lý thuyết thông thường (hệ số 1.0)
  "STUDIO_PROJECT",      // Đồ án Kiến trúc / Nội thất / Quy hoạch tại xưởng (hệ số 1.25)
  "GRADUATION_THESIS",   // Hướng dẫn Đồ án Tốt nghiệp KTS (18 giờ chuẩn/đồ án sinh viên)
  "REVIEW_THESIS",       // Chấm phản biện ĐATN KTS (1.5 giờ chuẩn/đồ án)
  "COUNCIL_MEMBER",      // Ủy viên Hội đồng bảo vệ ĐATN (1.0 giờ chuẩn/đồ án)
  "RESEARCH_PAPER",      // Bài báo khoa học / đề tài NCKH
]);

export type WorkloadType = z.infer<typeof WorkloadTypeEnum>;

export const SettlementStatusEnum = z.enum([
  "DRAFT",               // Dự thảo đầu năm học
  "IN_PROGRESS",         // Đang thực hiện trong học kỳ
  "SETTLED",             // Đã nghiệm thu quyết toán cuối năm
  "LOCKED",              // Đã khóa số liệu chuyển sang thanh toán
]);

export type SettlementStatus = z.infer<typeof SettlementStatusEnum>;

// =============================================================================
// ASSIGNMENT SCHEMAS
// =============================================================================

export const TeachingAssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  courseCode: z.string().min(2, "Mã học phần tối thiểu 2 ký tự"),
  courseName: z.string().min(2, "Tên học phần không được để trống"),
  classCode: z.string().min(2, "Mã lớp không được để trống"),
  semester: z.number().int().min(1).max(3),
  workloadType: WorkloadTypeEnum,
  rawHours: z.number().positive("Số tiết thực tế phải lớn hơn 0"),
  multiplier: z.number().positive(),
  convertedHours: z.number().nonnegative(),
  studentCount: z.number().int().nonnegative().default(30),
  studioLocation: z.string().optional(),
});

export type TeachingAssignmentDto = z.infer<typeof TeachingAssignmentSchema>;

export const CreateAssignmentInputSchema = z.object({
  courseCode: z.string().min(2),
  courseName: z.string().min(2),
  classCode: z.string().min(2),
  semester: z.number().int().min(1).max(3),
  workloadType: WorkloadTypeEnum,
  rawHours: z.number().positive(),
  studentCount: z.number().int().nonnegative().optional(),
  studioLocation: z.string().optional(),
});

export type CreateAssignmentInput = z.infer<typeof CreateAssignmentInputSchema>;

// =============================================================================
// QUOTA & WORKLOAD SCHEMAS
// =============================================================================

export const AcademicYearQuotaSchema = z.object({
  academicYear: z.string().regex(/^\d{4}-\d{4}$/, "Định dạng năm học phải là YYYY-YYYY (ví dụ: 2025-2026)"),
  employeeId: z.string().uuid(),
  employeeName: z.string(),
  employeeCode: z.string(),
  positionTitle: z.string(),
  baseTeachingQuota: z.number().nonnegative(),
  baseResearchQuota: z.number().nonnegative(),
  reductionPercentage: z.number().min(0).max(100),
  reductionReason: z.string().nullable().optional(),
  effectiveTeachingQuota: z.number().nonnegative(),
  actualTeachingHours: z.number().nonnegative(),
  actualResearchHours: z.number().nonnegative(),
  overtimeHours: z.number(),
  status: SettlementStatusEnum,
  assignments: z.array(TeachingAssignmentSchema).optional(),
});

export type AcademicYearQuotaDto = z.infer<typeof AcademicYearQuotaSchema>;

// =============================================================================
// SETTLEMENT & OVERTIME PAY SCHEMAS
// =============================================================================

export const WorkloadSettlementResponseSchema = z.object({
  academicYear: z.string(),
  employeeId: z.string().uuid(),
  employeeName: z.string(),
  baseQuota: z.number(),
  reducedPercentage: z.number(),
  reducedHours: z.number(),
  effectiveQuota: z.number(),
  totalActualConvertedHours: z.number(),
  overtimeHours: z.number(),
  hourlyRate: z.number(),
  totalOvertimePay: z.number(),
  deficitHours: z.number(),
  settlementDate: z.string(),
  isSettled: z.boolean(),
});

export type WorkloadSettlementResponse = z.infer<typeof WorkloadSettlementResponseSchema>;
