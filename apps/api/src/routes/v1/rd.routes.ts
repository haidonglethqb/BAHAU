import { Router } from "express";
import {
  getAllRdProjects,
  getRdProjectById,
  createRdProject,
  reviewRdProjectCouncil,
  allocateRdRoyalty,
  approveRdProjectWithPki,
  downloadRdResolutionPdf,
} from "../../controllers/rd.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// Danh sách đề tài NCKH & Dự án tư vấn thiết kế
router.get("/rd/projects", requireAuth, asyncHandler(getAllRdProjects));

// Chi tiết đề tài / dự án
router.get("/rd/projects/:id", requireAuth, asyncHandler(getRdProjectById));

// Đăng ký đề cương đề tài NCKH hoặc Hợp đồng tư vấn thiết kế mới
router.post("/rd/projects", requireAuth, asyncHandler(createRdProject));

// Hội đồng khoa học đánh giá nghiệm thu đề tài (Rào chắn >= 70 điểm)
router.post(
  "/rd/projects/:id/review",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_DEAN", "ROLE_COUNCIL_MEMBER", "ROLE_SYSADMIN"]),
  asyncHandler(reviewRdProjectCouncil)
);

// Phân bổ tỷ lệ nhuận bút tác giả và quy đổi giờ NCKH
router.post(
  "/rd/projects/:id/allocate",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_DEAN", "ROLE_SYSADMIN"]),
  asyncHandler(allocateRdRoyalty)
);

// Hiệu trưởng phê duyệt và ký số PKI RSA-2048 ban hành Quyết định Nghiệm thu & Chi trả Nhuận bút
router.post(
  "/rd/projects/:id/approve",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_SYSADMIN"]),
  asyncHandler(approveRdProjectWithPki)
);

// Tải file PDF Quyết định Nghiệm thu & Phân bổ Nhuận bút chuẩn Nghị định 30/2020/NĐ-CP
router.get(
  "/rd/projects/:id/resolution/pdf",
  requireAuth,
  asyncHandler(downloadRdResolutionPdf)
);

export default router;
