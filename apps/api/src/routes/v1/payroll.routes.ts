import { Router } from "express";
import {
  getMyPayslip,
  getPeriodSummary,
} from "../../controllers/payroll.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

router.get("/payroll/my-payslip", requireAuth, asyncHandler(getMyPayslip));
router.get(
  "/payroll/period-summary",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER", "ROLE_SYSADMIN"]),
  asyncHandler(getPeriodSummary)
);

export default router;
