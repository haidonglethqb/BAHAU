import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";
import { WorkerQueue } from "../apps/api/dist/jobs/worker-queue.js";
import { JobScheduler } from "../apps/api/dist/jobs/scheduler.js";
import { registerDefaultJobHandlers } from "../apps/api/dist/jobs/handlers/index.js";
import { OutboxService } from "../apps/api/dist/services/outbox.service.js";
import { DOMAIN_EVENTS } from "@bahau/contracts";

async function runSystemWorkerQueueTests() {
  console.log("================================================================================");
  console.log("  BAHAU System Architecture Test: Asynchronous Worker Queue & Task Dispatcher");
  console.log("  (Priority Scheduling, Concurrency Limit, Progress Tracking, DLQ & NĐ 30 PDF)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4037";

  try {
    const entry = pm.spawn("api-jobs-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 30000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 30s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    const queue = WorkerQueue.getInstance();
    queue.clear();
    registerDefaultJobHandlers(queue);

    // --------------------------------------------------------------------------
    // TEST 1: Authentication enforcement on all Job Management Endpoints (401)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-JOB-01: Authentication enforcement on Job Queue endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/jobs" },
      { method: "GET", path: "/api/v1/jobs/job-test-01" },
      { method: "GET", path: "/api/v1/jobs/stats/summary" },
      { method: "POST", path: "/api/v1/jobs/enqueue", body: { type: "OUTBOX_POLL" } },
      { method: "POST", path: "/api/v1/jobs/job-test-01/cancel" },
      { method: "POST", path: "/api/v1/jobs/job-test-01/retry" },
      { method: "POST", path: "/api/v1/jobs/trigger-outbox-poll" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method, ep.body);
      assert.strictEqual(
        res.status,
        401,
        `${ep.path} must reject unauthenticated request with 401 UNAUTHENTICATED`
      );
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 7/7 Job Queue endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Priority Scheduling (HIGH prioritized over LOW regardless of queue order)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-JOB-02: Priority Scheduling Verification (HIGH > NORMAL > LOW)...");
    queue.clear();
    queue.pause(); // Tạm dừng để enqueue nhiều job và kiểm tra thứ tự thực thi

    const executionOrder = [];
    queue.registerHandler("TEST_PRIORITY_TASK", async (payload) => {
      executionOrder.push(payload.label);
      return { executed: payload.label };
    });

    // Enqueue job LOW trước
    await queue.enqueue({
      type: "TEST_PRIORITY_TASK",
      priority: "LOW",
      payload: { label: "LOW_PRIORITY_JOB" },
    });

    // Enqueue job NORMAL tiếp theo
    await queue.enqueue({
      type: "TEST_PRIORITY_TASK",
      priority: "NORMAL",
      payload: { label: "NORMAL_PRIORITY_JOB" },
    });

    // Enqueue job HIGH sau cùng
    await queue.enqueue({
      type: "TEST_PRIORITY_TASK",
      priority: "HIGH",
      payload: { label: "HIGH_PRIORITY_JOB" },
    });

    // Cấu hình concurrency = 1 để kiểm tra tuần tự thứ tự ưu tiên
    queue.setConcurrency(1);
    queue.resume();

    await queue.drain();

    assert.deepStrictEqual(
      executionOrder,
      ["HIGH_PRIORITY_JOB", "NORMAL_PRIORITY_JOB", "LOW_PRIORITY_JOB"],
      "HIGH priority job must execute first, followed by NORMAL, and lastly LOW"
    );
    console.log("   ✓ Priority Scheduling validated: [HIGH -> NORMAL -> LOW] executed in exact priority order");

    // --------------------------------------------------------------------------
    // TEST 3: Concurrency Limit Enforcement
    // --------------------------------------------------------------------------
    console.log("\n-> TC-JOB-03: Concurrency Limit Enforcement (Max concurrent workers)...");
    queue.clear();
    const MAX_CONCURRENT = 2;
    queue.setConcurrency(MAX_CONCURRENT);

    let currentActiveWorkers = 0;
    let peakConcurrency = 0;

    queue.registerHandler("TEST_CONCURRENT_TASK", async () => {
      currentActiveWorkers++;
      if (currentActiveWorkers > peakConcurrency) {
        peakConcurrency = currentActiveWorkers;
      }
      // Giữ task chạy trong 80ms
      await new Promise((r) => setTimeout(r, 80));
      currentActiveWorkers--;
      return { ok: true };
    });

    // Đẩy 6 tasks đồng thời
    for (let i = 0; i < 6; i++) {
      await queue.enqueue({
        type: "TEST_CONCURRENT_TASK",
        priority: "NORMAL",
        payload: { taskId: i },
      });
    }

    await queue.drain();

    assert.ok(
      peakConcurrency <= MAX_CONCURRENT,
      `Peak concurrency (${peakConcurrency}) must not exceed limit (${MAX_CONCURRENT})`
    );
    assert.strictEqual(currentActiveWorkers, 0, "All workers must finish cleanly");
    console.log(`   ✓ Concurrency limit enforced: Peak active workers = ${peakConcurrency} (Limit = ${MAX_CONCURRENT})`);

    // Phục hồi concurrency chuẩn
    queue.setConcurrency(3);

    // --------------------------------------------------------------------------
    // TEST 4: Real-time Progress Tracking (PAYROLL_BATCH_CALC)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-JOB-04: Real-time Progress Tracking & Aggregated Result (Payroll Batch)...");
    registerDefaultJobHandlers(queue);

    const recordedProgress = [];
    queue.on("job:progress", (job) => {
      if (job.type === "PAYROLL_BATCH_CALC") {
        recordedProgress.push({ progress: job.progress, message: job.statusMessage });
      }
    });

    const payrollJob = await queue.enqueue({
      type: "PAYROLL_BATCH_CALC",
      priority: "HIGH",
      payload: { period: "2026-10" },
    });

    await queue.drain();

    const finalizedJob = queue.getJob(payrollJob.id);
    assert.strictEqual(finalizedJob.status, "COMPLETED");
    assert.strictEqual(finalizedJob.progress, 100);
    assert.ok(recordedProgress.length >= 3, "Must record multiple progress milestones");
    assert.ok(finalizedJob.result.totalFacultyProcessed >= 2);
    assert.ok(finalizedJob.result.totalGrossPay > 0);
    assert.ok(finalizedJob.result.totalNetPay > 0);
    assert.ok(finalizedJob.result.totalSeniorityAllowance > 0);
    assert.strictEqual(finalizedJob.result.status, "FINALIZED");
    console.log(`   ✓ Payroll Batch calculated for ${finalizedJob.result.totalFacultyProcessed} faculty members:`);
    console.log(`     - Total Gross Pay: ${finalizedJob.result.totalGrossPay.toLocaleString("vi-VN")} VNĐ`);
    console.log(`     - Seniority Allowance (NĐ 85): ${finalizedJob.result.totalSeniorityAllowance.toLocaleString("vi-VN")} VNĐ`);

    // --------------------------------------------------------------------------
    // TEST 5: Error Handling, Exponential Retry Backoff & DLQ (FAILED)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-JOB-05: Error Handling, Exponential Retry Backoff & DLQ...");
    let attemptCount = 0;
    queue.registerHandler("TEST_RETRY_TASK", async () => {
      attemptCount++;
      throw new Error(`Flaky service failure on attempt ${attemptCount}`);
    });

    const flakyJob = await queue.enqueue({
      type: "TEST_RETRY_TASK",
      priority: "NORMAL",
      maxAttempts: 2,
    });

    // Chờ cho các lần thử lại hoàn tất
    while (queue.getJob(flakyJob.id)?.status !== "FAILED") {
      await new Promise((r) => setTimeout(r, 100));
    }

    const failedJob = queue.getJob(flakyJob.id);
    assert.strictEqual(failedJob.status, "FAILED", "Job must be marked FAILED after reaching maxAttempts");
    assert.strictEqual(failedJob.attempts, 2);
    assert.ok(failedJob.error.includes("Flaky service failure on attempt 2"));
    console.log(`   ✓ Job moved to Dead-Letter Queue (FAILED after ${failedJob.attempts} attempts)`);

    // Thử lại thủ công
    const retriedJob = queue.retryJob(failedJob.id);
    assert.strictEqual(retriedJob.status, "PENDING");
    assert.strictEqual(retriedJob.error, null);
    console.log("   ✓ Manual retry reset FAILED job back to PENDING successfully");

    // --------------------------------------------------------------------------
    // TEST 6: Background Outbox Poller & Scheduler Integration
    // --------------------------------------------------------------------------
    console.log("\n-> TC-JOB-06: Background Outbox Poller & Scheduler Integration...");
    OutboxService.clearMemoryStore();

    // Tạo một sự kiện Outbox PENDING
    const outboxPending = await OutboxService.createOutboxEvent({
      aggregateType: "BAHAU_SCHEDULER_TEST",
      aggregateId: "sched-test-01",
      eventType: DOMAIN_EVENTS.TENURE_APPOINTED,
      payload: { employeeId: "DAU260001-ID", resolutionNumber: "888/QĐ-ĐHKTĐN" },
      status: "PENDING",
    });

    assert.strictEqual(outboxPending.status, "PENDING");

    // Kích hoạt job OUTBOX_POLL qua scheduler
    const scheduler = JobScheduler.getInstance();
    await scheduler.triggerOutboxPoll(20);

    await queue.drain();

    const checkedOutbox = await OutboxService.getOutboxEventById(outboxPending.id);
    assert.strictEqual(checkedOutbox?.status, "PROCESSED", "Pending Outbox event must be processed by OUTBOX_POLL job");
    console.log("   ✓ Background Outbox Poller automatically picked and processed pending Outbox event");

    // --------------------------------------------------------------------------
    // TEST 7: Decree 30/2020/NĐ-CP Administrative Resolution PDF Generation
    // --------------------------------------------------------------------------
    console.log("\n-> TC-JOB-07: Decree 30/2020/NĐ-CP Administrative Resolution PDF Handler...");
    const pdfJob = await queue.enqueue({
      type: "ND30_DECISION_PDF",
      priority: "HIGH",
      payload: {
        resolutionNumber: "128/QĐ-ĐHKT-2026",
        employeeCode: "DAU260001",
        employeeName: "PGS.TS. Trần Thị Bình",
        positionTitle: "Giáo sư ngành Kiến trúc",
        salaryCoefficient: 7.10,
        signerName: "GS.TS. Hoàng Đức Dũng",
        signerTitle: "Hiệu trưởng",
      },
    });

    await queue.drain();

    const completedPdfJob = queue.getJob(pdfJob.id);
    assert.strictEqual(completedPdfJob.status, "COMPLETED");
    assert.strictEqual(completedPdfJob.result.legalFormStandard, "NGHI_DINH_30_2020_ND_CP");
    assert.ok(completedPdfJob.result.sha256Checksum.length === 64, "Must contain 64-char SHA-256 hash");
    assert.strictEqual(completedPdfJob.result.digitalSignature.algorithm, "RSA-SHA256");
    assert.strictEqual(completedPdfJob.result.digitalSignature.verified, true);
    assert.ok(completedPdfJob.result.simulatedFileSize > 0);
    console.log(`   ✓ NĐ 30/2020/NĐ-CP Administrative Resolution generated:`);
    console.log(`     - Document Number: ${completedPdfJob.result.documentNumber}`);
    console.log(`     - SHA-256 Checksum: ${completedPdfJob.result.sha256Checksum}`);
    console.log(`     - Digital Signature: ${completedPdfJob.result.digitalSignature.signer} (${completedPdfJob.result.digitalSignature.algorithm})`);

    // Kiểm tra Stats Queue
    const stats = queue.getStats();
    assert.ok(stats.total > 0);
    assert.ok(stats.completed >= 3);
    console.log(`   ✓ Queue Stats: ${stats.total} total jobs, ${stats.completed} completed, ${stats.active} active`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 ASYNCHRONOUS WORKER QUEUE TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runSystemWorkerQueueTests().catch((err) => {
  console.error("\n❌ Worker Queue Test Suite Failed:\n", err);
  process.exit(1);
});
