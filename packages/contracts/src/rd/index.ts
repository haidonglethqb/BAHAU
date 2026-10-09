import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const RdProjectTypeEnum = z.enum([
  "ACADEMIC_RESEARCH",     // Đề tài NCKH (Cấp Trường, Cấp Bộ, Cấp Tỉnh)
  "ARCHITECTURAL_DESIGN", // Dự án Tư vấn Thiết kế Kiến trúc thực tế
  "URBAN_PLANNING",       // Dự án Tư vấn Quy hoạch Đô thị & Nông thôn
]);

export type RdProjectType = z.infer<typeof RdProjectTypeEnum>;

export const RdProjectLevelEnum = z.enum([
  "INSTITUTIONAL",        // Cấp Cơ sở / Trường ĐH Kiến trúc Đà Nẵng
  "MINISTERIAL",          // Cấp Bộ GD&ĐT / Bộ Xây dựng
  "PROVINCIAL",           // Cấp Tỉnh / TP. Đà Nẵng
  "COMMERCIAL_CONTRACT",  // Hợp đồng Dịch vụ KH&CN với Doanh nghiệp
]);

export type RdProjectLevel = z.infer<typeof RdProjectLevelEnum>;

export const RdProjectStatusEnum = z.enum([
  "DRAFT",                // Bản nháp thuyết minh đề cương
  "PROPOSAL_SUBMITTED",   // Đã nộp đề cương chờ Hội đồng duyệt
  "IN_PROGRESS",          // Đang triển khai thực hiện
  "REVIEW_COUNCIL",       // Hội đồng chuẩn bị / đang họp nghiệm thu
  "COMPLETED",            // Nghiệm thu Đạt & Hoàn thành
  "TERMINATED",           // Dừng thực hiện / Không đạt
]);

export type RdProjectStatus = z.infer<typeof RdProjectStatusEnum>;

export const RoyaltyPayoutStatusEnum = z.enum([
  "PENDING",              // Chưa quyết toán phân bổ nhuận bút
  "APPROVED",             // Đã phê duyệt phương án phân bổ
  "PAID_VIA_PAYROLL",     // Đã thanh toán tự động qua kỳ lương PayrollService
]);

export type RoyaltyPayoutStatus = z.infer<typeof RoyaltyPayoutStatusEnum>;

export const RdTeamMemberRoleEnum = z.enum([
  "PRINCIPAL_INVESTIGATOR", // Chủ nhiệm Đề tài
  "LEAD_ARCHITECT",         // Chủ trì Thiết kế Kiến trúc
  "DESIGN_MEMBER",          // Thành viên Thiết kế / Kỹ sư kết cấu
  "RESEARCH_MEMBER",        // Thành viên Nghiên cứu
  "TECHNICAL_EXPERT",       // Chuyên gia Tư vấn kỹ thuật
]);

export type RdTeamMemberRole = z.infer<typeof RdTeamMemberRoleEnum>;

// =============================================================================
// SUB-SCHEMAS
// =============================================================================

export const RdTeamMemberSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  role: RdTeamMemberRoleEnum,
  royaltyPercentage: z.number().min(0).max(100), // Tỷ lệ % phân bổ nhuận bút
  allocatedAmount: z.number().min(0),            // Số tiền nhuận bút thực nhận (VNĐ)
  convertedResearchHours: z.number().min(0),     // Giờ NCKH quy đổi bù trừ Workload
});

export type RdTeamMember = z.infer<typeof RdTeamMemberSchema>;

export const RdCouncilReviewSchema = z.object({
  reviewDate: z.string(),
  score: z.number().min(0).max(100),             // Điểm nghiệm thu (>= 70đ là ĐẠT)
  ranking: z.enum(["EXCELLENT", "GOOD", "SATISFACTORY", "UNSATISFACTORY"]),
  isPassed: z.boolean(),
  councilNotes: z.string().optional().nullable(),
  councilPresidentName: z.string().optional().nullable(),
});

export type RdCouncilReview = z.infer<typeof RdCouncilReviewSchema>;

// =============================================================================
// PROJECT DTO
// =============================================================================

export const RdProjectDtoSchema = z.object({
  id: z.string(),
  projectCode: z.string(),
  title: z.string(),
  projectType: RdProjectTypeEnum,
  level: RdProjectLevelEnum,
  contractValue: z.number().min(0),               // Tổng kinh phí / Giá trị hợp đồng (VNĐ)
  institutionalFeePercentage: z.number().min(0).max(100), // Tỷ lệ trích nộp quỹ trường (20-30%)
  institutionalFeeAmount: z.number().min(0),      // Kinh phí trích nộp trường (VNĐ)
  royaltyFundAmount: z.number().min(0),           // Quỹ nhuận bút tác giả chi trả (VNĐ)
  startDate: z.string(),
  endDate: z.string(),
  status: RdProjectStatusEnum,
  payoutStatus: RoyaltyPayoutStatusEnum,
  principalInvestigatorId: z.string(),
  principalInvestigatorCode: z.string(),
  principalInvestigatorName: z.string(),
  departmentName: z.string(),
  members: z.array(RdTeamMemberSchema),
  councilReview: RdCouncilReviewSchema.nullable().optional(),
  resolutionNumber: z.string().nullable().optional(),
  pkiSignature: z.string().nullable().optional(),
  pkiSignedAt: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type RdProjectDto = z.infer<typeof RdProjectDtoSchema>;

// =============================================================================
// INPUT VALIDATION SCHEMAS
// =============================================================================

export const CreateRdProjectInputSchema = z.object({
  title: z.string().min(5, "Tên đề tài / dự án tối thiểu 5 ký tự"),
  projectType: RdProjectTypeEnum,
  level: RdProjectLevelEnum,
  contractValue: z.coerce.number().min(1000000, "Kinh phí tối thiểu 1.000.000 VNĐ"),
  institutionalFeePercentage: z.coerce.number().min(10).max(50).default(25),
  startDate: z.string(),
  endDate: z.string(),
  departmentName: z.string().default("Khoa Kiến trúc"),
  members: z.array(
    z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      fullName: z.string(),
      role: RdTeamMemberRoleEnum,
      royaltyPercentage: z.coerce.number().min(0).max(100).default(0),
    })
  ).min(1, "Phải có ít nhất 1 thành viên chủ nhiệm / chủ trì"),
});

export type CreateRdProjectInput = z.infer<typeof CreateRdProjectInputSchema>;

export const ReviewRdProjectInputSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  ranking: z.enum(["EXCELLENT", "GOOD", "SATISFACTORY", "UNSATISFACTORY"]),
  councilPresidentName: z.string().optional().nullable(),
  councilNotes: z.string().optional().nullable(),
});

export type ReviewRdProjectInput = z.infer<typeof ReviewRdProjectInputSchema>;

export const AllocateRoyaltyInputSchema = z.object({
  memberAllocations: z.array(
    z.object({
      employeeId: z.string(),
      royaltyPercentage: z.coerce.number().min(0).max(100),
    })
  ).min(1),
});

export type AllocateRoyaltyInput = z.infer<typeof AllocateRoyaltyInputSchema>;

export const ApproveRdWithPkiInputSchema = z.object({
  signerName: z.string().default("GS.TS. Nguyễn Hiệu Trưởng"),
  resolutionNumber: z.string().optional(),
  effectiveDate: z.string().optional(),
});

export type ApproveRdWithPkiInput = z.infer<typeof ApproveRdWithPkiInputSchema>;

export const RdProjectFilterQuerySchema = z.object({
  projectType: RdProjectTypeEnum.optional(),
  level: RdProjectLevelEnum.optional(),
  status: RdProjectStatusEnum.optional(),
  departmentName: z.string().optional(),
  search: z.string().optional(),
});

export type RdProjectFilterQuery = z.infer<typeof RdProjectFilterQuerySchema>;
