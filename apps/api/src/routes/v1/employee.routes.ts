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
  CreateEmploymentEventSchema,
} from "@bahau/contracts";
import {
  getEmployeeEvents,
  createEmploymentEvent,
} from "../../controllers/employment-event.controller.js";

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

router.get("/employees/:id/events", requireAuth, asyncHandler(getEmployeeEvents));
router.post(
  "/employees/:id/events",
  requireAuth,
  requirePermission("employee:update_official"),
  validateBody(CreateEmploymentEventSchema),
  asyncHandler(createEmploymentEvent)
);

export default router;
