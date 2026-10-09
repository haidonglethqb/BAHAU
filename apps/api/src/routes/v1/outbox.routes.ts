import { Router } from "express";
import { OutboxController } from "../../controllers/outbox.controller.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// ============================================================================
// OUTBOX EVENT MANAGEMENT & AUDIT API ENDPOINTS
// ============================================================================

// 1. Danh sách sự kiện Outbox (phân trang & bộ lọc status, eventType)
router.get(
  "/events",
  requireAuth,
  requirePermission("worker:process_outbox"),
  asyncHandler(OutboxController.listEvents)
);

// 2. Chi tiết sự kiện Outbox
router.get(
  "/events/:id",
  requireAuth,
  requirePermission("worker:process_outbox"),
  asyncHandler(OutboxController.getEventDetail)
);

// 3. Retry thủ công một sự kiện
router.post(
  "/events/:id/retry",
  requireAuth,
  requirePermission("worker:process_outbox"),
  asyncHandler(OutboxController.retryEvent)
);

// 4. Kích hoạt xử lý lô Outbox
router.post(
  "/process-batch",
  requireAuth,
  requirePermission("worker:process_outbox"),
  asyncHandler(OutboxController.processBatch)
);

export default router;
