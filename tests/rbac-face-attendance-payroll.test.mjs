import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
  console.log("================================================================================");
  console.log("  TEST SUITE: RBAC Role Separation, Face Attendance & Payroll by Attendance");
  console.log("================================================================================");

  // --------------------------------------------------------------------------
  // TEST 1: Verification of Demo Switcher Removal & Static Identity in Shell.tsx
  // --------------------------------------------------------------------------
  console.log("\n-> TC-RBAC-01: Verifying Demo Role Switcher has been eliminated from Shell.tsx...");
  const shellContent = fs.readFileSync(path.join(__dirname, "../apps/web/src/components/Shell.tsx"), "utf8");

  assert.ok(
    !shellContent.includes("Chuyển đổi vai trò thẩm định (Demo)"),
    "Demo Switcher dropdown text must NOT exist in Shell.tsx"
  );
  assert.ok(
    !shellContent.includes("ROLE_USER_MAP[rKey]"),
    "Shell.tsx must not map roles for switching"
  );
  assert.ok(
    shellContent.includes("filteredNavGroups"),
    "Shell.tsx must filter navigation groups by user role"
  );
  assert.ok(
    !shellContent.includes("roleMenuOpen"),
    "Shell.tsx must not retain roleMenuOpen state"
  );
  console.log("   ✓ Verified Demo Role Switcher is completely eliminated from Shell.tsx");

  // --------------------------------------------------------------------------
  // TEST 2: Verification of Role-Based Navigation Filtering Rules
  // --------------------------------------------------------------------------
  console.log("\n-> TC-RBAC-02: Verifying Navigation Items are strictly restricted per Role...");
  const authGuardContent = fs.readFileSync(path.join(__dirname, "../apps/web/src/components/AuthGuard.tsx"), "utf8");

  assert.ok(
    !authGuardContent.includes("Hoặc trải nghiệm nhanh với các vai trò mẫu DAU"),
    "AuthGuard must NOT offer demo switch accounts to bypass security"
  );
  assert.ok(
    authGuardContent.includes("403 Forbidden"),
    "AuthGuard must display 403 Forbidden on role mismatch"
  );

  // Check role restrictions in NAV_GROUPS
  assert.ok(
    shellContent.includes("allowedRoles: ['SYSTEM_ADMIN']"),
    "System Control Center must only be accessible to SYSTEM_ADMIN"
  );
  assert.ok(
    shellContent.includes("allowedRoles: ['HR_SPECIALIST', 'SYSTEM_ADMIN']"),
    "Contracts must only be accessible to HR and SYSTEM_ADMIN"
  );
  console.log("   ✓ Verified strict RBAC filtering and AuthGuard protection");

  // --------------------------------------------------------------------------
  // TEST 3: Verification of Face Recognition Check-in & Check-out Service Logic
  // --------------------------------------------------------------------------
  console.log("\n-> TC-FACE-01: Verifying Face Recognition Check-in & Check-out Logic...");
  const { AttendanceService } = await import("../apps/api/dist/services/attendance.service.js");

  // Status classification for 07:55 AM (Before 08:00) -> PRESENT
  const checkInBefore8 = new Date("2026-09-08T00:55:00.000Z"); // 07:55 VN time (UTC+7)
  const checkOutAfter17 = new Date("2026-09-08T10:15:00.000Z"); // 17:15 VN time (UTC+7)
  const normalResult = AttendanceService.classifyAttendanceStatus(checkInBefore8, checkOutAfter17);

  assert.strictEqual(normalResult.status, "PRESENT", "Arrival at 07:55 must be PRESENT");
  assert.ok(normalResult.hours >= 8.0, "Working hours must be >= 8.0 hours");

  // Status classification for 08:15 AM (After 08:00) -> LATE
  const checkInAfter8 = new Date("2026-09-08T01:15:00.000Z"); // 08:15 VN time (UTC+7)
  const lateResult = AttendanceService.classifyAttendanceStatus(checkInAfter8, checkOutAfter17);
  assert.strictEqual(lateResult.status, "LATE", "Arrival at 08:15 must be classified as LATE");

  // Status classification for Early Leave (Before 17:00) -> EARLY_LEAVE
  const checkOutBefore17 = new Date("2026-09-08T09:30:00.000Z"); // 16:30 VN time (UTC+7)
  const earlyResult = AttendanceService.classifyAttendanceStatus(checkInBefore8, checkOutBefore17);
  assert.strictEqual(earlyResult.status, "EARLY_LEAVE", "Departure before 17:00 must be EARLY_LEAVE");

  console.log("   ✓ Verified Face Check-in / Check-out timing and status classification (PRESENT, LATE, EARLY_LEAVE)");

  // --------------------------------------------------------------------------
  // TEST 4: Verification of Payroll Calculation Based on Attendance
  // --------------------------------------------------------------------------
  console.log("\n-> TC-PAY-01: Verifying Payroll Calculation with Attendance Deductions...");
  const { PayrollService } = await import("../apps/api/dist/services/payroll.service.js");

  // Scenario A: Full 22/22 attendance
  const payslipFull = PayrollService.computeSinglePayslip({
    employeeId: "DAU260003-ID",
    employeeName: "ThS. Nguyễn Văn An",
    employeeCode: "DAU260003",
    departmentName: "Khoa Kiến trúc",
    academicTitle: "MASTER",
    positionName: "Giảng viên",
    positionCode: "GIANG_VIEN",
    month: 9,
    year: 2026,
    salaryCoefficient: 4.98,
    hireYear: 2020,
    kpiRanking: "A",
    dependentCount: 0,
    standardWorkDays: 22,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    overtimeTeachingHours: 7.5,
  });

  assert.strictEqual(payslipFull.standardWorkDays, 22);
  assert.strictEqual(payslipFull.actualWorkDays, 22);
  assert.strictEqual(payslipFull.unpaidLeaveDays, 0);
  assert.strictEqual(payslipFull.workDaysDeduction, 0, "Full attendance must have 0 deduction");

  // Scenario B: 21/22 attendance (1 day missing from biometric check-ins)
  const payslipMiss1 = PayrollService.computeSinglePayslip({
    employeeId: "DAU260003-ID",
    employeeName: "ThS. Nguyễn Văn An",
    employeeCode: "DAU260003",
    departmentName: "Khoa Kiến trúc",
    academicTitle: "MASTER",
    positionName: "Giảng viên",
    positionCode: "GIANG_VIEN",
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

  const expectedDeduction1 = Math.round((payslipMiss1.baseSalary / 22) * 1);
  assert.strictEqual(payslipMiss1.actualWorkDays, 21);
  assert.strictEqual(payslipMiss1.unpaidLeaveDays, 1);
  assert.strictEqual(payslipMiss1.workDaysDeduction, expectedDeduction1, "Missing 1 day must deduct baseSalary / 22");
  assert.strictEqual(
    payslipFull.grossIncome - payslipMiss1.grossIncome,
    expectedDeduction1,
    "Gross income must decrease exactly by workDaysDeduction"
  );

  // Scenario C: 18/22 attendance (4 days missing)
  const payslipMiss4 = PayrollService.computeSinglePayslip({
    employeeId: "DAU260003-ID",
    employeeName: "ThS. Nguyễn Văn An",
    employeeCode: "DAU260003",
    departmentName: "Khoa Kiến trúc",
    academicTitle: "MASTER",
    positionName: "Giảng viên",
    positionCode: "GIANG_VIEN",
    month: 9,
    year: 2026,
    salaryCoefficient: 4.98,
    hireYear: 2020,
    kpiRanking: "A",
    dependentCount: 0,
    standardWorkDays: 22,
    actualWorkDays: 18,
    unpaidLeaveDays: 4,
    overtimeTeachingHours: 0,
  });

  const expectedDeduction4 = Math.round((payslipMiss4.baseSalary / 22) * 4);
  assert.strictEqual(payslipMiss4.workDaysDeduction, expectedDeduction4);
  console.log(`   ✓ Verified Attendance-to-Salary Deduction: 22 days = 0đ | 21 days = -${expectedDeduction1.toLocaleString()}đ | 18 days = -${expectedDeduction4.toLocaleString()}đ`);

  console.log("\n================================================================================");
  console.log("  ALL TESTS PASSED: 4/4 Verification Modules Succeeded (100% Green)");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
