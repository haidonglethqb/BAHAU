import { z } from "zod";

// ============================================================================
// 1. NOTIFICATION ENUMS & DTOS
// ============================================================================

export const NotificationTypeEnum = z.enum([
  "SYSTEM",
  "WORKFLOW",
  "ALERT",
  "CONTRACT",
  "CERTIFICATE",
  "KPI",
  "TRAINING",
]);
export type NotificationType = z.infer<typeof NotificationTypeEnum>;

export const NotificationDtoSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  content: z.string(),
  type: NotificationTypeEnum,
  isRead: z.boolean(),
  metadata: z.record(z.any()).nullable().optional(),
  createdAt: z.string(),
});
export type NotificationDto = z.infer<typeof NotificationDtoSchema>;

export const NotificationListResponseSchema = z.object({
  notifications: z.array(NotificationDtoSchema),
  unreadCount: z.number().int().nonnegative(),
});
export type NotificationListResponse = z.infer<typeof NotificationListResponseSchema>;

export const MarkNotificationReadSchema = z.object({
  notificationId: z.string().uuid(),
});
export type MarkNotificationReadInput = z.infer<typeof MarkNotificationReadSchema>;

// ============================================================================
// 2. OUTBOX BATCH PROCESSING DTOS
// ============================================================================

export const OutboxBatchProcessResultItemSchema = z.object({
  id: z.string().uuid(),
  eventType: z.string(),
  status: z.enum(["PROCESSED", "FAILED", "PENDING"]),
  retryCount: z.number().int(),
  error: z.string().nullable().optional(),
});
export type OutboxBatchProcessResultItem = z.infer<typeof OutboxBatchProcessResultItemSchema>;

export const ProcessOutboxBatchResponseSchema = z.object({
  processedCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  durationMs: z.number().nonnegative(),
  events: z.array(OutboxBatchProcessResultItemSchema),
});
export type ProcessOutboxBatchResponse = z.infer<typeof ProcessOutboxBatchResponseSchema>;
