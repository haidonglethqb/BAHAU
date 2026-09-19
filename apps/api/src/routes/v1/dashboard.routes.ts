import { Router } from "express";
import { DashboardController } from "../../controllers/dashboard.controller.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// ============================================================================
// EXECUTIVE DASHBOARD ENDPOINTS
// ============================================================================

// Tổng quan chỉ số điều hành toàn trường
router.get(
  "/dashboard/overview",
  requireAuth,
  requirePermission("dashboard:view_overview"),
  asyncHandler(DashboardController.getOverview)
);

// Thống kê cơ cấu nhân sự (học vị, chức danh, hợp đồng, biến động)
router.get(
  "/dashboard/workforce-stats",
  requireAuth,
  requirePermission("dashboard:view_workforce_stats"),
  asyncHandler(DashboardController.getWorkforceStats)
);

// Danh sách cảnh báo điều hành tập trung (hợp đồng, chứng chỉ, việc chờ duyệt)
router.get(
  "/dashboard/alerts",
  requireAuth,
  requirePermission("dashboard:view_alerts"),
  asyncHandler(DashboardController.getAlerts)
);

export default router;
