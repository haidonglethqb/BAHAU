import { OutboxService } from "../../services/outbox.service.js";
import type { JobHandlerFn } from "../worker-queue.js";

export interface OutboxPollPayload {
  batchLimit?: number;
}

export interface OutboxPollResult {
  processedCount: number;
  remainingPending: number;
  timestamp: string;
}

export const outboxPollHandler: JobHandlerFn<OutboxPollPayload, OutboxPollResult> = async (
  payload,
  updateProgress
) => {
  const limit = payload?.batchLimit || 50;
  await updateProgress(20, "Đang truy vấn sự kiện Outbox đang chờ xử lý...");

  const batchResult = await OutboxService.processBatch(limit);
  const processedCount = batchResult.processedCount;
  await updateProgress(80, `Đã xử lý ${processedCount} sự kiện Outbox thành công`);

  const pendingEvents = await OutboxService.getOutboxEvents({
    page: 1,
    limit: 1,
    status: "PENDING",
  });

  await updateProgress(100, "Hoàn tất chu trình quét Outbox");

  return {
    processedCount,
    remainingPending: pendingEvents.total,
    timestamp: new Date().toISOString(),
  };
};
