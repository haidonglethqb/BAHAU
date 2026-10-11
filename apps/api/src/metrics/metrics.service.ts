import type { SystemMetricsSummary } from "@bahau/contracts";

interface HttpDurationBucket {
  le: number;
  count: number;
}

const HISTOGRAM_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

export class MetricsService {
  private static instance: MetricsService;

  // Counters
  private httpRequests: Map<string, number> = new Map(); // key: method|route|status
  private eventsPublished: Map<string, number> = new Map(); // key: type|source
  private totalHttpRequests = 0;
  private totalEventsPublished = 0;

  // Duration stats
  private httpDurationSum: Map<string, number> = new Map(); // key: method|route
  private httpDurationBuckets: Map<string, number[]> = new Map(); // key: method|route, array matching HISTOGRAM_BUCKETS

  // Gauges
  private outboxLag = 0;
  private workerQueueStats = {
    active: 0,
    pending: 0,
    completed: 0,
    failed: 0,
  };

  private constructor() {}

  public static getInstance(): MetricsService {
    if (!MetricsService.instance) {
      MetricsService.instance = new MetricsService();
    }
    return MetricsService.instance;
  }

  /**
   * Ghi nhận HTTP Request
   */
  public recordHttpRequest(
    method: string,
    route: string,
    status: number,
    durationSeconds: number
  ): void {
    this.totalHttpRequests++;
    const key = `${method.toUpperCase()}|${route}|${status}`;
    this.httpRequests.set(key, (this.httpRequests.get(key) || 0) + 1);

    // Histogram
    const routeKey = `${method.toUpperCase()}|${route}`;
    this.httpDurationSum.set(
      routeKey,
      (this.httpDurationSum.get(routeKey) || 0) + durationSeconds
    );

    let buckets = this.httpDurationBuckets.get(routeKey);
    if (!buckets) {
      buckets = new Array(HISTOGRAM_BUCKETS.length).fill(0);
      this.httpDurationBuckets.set(routeKey, buckets);
    }

    for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
      const bucketLe = HISTOGRAM_BUCKETS[i];
      if (bucketLe !== undefined && durationSeconds <= bucketLe) {
        buckets[i] = (buckets[i] || 0) + 1;
      }
    }
  }

  /**
   * Ghi nhận Domain Event được phát đi
   */
  public recordEventPublished(eventType: string, source = "UNKNOWN"): void {
    this.totalEventsPublished++;
    const key = `${eventType}|${source}`;
    this.eventsPublished.set(key, (this.eventsPublished.get(key) || 0) + 1);
  }

  /**
   * Cập nhật số lượng sự kiện Outbox đang chờ xử lý (Outbox Lag)
   */
  public setOutboxLag(count: number): void {
    this.outboxLag = Math.max(0, count);
  }

  /**
   * Cập nhật độ sâu hàng đợi Worker
   */
  public setWorkerQueueDepth(stats: {
    active: number;
    pending: number;
    completed: number;
    failed: number;
  }): void {
    this.workerQueueStats = { ...stats };
  }

  /**
   * Xuất số liệu chuẩn định dạng Prometheus (OpenMetrics)
   */
  public toPrometheusText(): string {
    const lines: string[] = [];
    const now = Date.now();

    // 1. Process Uptime
    lines.push("# HELP process_uptime_seconds The process uptime in seconds.");
    lines.push("# TYPE process_uptime_seconds gauge");
    lines.push(`process_uptime_seconds ${process.uptime().toFixed(3)}`);
    lines.push("");

    // 2. Memory Usage
    const mem = process.memoryUsage();
    lines.push("# HELP nodejs_memory_heap_used_bytes Process heap memory used in bytes.");
    lines.push("# TYPE nodejs_memory_heap_used_bytes gauge");
    lines.push(`nodejs_memory_heap_used_bytes ${mem.heapUsed}`);
    lines.push("# HELP nodejs_memory_rss_bytes Process resident set size in bytes.");
    lines.push("# TYPE nodejs_memory_rss_bytes gauge");
    lines.push(`nodejs_memory_rss_bytes ${mem.rss}`);
    lines.push("");

    // 3. HTTP Requests Total
    lines.push("# HELP bahau_http_requests_total Total number of HTTP requests handled.");
    lines.push("# TYPE bahau_http_requests_total counter");
    for (const [key, count] of this.httpRequests.entries()) {
      const [method, route, status] = key.split("|");
      lines.push(
        `bahau_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`
      );
    }
    lines.push("");

    // 4. HTTP Request Duration Histogram
    lines.push(
      "# HELP bahau_http_request_duration_seconds HTTP request latencies in seconds."
    );
    lines.push("# TYPE bahau_http_request_duration_seconds histogram");
    for (const [routeKey, buckets] of this.httpDurationBuckets.entries()) {
      const [method, route] = routeKey.split("|");
      let cumulative = 0;
      for (let i = 0; i < HISTOGRAM_BUCKETS.length; i++) {
        const bucketLe = HISTOGRAM_BUCKETS[i];
        if (bucketLe !== undefined) {
          cumulative += buckets[i] || 0;
          lines.push(
            `bahau_http_request_duration_seconds_bucket{method="${method}",route="${route}",le="${bucketLe}"} ${cumulative}`
          );
        }
      }
      lines.push(
        `bahau_http_request_duration_seconds_bucket{method="${method}",route="${route}",le="+Inf"} ${this.totalHttpRequests}`
      );
      lines.push(
        `bahau_http_request_duration_seconds_sum{method="${method}",route="${route}"} ${(this.httpDurationSum.get(routeKey) || 0).toFixed(6)}`
      );
      lines.push(
        `bahau_http_request_duration_seconds_count{method="${method}",route="${route}"} ${this.totalHttpRequests}`
      );
    }
    lines.push("");

    // 5. Domain Events Published Total
    lines.push("# HELP bahau_events_published_total Total domain events published.");
    lines.push("# TYPE bahau_events_published_total counter");
    for (const [key, count] of this.eventsPublished.entries()) {
      const [type, source] = key.split("|");
      lines.push(
        `bahau_events_published_total{event_type="${type}",source="${source}"} ${count}`
      );
    }
    lines.push("");

    // 6. Outbox Lag Total
    lines.push(
      "# HELP bahau_outbox_lag_total Number of pending transactional outbox events awaiting dispatch."
    );
    lines.push("# TYPE bahau_outbox_lag_total gauge");
    lines.push(`bahau_outbox_lag_total{status="PENDING"} ${this.outboxLag}`);
    lines.push("");

    // 7. Worker Queue Depth
    lines.push("# HELP bahau_worker_queue_depth Current depth of worker job queue by status.");
    lines.push("# TYPE bahau_worker_queue_depth gauge");
    lines.push(`bahau_worker_queue_depth{status="active"} ${this.workerQueueStats.active}`);
    lines.push(`bahau_worker_queue_depth{status="pending"} ${this.workerQueueStats.pending}`);
    lines.push(`bahau_worker_queue_depth{status="completed"} ${this.workerQueueStats.completed}`);
    lines.push(`bahau_worker_queue_depth{status="failed"} ${this.workerQueueStats.failed}`);
    lines.push("");

    return lines.join("\n");
  }

  /**
   * Xuất JSON summary cho Dashboard
   */
  public getSummary(): SystemMetricsSummary {
    const mem = process.memoryUsage();
    return {
      httpRequestsTotal: this.totalHttpRequests,
      eventsPublishedTotal: this.totalEventsPublished,
      outboxPendingLag: this.outboxLag,
      workerQueue: { ...this.workerQueueStats },
      memoryUsageMb: {
        heapUsed: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
        rss: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
      },
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Reset số liệu (dùng cho unit/integration tests)
   */
  public reset(): void {
    this.httpRequests.clear();
    this.eventsPublished.clear();
    this.httpDurationSum.clear();
    this.httpDurationBuckets.clear();
    this.totalHttpRequests = 0;
    this.totalEventsPublished = 0;
    this.outboxLag = 0;
    this.workerQueueStats = { active: 0, pending: 0, completed: 0, failed: 0 };
  }
}
