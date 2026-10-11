import { z } from "zod";

// =============================================================================
// OBSERVABILITY, METRICS & KUBERNETES PROBE SCHEMAS (Phase 4)
// =============================================================================

export const SubsystemHealthStatusEnum = z.enum(["HEALTHY", "DEGRADED", "UNHEALTHY"]);
export type SubsystemHealthStatus = z.infer<typeof SubsystemHealthStatusEnum>;

export const LivenessProbeResponseSchema = z.object({
  status: z.literal("UP"),
  uptime: z.number().nonnegative(),
  timestamp: z.string(),
  version: z.string().default("1.0.0"),
});
export type LivenessProbeResponse = z.infer<typeof LivenessProbeResponseSchema>;

export const SubsystemCheckSchema = z.object({
  status: SubsystemHealthStatusEnum,
  type: z.string().optional(),
  message: z.string().optional(),
  details: z.record(z.any()).optional(),
});
export type SubsystemCheck = z.infer<typeof SubsystemCheckSchema>;

export const ReadinessProbeResponseSchema = z.object({
  status: z.enum(["READY", "NOT_READY"]),
  checks: z.object({
    database: SubsystemCheckSchema,
    eventBus: SubsystemCheckSchema,
    outbox: SubsystemCheckSchema,
    workerQueue: SubsystemCheckSchema,
  }),
  uptime: z.number().nonnegative(),
  timestamp: z.string(),
});
export type ReadinessProbeResponse = z.infer<typeof ReadinessProbeResponseSchema>;

export const SystemMetricsSummarySchema = z.object({
  httpRequestsTotal: z.number().int().nonnegative(),
  eventsPublishedTotal: z.number().int().nonnegative(),
  outboxPendingLag: z.number().int().nonnegative(),
  workerQueue: z.object({
    active: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    completed: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative(),
  }),
  memoryUsageMb: z.object({
    heapUsed: z.number().nonnegative(),
    rss: z.number().nonnegative(),
  }),
  uptimeSeconds: z.number().nonnegative(),
  timestamp: z.string(),
});
export type SystemMetricsSummary = z.infer<typeof SystemMetricsSummarySchema>;
