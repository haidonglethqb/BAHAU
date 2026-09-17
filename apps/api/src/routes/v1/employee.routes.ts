import { Router } from "express";
import {
  getEmployees,
  getEmployeeById,
  getMyProfile,
  updateMyContact,
  createEmployee,
} from "../../controllers/employee.controller.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  CreateEmployeeSchema,
  UpdateMyContactSchema,
  EmployeeFilterQuerySchema,
} from "@bahau/contracts";

const router = Router();

router.get("/employees", requireAuth, validateQuery(EmployeeFilterQuerySchema), asyncHandler(getEmployees));
router.post(
  "/employees",
  requireAuth,
  requirePermission("employee:create"),
  validateBody(CreateEmployeeSchema),
  asyncHandler(createEmployee)
);
router.get("/employees/me", requireAuth, asyncHandler(getMyProfile));
router.put(
  "/employees/me/contact",
  requireAuth,
  validateBody(UpdateMyContactSchema),
  asyncHandler(updateMyContact)
);
router.get("/employees/:id", requireAuth, asyncHandler(getEmployeeById));

export default router;
