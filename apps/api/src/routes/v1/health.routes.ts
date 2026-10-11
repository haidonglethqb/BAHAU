import { Router } from "express";
import { HealthController } from "../../controllers/health.controller.js";
import { asyncHandler } from "../../middlewares/async.middleware.js";

const router = Router();

// ============================================================================
// HEALTH PROBES & OBSERVABILITY METRICS ENDPOINTS (Phase 4)
// ============================================================================

// 1. Basic Health Check
router.get("/health", asyncHandler(HealthController.getHealth));

// 2. Kubernetes Liveness Probe
router.get("/health/liveness", asyncHandler(HealthController.getLiveness));

// 3. Kubernetes Readiness Probe
router.get("/health/readiness", asyncHandler(HealthController.getReadiness));

// 4. Prometheus Scraping Endpoint (OpenMetrics standard)
router.get("/metrics", asyncHandler(HealthController.getPrometheusMetrics));

// 5. JSON Metrics Summary
router.get("/metrics/json", asyncHandler(HealthController.getJsonMetrics));

export default router;
