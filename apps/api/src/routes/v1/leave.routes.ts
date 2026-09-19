import { Router } from "express";
import {
  createLeaveRequest,
  getMyLeaveRequests,
  getLeaveRequestById,
  cancelLeaveRequest,
  getMyLeaveBalance,
  getMyLeaveLedger,
  createTripRequest,
  getMyTripRequests,
  getTripRequestById,
  cancelTripRequest,
} from "../../controllers/leave.controller.js";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  CreateLeaveRequestSchema,
  CreateTripRequestSchema,
} from "@bahau/contracts";

const router = Router();

// =============================================================================
// LEAVE ROUTES
// =============================================================================
router.post(
  "/leave/requests",
  requireAuth,
  validateBody(CreateLeaveRequestSchema),
  asyncHandler(createLeaveRequest)
);
router.get("/leave/requests/my", requireAuth, asyncHandler(getMyLeaveRequests));
router.get("/leave/requests/:id", requireAuth, asyncHandler(getLeaveRequestById));
router.post("/leave/requests/:id/cancel", requireAuth, asyncHandler(cancelLeaveRequest));

router.get("/leave/balance/my", requireAuth, asyncHandler(getMyLeaveBalance));
router.get("/leave/ledger/my", requireAuth, asyncHandler(getMyLeaveLedger));

// =============================================================================
// BUSINESS TRIP ROUTES
// =============================================================================
router.post(
  "/trips/requests",
  requireAuth,
  validateBody(CreateTripRequestSchema),
  asyncHandler(createTripRequest)
);
router.get("/trips/requests/my", requireAuth, asyncHandler(getMyTripRequests));
router.get("/trips/requests/:id", requireAuth, asyncHandler(getTripRequestById));
router.post("/trips/requests/:id/cancel", requireAuth, asyncHandler(cancelTripRequest));

export default router;
