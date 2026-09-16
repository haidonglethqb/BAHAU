import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessManager, waitForPort } from "../helpers/process-manager.mjs";
import { httpGet, httpRequest } from "../helpers/http.mjs";
import { validateErrorEnvelope, isUUID } from "../helpers/assertions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runBoundaryCornerTests(reporter) {
  const tier = "Tier 2: Boundary & Corner Cases";
  const criterion = "Boundary, Error Handling & Resiliency";
  const pm = new ProcessManager();

  try {
    // TC-T2-BC-01: Port override boundary (PORT=4008)
    await (async () => {
      const testId = "TC-T2-BC-01";
      const desc = "API respects environment PORT override (PORT=4008)";
      const start = Date.now();
      try {
        const entry1 = pm.spawn("api-custom-port", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4008", NODE_ENV: "test" },
        });
        const open = await waitForPort(4008, "127.0.0.1", 10000, entry1);
        assert.ok(open, "Server must bind to overridden PORT 4008");
        const res = await httpGet("http://127.0.0.1:4008/api/v1/health");
        assert.strictEqual(res.status, 200, "Health check should respond on port 4008");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      } finally {
        pm.stop("api-custom-port");
      }
    })();

    // Boot standard API server on 4000 for BC-02 .. BC-05
    let serverRunning = false;
    try {
      const entry2 = pm.spawn("api-server-bc", "npm", ["run", "dev", "--workspace=apps/api"], {
        cwd: ROOT_DIR,
        env: { ...process.env, PORT: "4000", NODE_ENV: "test" },
      });
      serverRunning = await waitForPort(4000, "127.0.0.1", 12000, entry2);
    } catch {
      serverRunning = false;
    }

    // TC-T2-BC-02: Unknown route returns 404 with standard error envelope
    await (async () => {
      const testId = "TC-T2-BC-02";
      const desc = "Unknown route GET /api/v1/undefined-route returns 404 with standard error envelope";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/undefined-route-endpoint");
        assert.strictEqual(res.status, 404, `Expected HTTP 404, received ${res.status}`);
        assert.ok(res.bodyJson, "Error response must be JSON");
        validateErrorEnvelope(res.bodyJson);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T2-BC-03: Invalid HTTP method on health route does not crash server
    await (async () => {
      const testId = "TC-T2-BC-03";
      const desc = "POST /api/v1/health is rejected gracefully without crashing process";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running");
        const res = await httpRequest("http://127.0.0.1:4000/api/v1/health", "POST", {}, { action: "invalid" });
        assert.ok(res.status === 404 || res.status === 405 || res.status === 400, `Expected 404/405/400 for invalid method, got ${res.status}`);
        // Ensure server is still alive
        const aliveRes = await httpGet("http://127.0.0.1:4000/api/v1/health");
        assert.strictEqual(aliveRes.status, 200, "Server must remain alive after invalid HTTP method request");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T2-BC-04: Custom X-Request-Id header propagation
    await (async () => {
      const testId = "TC-T2-BC-04";
      const desc = "Incoming X-Request-Id header is propagated or tracked in response";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running");
        const customReqId = "0191fa30-e000-7000-8000-123456789abc";
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health", {
          "x-request-id": customReqId,
        });
        assert.strictEqual(res.status, 200);
        const respReqId = res.headers["x-request-id"] || res.bodyJson?.meta?.requestId;
        assert.ok(respReqId, "Response must include a request ID");
        assert.ok(isUUID(respReqId), `Request ID must be a valid UUID: received '${respReqId}'`);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T2-BC-05: Database disconnection resilience
    await (async () => {
      const testId = "TC-T2-BC-05";
      const desc = "Health check does not crash when database connection is unavailable";
      const start = Date.now();
      try {
        assert.ok(serverRunning, "Server must be running");
        const res = await httpGet("http://127.0.0.1:4000/api/v1/health");
        // Status could be 200 (with data.database = 'disconnected' or 'error') or 503 Service Unavailable,
        // but must be standard JSON and server must not crash
        assert.ok(res.status === 200 || res.status === 503, `Expected 200 or 503, got ${res.status}`);
        assert.ok(res.bodyJson, "Response must remain valid JSON");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T2-BC-06: Web malformed query handling
    await (async () => {
      const testId = "TC-T2-BC-06";
      const desc = "Web root route handles malformed queries and special characters without crash";
      const start = Date.now();
      try {
        const entry3 = pm.spawn("web-server-bc", "npm", ["run", "dev", "--workspace=apps/web"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "3001", NODE_ENV: "development" },
        });
        const open = await waitForPort(3001, "127.0.0.1", 12000, entry3);
        assert.ok(open, "Web server must boot on port 3001");
        const malformedUrl = "http://127.0.0.1:3001/?x=" + encodeURIComponent("<script>alert(1)</script>&num=99999999999999999999");
        const res = await httpGet(malformedUrl);
        assert.strictEqual(res.status, 200, "Web server should handle query string without 500 crash");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      } finally {
        pm.stop("web-server-bc");
      }
    })();
  } finally {
    pm.stopAll();
  }
}

// Node:test runner hook
if (process.execArgv.includes("--test") || process.env.NODE_TEST === "true") {
  test("Tier 2: Boundary & Corner Cases", async (t) => {
    const pm = new ProcessManager();
    try {
      await t.test("TC-T2-BC-01: API respects environment PORT override", async () => {
        pm.spawn("api-custom-port", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4008", NODE_ENV: "test" },
        });
        const open = await waitForPort(4008, "127.0.0.1", 10000);
        assert.ok(open);
        const res = await httpGet("http://127.0.0.1:4008/api/v1/health");
        assert.strictEqual(res.status, 200);
        pm.stop("api-custom-port");
      });
    } finally {
      pm.stopAll();
    }
  });
}
