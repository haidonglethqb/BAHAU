import { Router } from "express";
import {
  getMyAttendance,
  getUnitAttendance,
  createAdjustmentRequest,
  importAttendanceData,
  lockPeriod,
} from "../../controllers/attendance.controller.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  AttendanceQuerySchema,
  CreateAttendanceAdjustmentSchema,
  ImportAttendanceBatchSchema,
  LockPeriodSchema,
} from "@bahau/contracts";

const router = Router();

// Lấy dữ liệu chấm công cá nhân theo tháng (Lớp 1, 2, 3)
router.get(
  "/attendance/me",
  requireAuth,
  requirePermission("attendance:view_own"),
  validateQuery(AttendanceQuerySchema),
  asyncHandler(getMyAttendance)
);

// Lấy bảng công tổng hợp cấp đơn vị (Dành cho Quản lý & Phòng TCHC)
router.get(
  "/attendance/unit",
  requireAuth,
  requirePermission("attendance:view_unit"),
  validateQuery(AttendanceQuerySchema),
  asyncHandler(getUnitAttendance)
);

// Gửi đơn giải trình / điều chỉnh giờ công (Lớp 2)
router.post(
  "/attendance/adjustments",
  requireAuth,
  requirePermission("attendance:adjust_request"),
  validateBody(CreateAttendanceAdjustmentSchema),
  asyncHandler(createAdjustmentRequest)
);

// Nạp dữ liệu quẹt thẻ thô từ máy điểm danh vân tay/khuôn mặt (Lớp 1)
router.post(
  "/attendance/import",
  requireAuth,
  requirePermission("attendance:import_raw"),
  validateBody(ImportAttendanceBatchSchema),
  asyncHandler(importAttendanceData)
);

// Chốt & Khóa kỳ công tháng sang trạng thái bất biến (Lớp 3)
router.post(
  "/attendance/lock-period",
  requireAuth,
  requirePermission("attendance:lock_period"),
  validateBody(LockPeriodSchema),
  asyncHandler(lockPeriod)
);

export default router;
