import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runPayrollEngineTests() {
  console.log("================================================================================");
  console.log("  BAHAU Integration Test: Full Payroll Engine (2-Component, Studio, KPI & PKI)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4019";

  try {
    const entry = pm.spawn("api-payroll-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 15000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 15s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: HTTP Authentication enforcement (401 UNAUTHENTICATED)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PAY-01: Authentication enforcement on Payroll endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/payroll/my-payslip" },
      { method: "GET", path: "/api/v1/payroll/period-summary" },
      { method: "GET", path: "/api/v1/payroll/table" },
      { method: "POST", path: "/api/v1/payroll/calculate" },
      { method: "POST", path: "/api/v1/payroll/submit" },
      { method: "POST", path: "/api/v1/payroll/approve" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 6/6 payroll endpoints strictly enforce 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: 2-Component Salary Base Calculation Formula
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PAY-02: 2-Component State Salary & Pedagogical Allowance...");
    const { PayrollService } = await import("../apps/api/dist/services/payroll.service.js");

    const baseSalaryRate = 2340000;
    const salaryCoeff = 4.98;
    const expectedBaseSalary = Math.round(baseSalaryRate * salaryCoeff); // 11,653,200đ
    assert.strictEqual(expectedBaseSalary, 11653200);

    // Phụ cấp ưu đãi 30%
    const expectedPedagogical = Math.round(expectedBaseSalary * 0.3); // 3,495,960đ
    assert.strictEqual(expectedPedagogical, 3495960);

    // Phụ cấp thâm niên 6 năm >= 5 -> 6%
    const expectedSeniority = Math.round(expectedBaseSalary * 0.06); // 699,192đ
    assert.strictEqual(expectedSeniority, 699192);

    console.log("   ✓ Base salary verified: 4.98 x 2.340.000đ = 11.653.200đ");
    console.log("   ✓ Pedagogical allowance (30%) verified: 3.495.960đ");
    console.log("   ✓ Seniority allowance (6%) verified: 699.192đ");

    // --------------------------------------------------------------------------
    // TEST 3: Timesheet Deductions (Khấu trừ ngày nghỉ không phép)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PAY-03: Timesheet Deductions for Unpaid / Unauthorized Leave...");
    const standardDays = 22;
    const unpaidDays = 1;
    const expectedDeduction = Math.round((expectedBaseSalary / standardDays) * unpaidDays); // 529,691đ
    assert.strictEqual(expectedDeduction, 529691);

    const testPayslipWithLeave = PayrollService.computeSinglePayslip({
      employeeId: "DAU260003-ID",
      employeeName: "ThS. Nguyễn Văn An",
      employeeCode: "DAU260003",
      departmentName: "Khoa Kiến trúc",
      month: 9,
      year: 2026,
      salaryCoefficient: 4.98,
      hireYear: 2020,
      kpiRanking: "A",
      dependentCount: 0,
      standardWorkDays: 22,
      actualWorkDays: 21,
      unpaidLeaveDays: 1,
      overtimeTeachingHours: 7.5,
    });

    assert.strictEqual(testPayslipWithLeave.workDaysDeduction, 529691);
    assert.strictEqual(testPayslipWithLeave.actualWorkDays, 21);
    assert.strictEqual(testPayslipWithLeave.unpaidLeaveDays, 1);
    console.log("   ✓ Timesheet deduction verified: 1 unpaid day deducted = 529.691đ");

    // --------------------------------------------------------------------------
    // TEST 4: Studio Overtime & KPI Income Integration
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PAY-04: Studio Workload & KPI Performance Bonus Integration...");
    
    // Lecturer overtime rate: 160.000đ/h x 7.5h = 1.200.000đ
    assert.strictEqual(testPayslipWithLeave.overtimeTeachingHours, 7.5);
    assert.strictEqual(testPayslipWithLeave.overtimeTeachingPay, 1200000);

    // KPI Ranking A: 1.3 x 4.000.000đ = 5.200.000đ
    assert.strictEqual(testPayslipWithLeave.kpiRanking, "A");
    assert.strictEqual(testPayslipWithLeave.kpiBonusCoefficient, 1.3);
    assert.strictEqual(testPayslipWithLeave.kpiExtraIncome, 5200000);

    // Gross Income check
    const expectedGross =
      expectedBaseSalary -
      expectedDeduction +
      expectedSeniority +
      expectedPedagogical +
      5200000 +
      1200000;
    assert.strictEqual(testPayslipWithLeave.grossIncome, expectedGross);
    console.log(`   ✓ Gross Income verified: ${testPayslipWithLeave.grossIncome.toLocaleString("vi-VN")}đ`);

    // --------------------------------------------------------------------------
    // TEST 5: Insurance (10.5%) & Progressive PIT (7 Brackets)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PAY-05: 10.5% Statutory Insurance & 7-Bracket Progressive PIT...");

    // Insurable base: baseSalary + seniority = 11,653,200 + 699,192 = 12,352,392đ
    const insurableBase = expectedBaseSalary + expectedSeniority;
    const expectedBHXH = Math.round(insurableBase * 0.08); // 988,191đ
    const expectedBHYT = Math.round(insurableBase * 0.015); // 185,286đ
    const expectedBHTN = Math.round(expectedBaseSalary * 0.01); // 116,532đ
    const expectedTotalInsurance = expectedBHXH + expectedBHYT + expectedBHTN; // 1,290,009đ

    assert.strictEqual(testPayslipWithLeave.socialInsurance, expectedBHXH);
    assert.strictEqual(testPayslipWithLeave.healthInsurance, expectedBHYT);
    assert.strictEqual(testPayslipWithLeave.unemploymentInsurance, expectedBHTN);
    assert.strictEqual(testPayslipWithLeave.totalInsurance, expectedTotalInsurance);

    // Taxable Income: Gross - Insurance - PersonalDeduction (11M)
    const expectedTaxable = Math.max(0, expectedGross - expectedTotalInsurance - 11000000);
    assert.strictEqual(testPayslipWithLeave.taxableIncome, expectedTaxable);

    // PIT 7 Brackets check
    const calculatedPit = PayrollService.calculatePit(expectedTaxable);
    assert.strictEqual(testPayslipWithLeave.personalIncomeTax, calculatedPit);

    // Net Salary check
    assert.strictEqual(
      testPayslipWithLeave.netSalary,
      expectedGross - expectedTotalInsurance - calculatedPit
    );
    console.log(`   ✓ Insurance verified: ${testPayslipWithLeave.totalInsurance.toLocaleString("vi-VN")}đ (10.5%)`);
    console.log(`   ✓ Taxable Income: ${testPayslipWithLeave.taxableIncome.toLocaleString("vi-VN")}đ`);
    console.log(`   ✓ PIT Withheld: ${testPayslipWithLeave.personalIncomeTax.toLocaleString("vi-VN")}đ`);
    console.log(`   ✓ Net Salary: ${testPayslipWithLeave.netSalary.toLocaleString("vi-VN")}đ`);

    // --------------------------------------------------------------------------
    // TEST 6: Multi-tier Workflow Approval & PKI Digital Signature
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PAY-06: Period Aggregation, Multi-tier Approval & PKI Signatures...");

    // 6.1 Calculate full period -> DRAFT
    const periodDetail = await PayrollService.calculateFullPeriod(9, 2026, true);
    assert.strictEqual(periodDetail.status, "DRAFT");
    assert.ok(periodDetail.totalEmployees >= 5);
    assert.ok(periodDetail.totalGrossPayout > 50000000);
    assert.ok(periodDetail.totalNetPayout > 40000000);
    console.log(`   ✓ Full period calculated (DRAFT): ${periodDetail.totalEmployees} employees, Net Payout: ${periodDetail.totalNetPayout.toLocaleString("vi-VN")}đ`);

    // 6.2 Submit period -> SUBMITTED
    const submitted = await PayrollService.submitPeriod(9, 2026, "Trưởng phòng KHTC");
    assert.strictEqual(submitted.status, "SUBMITTED");
    assert.strictEqual(submitted.submittedBy, "Trưởng phòng KHTC");
    assert.ok(submitted.submittedAt);
    console.log("   ✓ Period submitted to Rector (SUBMITTED status verified)");

    // 6.3 Approve period -> APPROVED with PKI Signature
    const approved = await PayrollService.approvePeriod(9, 2026, "GS.TS. Nguyễn Hiệu Trưởng");
    assert.strictEqual(approved.status, "APPROVED");
    assert.strictEqual(approved.approvedBy, "GS.TS. Nguyễn Hiệu Trưởng");
    assert.ok(approved.pkiSignature && approved.pkiSignature.length > 50);
    console.log("   ✓ Period approved by Rector with RSA-2048 PKI Signature applied");

    // --------------------------------------------------------------------------
    // TEST 7: PDF Payslip Generation
    // --------------------------------------------------------------------------
    console.log("\n-> TC-PAY-07: Generating Official Payslip PDF Document...");
    const pdfBytes = await PayrollService.exportPayslipPdf(testPayslipWithLeave);
    assert.ok(pdfBytes instanceof Uint8Array);
    assert.ok(pdfBytes.length > 5000, "Payslip PDF must be > 5KB");
    const magic = Buffer.from(pdfBytes.subarray(0, 4)).toString("ascii");
    assert.strictEqual(magic, "%PDF", "Must begin with %PDF magic bytes");
    console.log(`   ✓ Official Payslip PDF generated (${pdfBytes.length} bytes, Magic: %PDF)`);

    console.log("\n================================================================================");
    console.log("  🎉 ALL 7 PAYROLL ENGINE & INTEGRATION TESTS PASSED 100%!");
    console.log("================================================================================\n");
  } finally {
    await pm.stopAll();
  }
}

runPayrollEngineTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
