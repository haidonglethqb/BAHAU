import { Request, Response, NextFunction } from "express";
import { WorkerQueue } from "../jobs/worker-queue.js";
import { JobScheduler } from "../jobs/scheduler.js";
import { EnqueueJobSchema, JobListQuerySchema } from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";

export class JobController {
  /**
   * POST /api/v1/jobs/enqueue
   * Đẩy một job mới vào hàng đợi
   */
  public static async enqueueJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsed = EnqueueJobSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          "Dữ liệu job không hợp lệ: " + parsed.error.issues.map((i) => i.message).join(", ")
        );
      }

      const queue = WorkerQueue.getInstance();
      const job = await queue.enqueue(parsed.data);

      res.status(202).json({
        success: true,
        data: job,
        message: "Job đã được tiếp nhận và đưa vào hàng đợi xử lý.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs
   * Danh sách các job trong hàng đợi (có lọc status, type, phân trang)
   */
  public static async listJobs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const parsed = JobListQuerySchema.safeParse(req.query);
      const query = parsed.success
        ? parsed.data
        : { page: 1, limit: 20 };

      const queue = WorkerQueue.getInstance();
      const data = queue.listJobs(query);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/:id
   * Chi tiết thông tin và tiến độ của job
   */
  public static async getJobDetail(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const queue = WorkerQueue.getInstance();
      const job = queue.getJob(id);

      if (!job) {
        throw new AppError(404, "NOT_FOUND", `Không tìm thấy Job có ID: ${id}`);
      }

      res.status(200).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/jobs/:id/cancel
   * Hủy một job đang ở trạng thái PENDING
   */
  public static async cancelJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const queue = WorkerQueue.getInstance();
      queue.cancelJob(id);

      res.status(200).json({
        success: true,
        message: `Đã hủy Job ${id} thành công.`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/jobs/:id/retry
   * Thử lại thủ công một job đã FAILED hoặc CANCELLED
   */
  public static async retryJob(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = String(req.params.id);
      const queue = WorkerQueue.getInstance();
      const job = queue.retryJob(id);

      res.status(200).json({
        success: true,
        data: job,
        message: `Đã kích hoạt thử lại Job ${id}.`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/jobs/stats/summary
   * Lấy số liệu thống kê tổng thể hàng đợi
   */
  public static async getQueueStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const queue = WorkerQueue.getInstance();
      const stats = queue.getStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/jobs/trigger-outbox-poll
   * Kích hoạt quét Outbox nền ngay lập tức
   */
  public static async triggerOutboxPoll(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const scheduler = JobScheduler.getInstance();
      await scheduler.triggerOutboxPoll();

      res.status(200).json({
        success: true,
        message: "Đã kích hoạt quét Outbox nền thành công.",
      });
    } catch (error) {
      next(error);
    }
  }
}
