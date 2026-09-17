import { Router } from "express";
import { getUnitTree, getAllUnits, createUnit } from "../../controllers/unit.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { CreateUnitSchema } from "@bahau/contracts";

const router = Router();

router.get("/units/tree", asyncHandler(getUnitTree));
router.get("/units", asyncHandler(getAllUnits));
router.post(
  "/units",
  requireAuth,
  requirePermission("unit:manage_structure"),
  validateBody(CreateUnitSchema),
  asyncHandler(createUnit)
);

export default router;
