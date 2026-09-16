# Project: BAHAU Baseline Skeleton

## Architecture
Hệ thống Quản trị Nhân sự Thông minh BAHAU cho Trường Đại học Kiến trúc Đà Nẵng (DAU).
- **Monorepo Structure**: Native npm workspaces (`packages/*`, `apps/*`), TypeScript NodeNext module resolution.
- **Packages**:
  - `@bahau/contracts`: Shared DTOs, Zod schemas, standard responses, and enums.
  - `@bahau/database`: Prisma ORM schema (PostgreSQL), singleton PrismaClient export (`prisma`), seed data (DAU organizational tree, 5 sample role accounts with password hashing).
- **Applications**:
  - `apps/api`: Backend Express TypeScript API with 4-tier layered architecture (`routes`, `controllers`, `services`, `middlewares`), security & observability middlewares (CORS, Helmet, cookie-parser, Request-Id UUIDv7, centralized error handling), and `GET /api/v1/health`.
  - `apps/web`: Frontend Next.js (App Router, TypeScript, Tailwind CSS), DAU branding, 3-Space model overview, live `<ApiHealthStatus />` component, and `/login` portal with sample credentials quick-picker.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Contracts Recursive Type Fix | Fix recursive schema typing in `packages/contracts/src/unit/index.ts` for clean TS declaration emit | M1 | Survey 3 |
| 2 | Contracts Build | Compile `@bahau/contracts` to `dist/` | M1 | Survey 3 |
| 3 | Core HR Prisma Schema | 15 models (User, Session, Role, Permission, RolePermission, RoleAssignment, OrganizationalUnit, Position, Employee, EmploymentAssignment, EmploymentContract, EmploymentEvent, FileAsset, OutboxEvent, AuditEvent) and 14 enums | M1 | Survey 1 |
| 4 | Singleton PrismaClient Export | Export singleton PrismaClient using `globalThis` cache to prevent connection exhaustion | M1 | Survey 1 |
| 5 | DAU Seed Data & 5 Role Accounts | Seed script for DAU organizational structure (BGH, 2 Khoa, 5 Bo mon, 2 Phong) and 5 role accounts with Argon2id password hashing | M1 | Survey 1 |
| 6 | Database Package Scripts | `db:generate`, `db:seed`, `db:migrate`, `build` scripts in `@bahau/database` | M1 | Survey 1 |
| 7 | Express Layered Architecture | Routes, controllers, services, middlewares, config, errors in `apps/api` | M2 | Survey 2 |
| 8 | Security & Tracing Middlewares | CORS (credentials: true), Helmet, cookie-parser, Request-Id tracing (UUIDv7) in `apps/api` | M2 | Survey 2 |
| 9 | Centralized Error Handling | Centralized error handler adhering to `api-standards.md` standard envelope | M2 | Survey 2 |
| 10 | Health Endpoint `GET /api/v1/health` | Uptime, version, database connection check, standard JSON format | M2 | Survey 2 |
| 11 | Next.js App Router Setup | Next.js 14/15 App Router, TypeScript, Tailwind CSS in `apps/web` | M3 | Survey 3 |
| 12 | BAHAU Overview & 3-Space UI | University branding, 3-Space model cards (Personal, Unit Management, HR & Admin) | M3 | Survey 3 |
| 13 | Live Backend Health Status Component | Interactive `<ApiHealthStatus />` polling `GET /api/v1/health` with retry button | M3 | Survey 3 |
| 14 | Login Portal & Sample Credentials | `/login` page with 5 sample role credentials quick-filler | M3 | Survey 3 |
| 15 | Monorepo Workspace Linkage | Verify `@bahau/contracts` and `@bahau/database` linked in root npm workspaces | M4 | ORIGINAL_REQUEST |
| 16 | db:generate Verification | Verify `npm run db:generate` generates Prisma Client with 0 errors | M4 | ORIGINAL_REQUEST |
| 17 | Full Monorepo Build Verification | Verify `npm run build` succeeds across all packages and apps with 0 type errors | M4 | ORIGINAL_REQUEST |
| 18 | API Health Check Verification | Verify Express API boots on port 4000 and responds 200 to `GET /api/v1/health` | M4 | ORIGINAL_REQUEST |
| 19 | Web App Rendering Verification | Verify Next.js boots on port 3000 and renders overview UI without runtime errors | M4 | ORIGINAL_REQUEST |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Foundation & Database Package (@bahau/database) | Fix contracts, create @bahau/database, Prisma schema, client export, seed data, db:generate | none | PLANNED |
| M2 | Backend Express API (apps/api) | Express TS layered architecture, security/observability middlewares, centralized error handling, GET /api/v1/health | M1 | PLANNED |
| M3 | Frontend Next.js Web (apps/web) | Next.js App Router, Tailwind CSS, overview UI, live ApiHealthStatus, login portal | M1 | PLANNED |
| M4 | Integration & Full Acceptance Verification | Monorepo build, db:generate, Express API boot & health check, Web render verification | M1, M2, M3 | PLANNED |

## Interface Contracts

### 1. Database Client Interface (`@bahau/database` -> `apps/api`)
```typescript
import { prisma, PrismaClient } from "@bahau/database";
// prisma is singleton instance
// prisma.$queryRaw`SELECT 1` used for health check
```

### 2. Standard Health Response Format (`apps/api` -> `apps/web`)
`GET /api/v1/health`
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptime": 12.34,
    "version": "1.0.0",
    "database": "connected"
  },
  "meta": {
    "timestamp": "2026-09-16T14:20:00.000Z",
    "requestId": "0191fa30-..."
  }
}
```

### 3. Standard Error Envelope (`apps/api` adhering to `api-standards.md`)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable message",
    "details": [],
    "requestId": "0191fa30-...",
    "timestamp": "2026-09-16T14:20:00.000Z"
  }
}
```

## Code Layout
```
c:\Users\HaiChu\Documents\GitHub\BAHAU\
├── packages/
│   ├── contracts/
│   │   ├── src/
│   │   │   ├── unit/index.ts       (Fix recursive type annotation)
│   │   │   └── ...
│   │   └── package.json
│   └── database/
│       ├── prisma/
│       │   ├── schema.prisma       (15 models, 14 enums)
│       │   └── seed.ts             (DAU tree & 5 role accounts)
│       ├── src/
│       │   ├── client.ts           (Singleton PrismaClient)
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── config/env.ts
│   │   │   ├── errors/AppError.ts
│   │   │   ├── middlewares/
│   │   │   │   ├── requestId.middleware.ts
│   │   │   │   ├── errorHandler.middleware.ts
│   │   │   │   └── security.middleware.ts
│   │   │   ├── routes/health.routes.ts
│   │   │   ├── controllers/health.controller.ts
│   │   │   ├── services/health.service.ts
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── web/
│       ├── src/
│       │   ├── app/
│       │   │   ├── layout.tsx
│       │   │   ├── page.tsx
│       │   │   ├── login/page.tsx
│       │   │   └── globals.css
│       │   └── components/
│       │       ├── ApiHealthStatus.tsx
│       │       ├── Header.tsx
│       │       └── SpaceCard.tsx
│       ├── next.config.js
│       ├── tailwind.config.ts
│       ├── tsconfig.json
│       └── package.json
├── package.json
└── tsconfig.base.json
```
