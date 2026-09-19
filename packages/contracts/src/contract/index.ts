import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================

export const ContractTypeEnum = z.enum([
  "PROBATION",          // Thử việc
  "DEFINITE_TERM_12M", // Xác định thời hạn 12 tháng
  "DEFINITE_TERM_36M", // Xác định thời hạn 36 tháng
  "INDEFINITE_TERM",    // Không xác định thời hạn
  "VISITING_LECTURER",  // Giảng viên thỉnh giảng
]);
export type ContractType = z.infer<typeof ContractTypeEnum>;

export const ContractStatusEnum = z.enum([
  "DRAFT",      // Dự thảo
  "ACTIVE",     // Có hiệu lực
  "EXPIRED",    // Hết hạn
  "TERMINATED", // Chấm dứt trước hạn
  "RENEWED",    // Đã tái ký / gia hạn (chuỗi liên kết)
]);
export type ContractStatus = z.infer<typeof ContractStatusEnum>;

export const EmploymentEventTypeEnum = z.enum([
  "HIRED",               // Tuyển dụng mới
  "APPOINTED",           // Bổ nhiệm chức vụ quản lý
  "TRANSFERRED",         // Điều chuyển công tác
  "CONCURRENT_ASSIGNED", // Phân công kiêm nhiệm
  "PROMOTED",            // Nâng ngạch / Thăng tiến
  "RESIGNED",            // Thôi việc
  "RETIRED",             // Nghỉ hưu
]);
export type EmploymentEventType = z.infer<typeof EmploymentEventTypeEnum>;

export const ContractAlertLevelEnum = z.enum([
  "NORMAL",       // Bình thường (> 90 ngày)
  "WARNING_90",   // Sắp hết hạn trong 61-90 ngày (Vàng)
  "WARNING_60",   // Sắp hết hạn trong 31-60 ngày (Cam)
  "CRITICAL_30",  // Sắp hết hạn trong <= 30 ngày (Đỏ)
  "EXPIRED",      // Đã hết hạn (< 0 ngày)
  "INDEFINITE",   // Hợp đồng không thời hạn
]);
export type ContractAlertLevel = z.infer<typeof ContractAlertLevelEnum>;

// =============================================================================
// CONTRACT INPUT SCHEMAS
// =============================================================================

export const CreateContractSchema = z
  .object({
    employeeId: z.string().uuid("Mã nhân sự không đúng định dạng UUID"),
    contractNumber: z
      .string()
      .trim()
      .min(3, "Số hợp đồng tối thiểu 3 ký tự")
      .max(100, "Số hợp đồng không vượt quá 100 ký tự"),
    contractType: ContractTypeEnum,
    signedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày ký định dạng YYYY-MM-DD"),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hiệu lực định dạng YYYY-MM-DD"),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc định dạng YYYY-MM-DD")
      .optional()
      .nullable(),
    salaryCoefficient: z.coerce.number().positive("Hệ số lương phải là số dương"),
    fileAssetId: z.string().uuid("File asset id không đúng định dạng UUID").optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.contractType === "INDEFINITE_TERM") {
        return true;
      }
      return !!data.expiryDate && data.expiryDate >= data.effectiveDate;
    },
    {
      message: "Hợp đồng có thời hạn bắt buộc có ngày kết thúc sau ngày hiệu lực",
      path: ["expiryDate"],
    }
  );

export type CreateContractInput = z.infer<typeof CreateContractSchema>;

export const RenewContractSchema = z
  .object({
    contractNumber: z
      .string()
      .trim()
      .min(3, "Số hợp đồng mới tối thiểu 3 ký tự")
      .max(100, "Số hợp đồng không vượt quá 100 ký tự"),
    contractType: ContractTypeEnum,
    signedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày ký định dạng YYYY-MM-DD"),
    effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hiệu lực định dạng YYYY-MM-DD"),
    expiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc định dạng YYYY-MM-DD")
      .optional()
      .nullable(),
    salaryCoefficient: z.coerce.number().positive("Hệ số lương phải là số dương"),
    fileAssetId: z.string().uuid("File asset id không đúng định dạng UUID").optional().nullable(),
    note: z.string().optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.contractType === "INDEFINITE_TERM") {
        return true;
      }
      return !!data.expiryDate && data.expiryDate >= data.effectiveDate;
    },
    {
      message: "Hợp đồng có thời hạn bắt buộc có ngày kết thúc sau ngày hiệu lực",
      path: ["expiryDate"],
    }
  );

export type RenewContractInput = z.infer<typeof RenewContractSchema>;

export const ContractFilterQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  unitId: z.string().uuid().optional(),
  status: ContractStatusEnum.optional(),
  contractType: ContractTypeEnum.optional(),
  employeeId: z.string().uuid().optional(),
  expiringInDays: z.coerce
    .number()
    .int()
    .refine((val) => [30, 60, 90].includes(val), {
      message: "Chỉ hỗ trợ lọc sắp hết hạn trong 30, 60 hoặc 90 ngày",
    })
    .optional(),
});

export type ContractFilterQuery = z.infer<typeof ContractFilterQuerySchema>;

// =============================================================================
// CONTRACT DTO SCHEMAS
// =============================================================================

export const ContractDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeCode: z.string(),
  employeeName: z.string(),
  unitName: z.string().nullable().optional(),
  positionName: z.string().nullable().optional(),
  contractNumber: z.string(),
  contractType: ContractTypeEnum,
  signedDate: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string().nullable(),
  salaryCoefficient: z.number(),
  status: ContractStatusEnum,
  daysRemaining: z.number().nullable().optional(),
  alertLevel: ContractAlertLevelEnum.optional(),
  parentContractId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});

export type ContractDto = z.infer<typeof ContractDtoSchema>;

export const ContractLinkedNodeSchema = z.object({
  id: z.string().uuid(),
  contractNumber: z.string(),
  contractType: ContractTypeEnum,
  status: ContractStatusEnum,
  signedDate: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string().nullable(),
  salaryCoefficient: z.number(),
});

export type ContractLinkedNode = z.infer<typeof ContractLinkedNodeSchema>;

export const ContractDetailDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeCode: z.string(),
  employeeName: z.string(),
  unitName: z.string().nullable().optional(),
  positionName: z.string().nullable().optional(),
  contractNumber: z.string(),
  contractType: ContractTypeEnum,
  signedDate: z.string(),
  effectiveDate: z.string(),
  expiryDate: z.string().nullable(),
  salaryCoefficient: z.number(),
  status: ContractStatusEnum,
  daysRemaining: z.number().nullable().optional(),
  alertLevel: ContractAlertLevelEnum.optional(),
  parentContractId: z.string().uuid().nullable().optional(),
  parentContract: ContractLinkedNodeSchema.nullable().optional(),
  renewedContracts: z.array(ContractLinkedNodeSchema).optional(),
  fileAssetId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});

export type ContractDetailDto = z.infer<typeof ContractDetailDtoSchema>;

export const ContractAlertSummaryDtoSchema = z.object({
  totalActive: z.number(),
  totalDefinite: z.number(),
  totalIndefinite: z.number(),
  totalExpiring30: z.number(),
  totalExpiring60: z.number(),
  totalExpiring90: z.number(),
});

export type ContractAlertSummaryDto = z.infer<typeof ContractAlertSummaryDtoSchema>;

// =============================================================================
// EMPLOYMENT EVENT INPUT & DTO SCHEMAS
// =============================================================================

export const CreateEmploymentEventSchema = z.object({
  employeeId: z.string().uuid("Mã nhân sự không đúng định dạng UUID"),
  eventType: EmploymentEventTypeEnum,
  decisionNumber: z.string().max(100, "Số quyết định tối đa 100 ký tự").optional().nullable(),
  decisionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày ký quyết định định dạng YYYY-MM-DD")
    .optional()
    .nullable(),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày hiệu lực định dạng YYYY-MM-DD"),
  fromUnitId: z.string().uuid("Mã đơn vị cũ không đúng định dạng UUID").optional().nullable(),
  toUnitId: z.string().uuid("Mã đơn vị mới không đúng định dạng UUID").optional().nullable(),
  fromPositionId: z.string().uuid("Mã chức vụ cũ không đúng định dạng UUID").optional().nullable(),
  toPositionId: z.string().uuid("Mã chức vụ mới không đúng định dạng UUID").optional().nullable(),
  note: z.string().max(1000, "Ghi chú tối đa 1000 ký tự").optional().nullable(),
  fileAssetId: z.string().uuid("File asset id không đúng định dạng UUID").optional().nullable(),
  syncAssignment: z.boolean().default(true),
});

export type CreateEmploymentEventInput = z.infer<typeof CreateEmploymentEventSchema>;

export const EmploymentEventDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeCode: z.string().optional(),
  employeeName: z.string().optional(),
  eventType: EmploymentEventTypeEnum,
  decisionNumber: z.string().nullable().optional(),
  decisionDate: z.string().nullable().optional(),
  effectiveDate: z.string(),
  fromUnitId: z.string().uuid().nullable().optional(),
  fromUnitName: z.string().nullable().optional(),
  toUnitId: z.string().uuid().nullable().optional(),
  toUnitName: z.string().nullable().optional(),
  fromPositionId: z.string().uuid().nullable().optional(),
  fromPositionName: z.string().nullable().optional(),
  toPositionId: z.string().uuid().nullable().optional(),
  toPositionName: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  fileAssetId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});

export type EmploymentEventDto = z.infer<typeof EmploymentEventDtoSchema>;
