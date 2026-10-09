import { Router } from "express";
import {
  getAllPostgradStudents,
  getPostgradStudentById,
  createPostgradStudent,
  schedulePostgradDefenseCouncil,
  scorePostgradThesisDefense,
  awardPostgradDegreeWithPki,
  downloadDegreeResolutionPdf,
} from "../../controllers/postgrad.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// Danh sách học viên Sau đại học & đề tài
router.get("/postgrad/students", requireAuth, asyncHandler(getAllPostgradStudents));

// Chi tiết hồ sơ học viên & đề tài
router.get("/postgrad/students/:id", requireAuth, asyncHandler(getPostgradStudentById));

// Đăng ký đề tài luận văn/luận án & phân công CBHD
router.post("/postgrad/students", requireAuth, asyncHandler(createPostgradStudent));

// Thành lập Hội đồng đánh giá luận văn / luận án (5 thành viên)
router.post(
  "/postgrad/students/:id/schedule-council",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_DEAN", "ROLE_SYSADMIN"]),
  asyncHandler(schedulePostgradDefenseCouncil)
);

// Chấm điểm và kết luận của Hội đồng đánh giá
router.post(
  "/postgrad/students/:id/score-defense",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_DEAN", "ROLE_COUNCIL_MEMBER", "ROLE_SYSADMIN"]),
  asyncHandler(scorePostgradThesisDefense)
);

// Hiệu trưởng ký số PKI RSA-2048 ban hành Quyết định công nhận học vị Thạc sĩ / Tiến sĩ
router.post(
  "/postgrad/students/:id/award-degree",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_SYSADMIN"]),
  asyncHandler(awardPostgradDegreeWithPki)
);

// Tải file PDF Quyết định Công nhận học vị chuẩn Nghị định 30/2020/NĐ-CP
router.get(
  "/postgrad/students/:id/resolution/pdf",
  requireAuth,
  asyncHandler(downloadDegreeResolutionPdf)
);

export default router;
