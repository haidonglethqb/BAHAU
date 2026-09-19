import { z } from "zod";

// ============================================================================
// 1. DASHBOARD OVERVIEW DTO
// ============================================================================

export const DashboardOverviewDtoSchema = z.object({
  totalEmployees: z.number().int().nonnegative(),
  activeEmployees: z.number().int().nonnegative(),
  onLeaveEmployees: z.number().int().nonnegative(),
  probationEmployees: z.number().int().nonnegative(),
  doctorCount: z.number().int().nonnegative(),
  masterCount: z.number().int().nonnegative(),
  bachelorCount: z.number().int().nonnegative(),
  professorCount: z.number().int().nonnegative(),
  associateProfessorCount: z.number().int().nonnegative(),
  verifiedCertificatesCount: z.number().int().nonnegative(),
  expiringCertificatesCount: z.number().int().nonnegative(),
  expiringContractsCount: z.number().int().nonnegative(),
  pendingRequestsCount: z.number().int().nonnegative(),
});
export type DashboardOverviewDto = z.infer<typeof DashboardOverviewDtoSchema>;

// ============================================================================
// 2. WORKFORCE STATS DTO
// ============================================================================

export const WorkforceStatItemSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  percentage: z.number(),
});
export type WorkforceStatItem = z.infer<typeof WorkforceStatItemSchema>;

export const TurnoverEventItemSchema = z.object({
  id: z.string().uuid(),
  employeeCode: z.string(),
  fullName: z.string(),
  eventType: z.string(),
  decisionNumber: z.string().nullable().optional(),
  effectiveDate: z.string(),
  note: z.string().nullable().optional(),
});
export type TurnoverEventItem = z.infer<typeof TurnoverEventItemSchema>;

export const WorkforceStatsDtoSchema = z.object({
  byDegree: z.array(WorkforceStatItemSchema),
  byTitle: z.array(WorkforceStatItemSchema),
  byPositionType: z.array(WorkforceStatItemSchema),
  byContractType: z.array(WorkforceStatItemSchema),
  recentTurnover: z.array(TurnoverEventItemSchema),
});
export type WorkforceStatsDto = z.infer<typeof WorkforceStatsDtoSchema>;

// ============================================================================
// 3. EXECUTIVE ALERTS DTO
// ============================================================================

export const ExpiringContractAlertSchema = z.object({
  id: z.string().uuid(),
  employeeCode: z.string(),
  fullName: z.string(),
  unitName: z.string().optional(),
  contractNumber: z.string(),
  contractType: z.string(),
  expiryDate: z.string(),
  daysRemaining: z.number().int(),
});
export type ExpiringContractAlert = z.infer<typeof ExpiringContractAlertSchema>;

export const ExpiringCertificateAlertSchema = z.object({
  id: z.string().uuid(),
  employeeCode: z.string(),
  fullName: z.string(),
  unitName: z.string().optional(),
  certificateName: z.string(),
  certificateType: z.string(),
  expiryDate: z.string(),
  daysRemaining: z.number().int(),
  alertLevel: z.string(),
});
export type ExpiringCertificateAlert = z.infer<typeof ExpiringCertificateAlertSchema>;

export const PendingApprovalAlertSchema = z.object({
  id: z.string(),
  type: z.enum(["LEAVE", "KPI", "CERTIFICATE"]),
  title: z.string(),
  submittedBy: z.string(),
  unitName: z.string().optional(),
  submittedAt: z.string(),
});
export type PendingApprovalAlert = z.infer<typeof PendingApprovalAlertSchema>;

export const ExecutiveAlertsDtoSchema = z.object({
  expiringContracts: z.array(ExpiringContractAlertSchema),
  expiringCertificates: z.array(ExpiringCertificateAlertSchema),
  pendingApprovals: z.array(PendingApprovalAlertSchema),
});
export type ExecutiveAlertsDto = z.infer<typeof ExecutiveAlertsDtoSchema>;
