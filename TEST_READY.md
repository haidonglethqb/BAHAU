# BAHAU E2E Test Readiness & Verification Matrix (TEST_READY.md)

## Status: TEST SUITE READY FOR PROGRESSIVE VERIFICATION
- **Framework:** Native Node.js 24 Test Runner + Custom 4-Tier Opaque-Box Test Harness
- **Test Scripts Root:** `tests/e2e/`
- **Total Test Cases:** 40
- **Current Baseline Run:** 40 Executed | 6 Passed (Base Structure & Config) | 34 Failed (Awaiting M1-M3 Implementations)

---

## 1. Feature Coverage & Traceability Matrix

### Tier 1: Feature Coverage (25 Tests)
| Test ID | Scope | Requirement / Acceptance Criterion | Expected Output Source | Current Status |
|---------|-------|-----------------------------------|------------------------|----------------|
| `TC-T1-AC1-01` | AC1 | Root `package.json` declares `packages/*` and `apps/*` workspaces | ORIGINAL_REQUEST.md AC1 | ✅ PASS |
| `TC-T1-AC1-02` | AC1 | `packages/contracts/package.json` exists with name `@bahau/contracts` | ORIGINAL_REQUEST.md AC1 | ✅ PASS |
| `TC-T1-AC1-03` | AC1 | `packages/database/package.json` exists with name `@bahau/database` | ORIGINAL_REQUEST.md AC1 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC1-04` | AC1 | `npm query .workspace` recognizes `@bahau/contracts` and `@bahau/database` | ORIGINAL_REQUEST.md AC1 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC1-05` | AC1 | `@bahau/contracts` and `@bahau/database` linked in root `node_modules/@bahau` | ORIGINAL_REQUEST.md AC1 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC2-01` | AC2 | Root `package.json` defines `db:generate` targeting `@bahau/database` | ORIGINAL_REQUEST.md AC2 | ✅ PASS |
| `TC-T1-AC2-02` | AC2 | Prisma schema exists at `packages/database/prisma/schema.prisma` | ORIGINAL_REQUEST.md AC2 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC2-03` | AC2 | Prisma schema defines `postgresql` datasource and `prisma-client-js` generator | ORIGINAL_REQUEST.md AC2 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC2-04` | AC2 | `npm run db:generate` executes cleanly with exit code 0 | ORIGINAL_REQUEST.md AC2 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC2-05` | AC2 | `@bahau/database` exports singleton `prisma` client | PROJECT.md Interface 1 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC3-01` | AC3 | Root `package.json` defines `build` script with `--workspaces` | ORIGINAL_REQUEST.md AC3 | ✅ PASS |
| `TC-T1-AC3-02` | AC3 | `tsconfig.base.json` exists and enforces strict type checking (`strict: true`) | ORIGINAL_REQUEST.md AC3 | ✅ PASS |
| `TC-T1-AC3-03` | AC3 | `npm run build` completes across entire monorepo with exit code 0 | ORIGINAL_REQUEST.md AC3 | ❌ FAIL (M1-M3 Pending) |
| `TC-T1-AC3-04` | AC3 | Build stdout/stderr contains zero TypeScript diagnostics errors (`TSxxxx`) | ORIGINAL_REQUEST.md AC3 | ✅ PASS (No TS errors) |
| `TC-T1-AC3-05` | AC3 | `@bahau/contracts` emits compiled `dist/` artifacts (`.js` and `.d.ts`) | PROJECT.md Feature 2 | ❌ FAIL (M1 Pending) |
| `TC-T1-AC4-01` | AC4 | `apps/api` package manifest and source entrypoints exist | ORIGINAL_REQUEST.md AC4 | ❌ FAIL (M2 Pending) |
| `TC-T1-AC4-02` | AC4 | Express API boots successfully and opens port 4000 | ORIGINAL_REQUEST.md AC4 | ❌ FAIL (M2 Pending) |
| `TC-T1-AC4-03` | AC4 | `GET /api/v1/health` returns HTTP 200 and `Content-Type: application/json` | ORIGINAL_REQUEST.md AC4 | ❌ FAIL (M2 Pending) |
| `TC-T1-AC4-04` | AC4 | Health response matches standard `{ success: true, data: { status: 'ok', ... }, meta: { ... } }` | PROJECT.md Interface 2 | ❌ FAIL (M2 Pending) |
| `TC-T1-AC4-05` | AC4 | Response includes `X-Request-Id` (UUID) and Helmet headers (`nosniff`) | PROJECT.md Feature 8 | ❌ FAIL (M2 Pending) |
| `TC-T1-AC5-01` | AC5 | `apps/web` package manifest and App Router structure exist (`page.tsx`) | ORIGINAL_REQUEST.md AC5 | ❌ FAIL (M3 Pending) |
| `TC-T1-AC5-02` | AC5 | Next.js web app starts successfully and listens on port 3000 | ORIGINAL_REQUEST.md AC5 | ❌ FAIL (M3 Pending) |
| `TC-T1-AC5-03` | AC5 | `GET http://127.0.0.1:3000/` responds with HTTP 200 OK | ORIGINAL_REQUEST.md AC5 | ❌ FAIL (M3 Pending) |
| `TC-T1-AC5-04` | AC5 | Rendered HTML contains valid `<!DOCTYPE html>` and DAU/BAHAU branding | ORIGINAL_REQUEST.md AC5 | ❌ FAIL (M3 Pending) |
| `TC-T1-AC5-05` | AC5 | HTML response contains zero unhandled exception overlays or crashes | ORIGINAL_REQUEST.md AC5 | ❌ FAIL (M3 Pending) |

---

### Tier 2: Boundary & Corner Cases (6 Tests)
| Test ID | Scope | Boundary / Corner Scenario | Expected Behavior | Current Status |
|---------|-------|----------------------------|-------------------|----------------|
| `TC-T2-BC-01` | Edge | Environment variable `PORT` override | API binds and serves on `PORT=4008` | ❌ FAIL (M2 Pending) |
| `TC-T2-BC-02` | Edge | Unknown route `GET /api/v1/undefined-route` | Returns HTTP 404 with standard error envelope | ❌ FAIL (M2 Pending) |
| `TC-T2-BC-03` | Edge | Invalid HTTP method `POST /api/v1/health` | Rejected gracefully (404/405) without crashing API | ❌ FAIL (M2 Pending) |
| `TC-T2-BC-04` | Edge | Custom client `X-Request-Id` header | Traced or propagated with valid UUID format | ❌ FAIL (M2 Pending) |
| `TC-T2-BC-05` | Edge | Database disconnection resilience | Health check responds gracefully without process crash | ❌ FAIL (M2 Pending) |
| `TC-T2-BC-06` | Edge | Web malformed query strings & scripts | Next.js root route renders cleanly without 500 error | ❌ FAIL (M3 Pending) |

---

### Tier 3: Cross-Feature Combinations (5 Tests)
| Test ID | Scope | Cross-Feature Interaction | Expected Behavior | Current Status |
|---------|-------|---------------------------|-------------------|----------------|
| `TC-T3-XF-01` | Integration | Full build -> API boot flow | `npm run build` succeeds, then API boots and responds 200 | ❌ FAIL (M1-M3 Pending) |
| `TC-T3-XF-02` | Integration | Contracts consumption in API | `apps/api` depends on and imports `@bahau/contracts` | ❌ FAIL (M2 Pending) |
| `TC-T3-XF-03` | Integration | Database client consumption in API | `apps/api` depends on and imports `@bahau/database` | ❌ FAIL (M2 Pending) |
| `TC-T3-XF-04` | Integration | Web to API Live Health component | `<ApiHealthStatus />` component exists in `apps/web` | ❌ FAIL (M3 Pending) |
| `TC-T3-XF-05` | Integration | Database seed script | `npm run db:seed` defined and `seed.ts` exists | ❌ FAIL (M1 Pending) |

---

### Tier 4: Real-World Scenarios (4 Tests)
| Test ID | Scope | Real-World Scenario | Acceptance Threshold | Current Status |
|---------|-------|---------------------|----------------------|----------------|
| `TC-T4-RW-01` | Readiness | Cold boot & readiness probe latency | API boots and responds 200 within 15 seconds | ❌ FAIL (M2 Pending) |
| `TC-T4-RW-02` | Concurrency | Burst health polling (50 concurrent requests) | 100% success rate (50/50 HTTP 200) with 50 unique Request-Ids | ❌ FAIL (M2 Pending) |
| `TC-T4-RW-03` | Lifecycle | Graceful process termination & port release | Process terminates and releases port 4005 within 5 seconds | ❌ FAIL (M2 Pending) |
| `TC-T4-RW-04` | Environment | Production vs Development consistency | Schema remains consistent under `NODE_ENV=production` | ❌ FAIL (M2 Pending) |

---

## 2. Progressive Verification Roadmap for Implementing Agents
Implementing agents should run their respective criteria checks as milestones complete:

1. **Milestone 1 Completion Verification:**
   ```powershell
   node tests/e2e/runner.mjs --criterion=ac1
   node tests/e2e/runner.mjs --criterion=ac2
   ```
   *Expected: All 5 tests for AC1 and all 5 tests for AC2 turn GREEN.*

2. **Milestone 2 Completion Verification:**
   ```powershell
   node tests/e2e/runner.mjs --criterion=ac4
   node tests/e2e/runner.mjs --tier=2
   node tests/e2e/runner.mjs --tier=4
   ```
   *Expected: All AC4, Tier 2, and Tier 4 tests turn GREEN.*

3. **Milestone 3 Completion Verification:**
   ```powershell
   node tests/e2e/runner.mjs --criterion=ac5
   node tests/e2e/runner.mjs --tier=3
   ```
   *Expected: All AC5 and Tier 3 tests turn GREEN.*

4. **Milestone 4 Final Acceptance Gate:**
   ```powershell
   node tests/e2e/runner.mjs --all
   ```
   *Expected: 40/40 tests PASS (100% pass rate) with 0 exit code.*
