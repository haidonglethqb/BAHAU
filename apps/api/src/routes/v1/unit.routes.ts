import { Router } from "express";
import {
  getUnitTree,
  getAllUnits,
  createUnit,
  updateUnit,
  deleteUnit,
} from "../../controllers/unit.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission, requireRole } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { CreateUnitSchema, UpdateUnitSchema } from "@bahau/contracts";

const router = Router();

router.get("/units/tree", requireAuth, requirePermission("unit:read_tree"), asyncHandler(getUnitTree));
router.get("/units", requireAuth, requirePermission("unit:read_tree"), asyncHandler(getAllUnits));
router.post(
  "/units",
  requireAuth,
  requireRole("ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"),
  requirePermission("unit:manage_structure"),
  validateBody(CreateUnitSchema),
  asyncHandler(createUnit)
);
router.put(
  "/units/:id",
  requireAuth,
  requireRole("ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"),
  requirePermission("unit:manage_structure"),
  validateBody(UpdateUnitSchema),
  asyncHandler(updateUnit)
);
router.delete(
  "/units/:id",
  requireAuth,
  requireRole("ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"),
  requirePermission("unit:manage_structure"),
  asyncHandler(deleteUnit)
);

export default router;
