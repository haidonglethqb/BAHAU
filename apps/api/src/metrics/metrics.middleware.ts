import { Request, Response, NextFunction } from "express";
import { MetricsService } from "./metrics.service.js";

/**
 * Chuẩn hóa URL path để tránh cardinality explosion trong Prometheus
 * Ví dụ: /api/v1/jobs/job-172869123-abcd -> /api/v1/jobs/:id
 */
function normalizeRoutePath(originalUrl: string): string {
  const urlWithoutQuery = originalUrl.split("?")[0] || "/";

  return urlWithoutQuery
    .replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ":id"
    )
    .replace(/job-[0-9]+-[0-9a-f]+/gi, ":id")
    .replace(/usr-[a-z0-9-]+/gi, ":id")
    .replace(/DAU[0-9]{6}/gi, ":code")
    .replace(/\/([0-9]+)(\/|$)/g, "/:id$2");
}

export function metricsMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Bỏ qua metrics endpoint để tránh tự đo chính nó
  if (req.path === "/metrics" || req.path === "/api/v1/metrics") {
    return next();
  }

  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const endTime = process.hrtime.bigint();
    const durationSeconds = Number(endTime - startTime) / 1e9;
    const normalizedRoute = normalizeRoutePath(req.baseUrl + req.path);

    MetricsService.getInstance().recordHttpRequest(
      req.method,
      normalizedRoute,
      res.statusCode,
      durationSeconds
    );
  });

  next();
}
