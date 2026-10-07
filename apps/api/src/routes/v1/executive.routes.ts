import { Router } from "express";
import {
  getSalaryIncrements,
  generateResolution,
} from "../../controllers/executive.controller.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { GenerateResolutionInputSchema } from "@bahau/contracts";

const router = Router();

router.get(
  "/executive/salary-increments",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_HR_OFFICER", "ROLE_SYSADMIN"]),
  asyncHandler(getSalaryIncrements)
);
router.post(
  "/executive/generate-resolution",
  requireAuth,
  requireRole(["ROLE_RECTOR", "ROLE_SYSADMIN"]),
  validateBody(GenerateResolutionInputSchema),
  asyncHandler(generateResolution)
);

export default router;
