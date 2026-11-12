import { Router, type RequestHandler } from "express";
import {
  getMyCertificates,
  submitCertificate,
  getAllCertificates,
  verifyCertificate,
  getExpiringCertificates,
  getCourses,
  createCourse,
  registerCourse,
} from "../../controllers/training.controller.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { AppError } from "../../middlewares/error.middleware.js";
import {
  CreateCertificateSchema,
  VerifyCertificateSchema,
  CreateTrainingCourseSchema,
  RegisterTrainingCourseSchema,
  CertificateFilterQuerySchema,
} from "@bahau/contracts";

const router = Router();

/** Cho phép quyền xem chứng chỉ toàn trường (TCHC/BGH) hoặc theo đơn vị (Trưởng đơn vị) */
const requireCertificateViewScope: RequestHandler = (req, _res, next) => {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập để thực hiện thao tác này.");
  }
  const perms = req.user.permissions || [];
  if (
    !perms.includes("training:view_all_certificates") &&
    !perms.includes("training:view_unit_certificates")
  ) {
    throw new AppError(403, "FORBIDDEN", "Bạn không có quyền tra cứu danh sách chứng chỉ.");
  }
  next();
};

// ============================================================================
// CHỨNG CHỈ (CERTIFICATES)
// ============================================================================

// Tra cứu chứng chỉ cá nhân của CBGV
router.get(
  "/training/certificates/my",
  requireAuth,
  requirePermission("training:view_own_certificates"),
  asyncHandler(getMyCertificates)
);

// Khai báo / nộp chứng chỉ mới
router.post(
  "/training/certificates",
  requireAuth,
  requirePermission("training:submit_certificate"),
  validateBody(CreateCertificateSchema),
  asyncHandler(submitCertificate)
);

// Tra cứu danh sách chứng chỉ sắp hết hạn trong 30/60/90 ngày
router.get(
  "/training/certificates/expiring",
  requireAuth,
  requireCertificateViewScope,
  requireRole(["ROLE_UNIT_HEAD", "ROLE_HR_OFFICER", "ROLE_RECTOR"]),
  asyncHandler(getExpiringCertificates)
);

// Tra cứu chứng chỉ toàn trường / theo đơn vị (Phòng TCHC & Quản lý)
router.get(
  "/training/certificates",
  requireAuth,
  requireCertificateViewScope,
  requireRole(["ROLE_UNIT_HEAD", "ROLE_HR_OFFICER", "ROLE_RECTOR"]),
  validateQuery(CertificateFilterQuerySchema),
  asyncHandler(getAllCertificates)
);

// Phòng TCHC thẩm định chứng chỉ (VERIFIED hoặc REJECTED)
router.put(
  "/training/certificates/:id/verify",
  requireAuth,
  requirePermission("training:verify_certificate"),
  requireRole(["ROLE_HR_OFFICER"]),
  validateBody(VerifyCertificateSchema),
  asyncHandler(verifyCertificate)
);

// ============================================================================
// KHÓA ĐÀO TẠO & BỒI DƯỠNG (TRAINING COURSES)
// ============================================================================

// Tra cứu danh sách khóa bồi dưỡng
router.get(
  "/training/courses",
  requireAuth,
  requirePermission("training:view_courses"),
  asyncHandler(getCourses)
);

// Mở khóa đào tạo mới (Phòng TCHC)
router.post(
  "/training/courses",
  requireAuth,
  requirePermission("training:manage_courses"),
  validateBody(CreateTrainingCourseSchema),
  asyncHandler(createCourse)
);

// CBGV đăng ký tham gia khóa đào tạo
router.post(
  "/training/courses/:id/register",
  requireAuth,
  requirePermission("training:register_course"),
  validateBody(RegisterTrainingCourseSchema),
  asyncHandler(registerCourse)
);

export default router;
