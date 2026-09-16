## 2026-09-16T15:03:10Z

You are explorer_m2_1.
Your working directory is: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m2_1
The authoritative user request is in: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md
Read:
- c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\orchestrator_1_gen2\PROJECT.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\worker_m1_1\handoff.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\packages\database\package.json
- c:\Users\HaiChu\Documents\GitHub\BAHAU\packages\database\src\client.ts
- c:\Users\HaiChu\Documents\GitHub\BAHAU\packages\contracts\package.json
- c:\Users\HaiChu\Documents\GitHub\BAHAU\tsconfig.base.json
- c:\Users\HaiChu\Documents\GitHub\BAHAU\package.json

Investigate the architecture and configuration needed for `apps/api`:
1. What package name, dependencies, devDependencies, and scripts should be placed in `apps/api/package.json`? Note: It must consume `@bahau/contracts` and `@bahau/database` from the monorepo.
2. What `tsconfig.json` configuration should be used in `apps/api`? (Extends `../../tsconfig.base.json`, NodeNext resolution, outDir `./dist`, rootDir `./src`).
3. Detail the 4-tier layered architecture structure for `apps/api/src/`:
   - `config/` (env parsing, defaults, PORT default 4000)
   - `errors/` (AppError base class and error hierarchies)
   - `middlewares/` (security, requestId UUIDv7, errorHandler, request logging)
   - `routes/` (health.routes.ts mounted at both `/api/v1/health` and `/health`)
   - `controllers/` (health.controller.ts)
   - `services/` (health.service.ts interacting with Prisma)
   - `app.ts` (Express application setup)
   - `server.ts` (HTTP server startup, listening on PORT, graceful shutdown with SIGINT/SIGTERM)
4. Note any ESM NodeNext import conventions (e.g. `.js` extension on relative imports) and Windows command considerations (`npm.cmd`).

Write your comprehensive findings to `c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m2_1\handoff.md` and send a completion message to the orchestrator.
