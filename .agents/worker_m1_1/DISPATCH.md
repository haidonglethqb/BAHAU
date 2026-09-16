## 2026-09-16T14:24:44Z
<USER_REQUEST>
Your identity: worker_m1_1
Your working directory: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\worker_m1_1
You MUST read the authoritative user request at: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md before starting work.
Also read the master project plan at: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\orchestrator_1\PROJECT.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

You are assigned to implement Milestone 1: Foundation & Database Package (@bahau/database).

Authoritative blueprints and handoff reports from Explorers:
1. Explorer 1 (Prisma Schema, Models, Package Config):
   c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_1\handoff.md
2. Explorer 2 (Seed Data Script, DAU Structure, 5 Roles, Password Hashing):
   c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_2\handoff.md
3. Explorer 3 (Contracts TS7022 Fix, Workspace Linking, Build Commands):
   c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_3\handoff.md

Your exclusive write ownership:
- packages/contracts/src/unit/index.ts
- packages/contracts/package.json
- packages/database/** (all files under packages/database)
- .env (if needed to copy from .env.example)

Required implementation steps:
Step 1: Fix `packages/contracts/src/unit/index.ts` recursive type annotation for `OrganizationalUnitDtoSchema` (`z.ZodType<OrganizationalUnitDto>`) and verify exports in `packages/contracts/package.json` as specified in `explorer_m1_3/handoff.md`.
Step 2: Create `packages/database/package.json` and `packages/database/tsconfig.json` as specified in `explorer_m1_1/handoff.md`.
Step 3: Create `packages/database/src/client.ts` and `packages/database/src/index.ts` with singleton PrismaClient export (`./client.js`).
Step 4: Create `packages/database/prisma/schema.prisma` with all 15 models and 14 enums as specified in `explorer_m1_1/handoff.md`.
Step 5: Create `packages/database/prisma/seed.ts` with complete DAU organizational structure, 5 sample role accounts (+ Rector), password hashing, and circular FK resolution as specified in `explorer_m1_2/handoff.md`.
Step 6: Run `npm.cmd install` at root to install dependencies and link npm workspaces.
Step 7: Run `npm.cmd run db:generate` (or `npm.cmd run generate --workspace=@bahau/database`) and verify clean code generation.
Step 8: Run `npm.cmd run build --workspace=@bahau/contracts` and `npm.cmd run build --workspace=@bahau/database` and verify TypeScript compiles without error.

NOTE on Windows environment:
All commands must use `npm.cmd` or `npx.cmd` to bypass PowerShell script execution policy.

When done, write a comprehensive handoff report to:
c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\worker_m1_1\handoff.md
Include:
- Files modified/created
- Exact commands executed and their full console outputs
- Build & generation status
- Verification evidence
Update progress.md with your liveness.
Send a message to your parent with the handoff path.
</USER_REQUEST>
