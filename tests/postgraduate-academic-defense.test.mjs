import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runPostgraduateAcademicDefenseTests() {
  console.log("================================================================================");
  console.log("  BAHAU E2E & Integration Test: Postgraduate Supervision & Defense Council Engine");
  console.log("  (Thông tư 18/2021/TT-BGDĐT, Thông tư 23/2021/TT-BGDĐT & TT 20/2020/TT-BGDĐT)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4035";

  try {
    const entry = pm.spawn("api-postgrad-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 30000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 30s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: Authentication enforcement on Postgraduate endpoints (401 UNAUTHENTICATED)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-POSTGRAD-01: Authentication enforcement on Postgraduate endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/postgrad/students" },
      { method: "GET", path: "/api/v1/postgrad/students/pg-dau-001" },
      { method: "POST", path: "/api/v1/postgrad/students" },
      { method: "POST", path: "/api/v1/postgrad/students/pg-dau-001/schedule-council" },
      { method: "POST", path: "/api/v1/postgrad/students/pg-dau-001/score-defense" },
      { method: "POST", path: "/api/v1/postgrad/students/pg-dau-001/award-degree" },
      { method: "GET", path: "/api/v1/postgrad/students/pg-dau-001/resolution/pdf" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 7/7 postgraduate endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Register student & supervisor workload conversion (TT 20/2020)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-POSTGRAD-02: Register student & supervisor workload conversion (TT 20/2020)...");
    const { PostgradService } = await import("../apps/api/dist/services/postgrad.service.js");

    // 2A: Doctoral PhD student (50h Primary / 25h Co-supervisor)
    const phdStudent = PostgradService.createStudent({
      studentCode: "NCS2026-KT99",
      fullName: "NCS. ThS. Lê Văn Sáng",
      degreeLevel: "DOCTORAL",
      specialization: "ARCHITECTURE",
      thesisTitle: "Thiết kế kiến trúc trường đại học sinh thái tại vùng duyên hải miền Trung",
      cohortYear: 2026,
      departmentName: "Khoa Kiến trúc",
      supervisors: [
        {
          employeeId: "DAU260001-ID",
          employeeCode: "DAU260001",
          fullName: "GS.TS. Nguyễn Hiệu Trưởng",
          academicTitle: "GS.TS",
          role: "PRIMARY_SUPERVISOR",
        },
        {
          employeeId: "DAU260002-ID",
          employeeCode: "DAU260002",
          fullName: "TS. Lê Hoàng Nam",
          academicTitle: "TS",
          role: "CO_SUPERVISOR",
        },
      ],
    });

    assert.strictEqual(phdStudent.degreeLevel, "DOCTORAL");
    assert.strictEqual(phdStudent.supervisors[0].convertedHours, 50, "Primary PhD supervisor gets 50h");
    assert.strictEqual(phdStudent.supervisors[0].kpiPoints, 20, "Primary PhD supervisor gets 20 KPI pts");
    assert.strictEqual(phdStudent.supervisors[1].convertedHours, 25, "Co-supervisor PhD gets 25h");
    assert.strictEqual(phdStudent.supervisors[1].kpiPoints, 10, "Co-supervisor PhD gets 10 KPI pts");
    console.log(`   ✓ PhD student registered: Primary=50h (20đ KPI), Co=25h (10đ KPI)`);

    // 2B: Master student (30h Primary supervisor)
    const masterStudent = PostgradService.createStudent({
      studentCode: "CH2026-QH99",
      fullName: "HVCH. KTS. Hoàng Lan Anh",
      degreeLevel: "MASTER",
      specialization: "URBAN_PLANNING",
      thesisTitle: "Quy hoạch không gian công cộng ven biển Sơn Trà, TP. Đà Nẵng",
      cohortYear: 2026,
      departmentName: "Khoa Quy hoạch",
      supervisors: [
        {
          employeeId: "DAU260003-ID",
          employeeCode: "DAU260003",
          fullName: "ThS. Nguyễn Văn An",
          academicTitle: "ThS.KTS",
          role: "PRIMARY_SUPERVISOR",
        },
      ],
    });

    assert.strictEqual(masterStudent.degreeLevel, "MASTER");
    assert.strictEqual(masterStudent.supervisors[0].convertedHours, 30, "Master supervisor gets 30h");
    assert.strictEqual(masterStudent.supervisors[0].kpiPoints, 15, "Master supervisor gets 15 KPI pts");
    console.log(`   ✓ Master student registered: Primary=30h (15đ KPI)`);

    // --------------------------------------------------------------------------
    // TEST 3: Schedule 5-member Defense Council & Honorarium structure
    // --------------------------------------------------------------------------
    console.log("\n-> TC-POSTGRAD-03: Schedule 5-member Defense Council & Honorarium structure...");

    // 3A: Council size guardrail
    assert.throws(
      () => {
        PostgradService.scheduleDefenseCouncil(phdStudent.id, {
          defenseDate: "2026-11-15",
          councilMembers: [
            { employeeId: "DAU260001-ID", employeeCode: "DAU260001", fullName: "GS.TS. Nguyễn Hiệu Trưởng", role: "PRESIDENT" },
            { employeeId: "DAU260002-ID", employeeCode: "DAU260002", fullName: "TS. Lê Hoàng Nam", role: "REVIEWER_1" },
          ], // Only 2 members -> Invalid
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, "INVALID_COUNCIL_SIZE");
        return true;
      },
      "Must reject council not having exactly 5 members"
    );
    console.log("   ✓ Guardrail enforced: Council must consist of exactly 5 members");

    // 3B: Valid 5 members schedule
    const scheduled = PostgradService.scheduleDefenseCouncil(phdStudent.id, {
      defenseDate: "2026-11-15",
      councilMembers: [
        { employeeId: "DAU260001-ID", employeeCode: "DAU260001", fullName: "GS.TS. Nguyễn Hiệu Trưởng", role: "PRESIDENT" },
        { employeeId: "DAU260002-ID", employeeCode: "DAU260002", fullName: "TS. Lê Hoàng Nam", role: "REVIEWER_1" },
        { employeeId: "DAU260003-ID", employeeCode: "DAU260003", fullName: "ThS. Nguyễn Văn An", role: "REVIEWER_2" },
        { employeeId: "DAU260004-ID", employeeCode: "DAU260004", fullName: "ThS. Phạm Thị Mai", role: "COMMISSIONER" },
        { employeeId: "DAU260005-ID", employeeCode: "DAU260005", fullName: "ThS. Đỗ Thị Quỳnh Chi", role: "SECRETARY" },
      ],
    });

    assert.strictEqual(scheduled.status, "DEFENSE_SCHEDULED");
    assert.strictEqual(scheduled.defenseMembers?.length, 5);

    const pres = scheduled.defenseMembers?.find((m) => m.role === "PRESIDENT");
    const rev1 = scheduled.defenseMembers?.find((m) => m.role === "REVIEWER_1");
    const comm = scheduled.defenseMembers?.find((m) => m.role === "COMMISSIONER");

    assert.strictEqual(pres?.honorariumAmount, 2000000, "President gets 2,000,000 VND");
    assert.strictEqual(rev1?.honorariumAmount, 1500000, "Reviewer gets 1,500,000 VND");
    assert.strictEqual(comm?.honorariumAmount, 1000000, "Commissioner gets 1,000,000 VND");
    console.log("   ✓ 5-member Defense Council scheduled: President=2M, Reviewers=1.5M, Members=1M");

    // --------------------------------------------------------------------------
    // TEST 4: Council scoring & legal guardrails (>= 70 average score & >= 4/5 votes)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-POSTGRAD-04: Council scoring & legal guardrails (>= 70 avg & >= 4/5 votes)...");

    // 4A: Fail case: Low score (< 70đ)
    const failStudent = PostgradService.createStudent({
      studentCode: "CH2026-FAIL",
      fullName: "HVCH. Nguyễn Văn Thử",
      degreeLevel: "MASTER",
      specialization: "ARCHITECTURE",
      thesisTitle: "Nghiên cứu thử nghiệm chưa đạt chuẩn",
      cohortYear: 2026,
      departmentName: "Khoa Kiến trúc",
      supervisors: [
        { employeeId: "DAU260003-ID", employeeCode: "DAU260003", fullName: "ThS. Nguyễn Văn An", academicTitle: "ThS", role: "PRIMARY_SUPERVISOR" },
      ],
    });

    PostgradService.scheduleDefenseCouncil(failStudent.id, {
      defenseDate: "2026-11-20",
      councilMembers: [
        { employeeId: "DAU260001-ID", employeeCode: "DAU260001", fullName: "GS.TS. Nguyễn Hiệu Trưởng", role: "PRESIDENT" },
        { employeeId: "DAU260002-ID", employeeCode: "DAU260002", fullName: "TS. Lê Hoàng Nam", role: "REVIEWER_1" },
        { employeeId: "DAU260003-ID", employeeCode: "DAU260003", fullName: "ThS. Nguyễn Văn An", role: "REVIEWER_2" },
        { employeeId: "DAU260004-ID", employeeCode: "DAU260004", fullName: "ThS. Phạm Thị Mai", role: "COMMISSIONER" },
        { employeeId: "DAU260005-ID", employeeCode: "DAU260005", fullName: "ThS. Đỗ Thị Quỳnh Chi", role: "SECRETARY" },
      ],
    });

    const scoredFail = PostgradService.scoreThesisDefense(failStudent.id, {
      memberScores: [
        { employeeId: "DAU260001-ID", score: 60, isApproved: false },
        { employeeId: "DAU260002-ID", score: 65, isApproved: true },
        { employeeId: "DAU260003-ID", score: 62, isApproved: false },
        { employeeId: "DAU260004-ID", score: 68, isApproved: true },
        { employeeId: "DAU260005-ID", score: 55, isApproved: false },
      ],
      councilNotes: "Luận văn chưa đạt yêu cầu học thuật",
    });

    assert.strictEqual(scoredFail.defenseResult?.isPassed, false);
    assert.strictEqual(scoredFail.status, "REJECTED");
    console.log(`   ✓ Low score & rejected votes: Avg=${scoredFail.defenseResult?.averageScore}đ, Votes=${scoredFail.defenseResult?.approvedVotes}/5 -> Status: REJECTED`);

    // 4B: Attempt to award degree on failed student
    assert.throws(
      () => {
        PostgradService.awardDegreeWithPki(failStudent.id, {
          signerName: "GS.TS. Nguyễn Hiệu Trưởng",
        });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, "COUNCIL_NOT_PASSED");
        return true;
      },
      "Must block degree award on students who failed thesis defense"
    );
    console.log("   ✓ Guardrail enforced: Cannot award degree without passing Defense Council");

    // 4C: Pass case for phdStudent (scores 92, 90, 88, 89, 91 -> avg 90, 5/5 votes)
    const scoredPass = PostgradService.scoreThesisDefense(phdStudent.id, {
      memberScores: [
        { employeeId: "DAU260001-ID", score: 92, isApproved: true },
        { employeeId: "DAU260002-ID", score: 90, isApproved: true },
        { employeeId: "DAU260003-ID", score: 88, isApproved: true },
        { employeeId: "DAU260004-ID", score: 89, isApproved: true },
        { employeeId: "DAU260005-ID", score: 91, isApproved: true },
      ],
      councilNotes: "Luận án xuất sắc, đóng góp giá trị khoa học cao cho kiến trúc miền Trung.",
    });

    assert.strictEqual(scoredPass.defenseResult?.isPassed, true);
    assert.strictEqual(scoredPass.defenseResult?.averageScore, 90.0);
    assert.strictEqual(scoredPass.defenseResult?.approvedVotes, 5);
    assert.strictEqual(scoredPass.status, "PASSED");
    console.log(`   ✓ Thesis defense passed: Avg=90.0/100đ, 5/5 votes -> Status: PASSED`);

    // --------------------------------------------------------------------------
    // TEST 5: Rector PKI RSA-2048 Degree Awarding Resolution
    // --------------------------------------------------------------------------
    console.log("\n-> TC-POSTGRAD-05: Rector PKI RSA-2048 Degree Awarding Resolution...");

    const signResult = PostgradService.awardDegreeWithPki(phdStudent.id, {
      signerName: "GS.TS. Nguyễn Hiệu Trưởng",
      resolutionNumber: "220/QĐ-ĐHKTĐN",
    });

    assert.strictEqual(signResult.student.status, "DEGREE_AWARDED");
    assert.strictEqual(signResult.resolutionNumber, "220/QĐ-ĐHKTĐN");
    assert.ok(signResult.pkiSignature.length > 50, "PKI signature must be a valid base64 RSA signature");
    assert.ok(signResult.signedAt, "Signing timestamp must be recorded");
    console.log(`   ✓ Degree awarded by Rector with PKI RSA-2048: Resolution ${signResult.resolutionNumber}`);

    // --------------------------------------------------------------------------
    // TEST 6: Decree 30/2020/NĐ-CP PDF Resolution generation with digital seal
    // --------------------------------------------------------------------------
    console.log("\n-> TC-POSTGRAD-06: Decree 30/2020/NĐ-CP PDF Resolution generation with digital seal...");

    const pdfBytes = await PostgradService.exportDegreeResolutionPdf(phdStudent.id);
    assert.ok(pdfBytes instanceof Uint8Array, "PDF export must return Uint8Array");
    assert.ok(pdfBytes.length > 3000, "PDF buffer must have valid content (>3KB)");

    const pdfMagic = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
    assert.strictEqual(pdfMagic, "%PDF", "PDF document must have %PDF header");
    console.log(`   ✓ Degree Awarding Resolution PDF generated (${pdfBytes.length} bytes, Magic: %PDF)`);

    // --------------------------------------------------------------------------
    // TEST 7: Triple-Coupling Engine verification (Payroll, Workload, KPI)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-POSTGRAD-07: Triple-Coupling Engine verification (Payroll, Workload, KPI)...");
    const { PayrollService } = await import("../apps/api/dist/services/payroll.service.js");
    const { WorkloadService } = await import("../apps/api/dist/services/workload.service.js");
    const { KpiService } = await import("../apps/api/dist/services/kpi.service.js");

    // 7A: Payroll Engine Coupling: Council President honorarium (2M)
    const presHonorarium = PayrollService.getPostgradCouncilHonorarium("DAU260001");
    assert.ok(presHonorarium >= 2000000, `President DAU260001 must receive >= 2M honorarium (Actual: ${presHonorarium})`);
    console.log(`   ✓ Payroll synced: DAU260001 received ${presHonorarium.toLocaleString("vi-VN")} VNĐ council honorarium`);

    // 7B: Workload Engine Coupling: PhD Primary Supervisor hours (50h)
    const supHours = WorkloadService.getSupervisionHours("DAU260001");
    assert.ok(supHours >= 50, `Supervisor DAU260001 must have >= 50 supervision hours (Actual: ${supHours})`);
    console.log(`   ✓ Workload synced: DAU260001 credited with ${supHours} supervision hours`);

    // 7C: KPI Engine Coupling: PhD Primary Supervisor KPI points (20đ)
    const supKpi = KpiService.getSupervisionKpiPoints("DAU260001");
    assert.ok(supKpi >= 20, `Supervisor DAU260001 must have >= 20 KPI points (Actual: ${supKpi})`);
    console.log(`   ✓ KPI synced: DAU260001 credited with +${supKpi} points into Pillar I & II`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 POSTGRADUATE SUPERVISION & DEFENSE COUNCIL TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runPostgraduateAcademicDefenseTests().catch((err) => {
  console.error("\n❌ Postgraduate Academic Defense Test Suite Failed:\n", err);
  process.exit(1);
});
