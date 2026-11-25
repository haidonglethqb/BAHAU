import { Router } from "express";
import { TestAiConnectionInputSchema, UpdateAiConfigInputSchema } from "@bahau/contracts";
import { AdminAiConfigController } from "../../controllers/admin-ai-config.controller.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";
import { requireAuth, requireRole } from "../../middlewares/auth.middleware.js";
import { validateBody } from "../../middlewares/validate.middleware.js";

const router = Router();

// ============================================================================
// ADMIN AI CONFIGURATION & CONVERSATION LOGS
// ============================================================================

router.get(
  "/admin/ai-config",
  requireAuth,
  requireRole("ROLE_SYSADMIN"),
  asyncHandler(AdminAiConfigController.getConfig)
);

router.put(
  "/admin/ai-config",
  requireAuth,
  requireRole("ROLE_SYSADMIN"),
  validateBody(UpdateAiConfigInputSchema),
  asyncHandler(AdminAiConfigController.updateConfig)
);

router.post(
  "/admin/ai-config/test",
  requireAuth,
  requireRole("ROLE_SYSADMIN"),
  validateBody(TestAiConnectionInputSchema),
  asyncHandler(AdminAiConfigController.testConnection)
);

router.get(
  "/admin/ai-config/logs",
  requireAuth,
  requireRole("ROLE_SYSADMIN", "ROLE_HR_OFFICER"),
  asyncHandler(AdminAiConfigController.getLogs)
);

router.post(
  "/admin/ai-config/sessions/:id/reply",
  requireAuth,
  requireRole("ROLE_SYSADMIN", "ROLE_HR_OFFICER"),
  asyncHandler(AdminAiConfigController.replyToSession)
);

router.delete(
  "/admin/ai-config/logs",
  requireAuth,
  requireRole("ROLE_SYSADMIN"),
  asyncHandler(AdminAiConfigController.clearLogs)
);

router.delete(
  "/admin/ai-config/sessions/:id",
  requireAuth,
  requireRole("ROLE_SYSADMIN"),
  asyncHandler(AdminAiConfigController.deleteSession)
);

export default router;
