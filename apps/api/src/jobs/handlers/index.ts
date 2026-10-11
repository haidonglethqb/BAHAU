import { WorkerQueue } from "../worker-queue.js";
import { outboxPollHandler } from "./outbox-poll.handler.js";
import { payrollBatchHandler } from "./payroll-batch.handler.js";
import { nd30PdfHandler } from "./nd30-pdf.handler.js";
import { evidenceBundleHandler } from "./evidence-bundle.handler.js";

export * from "./outbox-poll.handler.js";
export * from "./payroll-batch.handler.js";
export * from "./nd30-pdf.handler.js";
export * from "./evidence-bundle.handler.js";

/**
 * Đăng ký tất cả job handlers mặc định vào WorkerQueue Singleton
 */
export function registerDefaultJobHandlers(queue: WorkerQueue = WorkerQueue.getInstance()): void {
  queue.registerHandler("OUTBOX_POLL", outboxPollHandler);
  queue.registerHandler("PAYROLL_BATCH_CALC", payrollBatchHandler);
  queue.registerHandler("ND30_DECISION_PDF", nd30PdfHandler);
  queue.registerHandler("EVIDENCE_BUNDLE_ZIP", evidenceBundleHandler);
}
