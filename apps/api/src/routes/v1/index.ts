import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import unitRoutes from "./unit.routes.js";
import employeeRoutes from "./employee.routes.js";
import leaveRoutes from "./leave.routes.js";
import workflowRoutes from "./workflow.routes.js";

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(unitRoutes);
router.use(employeeRoutes);
router.use(leaveRoutes);
router.use(workflowRoutes);

export default router;
