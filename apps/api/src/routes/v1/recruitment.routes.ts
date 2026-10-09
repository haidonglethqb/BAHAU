import { Router } from "express";
import {
  getRecruitmentCandidates,
  getRecruitmentCandidateById,
  createCandidateApplication,
  scoreCandidateRound1,
  scoreCandidateRound2,
  appointRecruitmentWithPki,
  downloadAppointmentResolutionPdf,
} from "../../controllers/recruitment.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// Danh sách ứng viên tuyển dụng
router.get("/recruitment/candidates", requireAuth, asyncHandler(getRecruitmentCandidates));

// Chi tiết hồ sơ ứng viên
router.get("/recruitment/candidates/:id", requireAuth, asyncHandler(getRecruitmentCandidateById));

// Nộp hồ sơ ứng tuyển & e-Portfolio mới (cho phép nộp hồ sơ)
router.post("/recruitment/candidates", requireAuth, asyncHandler(createCandidateApplication));

// Chấm điểm Vòng 1: Thẩm định e-Portfolio Sáng tác & Hồ sơ Khoa học
router.post(
  "/recruitment/candidates/:id/score-round-1",
  requireAuth,
  requireRole(["ROLE_DEAN", "ROLE_COUNCIL_MEMBER", "ROLE_SYSADMIN"]),
  asyncHandler(scoreCandidateRound1)
);

// Chấm điểm Vòng 2: Giảng thử Đồ án Studio & Phỏng vấn Chuyên môn
router.post(
  "/recruitment/candidates/:id/score-round-2",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_DEAN", "ROLE_COUNCIL_MEMBER", "ROLE_SYSADMIN"]),
  asyncHandler(scoreCandidateRound2)
);

// Hiệu trưởng phê duyệt và ký số PKI RSA-2048 ban hành Quyết định Bổ nhiệm Tập sự
router.post(
  "/recruitment/candidates/:id/appoint",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_SYSADMIN"]),
  asyncHandler(appointRecruitmentWithPki)
);

// Tải file PDF Quyết định Tuyển dụng & Bổ nhiệm tập sự chuẩn Nghị định 30/2020/NĐ-CP
router.get(
  "/recruitment/candidates/:id/resolution/pdf",
  requireAuth,
  asyncHandler(downloadAppointmentResolutionPdf)
);

export default router;
