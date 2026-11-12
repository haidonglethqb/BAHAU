import { Request, Response, NextFunction } from "express";
import { OutboxService } from "../services/outbox.service.js";
import { AppError } from "../middlewares/error.middleware.js";

export class NotificationController {
  /**
   * GET /api/v1/notifications/my
   */
  static async getMyNotifications(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const rawLimit = req.query.limit;
      let limit = 30;
      if (rawLimit !== undefined && rawLimit !== "") {
        const num = Number(rawLimit);
        if (!Number.isInteger(num) || num < 1 || num > 100) {
          throw new AppError(422, "VALIDATION_ERROR", "Tham số limit phải là số nguyên từ 1 đến 100.");
        }
        limit = num;
      }
      const data = await OutboxService.getMyNotifications(userId, limit);
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
