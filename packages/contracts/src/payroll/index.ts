import { z } from "zod";

// =============================================================================
// PAYROLL ENUMS
// =============================================================================

export const PayrollPeriodStatusEnum = z.enum(["DRAFT", "LOCKED", "PAID"]);
export type PayrollPeriodStatus = z.infer<typeof PayrollPeriodStatusEnum>;

export const PayslipStatusEnum = z.enum(["DRAFT", "APPROVED", "PAID"]);
export type PayslipStatus = z.infer<typeof PayslipStatusEnum>;

// =============================================================================
// PAYSLIP SCHEMAS
// =============================================================================

export const PayslipDtoSchema = z.object({
  id: z.string().uuid().optional(),
  employeeId: z.string().uuid(),
  employeeName: z.string(),
  employeeCode: z.string(),
  departmentName: z.string(),
  month: z.number().int().min(1).max(12),
  year: z.number().int(),
  baseSalaryRate: z.number().default(2340000), // Mức lương cơ sở 2.340.000đ từ 01/07/2024
  salaryCoefficient: z.number().positive(),
  baseSalary: z.number().nonnegative(),
  leadershipAllowance: z.number().nonnegative(),
  seniorityAllowance: z.number().nonnegative(),
  pedagogicalAllowance: z.number().nonnegative(),
  kpiRanking: z.enum(["A", "B", "C", "D"]),
  kpiBonusCoefficient: z.number().nonnegative(),
  kpiExtraIncome: z.number().nonnegative(),
  overtimeTeachingHours: z.number().nonnegative(),
  overtimeTeachingPay: z.number().nonnegative(),
  grossIncome: z.number().nonnegative(),
  socialInsurance: z.number().nonnegative(),     // 8%
  healthInsurance: z.number().nonnegative(),     // 1.5%
  unemploymentInsurance: z.number().nonnegative(), // 1%
  personalIncomeTax: z.number().nonnegative(),
  netSalary: z.number().nonnegative(),
  status: PayslipStatusEnum,
  createdAt: z.string(),
});

export type PayslipDto = z.infer<typeof PayslipDtoSchema>;

export const PayrollPeriodSummarySchema = z.object({
  month: z.number().int(),
  year: z.number().int(),
  totalEmployees: z.number().int(),
  totalGrossPayout: z.number(),
  totalNetPayout: z.number(),
  totalInsurancePayout: z.number(),
  totalTaxWithheld: z.number(),
  status: PayrollPeriodStatusEnum,
});

export type PayrollPeriodSummaryDto = z.infer<typeof PayrollPeriodSummarySchema>;
