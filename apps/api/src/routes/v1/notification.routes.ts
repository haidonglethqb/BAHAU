import { Router } from "express";
import { NotificationController } from "../../controllers/notification.controller.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// ============================================================================
// NOTIFICATION & OUTBOX WORKER ENDPOINTS
// ============================================================================

// Lấy danh sách thông báo cá nhân
router.get(
  "/notifications/my",
  requireAuth,
  requirePermission("notification:view_own"),
  asyncHandler(NotificationController.getMyNotifications)
);

// Đánh dấu 1 thông báo là đã đọc
router.patch(
  "/notifications/:id/read",
  requireAuth,
  requirePermission("notification:mark_read"),
  asyncHandler(NotificationController.markAsRead)
);

// Đánh dấu toàn bộ thông báo là đã đọc
router.post(
  "/notifications/read-all",
  requireAuth,
  requirePermission("notification:mark_read"),
  asyncHandler(NotificationController.markAllAsRead)
);

// Kích hoạt xử lý lô hàng đợi Outbox (Worker Dispatcher)
router.post(
  "/worker/outbox/process-batch",
  requireAuth,
  requirePermission("worker:process_outbox"),
  asyncHandler(NotificationController.processBatch)
);

export default router;
