import { z } from "zod";

// =============================================================================
// OUTBOX ENUMS & SCHEMAS (Transactional Outbox & Database Event Audit)
// =============================================================================

export const OutboxStatusEnum = z.enum(["PENDING", "PROCESSING", "PROCESSED", "FAILED"]);
export type OutboxStatus = z.infer<typeof OutboxStatusEnum>;

export const OutboxEventDtoSchema = z.object({
  id: z.string(),
  aggregateType: z.string(),
  aggregateId: z.string(),
  eventType: z.string(),
  payload: z.record(z.any()),
  idempotencyKey: z.string(),
  status: OutboxStatusEnum,
  retryCount: z.number().int().nonnegative(),
  lastError: z.string().nullable().optional(),
  createdAt: z.string(),
  processedAt: z.string().nullable().optional(),
});

export type OutboxEventDto = z.infer<typeof OutboxEventDtoSchema>;

export const OutboxFilterQuerySchema = z.object({
  status: OutboxStatusEnum.optional(),
  eventType: z.string().optional(),
  aggregateType: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type OutboxFilterQuery = z.infer<typeof OutboxFilterQuerySchema>;

export const OutboxListResponseSchema = z.object({
  events: z.array(OutboxEventDtoSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
});

export type OutboxListResponse = z.infer<typeof OutboxListResponseSchema>;
