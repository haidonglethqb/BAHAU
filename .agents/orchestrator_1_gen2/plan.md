# Master Execution Plan: BAHAU Baseline Skeleton

## Overview
Completion of the Baseline Skeleton for BAHAU (HRMS Da Nang Architecture University).
- Monorepo: `@bahau/contracts`, `@bahau/database`, `apps/api`, `apps/web`.
- 40-test E2E verification suite across 4 tiers.

## Milestones & Steps

### Step 1: Initialize Orchestrator Gen 2 State
- [x] Create DISPATCH.md, BRIEFING.md
- [x] Start heartbeat cron (task-50)
- [ ] Create plan.md, progress.md, PROJECT.md, GATE_STATUS.md

### Step 2: Milestone 2 — Backend Express API (`apps/api`)
- [ ] Dispatch `worker_m2_1` (`teamwork_preview_worker`) with backend domain expertise:
  - Create `apps/api/package.json`, `apps/api/tsconfig.json`
  - Layered architecture: `config/`, `errors/`, `middlewares/`, `routes/`, `controllers/`, `services/`, `app.ts`, `server.ts`
  - Middlewares: CORS (credentials), Helmet, cookie-parser, Request-Id (UUIDv7), Centralized error handling
  - Route: `GET /api/v1/health` (status: ok, uptime, version, database connection check)
  - Verify AC4, Tier 2, and Tier 4 E2E tests (`node tests/e2e/runner.mjs --criterion=ac4`, `--tier=2`, `--tier=4`)
- [ ] Dispatch Reviewers (`reviewer_m2_1`, `reviewer_m2_2`)
- [ ] Dispatch Challenger (`challenger_m2_1`)
- [ ] Dispatch Forensic Auditor (`auditor_m2_1`)
- [ ] Milestone 2 Gate Evaluation in `GATE_STATUS.md`

### Step 3: Milestone 3 — Frontend Next.js Web (`apps/web`)
- [ ] Dispatch `worker_m3_1` (`teamwork_preview_worker`) with frontend domain expertise:
  - Create `apps/web` (Next.js App Router, TypeScript, Tailwind CSS)
  - DAU & BAHAU branding, 3-Space model overview
  - Interactive `<ApiHealthStatus />` component checking backend health
  - `/login` portal with sample credentials quick-picker
  - Verify AC5 and Tier 3 E2E tests (`node tests/e2e/runner.mjs --criterion=ac5`, `--tier=3`)
- [ ] Dispatch Reviewers (`reviewer_m3_1`, `reviewer_m3_2`)
- [ ] Dispatch Challenger (`challenger_m3_1`)
- [ ] Dispatch Forensic Auditor (`auditor_m3_1`)
- [ ] Milestone 3 Gate Evaluation in `GATE_STATUS.md`

### Step 4: Milestone 4 — Integration & Full Acceptance Gate
- [ ] Dispatch Worker / Verifier to run `node tests/e2e/runner.mjs` (all 40 tests)
- [ ] Verify monorepo build (`npm run build`) and Prisma generate (`npm run db:generate`)
- [ ] Final Forensic Audit across entire codebase
- [ ] Gate evaluation (100% test pass, clean audit)

### Step 5: Final Report
- [ ] Report completed Baseline Skeleton to Sentinel and Human User.
