# Handoff Report — Explorer Survey 3: Monorepo Architecture, apps/web & Acceptance Criteria

**Agent Identity**: `explorer_survey_3`  
**Working Directory**: `c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_survey_3`  
**Date & Timestamp**: 2026-09-16T14:14:30Z  
**Target Milestone**: Survey & Discovery (Phase 0) -> PROJECT.md & Execution (Phases 1-5)

---

## 1. Observation

Direct observations and measurements from the repository inspection:

### 1.1. Root Monorepo Configuration
- **Root `package.json`** (`c:\Users\HaiChu\Documents\GitHub\BAHAU\package.json`):
  ```json
  {
    "name": "bahau",
    "version": "1.0.0",
    "private": true,
    "description": "Smart HRMS for Da Nang Architecture University (DAU)",
    "workspaces": [
      "packages/*",
      "apps/*"
    ],
    "scripts": {
      "build": "npm run build --workspaces --if-present",
      "test": "npm run test --workspaces --if-present",
      "lint": "npm run lint --workspaces --if-present",
      "db:generate": "npm run generate --workspace=@bahau/database",
      "db:migrate": "npm run migrate:dev --workspace=@bahau/database",
      "db:seed": "npm run seed --workspace=@bahau/database",
      "db:studio": "npm run studio --workspace=@bahau/database",
      "docker:up": "docker compose up -d",
      "docker:down": "docker compose down"
    },
    "devDependencies": {
      "typescript": "^5.7.3"
    }
  }
  ```
- **Monorepo Engine**: Native **npm workspaces** (`npm` v11.17.0, Node.js v24.19.0).
  - Turborepo is **NOT** installed (`turbo --version` returned command not found; no `turbo.json` present).
  - All workspace build orchestration is handled via `npm run build --workspaces --if-present`.
- **Root TypeScript Configuration** (`c:\Users\HaiChu\Documents\GitHub\BAHAU\tsconfig.base.json`):
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "module": "NodeNext",
      "moduleResolution": "NodeNext",
      "lib": ["ES2022"],
      "strict": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "declaration": true,
      "declarationMap": true,
      "sourceMap": true
    }
  }
  ```

### 1.2. Shell & Environment Findings
- **Windows PowerShell Script Execution Policy**:
  - Running `npm run build` in PowerShell failed with:
    `npm : File C:\Program Files\nodejs\npm.ps1 cannot be loaded because running scripts is disabled on this system. (PSSecurityException)`.
  - **Remediation verified**: Using `npm.cmd` and `npx.cmd` directly bypasses the `.ps1` restriction and executes reliably in this shell environment.
- **Node Modules & Docker**:
  - `Test-Path node_modules` returned `False`. `npm install` has not been executed yet.
  - `docker` command is not available in PATH.
  - `Test-NetConnection -ComputerName localhost -Port 5432` failed (`TcpTestSucceeded: False`). PostgreSQL daemon is not currently running.

### 1.3. State of `packages/`
- **`packages/contracts`**:
  - Exists with `package.json`, `tsconfig.json`, and source files:
    - `src/index.ts`
    - `src/common/index.ts` (Pagination, StandardError, SuccessResponse, PaginatedResponse)
    - `src/auth/index.ts` (LoginRequest, AuthUser, LoginResponseData)
    - `src/unit/index.ts` (UnitTypeEnum, OrganizationalUnitDto, CreateUnitSchema, UpdateUnitSchema)
    - `src/employee/index.ts` (GenderEnum, AcademicTitleEnum, EmployeeBasicDto, EmployeeDetailedDto, CreateEmployeeSchema)
  - `dist/` directory does not exist yet (unbuilt).
  - **Critical TS Type Issue**: In `packages/contracts/src/unit/index.ts:24`, recursive schema `children: z.array(z.lazy(() => OrganizationalUnitDtoSchema)).optional()` has no explicit type annotation on the schema variable. With `"declaration": true`, `tsc` will trigger `TS7022` ("implicitly has type any in its own initializer") during `.d.ts` generation unless given explicit type `z.ZodType<OrganizationalUnitDto>`.
- **`packages/database`**:
  - **Does NOT exist yet**. Folder is missing completely under `packages/`.
  - Needed for `npm run db:generate` (`npm run generate --workspace=@bahau/database`).

### 1.4. State of `apps/`
- **`apps/` directory**:
  - **Does NOT exist yet**.
  - Neither `apps/api` (Express service) nor `apps/web` (Next.js App Router) has been initialized.

---

## 2. Logic Chain

From the observations above to our architecture conclusions:

1. **Monorepo Topology & Build Execution**:
   - Because root uses native npm workspaces (`workspaces: ["packages/*", "apps/*"]`) and `npm run build --workspaces --if-present`, npm iterates across workspaces.
   - For downstream packages (`apps/api`, `apps/web`) to import `@bahau/contracts`, `@bahau/contracts` must be compiled first (`tsc` emitting `dist/`), OR `apps/web` must use `transpilePackages: ["@bahau/contracts"]` in `next.config`.
   - Adding `transpilePackages: ["@bahau/contracts"]` in `apps/web/next.config.js` allows Next.js to directly bundle TypeScript files or ESM outputs from `@bahau/contracts` without bundler mismatch.

2. **apps/web Next.js Setup & Requirements (Requirement R3)**:
   - Must use **Next.js App Router** with TypeScript and Tailwind CSS.
   - Must visually represent **Trường Đại học Kiến trúc Đà Nẵng (DAU)** - BAHAU Smart HRMS.
   - Must present the **3-Space Model** defined in `docs/architecture/system-overview.md`:
     1. *Không gian Cá nhân (Personal Space)*: Self-service for 100% of university staff & lecturers (profile, leave requests, timesheets, KPI self-review).
     2. *Không gian Quản lý Đơn vị (Unit Management Space)*: For Faculty Deans, Dept Heads, Subject Chairs (hierarchical approval, unit staff overview).
     3. *Không gian Nhân sự & Quản trị (HR & Admin Space)*: For HR Department & Board of Rectors (full HR dossiers, contracts, organizational tree, reporting).
   - Must include an interactive **Backend API Health Status Indicator Component** (`<ApiHealthStatus />`):
     - Makes client-side or SSR request to `GET /api/v1/health` (default: `http://localhost:4000/api/v1/health`).
     - Shows real-time badge: Green/Connected with uptime, DB status, and latency when Express is up; Red/Disconnected with user-friendly retry button when Express is down.
   - Must provide navigation/link to a dedicated **Login Portal** (`/login`):
     - Displays login form designed for Stateful Session Authentication (`/api/v1/auth/login`).
     - Includes sample credentials selector for the 5 official seed role accounts (SysAdmin, HR Specialist, Faculty Dean, Unit Manager, Lecturer) to enable instant evaluation without manual typing.

3. **Backend API Health Graceful Degradation (Requirement R2)**:
   - Because PostgreSQL may not be immediately available if Docker is not installed or running, Express API's `GET /api/v1/health` must implement graceful error catching on DB ping:
     ```ts
     let dbStatus = "disconnected";
     try {
       await prisma.$queryRaw`SELECT 1`;
       dbStatus = "connected";
     } catch (err) {
       dbStatus = "disconnected";
     }
     ```
   - This ensures `GET /api/v1/health` returns HTTP 200 with standard JSON format `{ success: true, data: { status: "ok", uptime: ..., database: dbStatus } }` satisfying Acceptance Criteria even before Postgres container is started.

4. **Acceptance Criteria Dependency Chain**:
   - Step 1: Initialize `@bahau/database` with schema & singleton.
   - Step 2: Fix recursive type in `@bahau/contracts` and build it (`npm.cmd run build --workspace=@bahau/contracts`).
   - Step 3: Run `npm.cmd install` from root to link workspaces.
   - Step 4: Run `npm.cmd run db:generate` -> Prisma Client generated.
   - Step 5: Initialize `apps/api` with layered Express structure and `/api/v1/health`.
   - Step 6: Initialize `apps/web` with Next.js App Router, Tailwind CSS, BAHAU overview UI, `<ApiHealthStatus />`, and `/login`.
   - Step 7: Run `npm.cmd run build` across monorepo -> 0 errors.
   - Step 8: Boot API on port 4000, verify `GET /api/v1/health` returns 200.
   - Step 9: Boot Web on port 3000, verify page renders without runtime errors.

---

## 3. Caveats

1. **Docker Environment**:
   - `docker` is not currently recognized in the environment PATH. If the user intends to run PostgreSQL via Docker (`npm run docker:up`), Docker Desktop / engine must be installed and added to PATH, or an existing local PostgreSQL instance must be configured on port 5432.
2. **Windows PowerShell Execution Policy**:
   - All build/dev/test commands must be run via `npm.cmd` or `npx.cmd`. Running bare `npm` triggers a PowerShell security exception (`PSSecurityException`).
3. **Zod Recursive Type Annotation in `@bahau/contracts`**:
   - In `packages/contracts/src/unit/index.ts`, `OrganizationalUnitDtoSchema` must be explicitly typed with `z.ZodType<OrganizationalUnitDto>` before running `tsc` with `declaration: true`.
4. **Read-Only Explorer Scope**:
   - As an Explorer agent, no source files were created or modified during this investigation. All concrete implementations are handed off to the Orchestrator and designated Worker agents.

---

## 4. Conclusion & Required Deliverables

### 4.1. Current Monorepo State Assessment
- Monorepo uses npm workspaces (`packages/*`, `apps/*`).
- `packages/contracts` is partially scaffolded, lacks build and needs explicit recursive type annotation.
- `packages/database`, `apps/api`, and `apps/web` are completely uninitialized.
- Root scripts are well-defined (`db:generate`, `build`, `test`, `lint`).

### 4.2. Detailed Specification for `apps/web` (Next.js Application)
To satisfy Requirement R3 and Acceptance Criteria, `apps/web` must be structured as follows:

```
apps/web/
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── public/
└── src/
    ├── app/
    │   ├── layout.tsx         # Root layout with DAU meta, fonts, header/footer
    │   ├── page.tsx           # Home: BAHAU Overview, 3-Space cards, ApiHealthStatus, Login CTA
    │   ├── login/
    │   │   └── page.tsx       # Login page with 5 sample role credentials quick-picker
    │   └── globals.css        # Tailwind directives and university theme styling
    ├── components/
    │   ├── ApiHealthStatus.tsx# Real-time backend connectivity badge with retry button
    │   ├── Header.tsx         # University navbar with brand logo, nav links, login CTA
    │   ├── Footer.tsx         # DAU contact details, address (566 Nui Thanh, Da Nang)
    │   └── SpaceCard.tsx      # Feature card explaining each of the 3 spaces
    └── lib/
        ├── api-client.ts      # Standardized fetch wrapper for backend API calls
        └── utils.ts           # cn utility (clsx + tailwind-merge)
```

#### Key Components & Implementations:
1. **`apps/web/package.json`**:
   - Name: `@bahau/web`
   - Dependencies: `next`, `react`, `react-dom`, `@bahau/contracts`, `lucide-react`, `clsx`, `tailwind-merge`
   - DevDependencies: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `tailwindcss`, `postcss`, `autoprefixer`
   - Scripts: `"dev": "next dev -p 3000"`, `"build": "next build"`, `"start": "next start -p 3000"`, `"lint": "next lint"`
2. **`apps/web/next.config.js`**:
   - `transpilePackages: ["@bahau/contracts"]`
   - Rewrites or proxy optional: proxy `/api/:path*` to `http://localhost:4000/api/:path*`.
3. **`apps/web/src/components/ApiHealthStatus.tsx`**:
   - Calls `GET /api/v1/health` (to `http://localhost:4000/api/v1/health` or via proxy).
   - Shows state:
     - **Loading**: "Đang kiểm tra kết nối máy chủ..." (pulsing amber).
     - **Connected**: "Máy chủ Backend API: Hoạt động (200 OK)" (pulsing emerald), displaying Uptime, API Version, and PostgreSQL Database connectivity badge.
     - **Disconnected**: "Máy chủ Backend API: Chưa kết nối (Cổng 4000)" (pulsing rose) with an instant "Thử lại" (Retry) button.
4. **`apps/web/src/app/page.tsx`**:
   - University Header: "TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG" & "HỆ THỐNG QUẢN TRỊ NHÂN SỰ BAHAU".
   - Hero Banner: Introduction to digital transformation in HR management.
   - Live System Status: Embeds `<ApiHealthStatus />`.
   - 3-Space Cards:
     - *Không gian Cá nhân (Personal Space)*
     - *Không gian Quản lý Đơn vị (Unit Management Space)*
     - *Không gian Nhân sự & Quản trị (HR & Admin Space)*
   - Quick statistics preview (5 Role groups, Faculty & Department directory).
   - Clear CTA button: "Truy cập Cổng Đăng nhập" -> `/login`.
5. **`apps/web/src/app/login/page.tsx`**:
   - Clean, professional login card with UDA branding.
   - Quick-fill buttons for the 5 demo accounts from Seed Data:
     - `admin@dau.edu.vn` (Quản trị hệ thống)
     - `hr.specialist@dau.edu.vn` (Chuyên viên Phòng TC-HC)
     - `dean.architecture@dau.edu.vn` (Trưởng Khoa Kiến trúc)
     - `head.admin@dau.edu.vn` (Trưởng Phòng Đào tạo)
     - `lecturer.an@dau.edu.vn` (Giảng viên Khoa Kiến trúc)
   - Links back to Home (`/`).

---

## 5. Verification Strategy

The verification strategy is organized into a definitive sequence of executable commands:

### Step 1: Environment & Tooling Verification
```powershell
# Verify Node & NPM
node -v
npm.cmd -v

# Ensure .env is present
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Install dependencies and link workspaces
npm.cmd install
```

### Step 2: Verify Workspace Linkage
```powershell
# Verify npm workspaces linkage
npm.cmd ls --workspaces
# Expected: @bahau/contracts, @bahau/database, @bahau/api, @bahau/web all resolved locally
```

### Step 3: Verify Database Package Generation
```powershell
# Generate Prisma Client
npm.cmd run db:generate
# Expected: "Prisma Client (v...) generated successfully" with 0 errors
```

### Step 4: Verify Monorepo Full Build & Typecheck
```powershell
# Build all packages and apps in topological order
npm.cmd run build
# Expected:
# 1. @bahau/contracts: tsc compiles without errors
# 2. @bahau/database: builds/validates without errors
# 3. @bahau/api: tsc compiles without errors
# 4. @bahau/web: next build finishes with static pages generated
```

### Step 5: Verify Backend Express API Boot & Health Endpoint
```powershell
# Start Express API in background (Port 4000)
# (In a dedicated terminal or background task)
npm.cmd run start --workspace=@bahau/api

# Test Health Endpoint:
$healthResponse = Invoke-RestMethod -Uri http://localhost:4000/api/v1/health -Method GET
$healthResponse | ConvertTo-Json -Depth 5

# Verification Conditions:
# 1. $healthResponse.success -eq $true
# 2. $healthResponse.data.status -eq "ok"
# 3. $healthResponse.meta.timestamp is a valid ISO date
```

### Step 6: Verify Frontend Next.js Web Boot & Rendering
```powershell
# Start Next.js in background (Port 3000)
# (In a dedicated terminal or background task)
npm.cmd run start --workspace=@bahau/web

# Test Web Rendering:
$webResponse = Invoke-WebRequest -Uri http://localhost:3000 -Method GET

# Verification Conditions:
# 1. $webResponse.StatusCode -eq 200
# 2. $webResponse.Content -match "BAHAU"
# 3. $webResponse.Content -match "Đại học Kiến trúc Đà Nẵng"
# 4. $webResponse.Content -match "ApiHealthStatus"
```

---

## 6. Identified Gaps & Concrete Action Plan to Satisfy Acceptance Criteria

| # | Acceptance Criterion | Current Status | Concrete Actions Required |
|---|----------------------|----------------|---------------------------|
| **AC-1** | `@bahau/contracts` & `@bahau/database` linked in npm workspaces | ❌ Not linked (database does not exist; node_modules absent) | 1. Fix recursive schema in `packages/contracts/src/unit/index.ts`.<br/>2. Create `packages/database` with `package.json` (`@bahau/database`), `prisma/schema.prisma`, and `src/index.ts`.<br/>3. Run `npm.cmd install` at root. |
| **AC-2** | `npm run db:generate` succeeds without syntax errors | ❌ Missing database package & schema | 1. Implement complete Prisma schema for Module 1 (13 entities) in `packages/database/prisma/schema.prisma`.<br/>2. Add script `"generate": "prisma generate"` in `packages/database/package.json`.<br/>3. Execute `npm.cmd run db:generate`. |
| **AC-3** | `npm run build` succeeds across entire monorepo with 0 type errors | ❌ No apps exist; contracts unbuilt; node_modules missing | 1. Ensure `@bahau/contracts` compiles cleanly (`tsc`).<br/>2. Create `apps/api` with strict TypeScript configuration.<br/>3. Create `apps/web` with Next.js App Router and transpilePackages.<br/>4. Execute `npm.cmd run build`. |
| **AC-4** | Express API boots on port 4000; `GET /api/v1/health` returns HTTP 200 standard JSON | ❌ `apps/api` does not exist | 1. Scaffold `apps/api` (Express + TS) with security middlewares (CORS, Helmet, cookie-parser, Request-Id UUIDv7, centralized error handler).<br/>2. Implement `GET /api/v1/health` returning `{ success: true, data: { status: "ok", uptime, version, database }, meta }`.<br/>3. Gracefully handle DB ping so 200 is returned even if Postgres is starting. |
| **AC-5** | Next.js app starts on port 3000 and renders overview UI without runtime error | ❌ `apps/web` does not exist | 1. Scaffold `apps/web` with Next.js App Router, Tailwind CSS, DAU branding.<br/>2. Implement Overview UI (Header, Hero, 3-Space Cards, Footer).<br/>3. Implement `<ApiHealthStatus />` component.<br/>4. Implement `/login` page with 5 sample role credentials. |

---
*Report prepared by Explorer Survey 3 for BAHAU Monorepo Baseline Skeleton.*
