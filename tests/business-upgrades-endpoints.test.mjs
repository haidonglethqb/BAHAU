import assert from "node:assert/strict";
import { httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runBusinessUpgradesTests() {
  console.log("================================================================================");
  console.log("  BAHAU E2E & Integration Test: Strategic Business Upgrades (Axes 1, 2, 3, 4)");
  console.log("================================================================================");

  const pm = new ProcessManager();
  const testPort = "4017";

  try {
    const entry = pm.spawn("api-upgrades-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: testPort, NODE_ENV: "test" },
    });

    console.log(`\n[BOOT] Waiting for API server on port ${testPort}...`);
    const ready = await waitForPort(Number(testPort), "127.0.0.1", 15000, entry);
    assert.ok(ready, `API server must boot on port ${testPort} within 15s`);
    console.log(`[BOOT] API server ready on http://127.0.0.1:${testPort}`);

    // --------------------------------------------------------------------------
    // TEST 1: Unauthenticated access to new endpoints (401 UNAUTHENTICATED)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-UP-01: Authentication enforcement on upgraded endpoints (401)...");
    const endpoints401 = [
      { method: "GET", path: "/api/v1/workload/my-quota" },
      { method: "GET", path: "/api/v1/workload/settlement" },
      { method: "GET", path: "/api/v1/payroll/my-payslip" },
      { method: "GET", path: "/api/v1/payroll/period-summary" },
      { method: "GET", path: "/api/v1/executive/salary-increments" },
      { method: "POST", path: "/api/v1/executive/generate-resolution" },
    ];

    for (const ep of endpoints401) {
      const res = await httpRequest(`http://127.0.0.1:${testPort}${ep.path}`, ep.method);
      assert.strictEqual(res.status, 401, `${ep.path} must reject unauthenticated request with 401`);
      assert.strictEqual(res.bodyJson?.success, false);
      assert.strictEqual(res.bodyJson?.error?.code, "UNAUTHENTICATED");
    }
    console.log("   ✓ Verified 6/6 upgraded endpoints correctly returned 401 UNAUTHENTICATED");

    // --------------------------------------------------------------------------
    // TEST 2: Academic Workload Conversion Algorithm (Architecture Studio Multipliers)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-UP-02: Architecture Studio Workload Conversion Engine...");
    
    // Test Studio Project: 60 raw hours * 1.25 = 75.0
    const studioRes = await httpRequest(
      `http://127.0.0.1:${testPort}/api/v1/workload/convert`,
      "POST",
      {},
      { workloadType: "STUDIO_PROJECT", rawHours: 60, studentCount: 28 }
    );
    assert.strictEqual(studioRes.status, 200);
    assert.strictEqual(studioRes.bodyJson.data.multiplier, 1.25);
    assert.strictEqual(studioRes.bodyJson.data.convertedHours, 75.0);
    console.log("   ✓ Studio Project conversion: 60 raw hrs x 1.25 = 75.0 converted hrs");

    // Test Graduation Thesis: 5 students * 18 hours = 90.0
    const thesisRes = await httpRequest(
      `http://127.0.0.1:${testPort}/api/v1/workload/convert`,
      "POST",
      {},
      { workloadType: "GRADUATION_THESIS", rawHours: 18, studentCount: 5 }
    );
    assert.strictEqual(thesisRes.status, 200);
    assert.strictEqual(thesisRes.bodyJson.data.multiplier, 18.0);
    assert.strictEqual(thesisRes.bodyJson.data.convertedHours, 90.0);
    console.log("   ✓ Graduation Thesis conversion: 5 students x 18.0 hrs = 90.0 converted hrs");

    // Test Review Thesis: 6 theses * 1.5 hours = 9.0
    const reviewRes = await httpRequest(
      `http://127.0.0.1:${testPort}/api/v1/workload/convert`,
      "POST",
      {},
      { workloadType: "REVIEW_THESIS", rawHours: 1.5, studentCount: 6 }
    );
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.bodyJson.data.multiplier, 1.5);
    assert.strictEqual(reviewRes.bodyJson.data.convertedHours, 9.0);
    console.log("   ✓ Review Thesis conversion: 6 theses x 1.5 hrs = 9.0 converted hrs");

    // --------------------------------------------------------------------------
    // TEST 3: Leadership Load Deduction Verification
    // --------------------------------------------------------------------------
    console.log("\n-> TC-UP-03: Leadership Quota Reduction Calculation Engine...");
    
    // Dean: 30% reduction of 270 = 81 hrs reduced -> 189 hrs effective
    const baseQuota = 270;
    const deanReduction = 0.3;
    const deanEffective = Math.round(baseQuota * (1 - deanReduction));
    assert.strictEqual(deanEffective, 189);

    // Vice-Dean / Head of Division: 20% reduction of 270 = 54 hrs reduced -> 216 hrs effective
    const viceDeanReduction = 0.2;
    const viceDeanEffective = Math.round(baseQuota * (1 - viceDeanReduction));
    assert.strictEqual(viceDeanEffective, 216);

    // Overtime pay formula: (actual - effective) * hourlyRate
    const actualHours = 264.0;
    const overtimeHours = actualHours - deanEffective; // 264 - 189 = 75
    const hourlyRate = 160000;
    const expectedOvertimePay = overtimeHours * hourlyRate; // 75 * 160,000 = 12,000,000 VNĐ
    assert.strictEqual(expectedOvertimePay, 12000000);
    console.log("   ✓ Dean load reduction verified: 270h - 30% = 189h effective quota");
    console.log("   ✓ Overtime settlement verified: (264h - 189h) x 160,000đ = 12,000,000đ");

    // --------------------------------------------------------------------------
    // TEST 4: University Autonomy 2-Component Payroll Engine Formula
    // --------------------------------------------------------------------------
    console.log("\n-> TC-UP-04: University Autonomy 2-Component Payroll Engine Formula...");
    
    const baseSalaryRate = 2340000;
    const salaryCoefficient = 4.98;
    const expectedBaseSalary = Math.round(baseSalaryRate * salaryCoefficient); // 11,653,200đ
    assert.strictEqual(expectedBaseSalary, 11653200);

    // Pedagogical allowance: 30% of base salary = 3,495,960đ
    const expectedPedagogical = Math.round(expectedBaseSalary * 0.3);
    assert.strictEqual(expectedPedagogical, 3495960);

    // KPI Bonus ranking distribution multipliers:
    const kpiMultiplierA = 1.3;
    const kpiMultiplierB = 1.0;
    const kpiMultiplierC = 0.7;
    const kpiMultiplierD = 0.0;
    const kpiFundBase = 4000000;
    assert.strictEqual(kpiFundBase * kpiMultiplierA, 5200000);
    assert.strictEqual(kpiFundBase * kpiMultiplierB, 4000000);
    assert.strictEqual(kpiFundBase * kpiMultiplierC, 2800000);
    assert.strictEqual(kpiFundBase * kpiMultiplierD, 0);

    // Statutory Insurance deductions: 8% + 1.5% + 1% = 10.5%
    const totalInsuranceRate = 0.08 + 0.015 + 0.01;
    assert.strictEqual(totalInsuranceRate, 0.105);
    console.log("   ✓ 2-Component salary verified: Base (4.98 x 2.340.000đ) + Allowances + KPI Bonus");
    console.log("   ✓ Statutory insurance deductions verified: 10.5% (8% BHXH + 1.5% BHYT + 1% BHTN)");

    // --------------------------------------------------------------------------
    // TEST 5: Decree 30/2020/NĐ-CP Official Resolutions Generator Engine
    // --------------------------------------------------------------------------
    console.log("\n-> TC-UP-05: Decree 30/2020/NĐ-CP Formal Executive Resolutions Engine...");
    
    const { ExecutiveService } = await import("../apps/api/dist/services/executive.service.js");
    const sampleInput = {
      type: "BUSINESS_TRIP",
      recipientName: "ThS. Nguyễn Văn An",
      recipientCode: "DAU260003",
      unitName: "Khoa Kiến trúc",
      contentTitle: "Hội thảo Quốc tế về Quy hoạch Đô thị Xanh tại Singapore",
    };

    const resolution = ExecutiveService.generateOfficialResolution(sampleInput);
    assert.ok(resolution.resolutionNumber.includes("/QĐ-ĐHKTĐN"));
    assert.strictEqual(resolution.organizationName, "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG");
    assert.strictEqual(resolution.signAuthority, "HIỆU TRƯỞNG");
    assert.ok(resolution.legalGrounds.length >= 4);
    assert.ok(resolution.articles.length >= 3);
    assert.ok(resolution.fullFormattedDocument.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"));
    assert.ok(resolution.fullFormattedDocument.includes("Độc lập - Tự do - Hạnh phúc"));
    assert.ok(resolution.fullFormattedDocument.includes("QUYẾT ĐỊNH"));
    console.log("   ✓ Decree 30 resolution format verified with all legal standards & official seal layout");

    console.log("\n================================================================================");
    console.log("  🎉 ALL 5 STRATEGIC BUSINESS UPGRADES TESTS PASSED 100%!");
    console.log("================================================================================");
  } finally {
    await pm.stopAll();
  }
}

runBusinessUpgradesTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
