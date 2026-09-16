# BRIEFING — 2026-09-16T14:23:00Z

## Mission
Investigate and design the exact production-ready Seed Data script (`packages/database/prisma/seed.ts`) for Milestone 1 (@bahau/database) reflecting Trường Đại học Kiến trúc Đà Nẵng (DAU).

## 🔒 My Identity
- Archetype: explorer
- Roles: Teamwork explorer (investigation, synthesis, blueprint generation)
- Working directory: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_2
- Original parent: 452617c6-00e4-447c-8dae-ffaffcf75a75
- Milestone: Milestone 1 (@bahau/database)

## 🔒 Key Constraints
- Read-only investigation — do NOT implement code outside .agents/
- Provide exact, production-ready blueprint for `packages/database/prisma/seed.ts`
- Reflect Trường Đại học Kiến trúc Đà Nẵng organizational structure
- Windows node-gyp compatibility for Argon2 hashing (@node-rs/argon2 with fallback)
- Circular FK resolution (Units created first -> Employees created -> managerEmployeeId updated)
- 5 sample role accounts (+ Rector) with precise assignments and matrix data scopes

## Current Parent
- Conversation ID: 452617c6-00e4-447c-8dae-ffaffcf75a75
- Updated: 2026-09-16T14:23:00Z

## Investigation State
- **Explored paths**:
  - `docs/architecture/domain-model.md`
  - `docs/requirements/rbac-matrix.md`
  - `docs/requirements/module-01-core-hr-prd.md`
  - `packages/contracts/src/auth/index.ts`
  - `.agents/spec_miner_survey_1/handoff.md`
  - `.agents/orchestrator_1/PROJECT.md`
  - `.agents/explorer_survey_3/handoff.md`
- **Key findings**:
  - Circular FK: `OrganizationalUnit.managerEmployeeId` points to `Employee.id`, and `EmploymentAssignment.unitId` points to `OrganizationalUnit.id`. Must seed Units with `managerEmployeeId: null`, then Employees, then update Units.
  - Windows node-gyp C++ compiler issue is avoided by using `@node-rs/argon2` with a robust dev fallback pre-calculated Argon2id hash.
  - Exactly 10 units cover DAU structure (BGH, K_KT, BM_KTCT, BM_LLLS, BM_KTNT, K_XD, BM_DDCN, BM_KCVL, P_TCHC, P_DT).
  - Exactly 12 positions, 5 roles, 26 granular permissions, and full role-permission mapping.
  - 5 official sample accounts (+ Rector) fully wired to User, Employee, Assignment, and RoleAssignment with scopes (`ALL`, `TREE: K_KT`, `SELF`).
  - 100% idempotent via `upsert` and unique checks.
- **Unexplored areas**: None for seed data specification. Downstream implementation belongs to engineer/builder agents.

## Key Decisions Made
- Chose `@node-rs/argon2` with verified fallback constant for `"Admin@123456"`.
- Resolved circular FKs through a 10-step insertion pipeline.
- Made all seed operations idempotent so `db:seed` can be rerun repeatedly.

## Artifact Index
- DISPATCH.md — record of initial dispatch
- BRIEFING.md — persistent state memory
- progress.md — liveness heartbeat
- handoff.md — final comprehensive handoff report with complete `seed.ts` blueprint
