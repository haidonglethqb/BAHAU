import { Request, Response, NextFunction } from "express";
import { OutboxService } from "../services/outbox.service.js";

export class NotificationController {
  /**
   * GET /api/v1/notifications/my
   */
  static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const data = await OutboxService.getMyNotifications(userId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/v1/notifications/:id/read
   */
  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const id = String(req.params.id);
      const data = await OutboxService.markAsRead(id, userId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/notifications/read-all
   */
  static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const data = await OutboxService.markAllAsRead(userId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/worker/outbox/process-batch
   */
  static async processBatch(req: Request, res: Response, next: NextFunction) {
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
