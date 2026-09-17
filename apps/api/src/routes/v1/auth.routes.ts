import { Router } from "express";
import { login, logout, getMe } from "../../controllers/auth.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { LoginRequestSchema } from "@bahau/contracts";

const router = Router();

router.post("/auth/login", validateBody(LoginRequestSchema), asyncHandler(login));
router.post("/auth/logout", asyncHandler(logout));
router.get("/auth/me", requireAuth, asyncHandler(getMe));

export default router;
