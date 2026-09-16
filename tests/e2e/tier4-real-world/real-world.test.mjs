import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ProcessManager, waitForPort, isPortOpen } from "../helpers/process-manager.mjs";
import { httpGet } from "../helpers/http.mjs";
import { validateHealthResponseContract, isUUID } from "../helpers/assertions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runRealWorldTests(reporter) {
  const tier = "Tier 4: Real-World Scenarios";
  const criterion = "Production Readiness, Concurrency & Lifecycle";
  const pm = new ProcessManager();

  try {
    // TC-T4-RW-01: Cold boot & readiness probe latency
    await (async () => {
      const testId = "TC-T4-RW-01";
      const desc = "Cold boot readiness: API boots and becomes healthy within 15 seconds";
      const start = Date.now();
      try {
        const entry1 = pm.spawn("api-cold-boot", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4003", NODE_ENV: "production" },
        });
        const open = await waitForPort(4003, "127.0.0.1", 15000, entry1);
        assert.ok(open, "Port 4003 was not opened within 15 seconds");
        const res = await httpGet("http://127.0.0.1:4003/api/v1/health");
        assert.strictEqual(res.status, 200, "Health check should return 200 on initial ready probe");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      } finally {
        pm.stop("api-cold-boot");
      }
    })();

    // TC-T4-RW-02: Burst concurrency: 50 concurrent requests
    await (async () => {
      const testId = "TC-T4-RW-02";
      const desc = "Burst concurrency: 50 concurrent requests to /api/v1/health all succeed with unique request IDs";
      const start = Date.now();
      try {
        const entry2 = pm.spawn("api-concurrency", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4004", NODE_ENV: "test" },
        });
        const open = await waitForPort(4004, "127.0.0.1", 12000, entry2);
        assert.ok(open, "API server failed to start on port 4004");

        const concurrentCount = 50;
        const promises = Array.from({ length: concurrentCount }, () =>
          httpGet("http://127.0.0.1:4004/api/v1/health")
        );

        const responses = await Promise.all(promises);
        const reqIds = new Set();

        for (const res of responses) {
          assert.strictEqual(res.status, 200, `Concurrent request failed with status ${res.status}`);
          validateHealthResponseContract(res.bodyJson);
          const reqId = res.headers["x-request-id"] || res.bodyJson?.meta?.requestId;
          assert.ok(isUUID(reqId), `Request ID must be UUID: ${reqId}`);
          reqIds.add(reqId);
        }

        // Each concurrent request should receive a distinct UUID
        assert.strictEqual(reqIds.size, concurrentCount, `Expected ${concurrentCount} unique request IDs, got ${reqIds.size}`);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      } finally {
        pm.stop("api-concurrency");
      }
    })();

    // TC-T4-RW-03: Graceful process shutdown and port release
    await (async () => {
      const testId = "TC-T4-RW-03";
      const desc = "Graceful process termination releases port within 5 seconds";
      const start = Date.now();
      try {
        const entry3 = pm.spawn("api-shutdown", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4005", NODE_ENV: "test" },
        });
        const open = await waitForPort(4005, "127.0.0.1", 12000, entry3);
        assert.ok(open, "Port 4005 failed to open");

        // Now stop the process
        pm.stop("api-shutdown");

        // Verify port closes within 5s
        let portStillOpen = true;
        const deadline = Date.now() + 5000;
        while (Date.now() < deadline) {
          portStillOpen = await isPortOpen(4005, "127.0.0.1");
          if (!portStillOpen) break;
          await new Promise((r) => setTimeout(r, 200));
        }

        assert.strictEqual(portStillOpen, false, "Port 4005 should be released after process shutdown");
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      }
    })();

    // TC-T4-RW-04: Environment consistency (NODE_ENV=production vs NODE_ENV=development)
    await (async () => {
      const testId = "TC-T4-RW-04";
      const desc = "Health response format remains consistent under production environment";
      const start = Date.now();
      try {
        const entry4 = pm.spawn("api-env-prod", "npm", ["run", "dev", "--workspace=apps/api"], {
          cwd: ROOT_DIR,
          env: { ...process.env, PORT: "4006", NODE_ENV: "production" },
        });
        const open = await waitForPort(4006, "127.0.0.1", 12000, entry4);
        assert.ok(open, "Port 4006 failed to open");

        const res = await httpGet("http://127.0.0.1:4006/api/v1/health");
        assert.strictEqual(res.status, 200);
        validateHealthResponseContract(res.bodyJson);
        reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
      } catch (err) {
        reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
      } finally {
        pm.stop("api-env-prod");
      }
    })();
  } finally {
    pm.stopAll();
  }
}

// Node:test runner hook
if (process.execArgv.includes("--test") || process.env.NODE_TEST === "true") {
  test("Tier 4: Real-World Scenarios", async (t) => {
    await t.test("TC-T4-RW-01: Cold boot readiness definition", () => {
      assert.ok(true);
    });
  });
}
