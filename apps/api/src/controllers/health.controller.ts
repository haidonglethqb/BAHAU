import { Request, Response } from "express";
import { prisma } from "@bahau/database";
import { MetricsService } from "../metrics/metrics.service.js";
import { DomainEventBus } from "../events/domain-event-bus.js";
import { OutboxService } from "../services/outbox.service.js";
import { WorkerQueue } from "../jobs/worker-queue.js";
import type {
  LivenessProbeResponse,
  ReadinessProbeResponse,
  SubsystemCheck,
} from "@bahau/contracts";

export class HealthController {
  /**
   * GET /api/v1/health
   * Endpoint cơ bản kiểm tra tình trạng API
   */
  public static async getHealth(req: Request, res: Response): Promise<void> {
    let dbStatus = "disconnected";

    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 2000)),
      ]);
      dbStatus = "connected";
    } catch {
      dbStatus = "disconnected";
    }

    const requestId = req.id || "00000000-0000-0000-0000-000000000000";

    res.status(200).json({
      success: true,
      data: {
        status: "ok",
        uptime: process.uptime(),
        version: "1.0.0",
        database: dbStatus,
        traceId: req.traceId,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
      },
    });
  }

  /**
   * GET /api/v1/health/liveness
   * Kubernetes Liveness Probe: Kiểm tra xem tiến trình Node.js còn sống và phản hồi
   */
  public static async getLiveness(_req: Request, res: Response): Promise<void> {
    const data: LivenessProbeResponse = {
      status: "UP",
      uptime: Math.round(process.uptime() * 100) / 100,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
    };

    res.status(200).json({
      success: true,
      data,
    });
  }

  /**
   * GET /api/v1/health/readiness
   * Kubernetes Readiness Probe: Kiểm tra chi tiết 4 phân hệ chính
   * (Database, Event Bus, Outbox Engine, Worker Queue)
   */
  public static async getReadiness(_req: Request, res: Response): Promise<void> {
    const checks: {
      database: SubsystemCheck;
      eventBus: SubsystemCheck;
      outbox: SubsystemCheck;
      workerQueue: SubsystemCheck;
    } = {
      database: { status: "HEALTHY", type: "PRISMA_POSTGRESQL", message: "Kết nối DB khả dụng" },
      eventBus: { status: "HEALTHY", type: "IN_PROCESS_EVENT_BUS", message: "Event Bus hoạt động bình thường" },
      outbox: { status: "HEALTHY", type: "TRANSACTIONAL_OUTBOX", message: "Outbox Engine sẵn sàng" },
      workerQueue: { status: "HEALTHY", type: "WORKER_QUEUE", message: "Hàng đợi tác vụ sẵn sàng" },
    };

    // 1. Kiểm tra Database
    try {
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => setTimeout(() => reject(new Error("DB timeout")), 1500)),
      ]);
    } catch {
      // Zero-Crash Resilience: DB offline nhưng có in-memory fallback
      checks.database = {
        status: "DEGRADED",
        type: "IN_MEMORY_FALLBACK",
        message: "PostgreSQL không phản hồi, đã tự động kích hoạt Zero-Crash In-Memory Fallback",
      };
    }

    // 2. Kiểm tra Event Bus
    try {
      const bus = DomainEventBus.getInstance();
      const subscriberCount = bus.getSubscriberCount();
      checks.eventBus.details = { subscriberCount };
    } catch {
      checks.eventBus.status = "UNHEALTHY";
      checks.eventBus.message = "Domain Event Bus không khả dụng";
    }

    // 3. Kiểm tra Outbox Engine
    try {
      const outboxQuery = await OutboxService.getOutboxEvents({
        status: "PENDING",
        page: 1,
        limit: 1,
      });
      checks.outbox.details = { pendingLag: outboxQuery.total };
      MetricsService.getInstance().setOutboxLag(outboxQuery.total);
    } catch {
      checks.outbox.status = "DEGRADED";
      checks.outbox.message = "Không thể lấy danh sách Outbox, fallback buffer hoạt động";
    }

    // 4. Kiểm tra Worker Queue
    try {
      const queue = WorkerQueue.getInstance();
      const stats = queue.getStats();
      checks.workerQueue.details = stats;
      MetricsService.getInstance().setWorkerQueueDepth(stats);
    } catch {
      checks.workerQueue.status = "UNHEALTHY";
      checks.workerQueue.message = "Worker Queue không khả dụng";
    }

    const isReady =
      checks.eventBus.status !== "UNHEALTHY" &&
      checks.workerQueue.status !== "UNHEALTHY";

    const responseData: ReadinessProbeResponse = {
      status: isReady ? "READY" : "NOT_READY",
      checks,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    res.status(isReady ? 200 : 503).json({
      success: isReady,
      data: responseData,
    });
  }

  /**
   * GET /api/v1/metrics
   * Prometheus Scraping Endpoint chuẩn OpenMetrics
   */
  public static async getPrometheusMetrics(_req: Request, res: Response): Promise<void> {
    // Cập nhật các gauges trước khi scrape
    try {
      const outboxQuery = await OutboxService.getOutboxEvents({
        status: "PENDING",
        page: 1,
        limit: 1,
      });
      MetricsService.getInstance().setOutboxLag(outboxQuery.total);
    } catch {
      // Ignored for resilient metrics
    }

    try {
      const stats = WorkerQueue.getInstance().getStats();
      MetricsService.getInstance().setWorkerQueueDepth(stats);
    } catch {
      // Ignored
    }

    const metricsText = MetricsService.getInstance().toPrometheusText();

    res.setHeader("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
    res.status(200).send(metricsText);
  }

  /**
   * GET /api/v1/metrics/json
   * JSON Summary của Metrics dành cho Frontend / API
   */
  public static async getJsonMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const outboxQuery = await OutboxService.getOutboxEvents({
        status: "PENDING",
        page: 1,
        limit: 1,
      });
      MetricsService.getInstance().setOutboxLag(outboxQuery.total);
    } catch {
      // Ignored
    }

    try {
      const stats = WorkerQueue.getInstance().getStats();
      MetricsService.getInstance().setWorkerQueueDepth(stats);
    } catch {
      // Ignored
    }

    const summary = MetricsService.getInstance().getSummary();

    res.status(200).json({
      success: true,
      data: summary,
    });
  }
}

// Giữ lại export getHealth tương thích ngược
export const getHealth = HealthController.getHealth;
