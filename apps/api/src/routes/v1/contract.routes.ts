import { Router } from "express";
import {
  getContracts,
  getContractAlertSummary,
  getContractById,
  createContract,
  renewContract,
} from "../../controllers/contract.controller.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission } from "../../middlewares/auth.middleware.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import {
  CreateContractSchema,
  RenewContractSchema,
  ContractFilterQuerySchema,
} from "@bahau/contracts";

const router = Router();

router.get(
  "/contracts",
  requireAuth,
  validateQuery(ContractFilterQuerySchema),
  asyncHandler(getContracts)
);

router.get(
  "/contracts/summary/alerts",
  requireAuth,
  asyncHandler(getContractAlertSummary)
);

router.get(
  "/contracts/:id",
  requireAuth,
  asyncHandler(getContractById)
);

router.post(
  "/contracts",
  requireAuth,
  requirePermission("contract:create_amend"),
  validateBody(CreateContractSchema),
  asyncHandler(createContract)
);

router.post(
  "/contracts/:id/renew",
  requireAuth,
  requirePermission("contract:create_amend"),
  validateBody(RenewContractSchema),
  asyncHandler(renewContract)
);

export default router;
