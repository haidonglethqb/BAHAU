## 2026-09-16T15:04:36Z
You are spec_miner_m2_2 (replacing failed spec_miner_m2_1).
Your working directory is: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_m2_1
The authoritative user request is in: c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md
Read:
- c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\ORIGINAL_REQUEST.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\requirements\api-standards.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\architecture\system-overview.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\docs\requirements\rbac-matrix.md
- c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\orchestrator_1_gen2\PROJECT.md

Extract and document the exact technical requirements from `api-standards.md` and related docs for `apps/api`:
1. Success Response Envelope: Format, status code, meta fields (timestamp ISO-8601, requestId UUIDv7), pagination if applicable.
2. Error Response Envelope: Error structure (code, message, details array, requestId, timestamp), standard HTTP error codes (e.g., VALIDATION_FAILED 400, UNAUTHORIZED 401, FORBIDDEN 403, NOT_FOUND 404, INTERNAL_SERVER_ERROR 500, etc.).
3. Request Tracing: `X-Request-Id` specification (UUIDv7 generation, client header propagation, propagation to response header).
4. Security & Middlewares: CORS specification (allowed origins, methods, credentials: true), Helmet configuration, cookie-parser.
5. Health Endpoint: Specification of `GET /api/v1/health` (uptime, status "ok", version, database connection check via `prisma.$queryRaw` SELECT 1).

Write your detailed extraction report to `c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\spec_miner_m2_1\handoff.md` and send a completion message to the orchestrator.
