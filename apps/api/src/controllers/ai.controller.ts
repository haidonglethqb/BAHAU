import { Request, Response, NextFunction } from "express";
import { AiAssistantService } from "../services/ai-assistant.service.js";
import { AiChatRequestSchema } from "@bahau/contracts";

export class AiController {
  /**
   * POST /api/v1/ai/chat
   */
  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const validated = AiChatRequestSchema.parse(req.body);
      const data = await AiAssistantService.chat(userId, validated);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/ai/policies
   */
  static async getPolicies(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await AiAssistantService.getPolicies();
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}
