import assert from "node:assert/strict";
import { httpGet, httpRequest } from "./e2e/helpers/http.mjs";
import { ProcessManager, waitForPort } from "./e2e/helpers/process-manager.mjs";

async function runAuthTests() {
  console.log("=== Running Auth Module Endpoint Tests ===");
  const pm = new ProcessManager();

  try {
    const entry = pm.spawn("api-auth-test", "npm", ["run", "dev", "--workspace=apps/api"], {
      cwd: process.cwd(),
      env: { ...process.env, PORT: "4010", NODE_ENV: "test" },
    });

    const ready = await waitForPort(4010, "127.0.0.1", 12000, entry);
    assert.ok(ready, "API must boot on port 4010");

    // Test 1: Invalid email format -> 422
    console.log("-> Test 1: Invalid email validation (422)...");
    const resInvalid = await httpRequest("http://127.0.0.1:4010/api/v1/auth/login", "POST", {}, {
      email: "not-an-email",
      password: "123",
    });
    assert.strictEqual(resInvalid.status, 422);
    assert.strictEqual(resInvalid.bodyJson?.success, false);
    assert.strictEqual(resInvalid.bodyJson?.error?.code, "VALIDATION_FAILED");
    console.log("   ✓ Passed 422 validation");

    // Test 2: Unauthenticated /auth/me -> 401
    console.log("-> Test 2: GET /auth/me unauthenticated (401)...");
    const resMe = await httpGet("http://127.0.0.1:4010/api/v1/auth/me");
    assert.strictEqual(resMe.status, 401);
    assert.strictEqual(resMe.bodyJson?.success, false);
    assert.strictEqual(resMe.bodyJson?.error?.code, "UNAUTHENTICATED");
    console.log("   ✓ Passed 401 unauthenticated check");

    // Test 3: Login attempt with invalid credentials / DB offline resilience
    console.log("-> Test 3: Login attempt (401 bad credentials or 503 DB offline)...");
    const resBadLogin = await httpRequest("http://127.0.0.1:4010/api/v1/auth/login", "POST", {}, {
      email: "nonexistent@dau.edu.vn",
      password: "WrongPassword@123",
    });
    console.log("   Debug Test 3:", resBadLogin.status, JSON.stringify(resBadLogin.bodyJson));
    assert.ok(
      resBadLogin.status === 401 || resBadLogin.status === 503,
      `Expected HTTP 401 or 503, received ${resBadLogin.status}`
    );
    assert.strictEqual(resBadLogin.bodyJson?.success, false);
    console.log(`   ✓ Passed login resilience check (status: ${resBadLogin.status})`);

    // Test 4: Logout endpoint -> 200
    console.log("-> Test 4: POST /auth/logout (200)...");
    const resLogout = await httpRequest("http://127.0.0.1:4010/api/v1/auth/logout", "POST", {}, {});
    assert.strictEqual(resLogout.status, 200);
    assert.strictEqual(resLogout.bodyJson?.success, true);
    console.log("   ✓ Passed 200 logout");

    console.log("\n🎉 ALL AUTH ENDPOINT TESTS PASSED SUCCESSFULLY!");
  } finally {
    pm.stopAll();
  }
}

runAuthTests().catch((err) => {
  console.error("❌ Auth test failed:", err);
  process.exit(1);
});
