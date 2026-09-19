import { z } from "zod";

// ============================================================================
// 1. ZOD ENUMS
// ============================================================================

export const CertificateTypeEnum = z.enum([
  "PROFESSIONAL_PRACTICE",
  "ACADEMIC_TITLE_DEGREE",
  "LANGUAGE",
  "INFORMATICS",
  "POLITICAL_THEORY",
  "OTHER",
]);
export type CertificateType = z.infer<typeof CertificateTypeEnum>;

export const CertificateStatusEnum = z.enum([
  "PENDING",
  "VERIFIED",
  "REJECTED",
  "EXPIRED",
]);
export type CertificateStatus = z.infer<typeof CertificateStatusEnum>;

export const TrainingCategoryEnum = z.enum([
  "PEDAGOGY",
  "PROFESSIONAL",
  "POLITICAL",
  "LANGUAGE_IT",
  "OVERSEAS_POSTGRAD",
]);
export type TrainingCategory = z.infer<typeof TrainingCategoryEnum>;

export const TrainingCourseStatusEnum = z.enum([
  "PLANNING",
  "ONGOING",
  "COMPLETED",
  "CANCELLED",
]);
export type TrainingCourseStatus = z.infer<typeof TrainingCourseStatusEnum>;

export const ParticipantStatusEnum = z.enum([
  "REGISTERED",
  "APPROVED",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
  "DROPPED",
]);
export type ParticipantStatus = z.infer<typeof ParticipantStatusEnum>;

export const CertificateExpiryAlertStatusEnum = z.enum([
  "EXPIRED",
  "CRITICAL_30",
  "WARNING_60",
  "WARNING_90",
  "VALID",
]);
export type CertificateExpiryAlertStatus = z.infer<typeof CertificateExpiryAlertStatusEnum>;

// ============================================================================
// 2. INPUT VALIDATION SCHEMAS
// ============================================================================

export const CreateCertificateSchema = z.object({
  certificateType: CertificateTypeEnum,
  name: z.string().min(2, "Tên chứng chỉ phải có ít nhất 2 ký tự").max(255),
  certificateNumber: z.string().min(1, "Số hiệu chứng chỉ không được để trống").max(100),
  issuedBy: z.string().min(2, "Đơn vị cấp không được để trống").max(255),
  issuedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày cấp phải có định dạng YYYY-MM-DD"),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hết hạn phải có định dạng YYYY-MM-DD").nullable().optional(),
  score: z.string().max(50).nullable().optional(),
  fileUrl: z.string().url("Đường dẫn file minh chứng không hợp lệ").max(500).nullable().optional(),
}).refine(
  (data) => {
    if (data.expiryDate && data.issuedDate) {
      return new Date(data.expiryDate) > new Date(data.issuedDate);
    }
    return true;
  },
  {
    message: "Ngày hết hạn phải sau ngày cấp chứng chỉ",
    path: ["expiryDate"],
  }
);
export type CreateCertificateInput = z.infer<typeof CreateCertificateSchema>;

export const VerifyCertificateSchema = z.object({
  status: z.enum(["VERIFIED", "REJECTED"]),
  rejectionReason: z.string().max(1000).optional(),
}).refine(
  (data) => {
    if (data.status === "REJECTED" && (!data.rejectionReason || data.rejectionReason.trim().length === 0)) {
      return false;
    }
    return true;
  },
  {
    message: "Bắt buộc phải nhập lý do khi từ chối thẩm định chứng chỉ",
    path: ["rejectionReason"],
  }
);
export type VerifyCertificateInput = z.infer<typeof VerifyCertificateSchema>;

export const CreateTrainingCourseSchema = z.object({
  code: z.string().min(2, "Mã khóa học phải có ít nhất 2 ký tự").max(50),
  name: z.string().min(3, "Tên khóa bồi dưỡng phải có ít nhất 3 ký tự").max(255),
  category: TrainingCategoryEnum,
  provider: z.string().min(2, "Đơn vị tổ chức/đào tạo không được để trống").max(255),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu phải có định dạng YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc phải có định dạng YYYY-MM-DD"),
  location: z.string().max(255).optional(),
  budget: z.number().min(0, "Kinh phí không được âm").optional().default(0),
  description: z.string().max(2000).optional(),
}).refine(
  (data) => new Date(data.endDate) >= new Date(data.startDate),
  {
    message: "Ngày kết thúc khóa học phải bằng hoặc sau ngày bắt đầu",
    path: ["endDate"],
  }
);
export type CreateTrainingCourseInput = z.infer<typeof CreateTrainingCourseSchema>;

export const RegisterTrainingCourseSchema = z.object({
  note: z.string().max(500).optional(),
});
export type RegisterTrainingCourseInput = z.infer<typeof RegisterTrainingCourseSchema>;

export const UpdateParticipantStatusSchema = z.object({
  status: ParticipantStatusEnum,
  grade: z.string().max(50).optional(),
  certificateIssued: z.boolean().optional(),
  note: z.string().max(500).optional(),
});
export type UpdateParticipantStatusInput = z.infer<typeof UpdateParticipantStatusSchema>;

export const CertificateFilterQuerySchema = z.object({
  certificateType: CertificateTypeEnum.optional(),
  status: CertificateStatusEnum.optional(),
  unitId: z.string().uuid().optional(),
  employeeId: z.string().uuid().optional(),
  expiringDays: z.coerce.number().int().min(1).max(365).optional(),
  search: z.string().optional(),
});
export type CertificateFilterQuery = z.infer<typeof CertificateFilterQuerySchema>;

// ============================================================================
// 3. DTO SCHEMAS
// ============================================================================

export const CertificateDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeCode: z.string(),
  employeeName: z.string(),
  unitName: z.string(),
  certificateType: CertificateTypeEnum,
  name: z.string(),
  certificateNumber: z.string(),
  issuedBy: z.string(),
  issuedDate: z.string(),
  expiryDate: z.string().nullable().optional(),
  score: z.string().nullable().optional(),
  fileUrl: z.string().nullable().optional(),
  status: CertificateStatusEnum,
  verifiedById: z.string().uuid().nullable().optional(),
  verifierName: z.string().nullable().optional(),
  verifiedAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  daysUntilExpiry: z.number().nullable().optional(),
  expiryAlertStatus: CertificateExpiryAlertStatusEnum.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CertificateDto = z.infer<typeof CertificateDtoSchema>;

export const TrainingCourseDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  category: TrainingCategoryEnum,
  provider: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string().nullable().optional(),
  budget: z.number().nullable().optional(),
  status: TrainingCourseStatusEnum,
  description: z.string().nullable().optional(),
  participantCount: z.number().default(0),
  isRegisteredByMe: z.boolean().optional().default(false),
  myParticipantStatus: ParticipantStatusEnum.nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TrainingCourseDto = z.infer<typeof TrainingCourseDtoSchema>;

export const TrainingParticipantDtoSchema = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  courseCode: z.string(),
  courseName: z.string(),
  employeeId: z.string().uuid(),
  employeeCode: z.string(),
  employeeName: z.string(),
  unitName: z.string(),
  status: ParticipantStatusEnum,
  grade: z.string().nullable().optional(),
  certificateIssued: z.boolean(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type TrainingParticipantDto = z.infer<typeof TrainingParticipantDtoSchema>;
