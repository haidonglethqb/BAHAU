import { Router } from "express";
import { JobController } from "../../controllers/job.controller.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();
const requireWorkerAdmin = [requireAuth, requirePermission("worker:process_outbox")];

// ============================================================================
// ASYNCHRONOUS WORKER QUEUE & BACKGROUND JOB MANAGEMENT API ENDPOINTS
// ============================================================================

// 1. Thống kê hàng đợi
router.get("/stats/summary", ...requireWorkerAdmin, asyncHandler(JobController.getQueueStats));

// 2. Kích hoạt quét Outbox nền ngay lập tức
router.post("/trigger-outbox-poll", ...requireWorkerAdmin, asyncHandler(JobController.triggerOutboxPoll));

// 3. Đẩy một job mới vào hàng đợi
router.post("/enqueue", ...requireWorkerAdmin, asyncHandler(JobController.enqueueJob));

// 4. Danh sách các job
router.get("/", ...requireWorkerAdmin, asyncHandler(JobController.listJobs));

// 5. Chi tiết job
router.get("/:id", ...requireWorkerAdmin, asyncHandler(JobController.getJobDetail));

// 6. Hủy job đang pending
router.post("/:id/cancel", ...requireWorkerAdmin, asyncHandler(JobController.cancelJob));

// 7. Thử lại job đã failed
router.post("/:id/retry", ...requireWorkerAdmin, asyncHandler(JobController.retryJob));

export default router;
