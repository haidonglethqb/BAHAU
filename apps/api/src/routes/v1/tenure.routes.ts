import { Router } from "express";
import {
  getTenureApplications,
  getTenureApplicationById,
  createTenureApplication,
  recordTenureCouncilVote,
  appointTenureWithPki,
  downloadAppointmentResolutionPdf,
} from "../../controllers/tenure.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// Danh sách hồ sơ xét chức danh & thăng hạng
router.get("/tenure/applications", requireAuth, asyncHandler(getTenureApplications));

// Chi tiết hồ sơ e-Portfolio
router.get("/tenure/applications/:id", requireAuth, asyncHandler(getTenureApplicationById));

// Đăng ký nộp hồ sơ xét chức danh
router.post("/tenure/applications", requireAuth, asyncHandler(createTenureApplication));

// Hội đồng cơ sở biểu quyết kín tín nhiệm (>= 2/3)
router.post(
  "/tenure/applications/:id/vote",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_DEAN", "ROLE_COUNCIL_MEMBER", "ROLE_SYSADMIN"]),
  asyncHandler(recordTenureCouncilVote)
);

// Hiệu trưởng phê duyệt và ký số PKI RSA-2048 ban hành quyết định bổ nhiệm
router.post(
  "/tenure/applications/:id/appoint",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_SYSADMIN"]),
  asyncHandler(appointTenureWithPki)
);

// Tải file PDF Quyết định bổ nhiệm chuẩn Nghị định 30/2020/NĐ-CP
router.get(
  "/tenure/applications/:id/resolution/pdf",
  requireAuth,
  asyncHandler(downloadAppointmentResolutionPdf)
);

export default router;
