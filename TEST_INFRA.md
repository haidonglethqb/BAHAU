# BAHAU E2E Testing Track Infrastructure (TEST_INFRA.md)

## 1. Overview
This document describes the end-to-end (E2E) testing track infrastructure established for the **BAHAU Smart HRMS** monorepo (Trường Đại học Kiến trúc Đà Nẵng). The testing suite validates all architectural layers and acceptance criteria outlined in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

## 2. Methodology: 4-Tier Requirement-Driven Opaque-Box Testing
The testing suite adheres strictly to the 4-Tier Requirement-Driven Opaque-Box testing standard:
- **Tier 1: Feature Coverage** (Minimum 5 test cases per acceptance criterion, total 25 test cases).
  - AC1: `@bahau/contracts` and `@bahau/database` linked in npm workspaces
  - AC2: `npm run db:generate` succeeds cleanly
  - AC3: `npm run build` succeeds across the entire monorepo without type errors
  - AC4: Express API boots on port 4000 and `GET /api/v1/health` returns HTTP 200 with standard JSON
  - AC5: Next.js app starts on port 3000 and renders without runtime error
- **Tier 2: Boundary & Corner Cases** (6 test cases): Port overrides, unregistered route 404 envelopes, invalid HTTP methods, custom `X-Request-Id` tracing propagation, database disconnection resilience, and malformed query strings.
- **Tier 3: Cross-Feature Combinations** (5 test cases): Full monorepo build-to-run pipeline, contracts package schema consumption in API, database package client export consumption, Web `<ApiHealthStatus />` integration, and database seed script validation.
- **Tier 4: Real-World Scenarios** (4 test cases): Cold boot and readiness latency probe (<15s), high-burst concurrency (50 parallel requests with unique UUID tracking), graceful process shutdown with port release (<5s), and environment consistency (`NODE_ENV=production` vs `development`).

**Total Test Count:** 40 authoritative, automated test cases.

---

## 3. Directory Layout
All test runners, suites, helpers, and generated artifacts reside within `tests/e2e/`:

```text
tests/
└── e2e/
    ├── helpers/
    │   ├── exec.mjs              # Child process runner with Windows npm.cmd normalization
    │   ├── http.mjs              # Native fetch client, headers extractor, and polling helper
    │   ├── process-manager.mjs   # Process lifecycle manager with Windows taskkill & port wait
    │   ├── assertions.mjs        # Schema validator for Health response & Error envelope (UUIDv7/v4, ISO dates)
    │   └── reporter.mjs          # Structured Markdown and JSON test result generator
    ├── tier1-feature-coverage/
    │   ├── ac1-workspaces.test.mjs    # TC-T1-AC1-01 .. 05 (Workspaces linkage)
    │   ├── ac2-db-generate.test.mjs   # TC-T1-AC2-01 .. 05 (Prisma db:generate)
    │   ├── ac3-build.test.mjs         # TC-T1-AC3-01 .. 05 (Monorepo build & typecheck)
    │   ├── ac4-api-health.test.mjs    # TC-T1-AC4-01 .. 05 (Express API & Health check)
    │   └── ac5-web-render.test.mjs    # TC-T1-AC5-01 .. 05 (Next.js web app rendering)
    ├── tier2-boundary-corner/
    │   └── boundary-corner.test.mjs   # TC-T2-BC-01 .. 06 (Edge cases & resilience)
    ├── tier3-cross-feature/
    │   └── cross-feature.test.mjs     # TC-T3-XF-01 .. 05 (Cross-package integration)
    ├── tier4-real-world/
    │   └── real-world.test.mjs        # TC-T4-RW-01 .. 04 (Cold boot, load, shutdown)
    ├── reports/
    │   ├── test-report.md             # Auto-generated Markdown summary & diagnosis
    │   └── test-report.json           # Machine-readable JSON execution output
    └── runner.mjs                     # Master test runner with tier and criteria filters
```

---

## 4. Execution Commands

### A. Full Suite (All 4 Tiers, 40 Tests)
```powershell
node tests/e2e/runner.mjs --all
```

### B. Filter by Tier
```powershell
node tests/e2e/runner.mjs --tier=1   # Runs Tier 1 (25 tests)
node tests/e2e/runner.mjs --tier=2   # Runs Tier 2 (6 tests)
node tests/e2e/runner.mjs --tier=3   # Runs Tier 3 (5 tests)
node tests/e2e/runner.mjs --tier=4   # Runs Tier 4 (4 tests)
```

### C. Filter by Acceptance Criterion
```powershell
node tests/e2e/runner.mjs --criterion=ac1   # Workspaces Linkage
node tests/e2e/runner.mjs --criterion=ac2   # Prisma db:generate
node tests/e2e/runner.mjs --criterion=ac3   # Monorepo Build & Types
node tests/e2e/runner.mjs --criterion=ac4   # Express API & Health Endpoint
node tests/e2e/runner.mjs --criterion=ac5   # Next.js Web App Rendering
```

### D. Native Node.js Test Runner Execution
```powershell
node --test tests/e2e/tier1-feature-coverage/*.test.mjs
node --test tests/e2e/**/*.test.mjs
```

---

## 5. Platform Compatibility (Windows & Linux)
- **Windows Command Normalization:** In `tests/e2e/helpers/exec.mjs`, all command invocations automatically normalize `npm` to `npm.cmd` and `npx` to `npx.cmd` on `process.platform === "win32"`.
- **Clean Process Termination:** Process cleanup uses `taskkill /pid <pid> /T /F` on Windows to eliminate orphaned or zombie Node processes and free ports immediately.
- **Zero External Test Framework Bloat:** The test suite uses native Node.js 24 runtime features (`node:test`, `node:assert`, native `fetch`), ensuring zero dependency installation blockers.
