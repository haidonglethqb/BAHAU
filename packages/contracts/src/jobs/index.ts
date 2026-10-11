import { z } from "zod";

// =============================================================================
// ASYNCHRONOUS WORKER QUEUE & BACKGROUND TASK SCHEMAS (Phase 3)
// =============================================================================

export const JobStatusEnum = z.enum([
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);
export type JobStatus = z.infer<typeof JobStatusEnum>;

export const JobPriorityEnum = z.enum(["HIGH", "NORMAL", "LOW"]);
export type JobPriority = z.infer<typeof JobPriorityEnum>;

export const JobTypeEnum = z.enum([
  "OUTBOX_POLL",
  "PAYROLL_BATCH_CALC",
  "ND30_DECISION_PDF",
  "EVIDENCE_BUNDLE_ZIP",
]);
export type JobType = z.infer<typeof JobTypeEnum>;

export const JobDtoSchema = z.object({
  id: z.string(),
  type: z.string(),
  priority: JobPriorityEnum,
  payload: z.record(z.any()).default({}),
  status: JobStatusEnum,
  progress: z.number().min(0).max(100).default(0),
  statusMessage: z.string().optional(),
  result: z.record(z.any()).nullable().optional(),
  error: z.string().nullable().optional(),
  attempts: z.number().int().nonnegative().default(0),
  maxAttempts: z.number().int().positive().default(3),
  deduplicationKey: z.string().optional(),
  createdAt: z.string(),
  startedAt: z.string().nullable().optional(),
  completedAt: z.string().nullable().optional(),
});
export type JobDto<TPayload = Record<string, any>, TResult = Record<string, any>> = z.infer<
  typeof JobDtoSchema
> & {
  payload: TPayload;
  result?: TResult | null;
};

export const EnqueueJobSchema = z.object({
  type: z.string().min(1, "Job type is required"),
  priority: JobPriorityEnum.optional().default("NORMAL"),
  payload: z.record(z.any()).optional().default({}),
  maxAttempts: z.number().int().positive().max(10).optional().default(3),
  deduplicationKey: z.string().optional(),
});
export type EnqueueJobDto = z.infer<typeof EnqueueJobSchema>;

export const JobListQuerySchema = z.object({
  status: JobStatusEnum.optional(),
  type: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});
export type JobListQuery = z.infer<typeof JobListQuerySchema>;

export const JobListResponseSchema = z.object({
  items: z.array(JobDtoSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});
export type JobListResponse = z.infer<typeof JobListResponseSchema>;

export const QueueStatsResponseSchema = z.object({
  active: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  completed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  isPollerRunning: z.boolean(),
  concurrency: z.number().int().positive(),
});
export type QueueStatsResponse = z.infer<typeof QueueStatsResponseSchema>;
