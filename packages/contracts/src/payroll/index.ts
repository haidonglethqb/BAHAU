import { z } from "zod";

// =============================================================================
// PAYROLL ENUMS
// =============================================================================

export const PayrollPeriodStatusEnum = z.enum([
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "LOCKED",
  "PAID",
]);
export type PayrollPeriodStatus = z.infer<typeof PayrollPeriodStatusEnum>;

export const PayslipStatusEnum = z.enum(["DRAFT", "APPROVED", "PAID"]);
export type PayslipStatus = z.infer<typeof PayslipStatusEnum>;

// =============================================================================
// PAYSLIP SCHEMAS (LƯƠNG 2 THÀNH PHẦN & CHẤM CÔNG, GIỜ VƯỢT, KPI)
// =============================================================================

export const PayslipDtoSchema = z.object({
  id: z.string().optional(),
  employeeId: z.string(),
  employeeName: z.string(),
  employeeCode: z.string(),
  departmentName: z.string(),
  academicTitle: z.string().optional(),
  positionName: z.string().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  baseSalaryRate: z.number().default(2340000), // Mức lương cơ sở 2.340.000đ từ 01/07/2024
  salaryCoefficient: z.number().positive(),
  baseSalary: z.number().nonnegative(),
  leadershipAllowance: z.number().nonnegative(),
  seniorityAllowance: z.number().nonnegative(),
  pedagogicalAllowance: z.number().nonnegative(), // 30% lương ngạch bậc + chức vụ
  
  // Thành phần chấm công & ngày công thực tế
  standardWorkDays: z.number().default(22),
  actualWorkDays: z.number().default(22),
  unpaidLeaveDays: z.number().default(0),
  workDaysDeduction: z.number().nonnegative().default(0),

  // Thành phần biến đổi: KPI & Giờ vượt Studio kiến trúc
  kpiRanking: z.enum(["A", "B", "C", "D"]),
  kpiBonusCoefficient: z.number().nonnegative(),
  kpiExtraIncome: z.number().nonnegative(),
  overtimeTeachingHours: z.number().nonnegative(),
  overtimeTeachingPay: z.number().nonnegative(),

  // Tổng thu nhập trước thuế & bảo hiểm
  grossIncome: z.number().nonnegative(),

  // Bảo hiểm bắt buộc người lao động đóng (10.5%)
  insurableBase: z.number().nonnegative().default(0),
  socialInsurance: z.number().nonnegative(),     // 8%
  healthInsurance: z.number().nonnegative(),     // 1.5%
  unemploymentInsurance: z.number().nonnegative(), // 1%
  totalInsurance: z.number().nonnegative().default(0),

  // Giảm trừ gia cảnh & Thuế TNCN lũy tiến 7 bậc
  personalDeduction: z.number().nonnegative().default(11000000),
  dependentCount: z.number().int().nonnegative().default(0),
  dependentDeduction: z.number().nonnegative().default(0),
  taxableIncome: z.number().nonnegative().default(0),
  personalIncomeTax: z.number().nonnegative(),

  // Lương thực lĩnh
  netSalary: z.number().nonnegative(),
  status: PayslipStatusEnum,
  createdAt: z.string(),
});

export type PayslipDto = z.infer<typeof PayslipDtoSchema>;

// =============================================================================
// PAYROLL PERIOD & SUMMARY SCHEMAS
// =============================================================================

export const PayrollPeriodSummarySchema = z.object({
  id: z.string().optional(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  totalEmployees: z.number().int(),
  totalGrossPayout: z.number(),
  totalNetPayout: z.number(),
  totalInsurancePayout: z.number(),
  totalTaxWithheld: z.number(),
  status: PayrollPeriodStatusEnum,
  submittedBy: z.string().optional(),
  submittedAt: z.string().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.string().optional(),
  pkiSignature: z.string().optional(),
});

export type PayrollPeriodSummaryDto = z.infer<typeof PayrollPeriodSummarySchema>;

export const PayrollPeriodDetailSchema = PayrollPeriodSummarySchema.extend({
  items: z.array(PayslipDtoSchema),
});

export type PayrollPeriodDetailDto = z.infer<typeof PayrollPeriodDetailSchema>;

// =============================================================================
// ACTION INPUT SCHEMAS
// =============================================================================

export const CalculatePayrollInputSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  recalculate: z.boolean().optional().default(false),
});

export type CalculatePayrollInput = z.infer<typeof CalculatePayrollInputSchema>;

export const SubmitPayrollInputSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  note: z.string().optional(),
});

export type SubmitPayrollInput = z.infer<typeof SubmitPayrollInputSchema>;

export const ApprovePayrollInputSchema = z.object({
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  pkiSignature: z.string().optional(),
});

export type ApprovePayrollInput = z.infer<typeof ApprovePayrollInputSchema>;
