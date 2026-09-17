import { z } from "zod";

// =============================================================================
// ENUMS
// =============================================================================
export const LeaveTypeEnum = z.enum([
  "ANNUAL",       // Nghỉ phép năm
  "SICK",         // Nghỉ ốm đau / thai sản
  "MATERNITY",    // Nghỉ chế độ thai sản
  "UNPAID",       // Nghỉ việc riêng không hưởng lương
  "BEREAVEMENT",  // Nghỉ chế độ tang lễ
  "WEDDING",      // Nghỉ kết hôn
  "ACADEMIC",     // Nghỉ nghiên cứu học thuật / thi cử
]);

export type LeaveType = z.infer<typeof LeaveTypeEnum>;

export const WorkflowStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "RETURNED",
  "CANCELLED",
]);

export type WorkflowStatus = z.infer<typeof WorkflowStatusEnum>;

// =============================================================================
// LEAVE SCHEMAS
// =============================================================================

export const CreateLeaveRequestSchema = z.object({
  leaveType: LeaveTypeEnum,
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu không đúng định dạng YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc không đúng định dạng YYYY-MM-DD"),
  totalDays: z.coerce.number().positive("Số ngày nghỉ phải lớn hơn 0"),
  reason: z.string().min(5, "Lý do nghỉ phép tối thiểu 5 ký tự"),
  substituteEmployeeId: z.string().uuid("Người thay thế không hợp lệ").nullable().optional(),
});

export type CreateLeaveRequestInput = z.infer<typeof CreateLeaveRequestSchema>;

export const LeaveRequestDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeName: z.string().optional(),
  employeeCode: z.string().optional(),
  leaveType: LeaveTypeEnum,
  startDate: z.string(),
  endDate: z.string(),
  totalDays: z.number(),
  reason: z.string(),
  substituteEmployeeName: z.string().nullable().optional(),
  status: WorkflowStatusEnum,
  createdAt: z.string(),
});

export type LeaveRequestDto = z.infer<typeof LeaveRequestDtoSchema>;

export const LeaveBalanceDtoSchema = z.object({
  year: z.number().int(),
  totalGranted: z.number(),
  carriedForward: z.number(),
  used: z.number(),
  pendingHold: z.number(),
  remaining: z.number(),
});

export type LeaveBalanceDto = z.infer<typeof LeaveBalanceDtoSchema>;

// =============================================================================
// BUSINESS TRIP SCHEMAS
// =============================================================================

export const CreateTripRequestSchema = z.object({
  purpose: z.string().min(5, "Mục đích công tác tối thiểu 5 ký tự"),
  destination: z.string().min(2, "Địa điểm công tác không được để trống"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày bắt đầu không đúng định dạng YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày kết thúc không đúng định dạng YYYY-MM-DD"),
  totalDays: z.coerce.number().positive("Số ngày công tác phải lớn hơn 0"),
  budgetEstimate: z.coerce.number().nonnegative().optional(),
  fundingSource: z.string().optional(),
});

export type CreateTripRequestInput = z.infer<typeof CreateTripRequestSchema>;

export const BusinessTripDtoSchema = z.object({
  id: z.string().uuid(),
  employeeId: z.string().uuid(),
  employeeName: z.string().optional(),
  purpose: z.string(),
  destination: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  totalDays: z.number(),
  budgetEstimate: z.number().nullable().optional(),
  fundingSource: z.string().nullable().optional(),
  status: WorkflowStatusEnum,
  createdAt: z.string(),
});

export type BusinessTripDto = z.infer<typeof BusinessTripDtoSchema>;

// =============================================================================
// WORKFLOW ACTIONS
// =============================================================================

export const WorkflowApprovalActionSchema = z.object({
  comment: z.string().optional(),
});

export type WorkflowApprovalActionInput = z.infer<typeof WorkflowApprovalActionSchema>;

export const WorkflowRejectionActionSchema = z.object({
  reason: z.string().min(3, "Vui lòng nhập lý do từ chối (tối thiểu 3 ký tự)"),
});

export type WorkflowRejectionActionInput = z.infer<typeof WorkflowRejectionActionSchema>;

export const PendingWorkflowTaskDtoSchema = z.object({
  stepId: z.string().uuid(),
  instanceId: z.string().uuid(),
  module: z.string(),
  recordId: z.string().uuid(),
  requesterName: z.string(),
  requesterCode: z.string(),
  stepName: z.string(),
  stepIndex: z.number(),
  summary: z.string(),
  createdAt: z.string(),
});

export type PendingWorkflowTaskDto = z.infer<typeof PendingWorkflowTaskDtoSchema>;
