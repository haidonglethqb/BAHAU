import { Router } from "express";
import { JobController } from "../../controllers/job.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// ============================================================================
// ASYNCHRONOUS WORKER QUEUE & BACKGROUND JOB MANAGEMENT API ENDPOINTS
// ============================================================================

// 1. Thống kê hàng đợi
router.get("/stats/summary", requireAuth, asyncHandler(JobController.getQueueStats));

// 2. Kích hoạt quét Outbox nền ngay lập tức
router.post("/trigger-outbox-poll", requireAuth, asyncHandler(JobController.triggerOutboxPoll));

// 3. Đẩy một job mới vào hàng đợi
router.post("/enqueue", requireAuth, asyncHandler(JobController.enqueueJob));

// 4. Danh sách các job
router.get("/", requireAuth, asyncHandler(JobController.listJobs));

// 5. Chi tiết job
router.get("/:id", requireAuth, asyncHandler(JobController.getJobDetail));

// 6. Hủy job đang pending
router.post("/:id/cancel", requireAuth, asyncHandler(JobController.cancelJob));

// 7. Thử lại job đã failed
router.post("/:id/retry", requireAuth, asyncHandler(JobController.retryJob));

export default router;
