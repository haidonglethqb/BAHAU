import { Request, Response, NextFunction } from "express";
import { DashboardService } from "../services/dashboard.service.js";

export class DashboardController {
  /**
   * GET /api/v1/dashboard/overview
   */
  static async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await DashboardService.getOverview({
        role: user?.roles?.[0],
      });
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/dashboard/workforce-stats
   */
  static async getWorkforceStats(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await DashboardService.getWorkforceStats({
        role: user?.roles?.[0],
      });
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/dashboard/alerts
   */
  static async getAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user;
      const data = await DashboardService.getExecutiveAlerts({
        role: user?.roles?.[0],
      });
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
