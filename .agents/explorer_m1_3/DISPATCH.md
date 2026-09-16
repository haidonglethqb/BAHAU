## 2026-09-16T14:15:39Z

Your identity: explorer_m1_3
Your working directory: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_3
You MUST read the authoritative user request at: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md before starting work.
Also read:
- c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\orchestrator_1\PROJECT.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_survey_3\handoff.md

Your task:
Investigate and provide the exact fix for `@bahau/contracts` and root workspace setup:
1. In `packages/contracts/src/unit/index.ts`, locate the recursive schema definition for `OrganizationalUnitDtoSchema` and add the explicit type annotation `z.ZodType<OrganizationalUnitDto>` so that `npm.cmd run build --workspace=@bahau/contracts` succeeds without TS7022 error.
2. Verify package.json dependencies, exports, and main/types fields in `packages/contracts/package.json` to ensure clean importing from `@bahau/database`, `apps/api`, and `apps/web`.
3. Specify exact sequence of commands for root install, workspace linking, and building contracts and database.

Write your recommendation and exact fix blueprints to:
c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_3\handoff.md
Update progress.md with your liveness.
When complete, send a message to your parent with the handoff path.
