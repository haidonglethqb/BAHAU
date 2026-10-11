import { WorkerQueue } from "./worker-queue.js";

export class JobScheduler {
  private static instance: JobScheduler;
  private pollerTimer: NodeJS.Timeout | null = null;
  private intervalMs = 15000; // Mặc định 15 giây quét Outbox 1 lần
  private isRunning = false;

  private constructor() {}

  public static getInstance(): JobScheduler {
    if (!JobScheduler.instance) {
      JobScheduler.instance = new JobScheduler();
    }
    return JobScheduler.instance;
  }

  /**
   * Khởi động scheduler quét Outbox nền tự động
   */
  public start(intervalMs?: number): void {
    if (this.isRunning) return;

    if (intervalMs && intervalMs > 0) {
      this.intervalMs = intervalMs;
    }

    this.isRunning = true;

    // Trigger ngay lần đầu
    this.triggerOutboxPoll();

    this.pollerTimer = setInterval(() => {
      this.triggerOutboxPoll();
    }, this.intervalMs);

    if (typeof this.pollerTimer.unref === "function") {
      this.pollerTimer.unref();
    }
  }

  /**
   * Dừng scheduler
   */
  public stop(): void {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
      this.pollerTimer = null;
    }
    this.isRunning = false;
  }

  public getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
    };
  }

  /**
   * Kích hoạt quét Outbox thông qua WorkerQueue với deduplication key
   */
  public async triggerOutboxPoll(batchLimit = 50): Promise<void> {
    const queue = WorkerQueue.getInstance();
    try {
      await queue.enqueue({
        type: "OUTBOX_POLL",
        priority: "HIGH",
        payload: { batchLimit },
        deduplicationKey: "daemon-outbox-poll",
        maxAttempts: 3,
      });
    } catch (err) {
      console.warn("[JobScheduler] Không thể enqueue OUTBOX_POLL:", err);
    }
  }
}
