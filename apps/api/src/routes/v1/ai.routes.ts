import { Router } from "express";
import { AiController } from "../../controllers/ai.controller.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { aiRateLimiter } from "../../middlewares/rate-limit.middleware.js";

const router = Router();

// ============================================================================
// AI ASSISTANT & DAU POLICY RAG ENDPOINTS
// ============================================================================

// Hội thoại trợ lý ảo AI (Non-stream JSON)
router.post(
  "/ai/chat",
  requireAuth,
  requirePermission("ai:chat"),
  aiRateLimiter,
  asyncHandler(AiController.chat)
);

// Hội thoại trợ lý ảo AI (SSE Streaming)
router.post(
  "/ai/chat/stream",
  requireAuth,
  requirePermission("ai:chat"),
  aiRateLimiter,
  asyncHandler(AiController.chatStream)
);

// Lấy chi tiết phiên hội thoại AI hiện tại (bao gồm phản hồi từ Phòng TCHC / Admin)
router.get("/ai/session", requireAuth, asyncHandler(AiController.getSession));

// Yêu cầu chuyển phiên hội thoại tới Phòng TCHC hỗ trợ trực tiếp
router.post("/ai/escalate", requireAuth, asyncHandler(AiController.escalate));

// Danh mục văn bản quy chế DAU có trong cơ sở tri thức
router.get("/ai/policies", requireAuth, asyncHandler(AiController.getPolicies));

export default router;
