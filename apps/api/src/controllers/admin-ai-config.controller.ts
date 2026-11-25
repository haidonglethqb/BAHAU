import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AppError } from "../middlewares/error.middleware.js";
import {
  aiConfigService,
  AVAILABLE_CODEX_MODELS,
  AVAILABLE_GROQ_MODELS,
} from "../services/ai/ai-config.service.js";
import { aiLogService } from "../services/ai/ai-log.service.js";
import { aiProviderTesterService } from "../services/ai/ai-provider-tester.service.js";

const AdminReplyInputSchema = z.object({
  message: z.string().trim().min(1, "Nội dung phản hồi không được để trống").max(4000),
  resolveEscalation: z.boolean().optional(),
});

export class AdminAiConfigController {
  /**
   * GET /api/v1/admin/ai-config
   */
  static async getConfig(_req: Request, res: Response, next: NextFunction) {
    try {
      res.status(200).json({
        success: true,
        data: {
          config: aiConfigService.getMaskedConfig(),
          availableCodexModels: AVAILABLE_CODEX_MODELS,
          availableGroqModels: AVAILABLE_GROQ_MODELS,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/admin/ai-config
   */
  static async updateConfig(req: Request, res: Response, next: NextFunction) {
    try {
      let updated;
      try {
        updated = aiConfigService.updateConfig(req.body);
      } catch (err) {
        if (err instanceof AppError && err.code === "INVALID_AI_CONFIG") {
          throw new AppError(422, "VALIDATION_FAILED", err.message);
        }
        throw err;
      }

      res.status(200).json({
        success: true,
        data: {
          config: aiConfigService.getMaskedConfig(),
          updatedProvider: updated.provider,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/ai-config/test
   */
  static async testConnection(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await aiProviderTesterService.testConnection(req.body);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/admin/ai-config/logs
   */
  static async getLogs(_req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = aiLogService.getSessions(50);
      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/admin/ai-config/sessions/:id/reply
   */
  static async replyToSession(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params["id"];
      const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
      const validated = AdminReplyInputSchema.parse(req.body);
      const sender = req.user!.fullName || req.user!.email;

      const updated = aiLogService.addAdminReply(sessionId, {
        sender,
        message: validated.message,
        resolveEscalation: validated.resolveEscalation,
      });

      if (!updated) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy phiên hội thoại AI.");
      }

      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/ai-config/logs
   */
  static async clearLogs(_req: Request, res: Response, next: NextFunction) {
    try {
      aiLogService.clearSessions();
      res.status(200).json({
        success: true,
        data: { cleared: true },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/v1/admin/ai-config/sessions/:id
   */
  static async deleteSession(req: Request, res: Response, next: NextFunction) {
    try {
      const rawId = req.params["id"];
      const sessionId = Array.isArray(rawId) ? rawId[0] : rawId;
      const deleted = aiLogService.deleteSession(sessionId);
      if (!deleted) {
        throw new AppError(404, "RESOURCE_NOT_FOUND", "Không tìm thấy phiên hội thoại AI.");
      }
      res.status(200).json({
        success: true,
        data: { deleted: true },
      });
    } catch (error) {
      next(error);
    }
  }
}
