import { Router } from "express";
import {
  getMyQuota,
  getSettlement,
  convertWorkload,
} from "../../controllers/workload.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { ConvertWorkloadInputSchema } from "@bahau/contracts";

const router = Router();

router.get("/workload/my-quota", requireAuth, asyncHandler(getMyQuota));
router.get("/workload/settlement", requireAuth, asyncHandler(getSettlement));
router.post(
  "/workload/convert",
  validateBody(ConvertWorkloadInputSchema),
  asyncHandler(convertWorkload)
);

export default router;
