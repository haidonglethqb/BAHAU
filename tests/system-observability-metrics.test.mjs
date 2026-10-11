import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";
import { MetricsService } from "../apps/api/dist/metrics/metrics.service.js";
import { DomainEventBus } from "../apps/api/dist/events/domain-event-bus.js";
import { OutboxService } from "../apps/api/dist/services/outbox.service.js";
import { WorkerQueue } from "../apps/api/dist/jobs/worker-queue.js";
import { DOMAIN_EVENTS } from "@bahau/contracts";

async function runSystemObservabilityMetricsTests() {
  console.log("================================================================================");
  console.log("  BAHAU System Architecture Test: Observability, Prometheus & Health Probes");
  console.log("  (Prometheus Metrics, K8s Liveness/Readiness Probes & Distributed Tracing)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4038";

  try {
    const entry = pm.spawn("api-obs-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 30000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 30s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: Prometheus Metrics Scraping Format (OpenMetrics standard)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBS-01: Prometheus Metrics Scraping format (/metrics & /api/v1/metrics)...");
    
    // Scrape root /metrics
    const rootMetrics = await httpRequest(`http://127.0.0.1:${testPort}/metrics`, "GET");
    assert.strictEqual(rootMetrics.status, 200, "Root /metrics must respond 200 OK");
    assert.ok(
      rootMetrics.headers["content-type"]?.includes("text/plain"),
      "Metrics endpoint must return text/plain content-type"
    );
    assert.ok(rootMetrics.bodyText.includes("# HELP process_uptime_seconds"));
    assert.ok(rootMetrics.bodyText.includes("# TYPE process_uptime_seconds gauge"));
    assert.ok(rootMetrics.bodyText.includes("# HELP nodejs_memory_heap_used_bytes"));

    // Scrape /api/v1/metrics
    const v1Metrics = await httpRequest(`http://127.0.0.1:${testPort}/api/v1/metrics`, "GET");
    assert.strictEqual(v1Metrics.status, 200);
    assert.ok(v1Metrics.bodyText.includes("process_uptime_seconds"));

    console.log("   ✓ Verified Prometheus text output adheres to OpenMetrics standard format");

    // --------------------------------------------------------------------------
    // TEST 2: HTTP Request Counter & Duration Histogram Tracking
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBS-02: HTTP Request Counter & Duration Histogram tracking...");
    
    // Make 3 requests with different status codes
    await httpRequest(`http://127.0.0.1:${testPort}/api/v1/health`, "GET"); // 200 OK
    await httpRequest(`http://127.0.0.1:${testPort}/api/v1/jobs`, "GET"); // 401 UNAUTHENTICATED
    await httpRequest(`http://127.0.0.1:${testPort}/api/v1/non-existent-route-xyz`, "GET"); // 404 NOT FOUND

    // Allow metrics middleware finish callbacks to flush
    await new Promise((r) => setTimeout(r, 100));

    const metricsAfterHttp = await httpRequest(`http://127.0.0.1:${testPort}/metrics`, "GET");
    const metricsBody = metricsAfterHttp.bodyText;

    assert.ok(
      metricsBody.includes('bahau_http_requests_total{method="GET",route="/api/v1/health",status="200"}'),
      "Must record 200 OK health request"
    );
    assert.ok(
      metricsBody.includes('bahau_http_requests_total{method="GET",route="/api/v1/jobs",status="401"}'),
      "Must record 401 UNAUTHENTICATED request"
    );
    assert.ok(
      metricsBody.includes('bahau_http_requests_total{method="GET",route="/api/v1/non-existent-route-xyz",status="404"}'),
      "Must record 404 NOT FOUND request"
    );
    assert.ok(
      metricsBody.includes("bahau_http_request_duration_seconds_bucket"),
      "Must generate histogram latency buckets"
    );
    assert.ok(
      metricsBody.includes("bahau_http_request_duration_seconds_count"),
      "Must generate histogram request count"
    );

    console.log("   ✓ Verified HTTP metrics accurately track request status codes, routes & latency buckets");

    // --------------------------------------------------------------------------
    // TEST 3: Domain Event Throughput & Outbox Lag Metric Gauges
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBS-03: Domain Event Throughput & Outbox Lag Metric gauges...");
    const localMetrics = MetricsService.getInstance();
    localMetrics.reset();

    // Ghi nhận sự kiện qua MetricsService
    localMetrics.recordEventPublished(DOMAIN_EVENTS.TENURE_APPOINTED, "BAHAU_OBS_TEST");
    localMetrics.recordEventPublished(DOMAIN_EVENTS.CANDIDATE_APPOINTED, "BAHAU_OBS_TEST");
    localMetrics.setOutboxLag(3);

    const promText = localMetrics.toPrometheusText();
    assert.ok(
      promText.includes(`bahau_events_published_total{event_type="${DOMAIN_EVENTS.TENURE_APPOINTED}",source="BAHAU_OBS_TEST"} 1`),
      "Must record published domain event in Prometheus counter"
    );
    assert.ok(
      promText.includes(`bahau_events_published_total{event_type="${DOMAIN_EVENTS.CANDIDATE_APPOINTED}",source="BAHAU_OBS_TEST"} 1`),
      "Must record candidate appointment event"
    );
    assert.ok(
      promText.includes('bahau_outbox_lag_total{status="PENDING"} 3'),
      "Outbox lag gauge must accurately reflect 3 pending events"
    );

    console.log("   ✓ Verified Event Bus throughput counter & Outbox Lag gauge reflection");

    // --------------------------------------------------------------------------
    // TEST 4: Worker Queue Depth Metric Gauges & JSON Summary API
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBS-04: Worker Queue Depth Metric gauges & JSON Summary API...");
    localMetrics.setWorkerQueueDepth({
      active: 1,
      pending: 4,
      completed: 12,
      failed: 0,
    });

    const summary = localMetrics.getSummary();
    assert.strictEqual(summary.workerQueue.pending, 4);
    assert.strictEqual(summary.workerQueue.active, 1);
    assert.strictEqual(summary.workerQueue.completed, 12);
    assert.ok(summary.uptimeSeconds >= 0);
    assert.ok(summary.memoryUsageMb.heapUsed > 0);

    const promQueueText = localMetrics.toPrometheusText();
    assert.ok(promQueueText.includes('bahau_worker_queue_depth{status="pending"} 4'));
    assert.ok(promQueueText.includes('bahau_worker_queue_depth{status="active"} 1'));
    assert.ok(promQueueText.includes('bahau_worker_queue_depth{status="completed"} 12'));

    // Check JSON metrics endpoint from server
    const jsonMetricsRes = await httpRequest(`http://127.0.0.1:${testPort}/api/v1/metrics/json`, "GET");
    assert.strictEqual(jsonMetricsRes.status, 200);
    assert.ok(jsonMetricsRes.bodyJson?.data?.uptimeSeconds >= 0);
    assert.ok(typeof jsonMetricsRes.bodyJson?.data?.httpRequestsTotal === "number");

    console.log("   ✓ Verified Worker Queue Depth metrics across Prometheus & JSON APIs");

    // --------------------------------------------------------------------------
    // TEST 5: Kubernetes Liveness Probe (/api/v1/health/liveness)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBS-05: Kubernetes Liveness Probe (/api/v1/health/liveness)...");
    const livenessRes = await httpRequest(`http://127.0.0.1:${testPort}/api/v1/health/liveness`, "GET");
    assert.strictEqual(livenessRes.status, 200, "Liveness probe must return 200 OK");
    assert.strictEqual(livenessRes.bodyJson?.data?.status, "UP");
    assert.ok(typeof livenessRes.bodyJson?.data?.uptime === "number");
    assert.ok(livenessRes.bodyJson?.data?.timestamp);
    console.log(`   ✓ Liveness Probe verified: Status = UP (Uptime: ${livenessRes.bodyJson?.data?.uptime}s)`);

    // --------------------------------------------------------------------------
    // TEST 6: Kubernetes Readiness Probe (/api/v1/health/readiness)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBS-06: Kubernetes Readiness Probe (/api/v1/health/readiness)...");
    const readinessRes = await httpRequest(`http://127.0.0.1:${testPort}/api/v1/health/readiness`, "GET");
    assert.strictEqual(readinessRes.status, 200, "Readiness probe must return 200 OK");
    assert.strictEqual(readinessRes.bodyJson?.data?.status, "READY");

    const checks = readinessRes.bodyJson?.data?.checks;
    assert.ok(checks, "Must include subsystem checks");
    assert.ok(checks.database, "Must verify database / fallback status");
    assert.ok(checks.eventBus.status === "HEALTHY", "Event Bus must be HEALTHY");
    assert.ok(checks.eventBus.details.subscriberCount > 0, "Subscribers must be active");
    assert.ok(checks.outbox, "Outbox check must be present");
    assert.ok(checks.workerQueue.status === "HEALTHY", "Worker Queue must be HEALTHY");

    console.log("   ✓ Readiness Probe verified: Status = READY with 4/4 subsystems validated:");
    console.log(`     - Database: ${checks.database.status} (${checks.database.type})`);
    console.log(`     - Event Bus: ${checks.eventBus.status} (${checks.eventBus.details.subscriberCount} subscribers)`);
    console.log(`     - Outbox: ${checks.outbox.status}`);
    console.log(`     - Worker Queue: ${checks.workerQueue.status}`);

    // --------------------------------------------------------------------------
    // TEST 7: Correlation ID & End-to-End Distributed Tracing (X-Trace-Id)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBS-07: Correlation ID & End-to-End Distributed Tracing (X-Trace-Id)...");
    
    // Case A: Custom incoming X-Trace-Id header
    const customTraceId = "trace-e2e-dau-2026-xyz";
    const customRes = await httpRequest(
      `http://127.0.0.1:${testPort}/api/v1/health`,
      "GET",
      { "X-Trace-Id": customTraceId }
    );
    assert.strictEqual(customRes.status, 200);
    assert.strictEqual(
      customRes.headers["x-trace-id"],
      customTraceId,
      "Response must propagate exact incoming X-Trace-Id header"
    );
    assert.strictEqual(
      customRes.bodyJson?.data?.traceId,
      customTraceId,
      "Response payload must contain matching traceId"
    );

    // Case B: Auto-generated X-Trace-Id when client provides none
    const autoRes = await httpRequest(`http://127.0.0.1:${testPort}/api/v1/health`, "GET");
    assert.strictEqual(autoRes.status, 200);
    const generatedTrace = autoRes.headers["x-trace-id"];
    assert.ok(generatedTrace, "Response must include auto-generated X-Trace-Id header");
    assert.ok(generatedTrace.startsWith("trace-"), "Auto-generated trace ID must start with 'trace-'");
    assert.strictEqual(autoRes.bodyJson?.data?.traceId, generatedTrace);

    console.log(`   ✓ Distributed Tracing verified:`);
    console.log(`     - Propagated incoming trace: ${customTraceId}`);
    console.log(`     - Auto-generated trace: ${generatedTrace}`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 SYSTEM OBSERVABILITY & METRICS TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runSystemObservabilityMetricsTests().catch((err) => {
  console.error("\n❌ Observability & Metrics Test Suite Failed:\n", err);
  process.exit(1);
});
