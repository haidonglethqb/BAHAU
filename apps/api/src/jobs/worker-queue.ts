import EventEmitter from "node:events";
import crypto from "node:crypto";
import type {
  JobDto,
  EnqueueJobDto,
  JobListQuery,
  JobListResponse,
  QueueStatsResponse,
  JobStatus,
  JobPriority,
} from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";

export type JobHandlerFn<TPayload = any, TResult = any> = (
  payload: TPayload,
  updateProgress: (progress: number, message?: string) => Promise<void> | void,
  job: JobDto<TPayload, TResult>
) => Promise<TResult>;

interface InternalJobRecord extends JobDto {
  priorityScore: number;
  retryTimer?: NodeJS.Timeout;
}

const PRIORITY_SCORES: Record<JobPriority, number> = {
  HIGH: 1,
  NORMAL: 5,
  LOW: 10,
};

export class WorkerQueue extends EventEmitter {
  private static instance: WorkerQueue;
  private jobs: Map<string, InternalJobRecord> = new Map();
  private handlers: Map<string, JobHandlerFn> = new Map();
  private activeWorkers = 0;
  private maxConcurrency = 3;
  private isRunning = true;
  private isProcessing = false;

  private constructor() {
    super();
  }

  public static getInstance(): WorkerQueue {
    if (!WorkerQueue.instance) {
      WorkerQueue.instance = new WorkerQueue();
    }
    return WorkerQueue.instance;
  }

  /**
   * Đăng ký handler xử lý cho từng loại job
   */
  public registerHandler<TPayload = any, TResult = any>(
    type: string,
    handler: JobHandlerFn<TPayload, TResult>
  ): void {
    this.handlers.set(type, handler);
  }

  /**
   * Cấu hình số worker đồng thời tối đa
   */
  public setConcurrency(limit: number): void {
    if (limit > 0) {
      this.maxConcurrency = limit;
    }
  }

  public getConcurrency(): number {
    return this.maxConcurrency;
  }

  /**
   * Đẩy một job mới vào hàng đợi
   */
  public async enqueue(dto: EnqueueJobDto): Promise<JobDto> {
    if (dto.deduplicationKey) {
      // Kiểm tra deduplication nếu job cũ đang PENDING hoặc PROCESSING
      for (const existing of this.jobs.values()) {
        if (
          existing.deduplicationKey === dto.deduplicationKey &&
          (existing.status === "PENDING" || existing.status === "PROCESSING")
        ) {
          return this.sanitizeJob(existing);
        }
      }
    }

    const priority: JobPriority = dto.priority || "NORMAL";
    const priorityScore = PRIORITY_SCORES[priority] ?? 5;
    const jobId = `job-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
    const now = new Date().toISOString();

    const record: InternalJobRecord = {
      id: jobId,
      type: dto.type,
      priority,
      priorityScore,
      payload: dto.payload || {},
      status: "PENDING",
      progress: 0,
      attempts: 0,
      maxAttempts: dto.maxAttempts ?? 3,
      deduplicationKey: dto.deduplicationKey,
      createdAt: now,
      startedAt: null,
      completedAt: null,
    };

    this.jobs.set(jobId, record);
    this.emit("job:enqueued", this.sanitizeJob(record));

    // Kích hoạt worker xử lý ngay
    setImmediate(() => this.processNext());

    return this.sanitizeJob(record);
  }

  /**
   * Lấy chi tiết thông tin Job
   */
  public getJob(id: string): JobDto | null {
    const job = this.jobs.get(id);
    return job ? this.sanitizeJob(job) : null;
  }

  /**
   * Danh sách Job có phân trang và bộ lọc
   */
  public listJobs(query: JobListQuery): JobListResponse {
    let items = Array.from(this.jobs.values());

    if (query.status) {
      items = items.filter((j) => j.status === query.status);
    }
    if (query.type) {
      items = items.filter((j) => j.type === query.type);
    }

    // Sắp xếp: Mới nhất lên đầu
    items.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const total = items.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = items
      .slice(startIndex, startIndex + limit)
      .map((j) => this.sanitizeJob(j));

    return {
      items: paginatedItems,
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Hủy một job đang ở trạng thái PENDING
   */
  public cancelJob(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) {
      throw new AppError(404, "NOT_FOUND", `Không tìm thấy Job có ID: ${id}`);
    }

    if (job.status !== "PENDING") {
      throw new AppError(
        400,
        "INVALID_STATE",
        `Chỉ có thể hủy Job đang ở trạng thái PENDING (Trạng thái hiện tại: ${job.status})`
      );
    }

    if (job.retryTimer) {
      clearTimeout(job.retryTimer);
    }

    job.status = "CANCELLED";
    job.completedAt = new Date().toISOString();
    this.emit("job:cancelled", this.sanitizeJob(job));
    return true;
  }

  /**
   * Thử lại thủ công một job đã FAILED
   */
  public retryJob(id: string): JobDto {
    const job = this.jobs.get(id);
    if (!job) {
      throw new AppError(404, "NOT_FOUND", `Không tìm thấy Job có ID: ${id}`);
    }

    if (job.status !== "FAILED" && job.status !== "CANCELLED") {
      throw new AppError(
        400,
        "INVALID_STATE",
        `Chỉ có thể thử lại Job có trạng thái FAILED hoặc CANCELLED (Hiện tại: ${job.status})`
      );
    }

    job.status = "PENDING";
    job.progress = 0;
    job.error = null;
    job.startedAt = null;
    job.completedAt = null;

    setImmediate(() => this.processNext());
    return this.sanitizeJob(job);
  }

  /**
   * Thống kê trạng thái hàng đợi
   */
  public getStats(): QueueStatsResponse {
    let pending = 0;
    let completed = 0;
    let failed = 0;

    for (const job of this.jobs.values()) {
      if (job.status === "PENDING") pending++;
      else if (job.status === "COMPLETED") completed++;
      else if (job.status === "FAILED") failed++;
    }

    return {
      active: this.activeWorkers,
      pending,
      completed,
      failed,
      total: this.jobs.size,
      isPollerRunning: this.isRunning,
      concurrency: this.maxConcurrency,
    };
  }

  /**
   * Lấy job tiếp theo theo thứ tự ưu tiên (Priority Scheduling)
   * 1. PriorityScore nhỏ hơn (HIGH = 1, NORMAL = 5, LOW = 10)
   * 2. Thời gian tạo sớm hơn (FIFO cho cùng mức ưu tiên)
   */
  private getNextPendingJob(): InternalJobRecord | null {
    const pendingJobs: InternalJobRecord[] = [];
    for (const job of this.jobs.values()) {
      if (job.status === "PENDING") {
        pendingJobs.push(job);
      }
    }

    if (pendingJobs.length === 0) return null;

    pendingJobs.sort((a, b) => {
      if (a.priorityScore !== b.priorityScore) {
        return a.priorityScore - b.priorityScore; // 1 trước 5 trước 10
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return pendingJobs[0] || null;
  }

  /**
   * Chu trình điều phối thực thi job
   */
  public async processNext(): Promise<void> {
    if (!this.isRunning) return;
    if (this.activeWorkers >= this.maxConcurrency) return;

    const nextJob = this.getNextPendingJob();
    if (!nextJob) return;

    this.activeWorkers++;
    nextJob.status = "PROCESSING";
    nextJob.startedAt = new Date().toISOString();
    nextJob.attempts += 1;

    const handler = this.handlers.get(nextJob.type);

    const updateProgress = async (progress: number, message?: string) => {
      nextJob.progress = Math.min(100, Math.max(0, progress));
      if (message) {
        nextJob.statusMessage = message;
      }
      this.emit("job:progress", this.sanitizeJob(nextJob));
    };

    try {
      if (!handler) {
        throw new Error(`Chưa đăng ký handler xử lý cho JobType: ${nextJob.type}`);
      }

      const result = await handler(nextJob.payload, updateProgress, this.sanitizeJob(nextJob));

      nextJob.status = "COMPLETED";
      nextJob.progress = 100;
      nextJob.result = result || {};
      nextJob.completedAt = new Date().toISOString();
      this.emit("job:completed", this.sanitizeJob(nextJob));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      nextJob.error = errorMsg;

      if (nextJob.attempts < nextJob.maxAttempts) {
        // Thử lại với Exponential Backoff
        const backoffMs = Math.min(1000 * Math.pow(2, nextJob.attempts - 1), 10000);
        nextJob.status = "PENDING";
        nextJob.statusMessage = `Lỗi lần ${nextJob.attempts}, thử lại sau ${backoffMs}ms: ${errorMsg}`;

        nextJob.retryTimer = setTimeout(() => {
          this.processNext();
        }, backoffMs);
        if (typeof nextJob.retryTimer.unref === "function") {
          nextJob.retryTimer.unref();
        }
      } else {
        // Vượt quá maxAttempts -> chuyển sang FAILED (Dead-Letter)
        nextJob.status = "FAILED";
        nextJob.completedAt = new Date().toISOString();
        this.emit("job:failed", this.sanitizeJob(nextJob));
      }
    } finally {
      this.activeWorkers--;
      // Tiếp tục quét job tiếp theo nếu còn slot worker
      setImmediate(() => this.processNext());
    }
  }

  /**
   * Chờ tất cả job đang active hoàn tất (dùng cho testing/graceful shutdown)
   */
  public async drain(): Promise<void> {
    while (this.activeWorkers > 0 || this.getNextPendingJob() !== null) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  /**
   * Dọn sạch toàn bộ jobs (dùng cho testing)
   */
  public clear(): void {
    for (const job of this.jobs.values()) {
      if (job.retryTimer) {
        clearTimeout(job.retryTimer);
      }
    }
    this.jobs.clear();
    this.activeWorkers = 0;
  }

  /**
   * Tạm dừng hoặc tiếp tục hàng đợi
   */
  public pause(): void {
    this.isRunning = false;
  }

  public resume(): void {
    this.isRunning = true;
    setImmediate(() => this.processNext());
  }

  private sanitizeJob(job: InternalJobRecord): JobDto {
    const { priorityScore, retryTimer, ...sanitized } = job;
    return sanitized;
  }
}
