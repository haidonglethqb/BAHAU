import { z } from "zod";

// =============================================================================
// DOMAIN EVENT INTERFACES & SCHEMAS
// =============================================================================

export const DomainEventMetadataSchema = z.object({
  actorId: z.string().optional(),
  actorRole: z.string().optional(),
  requestId: z.string().optional(),
  correlationId: z.string().optional(),
  source: z.string().default("BAHAU_HRMS_CORE"),
});

export type DomainEventMetadata = z.infer<typeof DomainEventMetadataSchema>;

export interface DomainEvent<T = any> {
  id: string; // Unique Event UUID
  name: string; // Event Identifier
  timestamp: string; // ISO 8601
  aggregateId: string; // ID của đối tượng phát sinh sự kiện
  payload: T;
  metadata?: DomainEventMetadata;
}

export const DOMAIN_EVENTS = {
  TENURE_APPOINTED: "TENURE_APPOINTED",
  CANDIDATE_APPOINTED: "CANDIDATE_APPOINTED",
  RD_PROJECT_APPROVED: "RD_PROJECT_APPROVED",
  POSTGRAD_DEGREE_AWARDED: "POSTGRAD_DEGREE_AWARDED",
  KPI_PERIOD_FINALIZED: "KPI_PERIOD_FINALIZED",
} as const;

export type DomainEventName = (typeof DOMAIN_EVENTS)[keyof typeof DOMAIN_EVENTS];

// =============================================================================
// EVENT PAYLOAD DEFINITIONS
// =============================================================================

// 1. Chức danh & Thăng hạng GS/PGS
export const TenureAppointedPayloadSchema = z.object({
  employeeId: z.string(),
  employeeCode: z.string(),
  fullName: z.string(),
  newAcademicTitle: z.string(),
  newSalaryCoefficient: z.number(),
  newTeachingNormHours: z.number(),
  overtimeCompRate: z.number(),
  academicRank: z.string().optional(),
  resolutionNumber: z.string(),
  signedAt: z.string(),
});

export type TenureAppointedPayload = z.infer<typeof TenureAppointedPayloadSchema>;

// 2. Tuyển dụng & Bổ nhiệm tập sự Giảng viên
export const CandidateAppointedPayloadSchema = z.object({
  candidateId: z.string(),
  candidateCode: z.string(),
  fullName: z.string(),
  degree: z.string(),
  targetDepartment: z.string(),
  appointedEmployeeCode: z.string(),
  probationSalaryCoeff: z.number(),
  isProbation: z.boolean().default(true),
  quotaReductionPercentage: z.number().default(50),
  resolutionNumber: z.string(),
  signedAt: z.string(),
});

export type CandidateAppointedPayload = z.infer<typeof CandidateAppointedPayloadSchema>;

// 3. Đề tài NCKH, Dự án Tư vấn Thiết kế & Nhuận bút Tác giả
export const RdProjectApprovedPayloadSchema = z.object({
  projectId: z.string(),
  projectCode: z.string(),
  title: z.string(),
  contractValue: z.number(),
  royaltyFundAmount: z.number(),
  resolutionNumber: z.string(),
  signedAt: z.string(),
  members: z.array(
    z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      fullName: z.string(),
      role: z.string(),
      allocatedAmount: z.number(),
      convertedResearchHours: z.number(),
      kpiPoints: z.number(),
    })
  ),
});

export type RdProjectApprovedPayload = z.infer<typeof RdProjectApprovedPayloadSchema>;

// 4. Đào tạo Sau đại học & Hội đồng Bảo vệ Luận văn / Luận án
export const PostgradDegreeAwardedPayloadSchema = z.object({
  studentId: z.string(),
  studentCode: z.string(),
  fullName: z.string(),
  degreeLevel: z.string(),
  thesisTitle: z.string(),
  resolutionNumber: z.string(),
  signedAt: z.string(),
  supervisors: z.array(
    z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      role: z.string(),
      convertedHours: z.number(),
      kpiPoints: z.number(),
    })
  ),
  defenseMembers: z.array(
    z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      role: z.string(),
      honorariumAmount: z.number(),
    })
  ),
});

export type PostgradDegreeAwardedPayload = z.infer<typeof PostgradDegreeAwardedPayloadSchema>;

// 5. Đánh giá KPI & Quyết toán Khen thưởng
export const KpiPeriodFinalizedPayloadSchema = z.object({
  periodId: z.string(),
  periodName: z.string(),
  resolutionNumber: z.string(),
  signedAt: z.string(),
  evaluations: z.array(
    z.object({
      employeeId: z.string(),
      employeeCode: z.string(),
      kpiRanking: z.string(),
      totalScore: z.number(),
      bonusMultiplier: z.number(),
      bonusAmount: z.number(),
    })
  ),
});

export type KpiPeriodFinalizedPayload = z.infer<typeof KpiPeriodFinalizedPayloadSchema>;
