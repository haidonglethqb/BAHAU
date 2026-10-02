import { Router } from "express";
import {
  getMyQuota,
  getSettlement,
  convertWorkload,
} from "../../controllers/workload.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

router.get("/workload/my-quota", requireAuth, asyncHandler(getMyQuota));
router.get("/workload/settlement", requireAuth, asyncHandler(getSettlement));
router.post("/workload/convert", asyncHandler(convertWorkload));

export default router;
