import { Router } from "express";
import { AiController } from "../../controllers/ai.controller.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// ============================================================================
// AI ASSISTANT & DAU POLICY RAG ENDPOINTS
// ============================================================================

// Hội thoại trợ lý ảo AI RAG
router.post(
  "/ai/chat",
  requireAuth,
  requirePermission("ai:chat"),
  asyncHandler(AiController.chat)
);

// Danh mục văn bản quy chế DAU có trong cơ sở tri thức
router.get(
  "/ai/policies",
  requireAuth,
  asyncHandler(AiController.getPolicies)
);

export default router;
