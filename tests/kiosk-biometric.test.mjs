import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";

async function loadModule(relTsPath) {
  return tsImport(relTsPath, import.meta.url);
}

async function runTests() {
  console.log("================================================================================");
  console.log("  BAHAU Biometric Kiosk Verification Suite");
  console.log("================================================================================");

  const { KioskBiometricService, MAX_SNAPSHOT_CHARS } = await loadModule(
    "../apps/api/src/services/kiosk-biometric.service.ts"
  );
  const { requireKioskAccess, kioskPunch } = await loadModule(
    "../apps/api/src/controllers/attendance.controller.ts"
  );
  const {
    normalizeVnSearch,
    getDefaultEmployeePin,
    averageDescriptors,
    cosineSimilarity,
    findBestFaceMatch,
  } = await loadModule("../apps/web/src/components/kiosk/kiosk-biometrics.ts");

  const tempDir = mkdtempSync(join(tmpdir(), "bahau-kiosk-test-"));
  const biometricsPath = join(tempDir, "kiosk-biometrics.json");
  const snapshotsPath = join(tempDir, "kiosk-snapshots.json");

  try {
    // --------------------------------------------------------------------------
    // TC-KIOSK-01: enrollFace persistence across restart & deleteEnrollment
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KIOSK-01: enrollFace persistence across restart...");
    const svc1 = new KioskBiometricService(biometricsPath, snapshotsPath);
    const descriptor256 = Array.from({ length: 256 }, (_, i) => Number(((i % 17) / 100).toFixed(6)));
    const sampleJpeg = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgK";

    const enrolled = svc1.enrollFace("emp-001", descriptor256, sampleJpeg);
    assert.strictEqual(enrolled.employeeId, "emp-001");
    assert.strictEqual(enrolled.descriptor.length, 256);
    assert.strictEqual(enrolled.sampleImage, sampleJpeg);
    assert.ok(existsSync(biometricsPath), "Biometrics JSON file must be created on disk");

    // Simulate server restart with a fresh instance
    const svc2 = new KioskBiometricService(biometricsPath, snapshotsPath);
    const restored = svc2.getEnrollment("emp-001");
    assert.ok(restored, "Enrolled face record must survive server restart");
    assert.strictEqual(restored.employeeId, "emp-001");
    assert.deepStrictEqual(restored.descriptor, descriptor256);
    assert.strictEqual(restored.sampleImage, sampleJpeg);

    const allEnrollments = svc2.getAllEnrollments();
    assert.ok(allEnrollments["emp-001"], "getAllEnrollments must include emp-001");

    console.log("   ✓ enrollFace persists to disk and restores accurately across restart");

    // --------------------------------------------------------------------------
    // TC-KIOSK-02: enrollFace validation (descriptor bounds, NaN/Inf, sampleImage)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KIOSK-02: enrollFace rejects malformed descriptors & sampleImage...");

    assert.throws(
      () => svc1.enrollFace("emp-bad-1", new Array(63).fill(0.1)),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "Descriptor < 64 elements must be rejected"
    );

    assert.throws(
      () => svc1.enrollFace("emp-bad-2", new Array(513).fill(0.1)),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "Descriptor > 512 elements must be rejected"
    );

    const nanDesc = new Array(256).fill(0.1);
    nanDesc[42] = Number.NaN;
    assert.throws(
      () => svc1.enrollFace("emp-bad-3", nanDesc),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "Descriptor containing NaN must be rejected"
    );

    const infDesc = new Array(256).fill(0.1);
    infDesc[10] = Number.POSITIVE_INFINITY;
    assert.throws(
      () => svc1.enrollFace("emp-bad-4", infDesc),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "Descriptor containing Infinity must be rejected"
    );

    assert.throws(
      () => svc1.enrollFace("emp-bad-5", descriptor256, "data:text/html;base64,PHNjcmlwdD4="),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "sampleImage with non-image MIME must be rejected"
    );

    const oversizedJpeg = `data:image/jpeg;base64,${"A".repeat(MAX_SNAPSHOT_CHARS)}`;
    assert.throws(
      () => svc1.enrollFace("emp-bad-6", descriptor256, oversizedJpeg),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "sampleImage exceeding MAX_SNAPSHOT_CHARS (180KB) must be rejected"
    );

    console.log("   ✓ enrollFace strictly rejects <64, >512, NaN, Infinity, bad MIME, and >180KB");

    // --------------------------------------------------------------------------
    // TC-KIOSK-03: validateSnapshot MIME & size enforcement
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KIOSK-03: validateSnapshot MIME & 180KB size validation...");

    assert.strictEqual(svc1.validateSnapshot(undefined), null);
    assert.strictEqual(svc1.validateSnapshot(null), null);
    assert.strictEqual(svc1.validateSnapshot(""), null);

    const validJpeg = "data:image/jpeg;base64,QUJDREVGRw==";
    const validPng = "data:image/png;base64,iVBORw0KGgo=";
    const validWebp = "data:image/webp;base64,UklGRh4AAABXRUJQ";

    assert.strictEqual(svc1.validateSnapshot(validJpeg), validJpeg);
    assert.strictEqual(svc1.validateSnapshot(validPng), validPng);
    assert.strictEqual(svc1.validateSnapshot(validWebp), validWebp);

    assert.throws(
      () => svc1.validateSnapshot("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "data:text/html must be rejected"
    );

    assert.throws(
      () => svc1.validateSnapshot("data:image/svg+xml;base64,PHN2Zz4="),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "SVG data URL must be rejected"
    );

    assert.throws(
      () => svc1.validateSnapshot(oversizedJpeg),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "Snapshot > 180KB must be rejected"
    );

    assert.throws(
      () => svc1.validateSnapshot({ fake: true }),
      (err) => err.statusCode === 400 && err.code === "BAD_REQUEST",
      "Non-string snapshot must be rejected"
    );

    console.log("   ✓ validateSnapshot accepts JPEG/PNG/WebP and rejects HTML/SVG/>180KB");

    // --------------------------------------------------------------------------
    // TC-KIOSK-04: savePunchSnapshot pruning & clearDaySnapshotsForEmployee
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KIOSK-04: savePunchSnapshot date pruning & clearDaySnapshotsForEmployee...");

    svc1.savePunchSnapshot("2026-11-24", "emp-001", "checkin", validJpeg);
    svc1.savePunchSnapshot("2026-11-24", "emp-002", "checkout", validPng);
    assert.strictEqual(svc1.getPunchSnapshot("2026-11-24", "emp-001", "checkin"), validJpeg);

    // Saving on a new date automatically prunes all previous-date snapshots
    svc1.savePunchSnapshot("2026-11-25", "emp-001", "checkin", validJpeg);
    svc1.savePunchSnapshot("2026-11-25", "emp-001", "checkout", validPng);
    svc1.savePunchSnapshot("2026-11-25", "emp-002", "checkin", validWebp);

    assert.strictEqual(
      svc1.getPunchSnapshot("2026-11-24", "emp-001", "checkin"),
      null,
      "Old date snapshot must be pruned automatically"
    );
    assert.strictEqual(
      svc1.getPunchSnapshot("2026-11-24", "emp-002", "checkout"),
      null,
      "Old date snapshot for other employee must be pruned automatically"
    );
    assert.strictEqual(svc1.getPunchSnapshot("2026-11-25", "emp-001", "checkin"), validJpeg);
    assert.strictEqual(svc1.getPunchSnapshot("2026-11-25", "emp-001", "checkout"), validPng);
    assert.strictEqual(svc1.getPunchSnapshot("2026-11-25", "emp-002", "checkin"), validWebp);

    const diskSnapshots = JSON.parse(readFileSync(snapshotsPath, "utf8"));
    assert.strictEqual(Object.keys(diskSnapshots).length, 3, "Only current date snapshots remain on disk");

    // Clear only emp-001 for 2026-11-25; emp-002 must remain intact
    svc1.clearDaySnapshotsForEmployee("2026-11-25", "emp-001");
    assert.strictEqual(svc1.getPunchSnapshot("2026-11-25", "emp-001", "checkin"), null);
    assert.strictEqual(svc1.getPunchSnapshot("2026-11-25", "emp-001", "checkout"), null);
    assert.strictEqual(svc1.getPunchSnapshot("2026-11-25", "emp-002", "checkin"), validWebp);

    console.log("   ✓ savePunchSnapshot prunes old dates and clearDaySnapshotsForEmployee targets only one employee");

    // --------------------------------------------------------------------------
    // TC-KIOSK-05: computeLateMinutes & computeEarlyLeaveMinutes (VN GMT+7)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KIOSK-05: computeLateMinutes & computeEarlyLeaveMinutes (GMT+7)...");

    // 07:59 VN = 00:59Z -> 0 min late
    assert.strictEqual(svc1.computeLateMinutes("2026-11-25T00:59:00.000Z"), 0);
    // 08:00 VN = 01:00Z -> 0 min late
    assert.strictEqual(svc1.computeLateMinutes("2026-11-25T01:00:00.000Z"), 0);
    // 08:15 VN = 01:15Z -> 15 min late
    assert.strictEqual(svc1.computeLateMinutes("2026-11-25T01:15:00.000Z"), 15);

    // 17:00 VN = 10:00Z -> 0 min early leave
    assert.strictEqual(
      svc1.computeEarlyLeaveMinutes("2026-11-25T10:00:00.000Z", "2026-11-25T01:00:00.000Z"),
      0
    );
    // 16:40 VN = 09:40Z -> 20 min early leave
    assert.strictEqual(
      svc1.computeEarlyLeaveMinutes("2026-11-25T09:40:00.000Z", "2026-11-25T01:00:00.000Z"),
      20
    );
    // Overnight shift: check-in 2026-11-25 22:00 VN (15:00Z), check-out 2026-11-26 06:00 VN (2026-11-25T23:00Z) -> 0
    assert.strictEqual(
      svc1.computeEarlyLeaveMinutes("2026-11-25T23:00:00.000Z", "2026-11-25T15:00:00.000Z"),
      0
    );

    console.log("   ✓ Late and early-leave calculations accurate in GMT+7 including overnight shifts");

    // --------------------------------------------------------------------------
    // TC-KIOSK-06: Production security guards (requireKioskAccess & reset lock)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KIOSK-06: Production security guards (requireKioskAccess & reset lock)...");

    const prevNodeEnv = process.env.NODE_ENV;
    const prevKioskKey = process.env.KIOSK_API_KEY;
    try {
      process.env.NODE_ENV = "production";
      process.env.KIOSK_API_KEY = "test-kiosk-secret-key";

      // Unauthenticated without x-kiosk-key in production -> 401
      assert.throws(
        () => requireKioskAccess({ headers: {} }, {}, () => {}),
        (err) => err.statusCode === 401 && err.code === "UNAUTHENTICATED",
        "Unauthenticated kiosk access in production without key must throw 401"
      );

      // Valid x-kiosk-key in production -> passes requireKioskAccess
      let nextCalled = false;
      requireKioskAccess({ headers: { "x-kiosk-key": "test-kiosk-secret-key" } }, {}, () => {
        nextCalled = true;
      });
      assert.strictEqual(nextCalled, true);

      // mode: "reset" in production without HR/SYSADMIN role -> 403 FORBIDDEN
      await assert.rejects(
        () =>
          kioskPunch(
            {
              headers: { "x-kiosk-key": "test-kiosk-secret-key" },
              body: { employeeId: "emp-001", mode: "reset" },
            },
            {}
          ),
        (err) => err.statusCode === 403 && err.code === "FORBIDDEN",
        "Kiosk reset in production without HR/SYSADMIN role must throw 403"
      );

      await assert.rejects(
        () =>
          kioskPunch(
            {
              user: { roles: ["ROLE_EMPLOYEE"] },
              headers: {},
              body: { employeeId: "emp-001", mode: "reset" },
            },
            {}
          ),
        (err) => err.statusCode === 403 && err.code === "FORBIDDEN",
        "Employee user cannot reset kiosk attendance in production"
      );
    } finally {
      process.env.NODE_ENV = prevNodeEnv;
      if (prevKioskKey === undefined) {
        delete process.env.KIOSK_API_KEY;
      } else {
        process.env.KIOSK_API_KEY = prevKioskKey;
      }
    }

    console.log("   ✓ Production kiosk access & reset role-lock guards enforced");

    // --------------------------------------------------------------------------
    // TC-KIOSK-07: Frontend biometric pure helpers (search, PIN, cosine, match)
    // --------------------------------------------------------------------------
    console.log("\n-> TC-KIOSK-07: Frontend kiosk biometric pure helpers...");

    assert.strictEqual(normalizeVnSearch("  ThS. Nguyễn Văn  Đức  "), "ths. nguyen van duc");
    assert.strictEqual(getDefaultEmployeePin("DAU240001"), "0001");
    assert.strictEqual(getDefaultEmployeePin("DAU15"), "0015");

    const v1 = Array.from({ length: 256 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const v2 = Array.from({ length: 256 }, (_, i) => (i % 2 === 0 ? 1 : -1));
    const avg = averageDescriptors([v1, v2]);
    assert.strictEqual(avg.length, 256);
    assert.ok(cosineSimilarity(avg, v1) >= 0.999, "Identical vectors cosine similarity must be ~1");

    const best = findBestFaceMatch(avg, [
      { id: "e1", fullName: "Wrong User", employeeCode: "DAU001", faceDescriptor: new Array(256).fill(0) },
      { id: "e2", fullName: "Matched User", employeeCode: "DAU002", faceDescriptor: avg },
    ]);
    assert.ok(best, "findBestFaceMatch must find the matching enrolled employee");
    assert.strictEqual(best.employeeId, "e2");
    assert.ok(best.confidence >= 0.9);

    console.log("   ✓ Frontend pure helpers (normalizeVnSearch, PIN, averageDescriptors, findBestFaceMatch) verified");

    console.log("\n================================================================================");
    console.log("  ALL 7 KIOSK BIOMETRIC VERIFICATION TEST CASES PASSED SUCCESSFULLY!");
    console.log("================================================================================");
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error("❌ Kiosk biometric test suite failed:", err);
  process.exit(1);
});
