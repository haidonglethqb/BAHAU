import { Router } from "express";
import {
  getEmployees,
  getEmployeeById,
  getMyProfile,
  updateMyContact,
  createEmployee,
} from "../../controllers/employee.controller.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  CreateEmployeeSchema,
  UpdateMyContactSchema,
  EmployeeFilterQuerySchema,
  CreateEmploymentEventSchema,
} from "@bahau/contracts";
import {
  getEmployeeEvents,
  createEmploymentEvent,
} from "../../controllers/employment-event.controller.js";

const router = Router();

router.get(
  "/employees",
  requireAuth,
  requirePermission("employee:read_basic"),
  validateQuery(EmployeeFilterQuerySchema),
  asyncHandler(getEmployees)
);
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
router.get(
  "/employees/:id",
  requireAuth,
  requirePermission("employee:read_basic"),
  asyncHandler(getEmployeeById)
);

router.get(
  "/employees/:id/events",
  requireAuth,
  requirePermission("employee:read_basic"),
  asyncHandler(getEmployeeEvents)
);
router.post(
  "/employees/:id/events",
  requireAuth,
  requireRole("ROLE_HR_OFFICER", "ROLE_RECTOR"),
  requirePermission("employee:update_official"),
  validateBody(CreateEmploymentEventSchema),
  asyncHandler(createEmploymentEvent)
);

export default router;
