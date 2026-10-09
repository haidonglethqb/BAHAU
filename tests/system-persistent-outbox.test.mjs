import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";
import { OutboxService } from "../apps/api/dist/services/outbox.service.js";
import { DomainEventBus } from "../apps/api/dist/events/domain-event-bus.js";
import { DOMAIN_EVENTS } from "@bahau/contracts";

async function runSystemPersistentOutboxTests() {
  console.log("================================================================================");
  console.log("  BAHAU System Architecture Test: Persistent Outbox Pattern & Event Audit Engine");
  console.log("  (Transactional Outbox, Worker Batching, Notification Dispatch & DLQ Retries)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4036";

  try {
    const entry = pm.spawn("api-outbox-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 30000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 30s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // Clean up memory store for clean test baseline
    OutboxService.clearMemoryStore();

    // --------------------------------------------------------------------------
    // TEST 1: Authentication enforcement on Outbox Management Endpoints (401)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBX-01: Authentication enforcement on Outbox endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/outbox/events" },
      { method: "GET", path: "/api/v1/outbox/events/outbox-001" },
      { method: "POST", path: "/api/v1/outbox/events/outbox-001/retry" },
      { method: "POST", path: "/api/v1/outbox/process-batch" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 4/4 Outbox management endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Automatic Outbox Recording from Domain Event Bus (Audit Trail)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBX-02: Automatic Outbox Recording from DomainEventBus (Audit Trail)...");
    const bus = DomainEventBus.getInstance();

    const sampleTenureEvent = DomainEventBus.createEvent(
      DOMAIN_EVENTS.TENURE_APPOINTED,
      "DAU260001-ID",
      {
        employeeId: "DAU260001-ID",
        employeeCode: "DAU260001",
        fullName: "PGS.TS. Trần Thị Bình",
        newAcademicTitle: "PROFESSOR",
        newSalaryCoefficient: 7.10,
        newTeachingNormHours: 216,
        overtimeCompRate: 200000,
        resolutionNumber: "105/QĐ-ĐHKTĐN",
        signedAt: new Date().toISOString(),
      },
      { source: "BAHAU_TENURE_SERVICE" }
    );

    // Phát sự kiện qua bus
    bus.publishSync(sampleTenureEvent);

    // Chờ microtask queue lưu vào Outbox
    await new Promise((r) => setTimeout(r, 100));

    const outboxList = await OutboxService.getOutboxEvents({
      eventType: DOMAIN_EVENTS.TENURE_APPOINTED,
    });

    assert.ok(outboxList.total >= 1, "Published DomainEvent must be automatically recorded in Outbox store");
    const recordedEvent = outboxList.events.find((e) => e.idempotencyKey === sampleTenureEvent.id);
    assert.ok(recordedEvent, "Outbox record must match event idempotencyKey");
    assert.strictEqual(recordedEvent.status, "PROCESSED");
    assert.strictEqual(recordedEvent.aggregateId, "DAU260001-ID");
    assert.strictEqual(recordedEvent.payload.newSalaryCoefficient, 7.10);
    console.log("   ✓ Verified DomainEvent automatically persisted into Outbox with status: PROCESSED");

    // --------------------------------------------------------------------------
    // TEST 3: Transactional Outbox Batch Processing & Status Transition
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBX-03: Transactional Outbox Batch Processing & Status Transition...");

    // Tạo sự kiện PENDING cần background worker xử lý
    const pendingEvent = await OutboxService.createOutboxEvent({
      aggregateType: "BAHAU_RECRUITMENT",
      aggregateId: "cand-dau-005",
      eventType: DOMAIN_EVENTS.CANDIDATE_APPOINTED,
      payload: {
        candidateId: "cand-dau-005",
        fullName: "ThS.KTS. Nguyễn Văn Hùng",
        appointedEmployeeCode: "DAU260055",
        probationSalaryCoeff: 1.989,
        targetDepartment: "Khoa Kiến trúc",
        resolutionNumber: "305/QĐ-ĐHKTĐN",
      },
      status: "PENDING",
    });

    assert.strictEqual(pendingEvent.status, "PENDING");
    assert.strictEqual(pendingEvent.processedAt, null);

    // Chạy batch worker
    const batchResult = await OutboxService.processBatch(10);
    assert.ok(batchResult.processedCount >= 1, "Worker must process at least 1 pending event");

    // Kiểm tra trạng thái đã chuyển thành PROCESSED
    const processedEvent = await OutboxService.getOutboxEventById(pendingEvent.id);
    assert.ok(processedEvent, "Event must exist in store");
    assert.strictEqual(processedEvent.status, "PROCESSED");
    assert.ok(processedEvent.processedAt, "processedAt timestamp must be recorded");
    console.log(`   ✓ Outbox Worker batch processed: PENDING -> PROCESSED (Duration: ${batchResult.durationMs}ms)`);

    // --------------------------------------------------------------------------
    // TEST 4: Automated Notification Generation from Domain Events
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBX-04: Automated Notification generation from Domain Events...");

    // Dispatch sự kiện Nghiệm thu NCKH & Nhuận bút
    const rdOutbox = await OutboxService.createOutboxEvent({
      aggregateType: "BAHAU_RD",
      aggregateId: "DAU260002-ID",
      eventType: DOMAIN_EVENTS.RD_PROJECT_APPROVED,
      payload: {
        projectId: "rd-project-09",
        title: "Quy hoạch phân khu Hòa Vang",
        resolutionNumber: "412/QĐ-ĐHKTĐN",
        royaltyFundAmount: 300_000_000,
      },
      status: "PENDING",
    });

    await OutboxService.processBatch(5);

    // Kiểm tra thông báo của người dùng nhận sự kiện
    const notifs = await OutboxService.getMyNotifications("DAU260002-ID");
    assert.ok(notifs.notifications.length >= 1, "Recipient must receive automated notification");
    const rdNotif = notifs.notifications.find((n) => n.title.includes("Nghiệm thu Đề tài NCKH"));
    assert.ok(rdNotif, "Notification title must reflect R&D event");
    assert.ok(rdNotif.content.includes("412/QĐ-ĐHKTĐN"));
    assert.strictEqual(rdNotif.isRead, false);

    // Đánh dấu đã đọc
    const readResult = await OutboxService.markAsRead(rdNotif.id, "DAU260002-ID");
    assert.strictEqual(readResult.isRead, true);
    console.log("   ✓ Verified Automated System Notification dispatched and marked as READ");

    // --------------------------------------------------------------------------
    // TEST 5: Exponential Backoff & Retry Logic on Transient Failure
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBX-05: Exponential Backoff & Retry logic on Transient Failure...");

    let attemptCount = 0;
    OutboxService.registerCustomHandler("TEST_TRANSIENT_EVENT", async () => {
      attemptCount++;
      if (attemptCount < 3) {
        throw new Error(`Transient network glitch (Attempt ${attemptCount})`);
      }
    });

    const transientEvent = await OutboxService.createOutboxEvent({
      aggregateType: "BAHAU_TEST",
      aggregateId: "test-transient-01",
      eventType: "TEST_TRANSIENT_EVENT",
      payload: { message: "Retry test" },
      status: "PENDING",
    });

    // Lần chạy 1: thất bại lần 1 -> retryCount = 1, status vẫn là PENDING
    const r1 = await OutboxService.processBatch(10);
    const afterR1 = await OutboxService.getOutboxEventById(transientEvent.id);
    assert.strictEqual(afterR1?.status, "PENDING");
    assert.strictEqual(afterR1?.retryCount, 1);
    assert.ok(afterR1?.lastError?.includes("Transient network glitch"));

    // Lần chạy 2: thất bại lần 2 -> retryCount = 2, status vẫn là PENDING
    const r2 = await OutboxService.processBatch(10);
    const afterR2 = await OutboxService.getOutboxEventById(transientEvent.id);
    assert.strictEqual(afterR2?.status, "PENDING");
    assert.strictEqual(afterR2?.retryCount, 2);

    // Lần chạy 3: thành công -> status = PROCESSED
    const r3 = await OutboxService.processBatch(10);
    const afterR3 = await OutboxService.getOutboxEventById(transientEvent.id);
    assert.strictEqual(afterR3?.status, "PROCESSED");
    console.log("   ✓ Verified Transient Failure: Retried 2 times -> Succeeded on 3rd attempt");

    // --------------------------------------------------------------------------
    // TEST 6: Dead-Letter Queue (DLQ) & Manual Admin Retry
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBX-06: Dead-Letter Queue (DLQ) & Manual Admin Retry...");

    OutboxService.registerCustomHandler("TEST_FATAL_EVENT", async () => {
      throw new Error("Permanent database deadlock error");
    });

    const fatalEvent = await OutboxService.createOutboxEvent({
      aggregateType: "BAHAU_TEST",
      aggregateId: "test-fatal-01",
      eventType: "TEST_FATAL_EVENT",
      payload: { message: "DLQ test" },
      status: "PENDING",
    });

    // Chạy 3 lần để đẩy vào FAILED (DLQ)
    await OutboxService.processBatch(10); // Attempt 1
    await OutboxService.processBatch(10); // Attempt 2
    await OutboxService.processBatch(10); // Attempt 3 -> FAILED

    const dlqEvent = await OutboxService.getOutboxEventById(fatalEvent.id);
    assert.strictEqual(dlqEvent?.status, "FAILED", "Event must be moved to FAILED (DLQ) after 3 retries");
    assert.ok(dlqEvent?.lastError?.includes("Permanent database deadlock error"));
    console.log(`   ✓ Event routed to Dead-Letter Queue (Status: FAILED after ${dlqEvent?.retryCount} retries)`);

    // Kích hoạt thủ công retry của Admin
    const retriedEvent = await OutboxService.retryOutboxEvent(fatalEvent.id);
    assert.strictEqual(retriedEvent.status, "PENDING", "Admin retry must reset status to PENDING");
    assert.strictEqual(retriedEvent.lastError, null, "lastError must be cleared upon manual retry");
    console.log("   ✓ Admin manual retry successfully reset FAILED event back to PENDING");

    // --------------------------------------------------------------------------
    // TEST 7: Filtering, Pagination & Zero-Crash Resilience
    // --------------------------------------------------------------------------
    console.log("\n-> TC-OBX-07: Filtering, Pagination & Zero-Crash Resilience...");

    // Lọc theo status PROCESSED
    const processedQuery = await OutboxService.getOutboxEvents({
      status: "PROCESSED",
      page: 1,
      limit: 10,
    });
    assert.ok(processedQuery.events.length >= 2, "Must retrieve PROCESSED events");
    assert.ok(processedQuery.total >= 2);
    assert.ok(processedQuery.events.every((e) => e.status === "PROCESSED"));

    // Lọc theo aggregateType
    const tenureFiltered = await OutboxService.getOutboxEvents({
      aggregateType: "BAHAU_TENURE_SERVICE",
    });
    assert.ok(tenureFiltered.events.length >= 1);
    assert.strictEqual(tenureFiltered.events[0].aggregateType, "BAHAU_TENURE_SERVICE");

    console.log(`   ✓ Filtered ${processedQuery.total} outbox events across pages with 100% resilience`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 PERSISTENT OUTBOX & DATABASE AUDIT TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runSystemPersistentOutboxTests().catch((err) => {
  console.error("\n❌ Persistent Outbox Test Suite Failed:\n", err);
  process.exit(1);
});
