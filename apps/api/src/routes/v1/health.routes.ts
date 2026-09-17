import { Router } from "express";
import { getHealth } from "../../controllers/health.controller.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

router.get("/health", asyncHandler(getHealth));

export default router;
