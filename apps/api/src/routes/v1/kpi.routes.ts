import { Router } from "express";
import {
  getPeriods,
  createPeriod,
  getTemplates,
  getMyEvaluation,
  submitSelfEvaluation,
  getUnitEvaluations,
  scoreManagerEvaluation,
  finalizeEvaluation,
} from "../../controllers/kpi.controller.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  CreateKpiPeriodSchema,
  SubmitSelfEvaluationSchema,
  ScoreManagerEvaluationSchema,
  FinalizeCouncilEvaluationSchema,
  KpiFilterQuerySchema,
} from "@bahau/contracts";

const router = Router();

// Danh sách các kỳ đánh giá
router.get("/kpi/periods", requireAuth, asyncHandler(getPeriods));

// Mở kỳ đánh giá mới (Phòng TCHC)
router.post(
  "/kpi/periods",
  requireAuth,
  requirePermission("kpi:manage_periods"),
  validateBody(CreateKpiPeriodSchema),
  asyncHandler(createPeriod)
);

// Danh mục mẫu tiêu chí đánh giá
router.get("/kpi/templates", requireAuth, asyncHandler(getTemplates));

// Xem phiếu tự đánh giá cá nhân
router.get(
  "/kpi/evaluations/my",
  requireAuth,
  requirePermission("kpi:view_own"),
  asyncHandler(getMyEvaluation)
);

// Nộp / Lưu nháp phiếu tự đánh giá cá nhân (Bước 2)
router.post(
  "/kpi/evaluations/my",
  requireAuth,
  requirePermission("kpi:submit_self"),
  validateBody(SubmitSelfEvaluationSchema),
  asyncHandler(submitSelfEvaluation)
);

// Danh sách đánh giá toàn đơn vị (Trưởng đơn vị & Hội đồng)
router.get(
  "/kpi/evaluations/unit",
  requireAuth,
  requirePermission("kpi:view_unit"),
  validateQuery(KpiFilterQuerySchema),
  asyncHandler(getUnitEvaluations)
);

// Trưởng đơn vị chấm điểm quản lý (Bước 3)
router.put(
  "/kpi/evaluations/:id/manager-score",
  requireAuth,
  requirePermission("kpi:evaluate_unit"),
  validateBody(ScoreManagerEvaluationSchema),
  asyncHandler(scoreManagerEvaluation)
);

// Hội đồng chốt điểm và xếp loại thi đua A/B/C/D (Bước 4)
router.put(
  "/kpi/evaluations/:id/finalize",
  requireAuth,
  requirePermission("kpi:finalize_council"),
  validateBody(FinalizeCouncilEvaluationSchema),
  asyncHandler(finalizeEvaluation)
);

export default router;
