import { Request, Response, NextFunction } from "express";
import { OutboxFilterQuerySchema } from "@bahau/contracts";
import { OutboxService } from "../services/outbox.service.js";
import { AppError } from "../middlewares/error.middleware.js";

export class OutboxController {
  /**
   * GET /api/v1/outbox/events
   * Tra cứu danh sách sự kiện Outbox (bộ lọc status, eventType, aggregateType, phân trang)
   */
  public static async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = OutboxFilterQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        throw new AppError(422, "VALIDATION_ERROR", "Tham số truy vấn Outbox không hợp lệ.");
      }
      const data = await OutboxService.getOutboxEvents(parsed.data);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/outbox/events/:id
   * Xem chi tiết một sự kiện Outbox theo ID
   */
  public static async getEventDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const data = await OutboxService.getOutboxEventById(id);
      if (!data) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Không tìm thấy sự kiện Outbox tương ứng.",
          },
        });
        return;
      }
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/outbox/events/:id/retry
   * Kích hoạt thủ công retry một sự kiện bị FAILED
   */
  public static async retryEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = String(req.params.id);
      const data = await OutboxService.retryOutboxEvent(id);
      res.status(200).json({
        success: true,
        data,
        message: "Đã đưa sự kiện trở lại hàng đợi PENDING để xử lý lại.",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/outbox/process-batch
   * Kích hoạt thủ công một batch quét và xử lý Outbox
   */
  public static async processBatch(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawLimit = req.body?.limit;
      let limit = 10;
      if (rawLimit !== undefined && rawLimit !== null && rawLimit !== "") {
        const num = Number(rawLimit);
        if (!Number.isInteger(num) || num < 1 || num > 100) {
          throw new AppError(422, "VALIDATION_ERROR", "Tham số limit phải là số nguyên từ 1 đến 100.");
        }
        limit = num;
      }
      const data = await OutboxService.processBatch(limit);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
