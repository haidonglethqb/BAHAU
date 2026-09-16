# Orchestrator Execution Plan: BAHAU Baseline Skeleton

## Objective
Deliver a production-ready Baseline Skeleton for the BAHAU Human Resources Management System at Trường Đại học Kiến trúc Đà Nẵng (UDA), meeting all functional and technical criteria in `ORIGINAL_REQUEST.md`.

## Execution Phases

### Phase 0: Survey & Requirements Mining (Parallel Explorers)
- Dispatch 3 Explorers/Spec Miners:
  1. Explorer 1 (Database & Domain Model): Inspect `docs/architecture/domain-model.md`, existing `@bahau/database`, package configuration, Prisma setup, PostgreSQL configs, seed requirements (UDA structure & 5 role accounts).
  2. Explorer 2 (Backend API & Security/Observability): Inspect `docs/requirements/api-standards.md`, `apps/api` current status/scaffolding, Express TS requirements, CORS, Helmet, cookie-parser, UUIDv7 request-id, centralized error handler, `GET /api/v1/health` with DB connectivity.
  3. Explorer 3 (Frontend Web & Monorepo Integration): Inspect `apps/web` current status, Next.js App Router, Tailwind CSS, `@bahau/contracts`, root `package.json`, workspace linkages, build scripts (`npm run db:generate`, `npm run build`), and end-to-end verification.

### Phase 1: PROJECT.md Finalization
- Synthesize findings into `c:\Users\HaiChu\Documents\GitHub\BAHAU\PROJECT.md`.
- Establish Feature Inventory, Architecture, Code Layout, and Interface Contracts.

### Phase 2: Milestone 1 - @bahau/database Package
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate.
- Implement full Prisma schema for Module 1 (Core HR).
- Implement Seed data for Trường Đại học Kiến trúc Đà Nẵng and 5 sample role accounts with bcrypt/argon2 hashing.
- Singleton PrismaClient export and package scripts (`db:generate`, `db:seed`, etc.).

### Phase 3: Milestone 2 - apps/api Service
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate.
- Implement Express TypeScript layered structure (routes, controllers, services, middlewares).
- Integrate CORS, Helmet, cookie-parser, UUIDv7 request-id tracing, centralized error handling adhering to `docs/requirements/api-standards.md`.
- Endpoint `GET /api/v1/health` with uptime, API version, and DB connectivity status.

### Phase 4: Milestone 3 - apps/web Application
- Explorer -> Worker -> Reviewers (2) -> Challengers (2) -> Forensic Auditor -> Gate.
- Next.js (App Router, TypeScript, Tailwind CSS) in `apps/web`.
- UI showing BAHAU system overview, backend API health status, login navigation.

### Phase 5: Milestone 4 - Integration, End-to-End Verification & Acceptance Gate
- Full monorepo verification:
  - `@bahau/contracts` & `@bahau/database` linked in npm workspaces
  - `npm run db:generate` succeeds cleanly
  - `npm run build` succeeds cleanly across all apps & packages
  - Express API boots and responds 200 to `GET /api/v1/health`
  - Next.js boots and renders cleanly

### Phase 6: Final Reporting & Handoff
- Produce comprehensive report, verify all criteria, notify Sentinel via `send_message`.
