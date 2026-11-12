import { Router } from "express";
import {
  CalculatePayrollInputSchema,
  SubmitPayrollInputSchema,
  ApprovePayrollInputSchema,
  LockPayrollInputSchema,
  PayrollPeriodQuerySchema,
  PayrollTableQuerySchema,
} from "@bahau/contracts";
import {
  getMyPayslip,
  getPeriodSummary,
  calculatePayrollPeriod,
  getPayrollTable,
  submitPayrollPeriod,
  approvePayrollPeriod,
  lockPayrollPeriod,
  exportPayslipPdf,
} from "../../controllers/payroll.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";

const router = Router();

// Xem phiếu lương của cá nhân
router.get(
  "/payroll/my-payslip",
  requireAuth,
  validateQuery(PayrollPeriodQuerySchema),
  asyncHandler(getMyPayslip)
);

// Xuất PDF phiếu lương (cá nhân hoặc theo ID có chống IDOR)
router.get(
  "/payroll/payslip/:employeeId/pdf",
  requireAuth,
  validateQuery(PayrollPeriodQuerySchema),
  asyncHandler(exportPayslipPdf)
);

// Quản trị kỳ lương toàn trường (HR, KHTC, Ban Giám hiệu)
router.get(
  "/payroll/period-summary",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER"]),
  validateQuery(PayrollPeriodQuerySchema),
  asyncHandler(getPeriodSummary)
);

router.get(
  "/payroll/table",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER"]),
  validateQuery(PayrollTableQuerySchema),
  asyncHandler(getPayrollTable)
);

router.post(
  "/payroll/calculate",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER"]),
  validateBody(CalculatePayrollInputSchema),
  asyncHandler(calculatePayrollPeriod)
);

router.post(
  "/payroll/submit",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER"]),
  validateBody(SubmitPayrollInputSchema),
  asyncHandler(submitPayrollPeriod)
);

router.post(
  "/payroll/approve",
  requireAuth,
  requireRole(["ROLE_RECTOR"]),
  validateBody(ApprovePayrollInputSchema),
  asyncHandler(approvePayrollPeriod)
);

router.post(
  "/payroll/lock",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER"]),
  validateBody(LockPayrollInputSchema),
  asyncHandler(lockPayrollPeriod)
);

export default router;
