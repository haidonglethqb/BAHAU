import { z } from "zod";
import { WorkflowStatusEnum, WorkflowInstanceDetailDtoSchema } from "../leave/index.js";

// =============================================================================
// ENUMS
// =============================================================================
export const AttendanceStatusEnum = z.enum([
  "PRESENT",        // Đi làm đầy đủ đúng giờ
  "LATE",           // Đi muộn (vào sau 08:00)
  "EARLY_LEAVE",    // Về sớm (ra trước 17:00)
  "ABSENT",         // Vắng mặt không lý do
  "ON_LEAVE",       // Nghỉ phép đã duyệt
  "BUSINESS_TRIP",  // Đi công tác đã duyệt
  "HOLIDAY",        // Nghỉ Lễ/Tết theo quy định
  "WEEKEND",        // Thứ Bảy / Chủ Nhật
]);

export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

// =============================================================================
// DTO SCHEMAS
// =============================================================================

export const AttendancePeriodDtoSchema = z.object({
  id: z.string().uuid(),
  month: z.number().int(),
  year: z.number().int(),
  startDate: z.string(),
  endDate: z.string(),
  standardWorkingDays: z.number(),
  isLocked: z.boolean(),
  lockedAt: z.string().nullable().optional(),
  lockedById: z.string().uuid().nullable().optional(),
  lockedByName: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  createdAt: z.string(),
});

export type AttendancePeriodDto = z.infer<typeof AttendancePeriodDtoSchema>;

export const AttendanceRecordDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeCode: z.string().optional(),
  fullName: z.string().optional(),
  periodId: z.string().uuid().nullable().optional(),
  workDate: z.string(),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  rawWorkingHours: z.number(),
  status: AttendanceStatusEnum,
  deviceSource: z.string().nullable().optional(),
  importBatchId: z.string().nullable().optional(),
  adjustmentRequestId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
});

export type AttendanceRecordDto = z.infer<typeof AttendanceRecordDtoSchema>;

export const MonthlyTimesheetSummaryDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeCode: z.string().optional(),
  fullName: z.string().optional(),
  unitName: z.string().optional(),
  periodId: z.string().uuid(),
  standardDays: z.number(),
  actualWorkingDays: z.number(),
  paidLeaveDays: z.number(),
  unpaidLeaveDays: z.number(),
  businessTripDays: z.number(),
  lateCount: z.number(),
  earlyLeaveCount: z.number(),
  totalPayableDays: z.number(),
  isFinalized: z.boolean(),
  createdAt: z.string().optional(),
});

export type MonthlyTimesheetSummaryDto = z.infer<typeof MonthlyTimesheetSummaryDtoSchema>;

export const AttendanceAdjustmentDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeName: z.string().optional(),
  employeeCode: z.string().optional(),
  workDate: z.string(),
  originalCheckIn: z.string().nullable().optional(),
  originalCheckOut: z.string().nullable().optional(),
  adjustedCheckIn: z.string().nullable().optional(),
  adjustedCheckOut: z.string().nullable().optional(),
  reason: z.string(),
  status: WorkflowStatusEnum,
  workflowInstanceId: z.string().uuid().nullable().optional(),
  workflowInstance: WorkflowInstanceDetailDtoSchema.nullable().optional(),
  createdAt: z.string(),
});

export type AttendanceAdjustmentDto = z.infer<typeof AttendanceAdjustmentDtoSchema>;

export const AttendanceMonthDtoSchema = z.object({
  period: AttendancePeriodDtoSchema.nullable().optional(),
  records: z.array(AttendanceRecordDtoSchema),
  summary: MonthlyTimesheetSummaryDtoSchema.nullable().optional(),
  adjustments: z.array(AttendanceAdjustmentDtoSchema).optional(),
});

export type AttendanceMonthDto = z.infer<typeof AttendanceMonthDtoSchema>;

// =============================================================================
// INPUT REQUEST SCHEMAS
// =============================================================================

export const CreateAttendanceAdjustmentSchema = z.object({
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày điều chỉnh công không hợp lệ (YYYY-MM-DD)"),
  adjustedCheckIn: z.string().optional().nullable(),
  adjustedCheckOut: z.string().optional().nullable(),
  reason: z.string().min(5, "Lý do điều chỉnh tối thiểu 5 ký tự"),
});

export type CreateAttendanceAdjustmentInput = z.infer<typeof CreateAttendanceAdjustmentSchema>;

export const ImportAttendanceItemSchema = z.object({
  employeeCode: z.string().min(1, "Mã CBGV không được để trống"),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày công không đúng định dạng YYYY-MM-DD"),
  checkInTime: z.string().optional().nullable(),
  checkOutTime: z.string().optional().nullable(),
  deviceSource: z.string().optional().nullable(),
});

export type ImportAttendanceItem = z.infer<typeof ImportAttendanceItemSchema>;

export const ImportAttendanceBatchSchema = z.object({
  batchId: z.string().optional(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
  records: z.array(ImportAttendanceItemSchema).min(1, "Danh sách điểm danh import tối thiểu 1 bản ghi"),
});

export type ImportAttendanceBatchInput = z.infer<typeof ImportAttendanceBatchSchema>;

export const LockPeriodSchema = z.object({
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2020),
  isLocked: z.boolean().default(true),
  note: z.string().optional(),
});

export type LockPeriodInput = z.infer<typeof LockPeriodSchema>;

export const AttendanceQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2020).optional(),
  employeeId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional(),
});

export type AttendanceQuery = z.infer<typeof AttendanceQuerySchema>;
