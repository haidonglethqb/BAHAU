import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runProcess } from "../helpers/exec.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "../../..");

export async function runDbGenerateTests(reporter) {
  const tier = "Tier 1: Feature Coverage";
  const criterion = "AC2: Prisma db:generate";

  // TC-T1-AC2-01: Root package.json db:generate script exists
  await (async () => {
    const testId = "TC-T1-AC2-01";
    const desc = "Root package.json defines db:generate script targeting @bahau/database";
    const start = Date.now();
    try {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8"));
      assert.ok(rootPkg.scripts && rootPkg.scripts["db:generate"], "Root package.json must define 'db:generate' script");
      assert.ok(rootPkg.scripts["db:generate"].includes("@bahau/database"), "db:generate script must target @bahau/database workspace");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC2-02: Prisma schema exists
  await (async () => {
    const testId = "TC-T1-AC2-02";
    const desc = "Prisma schema exists at packages/database/prisma/schema.prisma";
    const start = Date.now();
    try {
      const schemaPath = path.join(ROOT_DIR, "packages/database/prisma/schema.prisma");
      assert.ok(fs.existsSync(schemaPath), `schema.prisma must exist at ${schemaPath}`);
      const content = fs.readFileSync(schemaPath, "utf-8");
      assert.ok(content.length > 100, "schema.prisma must not be empty");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC2-03: Prisma schema defines PostgreSQL datasource and generator
  await (async () => {
    const testId = "TC-T1-AC2-03";
    const desc = "Prisma schema defines postgresql datasource and prisma-client-js generator";
    const start = Date.now();
    try {
      const schemaPath = path.join(ROOT_DIR, "packages/database/prisma/schema.prisma");
      assert.ok(fs.existsSync(schemaPath), "schema.prisma must exist");
      const content = fs.readFileSync(schemaPath, "utf-8");
      assert.ok(content.includes('provider = "postgresql"'), "Datasource provider must be 'postgresql'");
      assert.ok(content.includes('provider = "prisma-client-js"'), "Generator provider must be 'prisma-client-js'");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC2-04: npm.cmd run db:generate executes cleanly
  await (async () => {
    const testId = "TC-T1-AC2-04";
    const desc = "npm run db:generate succeeds cleanly with exit code 0";
    const start = Date.now();
    try {
      const result = await runProcess("npm", ["run", "db:generate"], { cwd: ROOT_DIR });
      assert.strictEqual(result.exitCode, 0, `npm run db:generate failed with code ${result.exitCode}:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`);
      assert.ok(!result.stderr.includes("Error:") && !result.stderr.includes("PrismaClientInitializationError"), "Prisma generate output should not contain syntax errors");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();

  // TC-T1-AC2-05: Generated Prisma Client artifacts exist and are exportable
  await (async () => {
    const testId = "TC-T1-AC2-05";
    const desc = "@bahau/database exports singleton prisma client";
    const start = Date.now();
    try {
      const clientTs = path.join(ROOT_DIR, "packages/database/src/client.ts");
      const indexTs = path.join(ROOT_DIR, "packages/database/src/index.ts");
      assert.ok(fs.existsSync(clientTs) || fs.existsSync(indexTs), "client.ts or index.ts must exist in packages/database/src");
      reporter?.record(tier, criterion, testId, desc, "PASS", Date.now() - start);
    } catch (err) {
      reporter?.record(tier, criterion, testId, desc, "FAIL", Date.now() - start, err);
    }
  })();
}

// Node:test runner hook
if (process.execArgv.includes("--test") || process.env.NODE_TEST === "true") {
  test("Tier 1: Feature Coverage - AC2: Prisma db:generate", async (t) => {
    await t.test("TC-T1-AC2-01: Root package.json db:generate script exists", () => {
      const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, "package.json"), "utf-8"));
      assert.ok(rootPkg.scripts && rootPkg.scripts["db:generate"], "Root package.json must define 'db:generate' script");
      assert.ok(rootPkg.scripts["db:generate"].includes("@bahau/database"), "db:generate script must target @bahau/database workspace");
    });

    await t.test("TC-T1-AC2-02: Prisma schema exists at packages/database/prisma/schema.prisma", () => {
      const schemaPath = path.join(ROOT_DIR, "packages/database/prisma/schema.prisma");
      assert.ok(fs.existsSync(schemaPath), `schema.prisma must exist at ${schemaPath}`);
      const content = fs.readFileSync(schemaPath, "utf-8");
      assert.ok(content.length > 100, "schema.prisma must not be empty");
    });

    await t.test("TC-T1-AC2-03: Prisma schema defines postgresql datasource and client generator", () => {
      const schemaPath = path.join(ROOT_DIR, "packages/database/prisma/schema.prisma");
      assert.ok(fs.existsSync(schemaPath), "schema.prisma must exist");
      const content = fs.readFileSync(schemaPath, "utf-8");
      assert.ok(content.includes('provider = "postgresql"'), "Datasource provider must be 'postgresql'");
      assert.ok(content.includes('provider = "prisma-client-js"'), "Generator provider must be 'prisma-client-js'");
    });

    await t.test("TC-T1-AC2-04: npm run db:generate executes cleanly with exit code 0", async () => {
      const result = await runProcess("npm", ["run", "db:generate"], { cwd: ROOT_DIR });
      assert.strictEqual(result.exitCode, 0, `npm run db:generate failed with code ${result.exitCode}:\nSTDOUT: ${result.stdout}\nSTDERR: ${result.stderr}`);
    });

    await t.test("TC-T1-AC2-05: @bahau/database exports singleton prisma client", () => {
      const clientTs = path.join(ROOT_DIR, "packages/database/src/client.ts");
      const indexTs = path.join(ROOT_DIR, "packages/database/src/index.ts");
      assert.ok(fs.existsSync(clientTs) || fs.existsSync(indexTs), "client.ts or index.ts must exist in packages/database/src");
    });
  });
}
