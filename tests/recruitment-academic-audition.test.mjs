import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runRecruitmentAcademicAuditionTests() {
  console.log("================================================================================");
  console.log("  BAHAU E2E & Integration Test: Academic Recruitment & Studio Audition (NĐ 115)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4033";

  try {
    const entry = pm.spawn("api-recruitment-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 30000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 30s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: Authentication enforcement on Recruitment endpoints (401 UNAUTHENTICATED)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RECRUIT-01: Authentication enforcement on Recruitment endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/recruitment/candidates" },
      { method: "GET", path: "/api/v1/recruitment/candidates/cand-dau-001" },
      { method: "POST", path: "/api/v1/recruitment/candidates/cand-dau-001/score-round-1" },
      { method: "POST", path: "/api/v1/recruitment/candidates/cand-dau-001/score-round-2" },
      { method: "POST", path: "/api/v1/recruitment/candidates/cand-dau-001/appoint" },
      { method: "GET", path: "/api/v1/recruitment/candidates/cand-dau-001/resolution/pdf" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 6/6 recruitment endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Round 1 Portfolio Review Scoring & >= 50 Guardrail
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RECRUIT-02: Round 1 Portfolio Review scoring & >= 50 threshold guardrail...");
    const { RecruitmentService } = await import("../apps/api/dist/services/recruitment.service.js");

    // 2A: Candidate đạt Vòng 1 (cand-dau-003: 20 + 30 + 15 + 12 = 77đ >= 50đ)
    const passedR1 = await RecruitmentService.scoreRound1(
      "cand-dau-003",
      {
        academicRecordScore: 20,
        architecturalProjectsScore: 30,
        scientificPapersScore: 15,
        foreignLanguageScore: 12,
        reviewerName: "PGS.TS. Trần Thị Bình",
        reviewNotes: "Hồ sơ kiến trúc xuất sắc",
      },
      { id: "usr-dean" }
    );

    assert.strictEqual(passedR1.portfolioScore?.totalScore, 77.0);
    assert.strictEqual(passedR1.portfolioScore?.isPassed, true);
    assert.strictEqual(passedR1.status, "ROUND_1_PASSED");
    console.log(`   ✓ Candidate passed Round 1: ${passedR1.portfolioScore?.totalScore}/100đ -> Status: ROUND_1_PASSED`);

    // 2B: Candidate không đạt Vòng 1 (< 50đ)
    const testFailCand = await RecruitmentService.createApplication({
      fullName: "KTS. Lê Văn Thử Nghiệm",
      email: "test.fail@example.com",
      phone: "0900111222",
      birthYear: 1996,
      degree: "MASTER",
      graduatedSchool: "Đại học Xây dựng",
      applyingPosition: "LECTURER_ARCHITECTURE",
      targetDepartment: "Khoa Kiến trúc",
    });

    const failedR1 = await RecruitmentService.scoreRound1(
      testFailCand.id,
      {
        academicRecordScore: 10,
        architecturalProjectsScore: 15,
        scientificPapersScore: 5,
        foreignLanguageScore: 8,
        reviewerName: "PGS.TS. Trần Thị Bình",
        reviewNotes: "Chưa đủ tiêu chuẩn",
      },
      { id: "usr-dean" }
    );

    assert.strictEqual(failedR1.portfolioScore?.totalScore, 38.0);
    assert.strictEqual(failedR1.portfolioScore?.isPassed, false);
    assert.strictEqual(failedR1.status, "ROUND_1_FAILED");
    console.log(`   ✓ Candidate failed Round 1: ${failedR1.portfolioScore?.totalScore}/100đ (< 50đ) -> Status: ROUND_1_FAILED (Guardrail enforced)`);

    // --------------------------------------------------------------------------
    // TEST 3: Round 2 Studio Audition Scoring & >= 50 Guardrail
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RECRUIT-03: Round 2 Studio Teaching Audition scoring & >= 50 threshold...");

    // 3A: Phải từ chối chấm Vòng 2 cho ứng viên chưa qua Vòng 1
    await assert.rejects(
      async () => {
        await RecruitmentService.scoreRound2(
          testFailCand.id, // Status is ROUND_1_FAILED
          {
            pedagogyScore: 25,
            studioPracticalScore: 25,
            liveSketchingScore: 15,
            defenseInterviewScore: 15,
          },
          { id: "usr-rector" }
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, "ROUND_1_NOT_PASSED");
        return true;
      },
      "Must reject Round 2 scoring if Round 1 was not passed"
    );
    console.log("   ✓ Rejected illegal Round 2 attempt on candidate who failed Round 1");

    // 3B: Chấm Vòng 2 đạt chuẩn cho cand-dau-001 (đã có Round 1 pass)
    const passedR2 = await RecruitmentService.scoreRound2(
      "cand-dau-001",
      {
        pedagogyScore: 28,
        studioPracticalScore: 26,
        liveSketchingScore: 17,
        defenseInterviewScore: 17,
        councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
        auditionNotes: "Giảng thử xưởng xuất sắc",
      },
      { id: "usr-rector" }
    );

    assert.strictEqual(passedR2.auditionScore?.totalScore, 88.0);
    assert.strictEqual(passedR2.auditionScore?.isPassed, true);
    assert.strictEqual(passedR2.status, "PASSED");
    console.log(`   ✓ Candidate passed Round 2: ${passedR2.auditionScore?.totalScore}/100đ -> Status: PASSED (Officially selected)`);

    // --------------------------------------------------------------------------
    // TEST 4: Legal Appointment Guardrail (Rejects unpassed candidates)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RECRUIT-04: Legal Appointment Guardrail enforcement...");
    await assert.rejects(
      async () => {
        await RecruitmentService.appointWithPki(
          testFailCand.id,
          { signerName: "GS.TS. Nguyễn Hiệu Trưởng" },
          { id: "usr-rector" }
        );
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.strictEqual(err.code, "NOT_ELIGIBLE_FOR_APPOINTMENT");
        return true;
      },
      "Must reject appointment of non-passed candidate"
    );
    console.log("   ✓ Rejected illegal appointment attempt on failed candidate");

    // --------------------------------------------------------------------------
    // TEST 5: Rector PKI RSA-2048 Appointment Decision & Salary Calculation
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RECRUIT-05: Rector PKI RSA-2048 Appointment Decision & Salary calculation...");

    // 5A: Tuyển dụng Tiến sĩ (cand-dau-002: TS Vũ Thanh Hà -> Hưởng 100% bậc 2 = 2.67 theo NĐ 115)
    const doctorAppointed = await RecruitmentService.appointWithPki(
      "cand-dau-002",
      {
        signerName: "GS.TS. Nguyễn Hiệu Trưởng",
        resolutionNumber: "205/QĐ-ĐHKTĐN",
        appointedEmployeeCode: "DAU260010",
      },
      { id: "usr-rector" }
    );

    assert.strictEqual(doctorAppointed.status, "APPOINTED_PROBATION");
    assert.strictEqual(doctorAppointed.appointmentResolutionNumber, "205/QĐ-ĐHKTĐN");
    assert.strictEqual(doctorAppointed.appointedEmployeeCode, "DAU260010");
    assert.strictEqual(doctorAppointed.probationSalaryCoeff, 2.67, "Doctor must receive 100% grade 2 salary coeff (2.67)");
    assert.ok(doctorAppointed.pkiSignature, "PKI RSA-2048 cryptographic signature must exist");
    assert.ok(doctorAppointed.pkiSignedAt, "Signed timestamp must exist");
    console.log(`   ✓ Doctor candidate appointed: Code=${doctorAppointed.appointedEmployeeCode}, Salary=${doctorAppointed.probationSalaryCoeff} (100% Grade 2 NĐ 115)`);

    // 5B: Tuyển dụng Thạc sĩ (cand-dau-001: ThS Hoàng Minh Trí -> Hưởng 85% bậc 1 = 1.989 theo NĐ 115)
    const masterAppointed = await RecruitmentService.appointWithPki(
      "cand-dau-001",
      {
        signerName: "GS.TS. Nguyễn Hiệu Trưởng",
        resolutionNumber: "206/QĐ-ĐHKTĐN",
        appointedEmployeeCode: "DAU260011",
      },
      { id: "usr-rector" }
    );

    assert.strictEqual(masterAppointed.status, "APPOINTED_PROBATION");
    assert.strictEqual(masterAppointed.appointedEmployeeCode, "DAU260011");
    assert.strictEqual(masterAppointed.probationSalaryCoeff, 1.989, "Master must receive 85% grade 1 salary coeff (2.34 * 85% = 1.989)");
    console.log(`   ✓ Master candidate appointed: Code=${masterAppointed.appointedEmployeeCode}, Salary=${masterAppointed.probationSalaryCoeff} (85% Grade 1 NĐ 115)`);

    // --------------------------------------------------------------------------
    // TEST 6: Decree 30 / 2020 PDF Generation & Digital Seal
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RECRUIT-06: Decree 30/2020/NĐ-CP PDF Resolution generation & Digital Seal...");
    const pdfBytes = await RecruitmentService.exportAppointmentPdf("cand-dau-002");
    assert.ok(pdfBytes instanceof Uint8Array, "PDF export must return Uint8Array");
    assert.ok(pdfBytes.length > 3000, "PDF buffer must have valid content (>3KB)");

    const pdfMagic = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3]);
    assert.strictEqual(pdfMagic, "%PDF", "PDF document must have %PDF header");
    console.log(`   ✓ Appointment Resolution PDF generated (${pdfBytes.length} bytes, Magic: %PDF)`);

    // --------------------------------------------------------------------------
    // TEST 7: Auto-coupling with Payroll & Workload Engines
    // --------------------------------------------------------------------------
    console.log("\n-> TC-RECRUIT-07: Auto-coupling with Payroll & Workload Engines...");
    const { PayrollService, DEFAULT_FACULTY_MEMBERS } = await import("../apps/api/dist/services/payroll.service.js");
    const { WorkloadService } = await import("../apps/api/dist/services/workload.service.js");

    // 7A: Verify Payroll automatically registered candidate
    const doctorFaculty = DEFAULT_FACULTY_MEMBERS.find((f) => f.employeeCode === "DAU260010");
    assert.ok(doctorFaculty, "Newly appointed doctor must be registered in Payroll faculty records");
    assert.strictEqual(doctorFaculty?.salaryCoefficient, 2.67);
    assert.strictEqual(doctorFaculty?.positionCode, "GIANG_VIEN_TAP_SU");
    console.log(`   ✓ Payroll synced: Faculty ${doctorFaculty?.fullName} registered with Salary Coeff = ${doctorFaculty?.salaryCoefficient}`);

    // 7B: Verify Workload quota reduced by 50% for probation
    const probationQuota = WorkloadService.calculateBaseQuotaAndReduction({
      id: "DAU260010-ID",
      employeeCode: "DAU260010",
      isProbation: true,
    });

    assert.strictEqual(probationQuota.reductionPercentage, 50, "Probation faculty must receive 50% workload quota reduction");
    assert.ok(probationQuota.reductionReason.includes("50%"), "Reduction reason must mention 50% probation per NĐ 115");
    console.log(`   ✓ Workload synced: ${probationQuota.reductionPercentage}% quota reduction applied (${probationQuota.reductionReason})`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 ACADEMIC RECRUITMENT & STUDIO AUDITION TEST CASES PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runRecruitmentAcademicAuditionTests().catch((err) => {
  console.error("\n❌ Academic Recruitment Test Suite Failed:\n", err);
  process.exit(1);
});
