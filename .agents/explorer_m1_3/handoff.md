# Handoff Report — Explorer M1.3: @bahau/contracts & Root Workspace Setup

**Agent Identity**: `explorer_m1_3`  
**Working Directory**: `c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_3`  
**Date & Timestamp**: 2026-09-16T14:24:00Z  
**Target Milestone**: Milestone 1 (@bahau/contracts recursive type fix, package exports/types, workspace linking, and build orchestration)  
**Parent Agent**: `orchestrator_1` (ID: `452617c6-00e4-447c-8dae-ffaffcf75a75`)

---

## 1. Observation

### 1.1. Recursive Zod Schema in `packages/contracts/src/unit/index.ts`
In `packages/contracts/src/unit/index.ts` (lines 14–27):
```typescript
// Unit DTO
export const OrganizationalUnitDtoSchema = z.object({
  id: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  unitType: UnitTypeEnum,
  parentId: z.string().uuid().nullable(),
  managerEmployeeId: z.string().uuid().nullable(),
  managerName: z.string().nullable().optional(),
  isActive: z.boolean(),
  orderIndex: z.number().int(),
  children: z.array(z.lazy(() => OrganizationalUnitDtoSchema)).optional(),
});

export type OrganizationalUnitDto = z.infer<typeof OrganizationalUnitDtoSchema>;
```
- Line 14 declares `OrganizationalUnitDtoSchema` without an explicit type annotation.
- Line 24 references `OrganizationalUnitDtoSchema` recursively via `z.lazy(() => OrganizationalUnitDtoSchema)`.
- Line 27 defines `OrganizationalUnitDto` as `z.infer<typeof OrganizationalUnitDtoSchema>`.
- In `tsconfig.base.json`, `"declaration": true` and `"declarationMap": true` are enabled.
- Compiling this with TypeScript emits verbatim errors:
  ```
  error TS7022: 'OrganizationalUnitDtoSchema' implicitly has type 'any' because it does not have a type annotation and is referenced directly or indirectly in its own initializer.
  error TS7024: Function implicitly has return type 'any' because it does not have a return type annotation and is referenced directly or indirectly in one of its return expressions.
  ```

### 1.2. Package Configuration in `packages/contracts/package.json`
Direct inspection of `packages/contracts/package.json`:
```json
{
  "name": "@bahau/contracts",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```
- Only `"main": "./dist/index.js"` and `"types": "./dist/index.d.ts"` are specified.
- The `"exports"` map is missing. Under `moduleResolution: "NodeNext"` (configured in `tsconfig.base.json`), subpath imports such as `import { ... } from "@bahau/contracts/unit"` fail with:
  ```
  error TS2307: Cannot find module '@bahau/contracts/unit' or its corresponding type declarations.
  ```
- Adding an explicit `exports` map supporting both root `"."` and module subpaths (`"./common"`, `"./auth"`, `"./unit"`, `"./employee"`) resolved this error completely in empirical testing under both `NodeNext` and `bundler` resolution.

### 1.3. Environment & Workspace Linkage State
- PowerShell execution: Invoking `npm` directly fails due to Windows Execution Policy (`npm.ps1 cannot be loaded... PSSecurityException`). Using `npm.cmd` and `npx.cmd` works reliably.
- Root `package.json` defines:
  ```json
  "workspaces": [
    "packages/*",
    "apps/*"
  ]
  ```
- Root `node_modules` does not exist yet (`Test-Path node_modules` returned `False`).
- `packages/database` does not exist yet; once created by `worker_m1_1` / `worker_m1_2`, running `npm.cmd install` from monorepo root links both `@bahau/contracts` and `@bahau/database` into root `node_modules/@bahau/`.

---

## 2. Logic Chain

1. **Root Cause of TS7022**:
   - TypeScript declaration generation (`declaration: true`) requires static type inference for all exported symbols.
   - When a variable initializer references itself inside a closure (e.g. `z.lazy(() => OrganizationalUnitDtoSchema)`), TypeScript cannot infer its return type without an explicit type annotation on the variable declaration.
   - Simply annotating `export const OrganizationalUnitDtoSchema: z.ZodType<OrganizationalUnitDto>` while defining `type OrganizationalUnitDto = z.infer<typeof OrganizationalUnitDtoSchema>` causes a circular type alias reference (`Type alias 'OrganizationalUnitDto' circularly references itself`).
   - **Resolution**: Explicitly declare `export type OrganizationalUnitDto` as a TypeScript object type first, and then annotate `export const OrganizationalUnitDtoSchema: z.ZodType<OrganizationalUnitDto>`.

2. **Subpath Module Resolution in NodeNext & Bundler**:
   - Consumers in `apps/api` and `apps/web` may import from root (`@bahau/contracts`) or specific submodules (`@bahau/contracts/unit`).
   - In modern Node and TypeScript NodeNext, importing subpaths without `"exports"` defined in `package.json` is restricted.
   - Providing explicit export paths with `"types"` first followed by `"default"` guarantees clean imports across both CommonJS and ESM consumers, as verified in isolated sandbox tests.

3. **Topological Build Dependency**:
   - In npm workspaces, `@bahau/contracts` has zero internal workspace dependencies (only depends on `zod`).
   - `@bahau/database` and `apps/api` depend on `@bahau/contracts`.
   - Therefore, `@bahau/contracts` must be built (`npm.cmd run build --workspace=@bahau/contracts`) before dependent packages can compile or generate types without missing declaration errors.

---

## 3. Caveats

1. **PowerShell Script Policy**:
   - Any command invoking npm or npx MUST use `npm.cmd` or `npx.cmd`. Never execute bare `npm` or `npx` in Windows PowerShell.
2. **Workspace Linking Prerequisite**:
   - `npm.cmd install` at root must be executed after `packages/database/package.json` is created on disk, so npm workspaces registers both `@bahau/contracts` and `@bahau/database`.
3. **Zod 3 Compatibility**:
   - The type annotation `z.ZodType<OrganizationalUnitDto>` defaults to `z.ZodType<OrganizationalUnitDto, z.ZodTypeDef, OrganizationalUnitDto>`. For `children?: OrganizationalUnitDto[]`, `exactOptionalPropertyTypes: false` in TypeScript ensures `undefined` is accepted cleanly.

---

## 4. Conclusion & Exact Fix Blueprints

### Blueprint 4.1: Fix for `packages/contracts/src/unit/index.ts`

**Target File**: `packages/contracts/src/unit/index.ts`  
**Line Range**: Replace lines 13–28 with the following:

```typescript
// Unit DTO
export type OrganizationalUnitDto = {
  id: string;
  code: string;
  name: string;
  unitType: UnitType;
  parentId: string | null;
  managerEmployeeId: string | null;
  managerName?: string | null;
  isActive: boolean;
  orderIndex: number;
  children?: OrganizationalUnitDto[];
};

export const OrganizationalUnitDtoSchema: z.ZodType<OrganizationalUnitDto> = z.object({
  id: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  unitType: UnitTypeEnum,
  parentId: z.string().uuid().nullable(),
  managerEmployeeId: z.string().uuid().nullable(),
  managerName: z.string().nullable().optional(),
  isActive: z.boolean(),
  orderIndex: z.number().int(),
  children: z.array(z.lazy(() => OrganizationalUnitDtoSchema)).optional(),
});
```

#### Full Replacement Content for `packages/contracts/src/unit/index.ts`:
```typescript
import { z } from "zod";

export const UnitTypeEnum = z.enum([
  "BOARD",        // Ban Giám hiệu
  "FACULTY",      // Khoa đào tạo
  "DEPARTMENT",   // Phòng ban chức năng
  "DIVISION",     // Bộ môn trực thuộc khoa
  "CENTER",       // Trung tâm/Viện trực thuộc
]);

export type UnitType = z.infer<typeof UnitTypeEnum>;

// Unit DTO
export type OrganizationalUnitDto = {
  id: string;
  code: string;
  name: string;
  unitType: UnitType;
  parentId: string | null;
  managerEmployeeId: string | null;
  managerName?: string | null;
  isActive: boolean;
  orderIndex: number;
  children?: OrganizationalUnitDto[];
};

export const OrganizationalUnitDtoSchema: z.ZodType<OrganizationalUnitDto> = z.object({
  id: z.string().uuid(),
  code: z.string().min(2).max(50),
  name: z.string().min(2).max(255),
  unitType: UnitTypeEnum,
  parentId: z.string().uuid().nullable(),
  managerEmployeeId: z.string().uuid().nullable(),
  managerName: z.string().nullable().optional(),
  isActive: z.boolean(),
  orderIndex: z.number().int(),
  children: z.array(z.lazy(() => OrganizationalUnitDtoSchema)).optional(),
});

// Create Unit Schema
export const CreateUnitSchema = z.object({
  code: z.string().min(2, "Mã đơn vị tối thiểu 2 ký tự").max(50),
  name: z.string().min(2, "Tên đơn vị tối thiểu 2 ký tự").max(255),
  unitType: UnitTypeEnum,
  parentId: z.string().uuid().nullable().optional(),
  managerEmployeeId: z.string().uuid().nullable().optional(),
  orderIndex: z.number().int().optional().default(0),
});

export type CreateUnitInput = z.infer<typeof CreateUnitSchema>;

// Update Unit Schema
export const UpdateUnitSchema = CreateUnitSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateUnitInput = z.infer<typeof UpdateUnitSchema>;
```

---

### Blueprint 4.2: Complete `packages/contracts/package.json`

**Target File**: `packages/contracts/package.json`  
Replace existing content with:

```json
{
  "name": "@bahau/contracts",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "default": "./dist/index.js"
    },
    "./common": {
      "types": "./dist/common/index.d.ts",
      "default": "./dist/common/index.js"
    },
    "./auth": {
      "types": "./dist/auth/index.d.ts",
      "default": "./dist/auth/index.js"
    },
    "./unit": {
      "types": "./dist/unit/index.d.ts",
      "default": "./dist/unit/index.js"
    },
    "./employee": {
      "types": "./dist/employee/index.d.ts",
      "default": "./dist/employee/index.js"
    },
    "./*": {
      "types": "./dist/*.d.ts",
      "default": "./dist/*.js"
    }
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "tsc",
    "clean": "node -e \"fs.rmSync('dist', { recursive: true, force: true })\"",
    "dev": "tsc --watch"
  },
  "dependencies": {
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

---

### Blueprint 4.3: Exact Execution Sequence for Worker & Orchestrator

Execute commands strictly from monorepo root (`c:\Users\HaiChu\Documents\GitHub\BAHAU`):

```powershell
# 1. Apply code changes
#    - Apply Blueprint 4.1 to packages/contracts/src/unit/index.ts
#    - Apply Blueprint 4.2 to packages/contracts/package.json
#    - Ensure packages/database is scaffolded with its package.json

# 2. Install monorepo dependencies & link all npm workspaces
npm.cmd install

# 3. Verify workspaces are correctly discovered and linked
npm.cmd ls --workspaces

# 4. Compile @bahau/contracts
npm.cmd run build --workspace=@bahau/contracts

# 5. Generate Prisma Client for @bahau/database
npm.cmd run db:generate

# 6. Compile @bahau/database
npm.cmd run build --workspace=@bahau/database

# 7. Verify full monorepo build passes without errors
npm.cmd run build
```

---

## 5. Verification Method

### Step-by-Step Independent Verification Commands

1. **Contracts Compilation Verification**:
   ```powershell
   npm.cmd run build --workspace=@bahau/contracts
   ```
   - **Expected Result**: Exits with code `0`.
   - **Output Files Verified**:
     - `packages/contracts/dist/index.js` exists
     - `packages/contracts/dist/index.d.ts` exists
     - `packages/contracts/dist/unit/index.d.ts` contains `export declare const OrganizationalUnitDtoSchema: z.ZodType<OrganizationalUnitDto>;`
     - 0 TS7022 or TS7024 errors.

2. **Workspace Linkage Verification**:
   ```powershell
   npm.cmd ls --workspaces
   ```
   - **Expected Result**: Displays tree showing `@bahau/contracts` and `@bahau/database` pointing to their local workspace directories.

3. **Prisma Generation Verification**:
   ```powershell
   npm.cmd run db:generate
   ```
   - **Expected Result**: Prisma Client is generated into `node_modules/.prisma/client` with 0 errors.

4. **Invalidation Conditions**:
   - If `npm.cmd run build --workspace=@bahau/contracts` produces TS7022, `OrganizationalUnitDto` was not explicitly typed before `OrganizationalUnitDtoSchema`.
   - If importing `@bahau/contracts/unit` triggers TS2307, the `exports` field in `packages/contracts/package.json` was omitted or misspelled.
