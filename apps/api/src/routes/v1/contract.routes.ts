import { Router } from "express";
import {
  getContracts,
  getContractAlertSummary,
  getContractById,
  createContract,
  renewContract,
} from "../../controllers/contract.controller.js";
import { validateBody, validateQuery } from "../../middlewares/validate.middleware.js";
import { requireAuth, requirePermission, requireRole } from "../../middlewares/auth.middleware.js";
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
  requirePermission("contract:read_own", "contract:read_unit"),
  validateQuery(ContractFilterQuerySchema),
  asyncHandler(getContracts)
);

router.get(
  "/contracts/summary/alerts",
  requireAuth,
  requirePermission("contract:read_unit"),
  asyncHandler(getContractAlertSummary)
);

router.get(
  "/contracts/:id",
  requireAuth,
  requirePermission("contract:read_own", "contract:read_unit"),
  asyncHandler(getContractById)
);

router.post(
  "/contracts",
  requireAuth,
  requireRole("ROLE_HR_OFFICER", "ROLE_RECTOR"),
  requirePermission("contract:create_amend"),
  validateBody(CreateContractSchema),
  asyncHandler(createContract)
);

router.post(
  "/contracts/:id/renew",
  requireAuth,
  requireRole("ROLE_HR_OFFICER", "ROLE_RECTOR"),
  requirePermission("contract:create_amend"),
  validateBody(RenewContractSchema),
  asyncHandler(renewContract)
);

export default router;
