## 2026-09-16T14:11:17Z
Your identity: spec_miner_survey_2
Your working directory: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_survey_2
You MUST read the authoritative user request at: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md before starting work.

Your task:
Thoroughly inspect and document all specifications and technical requirements for Requirement R2: Ứng dụng Backend API (apps/api).
Authoritative sources to inspect:
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\requirements\api-standards.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\architecture\system-overview.md
- Existing apps/api files, package.json, tsconfig.json, directory structure.

Required outputs in c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_survey_2\handoff.md:
1. Architectural structure for Express TypeScript (routes, controllers, services, middlewares, config).
2. Security & Observability middlewares required:
   - CORS configuration
   - Helmet security headers
   - cookie-parser
   - Request-Id tracing (UUIDv7)
   - Centralized Error Handling strictly adhering to api-standards.md (standard error response format, status codes, error classes, logging).
3. Endpoint specification for GET /api/v1/health:
   - Response structure: `{ "success": true, "data": { "status": "ok", "uptime": ..., "version": ..., "database": "connected" | ... } }`
   - How database health should be checked via PrismaClient singleton.
4. Port configurations (default 4000), environment variables, package dependencies, and scripts.
