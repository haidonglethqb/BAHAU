import { Request, Response, NextFunction } from "express";
import { OutboxService } from "../services/outbox.service.js";

export class OutboxController {
  /**
   * GET /api/v1/outbox/events
   * Tra cứu danh sách sự kiện Outbox (bộ lọc status, eventType, aggregateType, phân trang)
   */
  public static async listEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await OutboxService.getOutboxEvents(req.query as any);
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
      const limit = req.body?.limit ? Number(req.body.limit) : 10;
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
