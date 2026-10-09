import assert from "node:assert/strict";
import { DomainEventBus } from "../apps/api/dist/events/domain-event-bus.js";
import { DOMAIN_EVENTS } from "@bahau/contracts";
import { TenureService } from "../apps/api/dist/services/tenure.service.js";
import { RecruitmentService } from "../apps/api/dist/services/recruitment.service.js";
import { RdService } from "../apps/api/dist/services/rd.service.js";
import { PostgradService } from "../apps/api/dist/services/postgrad.service.js";
import { PayrollService } from "../apps/api/dist/services/payroll.service.js";
import { WorkloadService } from "../apps/api/dist/services/workload.service.js";
import { KpiService } from "../apps/api/dist/services/kpi.service.js";

async function runSystemEventBusTests() {
  console.log("================================================================================");
  console.log("  BAHAU System Architecture Test: In-Process Domain Event Bus & Decoupling Engine");
  console.log("  (Pub/Sub Event Bus, Triple-Coupling Decoupling, Event Store & Event Replay)");
  console.log("================================================================================");

  const bus = DomainEventBus.getInstance();

  // --------------------------------------------------------------------------
  // TEST 1: Domain Event Bus Pub/Sub Mechanism & Event Store Verification
  // --------------------------------------------------------------------------
  console.log("\n-> TC-EVT-01: Domain Event Bus Pub/Sub mechanism & Event Store immutability...");
  assert.ok(bus, "DomainEventBus instance must exist");
  assert.strictEqual(bus, DomainEventBus.getInstance(), "DomainEventBus must be a Singleton");

  let customReceived = null;
  bus.subscribe("TEST_SYSTEM_PING", (event) => {
    customReceived = event;
  });

  const testPingEvent = DomainEventBus.createEvent("TEST_SYSTEM_PING", "agg-001", {
    message: "Hệ thống HRMS Đại học Kiến trúc Đà Nẵng sẵn sàng",
    node: "DAU_CORE_CLUSTER",
  });

  await bus.publish(testPingEvent);
  assert.ok(customReceived, "Subscriber must receive published event");
  assert.strictEqual(customReceived.aggregateId, "agg-001");
  assert.strictEqual(customReceived.payload.node, "DAU_CORE_CLUSTER");

  const pingEventsInStore = bus.getEvents({ name: "TEST_SYSTEM_PING" });
  assert.ok(pingEventsInStore.length >= 1, "Event must be persisted in Event Store");
  assert.strictEqual(pingEventsInStore[0].id, testPingEvent.id);
  console.log("   ✓ Verified Pub/Sub delivery and persistence in Event Store");

  // --------------------------------------------------------------------------
  // TEST 2: Decoupled Tenure Appointment Event (TENURE_APPOINTED)
  // --------------------------------------------------------------------------
  console.log("\n-> TC-EVT-02: Decoupled Tenure Appointment event (TENURE_APPOINTED)...");
  const initialEventCount = bus.getEvents().length;

  // Bổ nhiệm hồ sơ PGS.TS. Trần Thị Bình (tenure-dau-001)
  const appointedTenure = await TenureService.appointWithPki("tenure-dau-001", {
    signerName: "GS.TS. Nguyễn Hiệu Trưởng",
    resolutionNumber: "888/QĐ-ĐHKTĐN",
    newSalaryCoeff: 6.20,
  }, { id: "USR-RECTOR", role: "RECTOR" });

  assert.strictEqual(appointedTenure.status, "APPOINTED");
  assert.strictEqual(appointedTenure.appointedSalaryCoeff, 6.20);

  // Kiểm tra Event Store đã ghi nhận sự kiện TENURE_APPOINTED
  const tenureEvents = bus.getEvents({ name: DOMAIN_EVENTS.TENURE_APPOINTED });
  assert.ok(tenureEvents.length >= 1, "Event Store must record TENURE_APPOINTED");
  const latestTenureEvent = tenureEvents[tenureEvents.length - 1];
  assert.strictEqual(latestTenureEvent.payload.employeeId, "DAU260001-ID");
  assert.strictEqual(latestTenureEvent.payload.newSalaryCoefficient, 6.20);
  assert.strictEqual(latestTenureEvent.payload.newTeachingNormHours, 216);

  // Kiểm tra Decoupled Subscribers đã tự động cập nhật Payroll và Workload
  const payrollMember = PayrollService.getFacultyMember("DAU260001");
  assert.strictEqual(payrollMember?.salaryCoefficient, 6.20, "Payroll must reflect new salary coeff via subscriber");

  const normHours = WorkloadService.getTeachingNormHours("DAU260001");
  assert.strictEqual(normHours, 216, "Workload norm must be adjusted to 216h via subscriber");
  console.log("   ✓ Verified TENURE_APPOINTED: Payroll (coeff=6.20) and Workload (norm=216h) synced asynchronously");

  // --------------------------------------------------------------------------
  // TEST 3: Decoupled Recruitment Probation Event (CANDIDATE_APPOINTED)
  // --------------------------------------------------------------------------
  console.log("\n-> TC-EVT-03: Decoupled Recruitment Probation event (CANDIDATE_APPOINTED)...");

  // Chấm đạt Vòng 2 cho ứng viên ThS.KTS. Hoàng Minh Trí (cand-dau-001 - đã qua Vòng 1)
  await RecruitmentService.scoreRound2("cand-dau-001", {
    pedagogyScore: 28,
    studioPracticalScore: 26,
    liveSketchingScore: 17,
    defenseInterviewScore: 17,
    councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
    auditionNotes: "Giảng thử xưởng xuất sắc, tư duy kiến trúc sắc bén",
  }, { id: "usr-rector" });

  const appointedCand = await RecruitmentService.appointWithPki("cand-dau-001", {
    signerName: "GS.TS. Nguyễn Hiệu Trưởng",
    resolutionNumber: "305/QĐ-ĐHKTĐN",
    appointedEmployeeCode: "DAU260099",
  }, { id: "USR-RECTOR", role: "RECTOR" });

  assert.strictEqual(appointedCand.status, "APPOINTED_PROBATION");

  // Kiểm tra Event Store
  const candEvents = bus.getEvents({ name: DOMAIN_EVENTS.CANDIDATE_APPOINTED });
  assert.ok(candEvents.length >= 1, "Event Store must record CANDIDATE_APPOINTED");
  const latestCandEvent = candEvents[candEvents.length - 1];
  assert.strictEqual(latestCandEvent.payload.appointedEmployeeCode, "DAU260099");
  assert.strictEqual(latestCandEvent.payload.quotaReductionPercentage, 50);

  // Kiểm tra Payroll & Workload đã được subscriber xử lý
  const probPayroll = PayrollService.getFacultyMember("DAU260099");
  assert.ok(probPayroll, "Probationary lecturer must be registered in Payroll");
  assert.strictEqual(probPayroll?.salaryCoefficient, 1.989, "Master probation coeff must be 1.989 (85% of 2.34)");

  const probNormHours = WorkloadService.getTeachingNormHours("DAU260099");
  assert.strictEqual(probNormHours, 135, "Probationary lecturer must have 50% norm reduction (135h/year)");
  console.log("   ✓ Verified CANDIDATE_APPOINTED: Payroll (coeff=1.99) and Workload (norm=135h) synced via subscriber");

  // --------------------------------------------------------------------------
  // TEST 4: Decoupled R&D Architectural Design Royalty Event (RD_PROJECT_APPROVED)
  // --------------------------------------------------------------------------
  console.log("\n-> TC-EVT-04: Decoupled R&D Design Royalty event (RD_PROJECT_APPROVED)...");

  // Tạo dự án mới, duyệt hội đồng và phân bổ nhuận bút
  const rdProject = RdService.createProject({
    title: "Quy hoạch Phân khu Đô thị Đổi mới Sáng tạo Hòa Vang - Đà Nẵng",
    projectType: "ARCHITECTURAL_DESIGN",
    level: "COMMERCIAL_CONTRACT",
    contractValue: 500_000_000,
    institutionalFeePercentage: 20, // Nhà trường thu 20% = 100M, Quỹ nhuận bút = 400M
    startDate: "2026-11-01",
    endDate: "2027-05-31",
    members: [
      {
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "TS.KTS. Lê Văn Cường",
        role: "LEAD_ARCHITECT",
        royaltyPercentage: 70, // 280M
      },
      {
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        fullName: "ThS.KTS. Phạm Thanh Nga",
        role: "MEMBER",
        royaltyPercentage: 30, // 120M
      },
    ],
  });

  RdService.submitCouncilReview(rdProject.id, {
    score: 95.0,
    ranking: "EXCELLENT",
    councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
    councilNotes: "Đồ án quy hoạch có tính sáng tạo cao",
  });

  RdService.allocateRoyalty(rdProject.id, {
    memberAllocations: [
      { employeeId: "DAU260002-ID", royaltyPercentage: 70 },
      { employeeId: "DAU260003-ID", royaltyPercentage: 30 },
    ],
  });

  const signRdResult = RdService.approveAndSignWithPki(rdProject.id, {
    signerName: "GS.TS. Nguyễn Hiệu Trưởng",
    resolutionNumber: "777/QĐ-ĐHKTĐN",
  }, { id: "USR-RECTOR", role: "RECTOR" });

  assert.strictEqual(signRdResult.project.status, "COMPLETED");

  // Kiểm tra Event Store
  const rdEvents = bus.getEvents({ name: DOMAIN_EVENTS.RD_PROJECT_APPROVED });
  assert.ok(rdEvents.length >= 1, "Event Store must record RD_PROJECT_APPROVED");
  const latestRdEvent = rdEvents[rdEvents.length - 1];
  assert.strictEqual(latestRdEvent.payload.projectId, rdProject.id);

  // Kiểm tra Triple-Coupling thực hiện qua Event Bus
  const leadRoyalty = PayrollService.getRoyaltyPayment("DAU260002");
  assert.ok(leadRoyalty >= 280_000_000, `Lead royalty in Payroll must be >= 280M (Actual: ${leadRoyalty})`);

  const leadWorkload = WorkloadService.getResearchHours("DAU260002");
  assert.ok(leadWorkload >= 175, `Lead research hours must be >= 175h (Actual: ${leadWorkload})`);

  const leadKpi = KpiService.getResearchKpiPoints("DAU260002");
  assert.ok(leadKpi >= 35, `Lead KPI points must be >= 35 points (Actual: ${leadKpi})`);

  console.log(`   ✓ Triple-Coupling Decoupled via Bus: Payroll=${leadRoyalty.toLocaleString("vi-VN")}đ, Workload=${leadWorkload}h, KPI=+${leadKpi}đ`);

  // --------------------------------------------------------------------------
  // TEST 5: Decoupled Postgraduate Thesis Defense Event (POSTGRAD_DEGREE_AWARDED)
  // --------------------------------------------------------------------------
  console.log("\n-> TC-EVT-05: Decoupled Postgraduate Thesis Defense event (POSTGRAD_DEGREE_AWARDED)...");

  // Tạo học viên cao học & bảo vệ thành công
  const postgradStudent = PostgradService.createStudent({
    studentCode: "CH2025-KTH09",
    fullName: "KTS. Đặng Thanh Tùng",
    degreeLevel: "MASTER",
    major: "Kiến trúc",
    cohort: "2025-2027",
    thesisTitle: "Kiến trúc xanh và tiết kiệm năng lượng tại khu nghỉ dưỡng ven biển Đà Nẵng",
    supervisors: [
      {
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "TS.KTS. Lê Văn Cường",
        role: "PRIMARY_SUPERVISOR",
        quotaPercentage: 100,
      },
    ],
  });

  PostgradService.scheduleDefenseCouncil(postgradStudent.id, {
    defenseDate: "2026-11-20T08:30:00.000Z",
    defenseLocation: "Hội trường A2 - DAU",
    councilMembers: [
      { employeeId: "DAU260001-ID", employeeCode: "DAU260001", fullName: "GS.TS. Nguyễn Hiệu Trưởng", role: "PRESIDENT" },
      { employeeId: "DAU260002-ID", employeeCode: "DAU260002", fullName: "TS. Lê Hoàng Nam", role: "REVIEWER_1" },
      { employeeId: "DAU260003-ID", employeeCode: "DAU260003", fullName: "PGS.TS. Trần Thị Bình", role: "REVIEWER_2" },
      { employeeId: "DAU260004-ID", employeeCode: "DAU260004", fullName: "TS. Phạm Văn D", role: "COMMISSIONER" },
      { employeeId: "DAU260005-ID", employeeCode: "DAU260005", fullName: "TS. Hoàng Văn E", role: "SECRETARY" },
    ],
  });

  PostgradService.scoreThesisDefense(postgradStudent.id, {
    memberScores: [
      { employeeId: "DAU260001-ID", score: 92, isApproved: true },
      { employeeId: "DAU260002-ID", score: 90, isApproved: true },
      { employeeId: "DAU260003-ID", score: 94, isApproved: true },
      { employeeId: "DAU260004-ID", score: 88, isApproved: true },
      { employeeId: "DAU260005-ID", score: 90, isApproved: true },
    ],
    councilNotes: "Luận văn đạt chất lượng xuất sắc",
  });

  const degreeResult = PostgradService.awardDegreeWithPki(postgradStudent.id, {
    signerName: "GS.TS. Nguyễn Hiệu Trưởng",
    resolutionNumber: "909/QĐ-ĐHKTĐN",
  }, { id: "USR-RECTOR", role: "RECTOR" });

  assert.strictEqual(degreeResult.student.status, "DEGREE_AWARDED");

  // Kiểm tra Event Store
  const postgradEvents = bus.getEvents({ name: DOMAIN_EVENTS.POSTGRAD_DEGREE_AWARDED });
  assert.ok(postgradEvents.length >= 1, "Event Store must record POSTGRAD_DEGREE_AWARDED");

  // Kiểm tra Decoupled Subscribers
  const presHonorarium = PayrollService.getPostgradCouncilHonorarium("DAU260001");
  assert.ok(presHonorarium >= 1_200_000, `Council member honorarium must be credited (Actual: ${presHonorarium})`);

  const supHours = WorkloadService.getSupervisionHours("DAU260002");
  assert.ok(supHours >= 20, `Supervisor supervision hours must be credited (Actual: ${supHours})`);

  const supKpi = KpiService.getSupervisionKpiPoints("DAU260002");
  assert.ok(supKpi >= 10, `Supervisor KPI points must be credited (Actual: ${supKpi})`);

  console.log(`   ✓ Triple-Coupling Decoupled via Bus: Honorarium=${presHonorarium.toLocaleString("vi-VN")}đ, SupHours=${supHours}h, KPI=+${supKpi}đ`);

  // --------------------------------------------------------------------------
  // TEST 6: Event Replay Engine (Replay Events from Store)
  // --------------------------------------------------------------------------
  console.log("\n-> TC-EVT-06: Event Replay Engine (Replay Events from Store)...");

  let replayedCount = 0;
  bus.subscribe(DOMAIN_EVENTS.RD_PROJECT_APPROVED, () => {
    replayedCount++;
  });

  const replayedEvents = await bus.replayEvents(DOMAIN_EVENTS.RD_PROJECT_APPROVED);
  assert.ok(replayedEvents >= 1, "Replay must process at least 1 recorded RD_PROJECT_APPROVED event");
  assert.ok(replayedCount >= 1, "Subscriber must receive replayed events");
  console.log(`   ✓ Successfully replayed ${replayedEvents} RD_PROJECT_APPROVED events from Event Store`);

  // --------------------------------------------------------------------------
  // TEST 7: Audit Trail & Metadata Validation
  // --------------------------------------------------------------------------
  console.log("\n-> TC-EVT-07: Audit Trail & Metadata Validation...");

  const allEvents = bus.getEvents();
  assert.ok(allEvents.length >= 4, "Event store must contain at least 4 domain events");

  const seenIds = new Set();
  for (const evt of allEvents) {
    assert.ok(evt.id, "Event must have unique id");
    assert.ok(!seenIds.has(evt.id), `Event ID ${evt.id} must be unique`);
    seenIds.add(evt.id);

    assert.ok(evt.name, "Event must have name");
    assert.ok(evt.timestamp, "Event must have timestamp");
    assert.ok(!isNaN(new Date(evt.timestamp).getTime()), "Timestamp must be valid ISO date");
    assert.ok(evt.aggregateId, "Event must have aggregateId");
    assert.ok(evt.metadata?.source, "Event must specify source system");
  }

  // Lọc theo timestamp since
  const sinceEvents = bus.getEvents({ since: new Date(Date.now() - 60000).toISOString() });
  assert.strictEqual(sinceEvents.length, allEvents.length, "All recent events must match since query");

  console.log(`   ✓ Validated ${allEvents.length} events: 100% compliant with Audit Trail & Metadata standards`);

  console.log("\n================================================================================");
  console.log("  🎉 ALL 7 SYSTEM ARCHITECTURE & DOMAIN EVENT BUS TESTS PASSED 100%!");
  console.log("================================================================================\n");
}

runSystemEventBusTests().catch((err) => {
  console.error("\n❌ System Architecture Test Suite Failed:\n", err);
  process.exit(1);
});
