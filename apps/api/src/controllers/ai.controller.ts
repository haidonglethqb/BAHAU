import { Request, Response, NextFunction } from "express";
import { AiChatRequestSchema, AiEscalationRequestSchema } from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";
import { AiAssistantService } from "../services/ai-assistant.service.js";
import { aiLogService } from "../services/ai/ai-log.service.js";
import { aiOrchestratorService } from "../services/ai/ai-orchestrator.service.js";

function resolveEffectiveSessionId(req: Request, bodySessionId?: string): string {
  const fromBody = bodySessionId?.trim();
  if (fromBody) return fromBody;
  const fromQuery = typeof req.query.sessionId === "string" ? req.query.sessionId.trim() : "";
  if (fromQuery) return fromQuery;
  const fromHeader =
    typeof req.headers["x-session-id"] === "string" ? req.headers["x-session-id"].trim() : "";
  if (fromHeader) return fromHeader;
  return `user:${req.user!.id}`;
}

function canAccessSession(sessionUserId: string | null | undefined, req: Request): boolean {
  const currentUser = req.user!;
  if (!sessionUserId) return true;
  if (sessionUserId === currentUser.id) return true;
  return currentUser.roles.some((r) => ["ROLE_SYSADMIN", "ROLE_HR_OFFICER"].includes(r));
}

export class AiController {
  /**
   * POST /api/v1/ai/chat
   */
  static async chat(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const validated = AiChatRequestSchema.parse(req.body);
      const sessionId = resolveEffectiveSessionId(req, validated.sessionId);
      const data = await AiAssistantService.chat(authUser.id, validated, authUser, sessionId);
      res.status(200).json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai/chat/stream (SSE)
   */
  static async chatStream(req: Request, res: Response, next: NextFunction) {
    let validated;
    try {
      validated = AiChatRequestSchema.parse(req.body);
    } catch (error) {
      return next(error);
    }

    const authUser = req.user!;
    const sessionId = resolveEffectiveSessionId(req, validated.sessionId);

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "private, no-store, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    const writeEvent = (ev: { type: string; [key: string]: unknown }) => {
      if (closed || res.writableEnded) return;
      res.write(`event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`);
    };

    try {
      await aiOrchestratorService.handleChatStream(authUser, validated, sessionId, (ev) => {
        writeEvent(ev as unknown as { type: string; [key: string]: unknown });
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Đã xảy ra lỗi khi xử lý yêu cầu AI.";
      writeEvent({ type: "error", message });
    } finally {
      if (!res.writableEnded) {
        res.end();
      }
    }
  }

  /**
   * GET /api/v1/ai/session
   */
  static async getSession(req: Request, res: Response, next: NextFunction) {
    try {
      const effectiveId = resolveEffectiveSessionId(req);
      const session = aiLogService.getSession(effectiveId);

      if (session && !canAccessSession(session.userId, req)) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền xem phiên hội thoại này.");
      }

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/ai/escalate
   */
  static async escalate(req: Request, res: Response, next: NextFunction) {
    try {
      const authUser = req.user!;
      const validated = AiEscalationRequestSchema.parse(req.body);
      const effectiveId = resolveEffectiveSessionId(req, validated.sessionId);
      const existing = aiLogService.getSession(effectiveId);

      if (existing && !canAccessSession(existing.userId, req)) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền chuyển hỗ trợ phiên hội thoại này.");
      }

      const session = aiLogService.markEscalated(effectiveId, {
        customerContact: validated.contact || authUser.email,
        reason: validated.reason || "Người dùng yêu cầu Phòng TCHC hỗ trợ trực tiếp",
        userMeta: {
          userId: authUser.id,
          userEmail: authUser.email,
          userName: authUser.fullName ?? authUser.email,
        },
      });

      res.status(200).json({
        success: true,
        data: session,
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
