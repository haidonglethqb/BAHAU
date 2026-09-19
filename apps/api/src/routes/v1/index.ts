import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import unitRoutes from "./unit.routes.js";
import employeeRoutes from "./employee.routes.js";
import leaveRoutes from "./leave.routes.js";
import workflowRoutes from "./workflow.routes.js";
import contractRoutes from "./contract.routes.js";
import attendanceRoutes from "./attendance.routes.js";
import kpiRoutes from "./kpi.routes.js";
import trainingRoutes from "./training.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import notificationRoutes from "./notification.routes.js";
import aiRoutes from "./ai.routes.js";

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(unitRoutes);
router.use(employeeRoutes);
router.use(leaveRoutes);
router.use(workflowRoutes);
router.use(contractRoutes);
router.use(attendanceRoutes);
router.use(kpiRoutes);
router.use(trainingRoutes);
router.use(dashboardRoutes);
router.use(notificationRoutes);
router.use(aiRoutes);

export default router;
