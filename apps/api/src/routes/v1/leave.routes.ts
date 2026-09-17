import { Router } from "express";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getMyLeaveBalance,
  createTripRequest,
  getMyTripRequests,
} from "../../controllers/leave.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  CreateLeaveRequestSchema,
  CreateTripRequestSchema,
} from "@bahau/contracts";

const router = Router();

router.post("/leave/requests", requireAuth, validateBody(CreateLeaveRequestSchema), asyncHandler(createLeaveRequest));
router.get("/leave/requests/my", requireAuth, asyncHandler(getMyLeaveRequests));
router.get("/leave/balance/my", requireAuth, asyncHandler(getMyLeaveBalance));

router.post("/trips/requests", requireAuth, validateBody(CreateTripRequestSchema), asyncHandler(createTripRequest));
router.get("/trips/requests/my", requireAuth, asyncHandler(getMyTripRequests));

export default router;
