import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
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

const UuidParamSchema = z.string().uuid("Mã định danh không đúng định dạng UUID");

function validateUuidParam(paramName = "id") {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      UuidParamSchema.parse(req.params[paramName]);
      next();
    } catch (err) {
      next(err);
    }
  };
}

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
router.get("/leave/requests/:id", requireAuth, validateUuidParam("id"), asyncHandler(getLeaveRequestById));
router.post("/leave/requests/:id/cancel", requireAuth, validateUuidParam("id"), asyncHandler(cancelLeaveRequest));

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
router.get("/trips/requests/:id", requireAuth, validateUuidParam("id"), asyncHandler(getTripRequestById));
router.post("/trips/requests/:id/cancel", requireAuth, validateUuidParam("id"), asyncHandler(cancelTripRequest));

export default router;
