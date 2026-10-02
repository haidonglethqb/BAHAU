import { Router } from "express";
import {
  getSalaryIncrements,
  generateResolution,
} from "../../controllers/executive.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

router.get("/executive/salary-increments", requireAuth, asyncHandler(getSalaryIncrements));
router.post("/executive/generate-resolution", requireAuth, asyncHandler(generateResolution));

export default router;
