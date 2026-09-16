# BÁO CÁO KHẢO SÁT ĐẶC TẢ KỸ THUẬT: GÓI CƠ SỞ DỮ LIỆU (@bahau/database)
## Requirement R1: Database Package, Prisma Schema & Seed Data Specification
**Dự án**: Hệ thống Quản trị Nhân sự Thông minh - Trường Đại học Kiến trúc Đà Nẵng (BAHAU)  
**Tác giả**: `spec_miner_survey_1`  
**Thời gian hoàn thành**: 2026-09-16T14:15:00Z  

---

## 1. Features Discovered (Danh mục Tính năng & Thực thể Khám phá)

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Identity & Access | `User` Model | Thực thể quản lý tài khoản, xác thực, mật khẩu và khóa đăng nhập | `email`, `passwordHash`, `status`, `isMfaEnabled`, `mfaSecret` | Bản ghi User (UUIDv7 id) | Unique constraint lỗi nếu trùng email; Invalid status enum | `docs/architecture/domain-model.md` §3.1 |
| 2 | Identity & Access | `Session` Model | Lưu trữ phiên làm việc stateful cookie HttpOnly | `userId`, `ipAddress`, `userAgent`, `expiresAt` | Bản ghi Session (UUIDv7 id) | Lỗi FK nếu userId không tồn tại | `docs/architecture/domain-model.md` §3.1, `system-overview.md` §4 |
| 3 | Identity & Access | `Role` Model | Danh mục vai trò trong trường (5 nhóm vai trò chuẩn) | `code`, `name`, `description` | Bản ghi Role | Unique constraint nếu trùng `code` | `docs/architecture/domain-model.md` §3.1, `rbac-matrix.md` §2 |
| 4 | Identity & Access | `Permission` Model | Quyền hạn chi tiết theo module và action | `code`, `module`, `action` | Bản ghi Permission | Unique constraint nếu trùng `code` | `docs/architecture/domain-model.md` §3.1, `rbac-matrix.md` §4 |
| 5 | Identity & Access | `RolePermission` Model | Bảng liên kết Many-to-Many giữa Role và Permission | `roleId`, `permissionId` | Cặp quan hệ Role - Permission | Lỗi trùng khóa chính composite `(roleId, permissionId)` | `docs/architecture/domain-model.md` §3.1 |
| 6 | Identity & Access | `RoleAssignment` Model | Gán vai trò cho người dùng kèm phạm vi đơn vị (Scope) | `userId`, `roleId`, `scopeUnitId`, `validFrom`, `validTo` | Bản ghi RoleAssignment | Lỗi FK nếu user/role/scopeUnit không hợp lệ | `docs/architecture/domain-model.md` §3.1, `rbac-matrix.md` §1 |
| 7 | Core HR | `OrganizationalUnit` Model | Cây cơ cấu tổ chức đa cấp của trường (BGH -> Khoa/Phòng -> Bộ môn) | `code`, `name`, `unitType`, `parentId`, `managerEmployeeId`, `isActive`, `orderIndex` | Node đơn vị trong cây | Trùng mã code; Khóa ngoại tự tham chiếu không hợp lệ | `docs/architecture/domain-model.md` §3.2, `module-01-core-hr-prd.md` §2, §3 |
| 8 | Core HR | `Position` Model | Danh mục chức vụ lãnh đạo & chức danh chuyên môn | `code`, `name`, `positionType`, `leadershipLevel`, `isActive` | Bản ghi Position | Trùng mã code | `docs/architecture/domain-model.md` §3.2, `module-01-core-hr-prd.md` §1 |
| 9 | Core HR | `Employee` Model | Hồ sơ nhân sự toàn diện (nhân thân, CCCD, bằng cấp, chức danh) | `employeeCode`, `fullName`, `gender`, `dateOfBirth`, `idCardNumber`, `workEmail`, ... | Bản ghi Employee | Trùng `employeeCode`, `idCardNumber`, `workEmail` | `docs/architecture/domain-model.md` §3.2, `module-01-core-hr-prd.md` §2, §3 |
| 10 | Core HR | `EmploymentAssignment` Model | Phân công công tác chính thức (`PRIMARY`) và kiêm nhiệm (`CONCURRENT`) | `employeeId`, `unitId`, `positionId`, `assignmentType`, `isHeadOfUnit`, `startDate`, `endDate`, `status` | Bản ghi Assignment | Chỉ 1 PRIMARY active tại 1 thời điểm; Lỗi FK | `docs/architecture/domain-model.md` §3.2, `module-01-core-hr-prd.md` §3 (US-03) |
| 11 | Core HR | `EmploymentContract` Model | Quản lý hợp đồng lao động, hệ số lương, thời hạn và chuỗi gia hạn | `employeeId`, `contractNumber`, `contractType`, `signedDate`, `effectiveDate`, `expiryDate`, `salaryCoefficient`, `status`, `parentContractId`, `fileAssetId` | Bản ghi Contract | Trùng `contractNumber`; `expiryDate <= effectiveDate` | `docs/architecture/domain-model.md` §3.2, `module-01-core-hr-prd.md` §3 (US-07) |
| 12 | Core HR | `EmploymentEvent` Model | Dòng thời gian lịch sử biến động công tác (bổ nhiệm, điều chuyển, tiếp nhận) | `employeeId`, `eventType`, `decisionNumber`, `decisionDate`, `effectiveDate`, `fromUnitId`, `toUnitId`, `fromPositionId`, `toPositionId`, `note`, `fileAssetId` | Bản ghi Event | Lỗi FK nếu employeeId hoặc đơn vị không tồn tại | `docs/architecture/domain-model.md` §3.2, `module-01-core-hr-prd.md` §3 (US-09) |
| 13 | Infrastructure | `FileAsset` Model | Quản lý metadata tệp đính kèm bảo mật (file scan hợp đồng, văn bằng, quyết định) | `originalFileName`, `storedFileName`, `mimeType`, `fileSizeBytes`, `sha256Checksum`, `storagePath`, `accessLevel`, `uploadedByUserId` | Bản ghi FileAsset | Lỗi vi phạm kiểu dữ liệu hoặc FK uploader | `docs/architecture/domain-model.md` §3.5, `system-overview.md` §6 |
| 14 | Infrastructure | `OutboxEvent` Model | Hàng đợi sự kiện giao dịch bất đồng bộ (Transactional Outbox Pattern) | `aggregateType`, `aggregateId`, `eventType`, `payload`, `idempotencyKey`, `status`, `retryCount`, `lastError` | Bản ghi OutboxEvent | Unique constraint nếu trùng `idempotencyKey` | `docs/architecture/domain-model.md` §3.5, `system-overview.md` §5 |
| 15 | Infrastructure | `AuditEvent` Model | Nhật ký kiểm toán bảo mật và thay đổi dữ liệu nhạy cảm | `userId`, `action`, `entityName`, `entityId`, `ipAddress`, `userAgent`, `diffData` | Bản ghi AuditEvent | Báo lỗi nếu thiếu các trường bắt buộc | `docs/architecture/domain-model.md` §3.5, `module-01-core-hr-prd.md` §3 (US-02) |
| 16 | Seed Data | Cơ cấu tổ chức Trường ĐH Kiến trúc ĐN | Dữ liệu mẫu phản ánh thực tế DAU (BGH, 2 Khoa, 5 Bộ môn, 2 Phòng ban) | Script seed Prisma | Cây đơn vị phân cấp hoàn chỉnh | Dừng transaction nếu trùng code đơn vị | `ORIGINAL_REQUEST.md` §R1, `module-01-core-hr-prd.md` §2 |
| 17 | Seed Data | 5 Nhóm tài khoản vai trò mẫu | Khởi tạo 5 tài khoản đại diện với mật khẩu băm Argon2id | Email, password, role assignment | 5 User + Employee tương ứng | Trùng email / employeeCode | `ORIGINAL_REQUEST.md` §R1, `rbac-matrix.md` §2 |
| 18 | Package Setup | Singleton PrismaClient Export | Export thực thể PrismaClient dùng chung cho monorepo tránh pool exhaustion | `NODE_ENV`, `DATABASE_URL` | Instance PrismaClient duy nhất qua `globalThis` | Lỗi kết nối DB khi cấu hình sai URL | `ORIGINAL_REQUEST.md` §R1, `system-overview.md` §2 |

---

## 2. Edge Cases (Các trường hợp biên và Kiểm thử giới hạn)

| # | Feature | Input | Observed Behavior / Xử lý theo đặc tả |
|---|---------|-------|--------------------------------------|
| 1 | `OrganizationalUnit` Hierarchy | Tạo đơn vị có `parentId` trỏ vào chính nó hoặc tạo vòng lặp | Bị chặn bởi logic nghiệp vụ hoặc FK constraint; Cần xử lý cẩn thận trong API/Seeder |
| 2 | `OrganizationalUnit` Deletion | Xóa đơn vị đang có nhân sự công tác hoặc có đơn vị con | Quan hệ `onDelete: Restrict` ngăn chặn hard delete trực tiếp ở DB; API trả về mã lỗi `CONFLICT_STATE` (PRD AC-01.4) |
| 3 | `Employee` - Primary Assignment | Thêm một `EmploymentAssignment` loại `PRIMARY` mới cho nhân sự đã có phân công chính thức | Nghiệp vụ tự động đóng phân công `PRIMARY` cũ bằng cách set `endDate = startDate_mới - 1 ngày` và cập nhật `status = EXPIRED` (PRD AC-03.1) |
| 4 | `Employee` - Headcount Calculation | Nhân sự có 1 phân công chính thức tại Khoa và 2 phân công kiêm nhiệm tại Phòng/Trung tâm khác | Báo cáo Headcount toàn trường chỉ đếm theo cá nhân `Employee.id`, không đếm theo số lượng `EmploymentAssignment` (PRD AC-03.4) |
| 5 | `EmploymentContract` - Expiry Date | Tạo hợp đồng không xác định thời hạn (`INDEFINITE_TERM`) | Trường `expiryDate` được phép `NULL`. Worker quét cảnh báo hết hạn hợp đồng phải loại trừ hoàn toàn các bản ghi có `expiryDate IS NULL` (PRD AC-08.4) |
| 6 | `EmploymentContract` - Renewal | Gia hạn hợp đồng lao động khi đến hạn | Không ghi đè hợp đồng cũ; Tạo bản ghi mới có `parentContractId` trỏ về hợp đồng cũ, đồng thời cập nhật hợp đồng cũ sang trạng thái `RENEWED` (PRD AC-07.3) |
| 7 | `OutboxEvent` - Idempotency | Gửi lặp sự kiện cùng một thao tác do mạng chập chờn | Ràng buộc duy nhất trên `idempotencyKey` đảm bảo bản ghi thứ hai bị từ chối, chống gửi trùng thông báo/email (PRD AC-13.2) |
| 8 | `User` vs `Employee` Lifecycle | Tài khoản `User` bị khóa (`SUSPENDED` hoặc `INACTIVE`) | Bản ghi `Employee` và lịch sử công tác `EmploymentEvent`, `EmploymentContract` vẫn được bảo lưu vĩnh viễn không bị xóa (domain-model.md §1) |
| 9 | Windows PowerShell Script Execution | Chạy lệnh `npm` trong môi trường Windows PowerShell mặc định | Lỗi `PSSecurityException: running scripts is disabled`. Giải pháp: bắt buộc dùng `npm.cmd` hoặc `npx.cmd` trên Windows. |

---

## 3. Five-Component Handoff Report

### 3.1. Observation (Quan sát trực tiếp)
1. **Trạng thái kho mã nguồn hiện tại**:
   - `packages/contracts` đã tồn tại với các DTO và Zod schema (`auth`, `common`, `employee`, `unit`).
   - `packages/database` **chưa tồn tại** (chưa có `package.json`, `prisma/schema.prisma`, `src/index.ts`).
   - Thư mục gốc `package.json` đã cấu hình sẵn workspaces (`packages/*`, `apps/*`) và các script liên kết:
     - `"db:generate": "npm run generate --workspace=@bahau/database"`
     - `"db:migrate": "npm run migrate:dev --workspace=@bahau/database"`
     - `"db:seed": "npm run seed --workspace=@bahau/database"`
     - `"db:studio": "npm run studio --workspace=@bahau/database"`
   - Tệp `.env.example` đã có định dạng connection string:
     `DATABASE_URL="postgresql://bahau_admin:bahau_secret_password_2026@localhost:5432/bahau_hrms?schema=public"`
   - `docker-compose.yml` định nghĩa service `postgres` dùng image `pgvector/pgvector:pg17` (tương thích PostgreSQL 17/18, port 5432).
2. **Môi trường hệ thống**:
   - OS: Windows 11.
   - Node.js version: `v24.19.0`.
   - npm version: `11.17.0` (phải chạy qua `npm.cmd` do PowerShell ExecutionPolicy).

### 3.2. Logic Chain (Chuỗi lập luận kỹ thuật)
1. **Thiết kế Cơ sở dữ liệu tuân thủ chuẩn Domain Model**:
   - Yêu cầu R1 đặt ra việc xây dựng schema Prisma hoàn chỉnh cho Phân hệ 1 theo `domain-model.md`.
   - Danh sách 13 thực thể cốt lõi: `User`, `Session`, `Role`, `Permission`, `RoleAssignment`, `OrganizationalUnit`, `Position`, `Employee`, `EmploymentAssignment`, `EmploymentContract`, `EmploymentEvent`, `OutboxEvent`, `AuditEvent`.
   - Bổ sung 2 thực thể phụ trợ mật thiết được tham chiếu trực tiếp: `RolePermission` (bảng nối tường minh giữa Role và Permission) và `FileAsset` (lưu trữ metadata file scan hợp đồng và quyết định bổ nhiệm).
   - Khóa chính tất cả các bảng sử dụng kiểu `String @id @default(uuid()) @db.Uuid` (đáp ứng chuẩn UUIDv7 của kiến trúc).
   - Định dạng ngày tháng: Các mốc ngày nghiệp vụ (`dateOfBirth`, `hireDate`, `signedDate`, `effectiveDate`, `expiryDate`, `validFrom`, `validTo`) dùng `@db.Date`. Các mốc thời gian hệ thống (`createdAt`, `updatedAt`, `expiresAt`, `lastLoginAt`, `processedAt`) dùng `@db.Timestamptz`.
2. **Cấu trúc Seed Data chuẩn hóa cho DAU**:
   - Phản ánh trung thực cơ cấu tổ chức Đại học Kiến trúc Đà Nẵng: Cấp 0 là Ban Giám hiệu (`BGH`); Cấp 1 gồm Khoa Kiến trúc (`K_KT`), Khoa Xây dựng (`K_XD`), Phòng TCHC (`P_TCHC`), Phòng Đào tạo (`P_DT`); Cấp 2 gồm các Bộ môn trực thuộc Khoa Kiến trúc (`BM_KTCT`, `BM_LLLS`, `BM_KTNT`) và Khoa Xây dựng (`BM_DDCN`, `BM_KCVL`).
   - 5 tài khoản đại diện cho 5 nhóm vai trò theo Ma trận RBAC:
     - `ROLE_SYSADMIN`: Quản trị hệ thống (`admin@dau.edu.vn`)
     - `ROLE_HR_OFFICER` (Manager): Trưởng phòng TCHC (`hrmanager@dau.edu.vn`)
     - `ROLE_UNIT_HEAD`: Trưởng khoa Kiến trúc (`unithead@dau.edu.vn`)
     - `ROLE_HR_OFFICER` (Specialist): Chuyên viên TCHC (`hrspecialist@dau.edu.vn`)
     - `ROLE_EMPLOYEE`: Giảng viên Bộ môn KTCT (`employee@dau.edu.vn`)
   - Mật khẩu mã hóa bằng chuẩn `argon2id` bảo mật cao.

### 3.3. Caveats (Lưu ý & Giả định)
1. **Biên dịch Argon2 trên Windows**:
   - Thư viện `argon2` bản gốc sử dụng `node-gyp` để biên dịch C++. Nếu môi trường phát triển thiếu Visual C++ Build Tools, cài đặt gói `argon2` có thể gặp lỗi build native. Có thể sử dụng gói `@node-rs/argon2` (precompiled N-API binary) hoặc băm trước chuỗi hash mẫu cố định trong tệp seed data để việc seed chạy mượt mà trên mọi môi trường.
2. **Khởi chạy container PostgreSQL**:
   - Để chạy các lệnh `prisma migrate` hay `db:seed`, container PostgreSQL phải được khởi động trước (`docker compose up -d` hoặc dịch vụ Postgres cục bộ sẵn sàng trên cổng 5432).
3. **Thực thi npm trên Windows PowerShell**:
   - Sử dụng `npm.cmd` thay vì `npm` khi chạy lệnh từ CLI để tránh lỗi chính sách bảo mật PowerShell (`PSSecurityException`).

### 3.4. Conclusion (Kết luận)
- Gói `@bahau/database` cần được tạo mới tại `packages/database` với đầy đủ:
  1. `package.json` cấu hình dependencies (`@prisma/client`, `prisma`, `typescript`, `@types/node`, `tsx`, `@bahau/contracts`).
  2. `prisma/schema.prisma` định nghĩa 15 models và 14 enums bám sát 100% `domain-model.md`.
  3. `src/index.ts` và `src/client.ts` xuất singleton `PrismaClient` có gắn `globalThis` chống tràn kết nối trong môi trường phát triển Next.js/Express.
  4. `prisma/seed.ts` nạp tự động toàn bộ cây tổ chức DAU, danh mục chức vụ, quyền hạn, và 5 tài khoản người dùng mẫu.

### 3.5. Verification Method (Phương pháp Kiểm chứng Độc lập)
1. Kiểm tra cấu trúc thư mục:
   - `packages/database/package.json`
   - `packages/database/prisma/schema.prisma`
   - `packages/database/src/index.ts`
   - `packages/database/prisma/seed.ts`
2. Kiểm tra sinh mã Prisma Client:
   - Chạy: `npm.cmd run db:generate`
   - Kỳ vọng: Prisma Client được sinh thành công trong `node_modules/@prisma/client` mà không có lỗi cú pháp schema.
3. Kiểm tra TypeScript Compilation:
   - Chạy: `npm.cmd run build --workspace=@bahau/database`
   - Kỳ vọng: Biên dịch `src/index.ts` sang `dist/` thành công không có lỗi kiểu dữ liệu.

---

## 4. Chi tiết Đặc tả Kỹ thuật Toàn diện (Detailed Specifications)

### 4.1. Danh sách Mô hình Dữ liệu (Prisma Schema Models & Enums)

#### A. Danh sách Enums (14 Enums)
1. `UserStatus`: `ACTIVE`, `INACTIVE`, `SUSPENDED`
2. `UnitType`: `BOARD`, `FACULTY`, `DEPARTMENT`, `DIVISION`, `CENTER`
3. `PositionType`: `MANAGEMENT`, `ACADEMIC`, `ADMINISTRATIVE`
4. `Gender`: `MALE`, `FEMALE`, `OTHER`
5. `AcademicTitle`: `NONE`, `ASSOCIATE_PROFESSOR`, `PROFESSOR`
6. `AcademicDegree`: `BACHELOR`, `MASTER`, `DOCTOR`
7. `EmploymentStatus`: `PROBATION`, `ACTIVE`, `ON_LEAVE`, `RESIGNED`, `RETIRED`
8. `AssignmentType`: `PRIMARY`, `CONCURRENT`
9. `AssignmentStatus`: `ACTIVE`, `EXPIRED`, `TERMINATED`
10. `ContractType`: `PROBATION`, `DEFINITE_TERM_12M`, `DEFINITE_TERM_36M`, `INDEFINITE_TERM`, `VISITING_LECTURER`
11. `ContractStatus`: `DRAFT`, `ACTIVE`, `EXPIRED`, `TERMINATED`, `RENEWED`
12. `EmploymentEventType`: `HIRED`, `APPOINTED`, `TRANSFERRED`, `CONCURRENT_ASSIGNED`, `PROMOTED`, `RESIGNED`, `RETIRED`
13. `FileAccessLevel`: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`
14. `OutboxStatus`: `PENDING`, `PROCESSING`, `PROCESSED`, `FAILED`

---

#### B. Đặc tả Chi tiết Các Models

##### 1. Model `User` (Danh tính & Xác thực)
```prisma
model User {
  id           String        @id @default(uuid()) @db.Uuid
  email        String        @unique @db.VarChar(255)
  passwordHash String        @db.VarChar(255)
  status       UserStatus    @default(ACTIVE)
  isMfaEnabled Boolean       @default(false)
  mfaSecret    String?       @db.VarChar(255)
  lastLoginAt  DateTime?     @db.Timestamptz
  createdAt    DateTime      @default(now()) @db.Timestamptz
  updatedAt    DateTime      @updatedAt @db.Timestamptz

  // Relations
  employee        Employee?
  sessions        Session[]
  roleAssignments RoleAssignment[]
  auditEvents     AuditEvent[]
  uploadedFiles   FileAsset[]

  @@map("users")
}
```

##### 2. Model `Session` (Phiên làm việc Stateful)
```prisma
model Session {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  ipAddress String?  @db.VarChar(45)
  userAgent String?  @db.Text
  expiresAt DateTime @db.Timestamptz
  createdAt DateTime @default(now()) @db.Timestamptz

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}
```

##### 3. Model `Role` (Vai trò)
```prisma
model Role {
  id          String   @id @default(uuid()) @db.Uuid
  code        String   @unique @db.VarChar(50)
  name        String   @db.VarChar(100)
  description String?  @db.Text
  createdAt   DateTime @default(now()) @db.Timestamptz
  updatedAt   DateTime @updatedAt @db.Timestamptz

  // Relations
  rolePermissions RolePermission[]
  roleAssignments RoleAssignment[]

  @@map("roles")
}
```

##### 4. Model `Permission` (Quyền hạn)
```prisma
model Permission {
  id        String   @id @default(uuid()) @db.Uuid
  code      String   @unique @db.VarChar(100)
  module    String   @db.VarChar(50)
  action    String   @db.VarChar(50)
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  // Relations
  rolePermissions RolePermission[]

  @@map("permissions")
}
```

##### 5. Model `RolePermission` (Quan hệ Role - Permission)
```prisma
model RolePermission {
  roleId       String @db.Uuid
  permissionId String @db.Uuid

  // Relations
  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@map("role_permissions")
}
```

##### 6. Model `RoleAssignment` (Gán vai trò & Phạm vi đơn vị)
```prisma
model RoleAssignment {
  id          String    @id @default(uuid()) @db.Uuid
  userId      String    @db.Uuid
  roleId      String    @db.Uuid
  scopeUnitId String?   @db.Uuid
  validFrom   DateTime  @default(now()) @db.Date
  validTo     DateTime? @db.Date
  createdAt   DateTime  @default(now()) @db.Timestamptz
  updatedAt   DateTime  @updatedAt @db.Timestamptz

  // Relations
  user      User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  role      Role                @relation(fields: [roleId], references: [id], onDelete: Cascade)
  scopeUnit OrganizationalUnit? @relation(fields: [scopeUnitId], references: [id], onDelete: SetNull)

  @@index([userId])
  @@index([roleId])
  @@index([scopeUnitId])
  @@map("role_assignments")
}
```

##### 7. Model `OrganizationalUnit` (Cơ cấu Đơn vị)
```prisma
model OrganizationalUnit {
  id                String   @id @default(uuid()) @default(uuid()) @db.Uuid
  code              String   @unique @db.VarChar(50)
  name              String   @db.VarChar(255)
  unitType          UnitType
  parentId          String?  @db.Uuid
  managerEmployeeId String?  @db.Uuid
  isActive          Boolean  @default(true)
  orderIndex        Int      @default(0)
  createdAt         DateTime @default(now()) @db.Timestamptz
  updatedAt         DateTime @updatedAt @db.Timestamptz

  // Relations
  parent          OrganizationalUnit?    @relation("UnitHierarchy", fields: [parentId], references: [id], onDelete: Restrict)
  children        OrganizationalUnit[]   @relation("UnitHierarchy")
  managerEmployee Employee?              @relation("UnitManager", fields: [managerEmployeeId], references: [id], onDelete: SetNull)
  assignments     EmploymentAssignment[]
  roleAssignments RoleAssignment[]
  fromEvents      EmploymentEvent[]      @relation("EventFromUnit")
  toEvents        EmploymentEvent[]      @relation("EventToUnit")

  @@index([parentId])
  @@index([managerEmployeeId])
  @@map("organizational_units")
}
```

##### 8. Model `Position` (Chức vụ & Chức danh)
```prisma
model Position {
  id              String       @id @default(uuid()) @db.Uuid
  code            String       @unique @db.VarChar(50)
  name            String       @db.VarChar(255)
  positionType    PositionType
  leadershipLevel Int          @default(0)
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now()) @db.Timestamptz
  updatedAt       DateTime     @updatedAt @db.Timestamptz

  // Relations
  assignments  EmploymentAssignment[]
  fromEvents   EmploymentEvent[]      @relation("EventFromPosition")
  toEvents     EmploymentEvent[]      @relation("EventToPosition")

  @@map("positions")
}
```

##### 9. Model `Employee` (Hồ sơ Nhân sự)
```prisma
model Employee {
  id               String           @id @default(uuid()) @db.Uuid
  userId           String?          @unique @db.Uuid
  employeeCode     String           @unique @db.VarChar(50)
  fullName         String           @db.VarChar(255)
  gender           Gender
  dateOfBirth      DateTime         @db.Date
  idCardNumber     String           @unique @db.VarChar(20)
  idCardIssueDate  DateTime?        @db.Date
  idCardIssuePlace String?          @db.VarChar(255)
  taxCode          String?          @db.VarChar(20)
  personalEmail    String?          @db.VarChar(255)
  workEmail        String           @unique @db.VarChar(255)
  phoneNumber      String?          @db.VarChar(20)
  currentAddress   String?          @db.Text
  academicTitle    AcademicTitle    @default(NONE)
  academicDegree   AcademicDegree   @default(BACHELOR)
  employmentStatus EmploymentStatus @default(ACTIVE)
  hireDate         DateTime         @db.Date
  createdAt        DateTime         @default(now()) @db.Timestamptz
  updatedAt        DateTime         @updatedAt @db.Timestamptz

  // Relations
  user         User?                  @relation(fields: [userId], references: [id], onDelete: SetNull)
  assignments  EmploymentAssignment[]
  contracts    EmploymentContract[]
  events       EmploymentEvent[]
  managedUnits OrganizationalUnit[]   @relation("UnitManager")

  @@index([employeeCode])
  @@index([workEmail])
  @@index([employmentStatus])
  @@map("employees")
}
```

##### 10. Model `EmploymentAssignment` (Phân công & Kiêm nhiệm)
```prisma
model EmploymentAssignment {
  id             String           @id @default(uuid()) @db.Uuid
  employeeId     String           @db.Uuid
  unitId         String           @db.Uuid
  positionId     String           @db.Uuid
  assignmentType AssignmentType   @default(PRIMARY)
  isHeadOfUnit   Boolean          @default(false)
  startDate      DateTime         @db.Date
  endDate        DateTime?        @db.Date
  status         AssignmentStatus @default(ACTIVE)
  createdAt      DateTime         @default(now()) @db.Timestamptz
  updatedAt      DateTime         @updatedAt @db.Timestamptz

  // Relations
  employee Employee           @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  unit     OrganizationalUnit @relation(fields: [unitId], references: [id], onDelete: Restrict)
  position Position           @relation(fields: [positionId], references: [id], onDelete: Restrict)

  @@index([employeeId])
  @@index([unitId])
  @@index([positionId])
  @@index([assignmentType, status])
  @@map("employment_assignments")
}
```

##### 11. Model `EmploymentContract` (Hợp đồng Lao động)
```prisma
model EmploymentContract {
  id                String         @id @default(uuid()) @db.Uuid
  employeeId        String         @db.Uuid
  contractNumber    String         @unique @db.VarChar(100)
  contractType      ContractType
  signedDate        DateTime       @db.Date
  effectiveDate     DateTime       @db.Date
  expiryDate        DateTime?      @db.Date
  salaryCoefficient Decimal        @db.Decimal(5, 2)
  status            ContractStatus @default(ACTIVE)
  fileAssetId       String?        @db.Uuid
  parentContractId  String?        @db.Uuid
  createdAt         DateTime       @default(now()) @db.Timestamptz
  updatedAt         DateTime       @updatedAt @db.Timestamptz

  // Relations
  employee         Employee             @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  parentContract   EmploymentContract?  @relation("ContractRenewal", fields: [parentContractId], references: [id], onDelete: SetNull)
  renewedContracts EmploymentContract[] @relation("ContractRenewal")
  fileAsset        FileAsset?           @relation(fields: [fileAssetId], references: [id], onDelete: SetNull)

  @@index([employeeId])
  @@index([status, expiryDate])
  @@map("employment_contracts")
}
```

##### 12. Model `EmploymentEvent` (Lịch sử Biến động Công tác)
```prisma
model EmploymentEvent {
  id             String              @id @default(uuid()) @db.Uuid
  employeeId     String              @db.Uuid
  eventType      EmploymentEventType
  decisionNumber String?             @db.VarChar(100)
  decisionDate   DateTime?           @db.Date
  effectiveDate  DateTime            @db.Date
  fromUnitId     String?             @db.Uuid
  toUnitId       String?             @db.Uuid
  fromPositionId String?             @db.Uuid
  toPositionId   String?             @db.Uuid
  note           String?             @db.Text
  fileAssetId    String?             @db.Uuid
  createdAt      DateTime            @default(now()) @db.Timestamptz

  // Relations
  employee     Employee            @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  fromUnit     OrganizationalUnit? @relation("EventFromUnit", fields: [fromUnitId], references: [id], onDelete: SetNull)
  toUnit       OrganizationalUnit? @relation("EventToUnit", fields: [toUnitId], references: [id], onDelete: SetNull)
  fromPosition Position?           @relation("EventFromPosition", fields: [fromPositionId], references: [id], onDelete: SetNull)
  toPosition   Position?           @relation("EventToPosition", fields: [toPositionId], references: [id], onDelete: SetNull)
  fileAsset    FileAsset?          @relation(fields: [fileAssetId], references: [id], onDelete: SetNull)

  @@index([employeeId])
  @@index([effectiveDate])
  @@map("employment_events")
}
```

##### 13. Model `FileAsset` (Metadata Tệp tin Bảo mật)
```prisma
model FileAsset {
  id               String          @id @default(uuid()) @db.Uuid
  originalFileName String          @db.VarChar(255)
  storedFileName   String          @db.VarChar(255)
  mimeType         String          @db.VarChar(100)
  fileSizeBytes    BigInt
  sha256Checksum   String          @db.VarChar(64)
  storagePath      String          @db.VarChar(500)
  accessLevel      FileAccessLevel @default(INTERNAL)
  uploadedByUserId String?         @db.Uuid
  createdAt        DateTime        @default(now()) @db.Timestamptz

  // Relations
  uploadedByUser User?                @relation(fields: [uploadedByUserId], references: [id], onDelete: SetNull)
  contracts      EmploymentContract[]
  events         EmploymentEvent[]

  @@map("file_assets")
}
```

##### 14. Model `OutboxEvent` (Hàng đợi Sự kiện Giao dịch)
```prisma
model OutboxEvent {
  id             String       @id @default(uuid()) @db.Uuid
  aggregateType  String       @db.VarChar(100)
  aggregateId    String       @db.Uuid
  eventType      String       @db.VarChar(100)
  payload        Json         @db.JsonB
  idempotencyKey String       @unique @db.VarChar(255)
  status         OutboxStatus @default(PENDING)
  retryCount     Int          @default(0)
  lastError      String?      @db.Text
  createdAt      DateTime     @default(now()) @db.Timestamptz
  processedAt    DateTime?    @db.Timestamptz

  @@index([status, createdAt])
  @@map("outbox_events")
}
```

##### 15. Model `AuditEvent` (Nhật ký Kiểm toán Hệ thống)
```prisma
model AuditEvent {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String?  @db.Uuid
  action     String   @db.VarChar(100)
  entityName String   @db.VarChar(100)
  entityId   String   @db.Uuid
  ipAddress  String?  @db.VarChar(45)
  userAgent  String?  @db.Text
  diffData   Json?    @db.JsonB
  createdAt  DateTime @default(now()) @db.Timestamptz

  // Relations
  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entityName, entityId])
  @@index([userId])
  @@index([createdAt])
  @@map("audit_events")
}
```

---

### 4.2. Đặc tả Dữ liệu Mẫu (Seed Data Specification)

#### A. Cây Cơ cấu Tổ chức Trường ĐH Kiến trúc Đà Nẵng (DAU Structure)

```
[BGH] Ban Giám hiệu (BOARD)
  ├── [K_KT] Khoa Kiến trúc (FACULTY)
  │     ├── [BM_KTCT] Bộ môn Kiến trúc công trình (DIVISION)
  │     ├── [BM_LLLS] Bộ môn Lý luận & Lịch sử Kiến trúc (DIVISION)
  │     └── [BM_KTNT] Bộ môn Kiến trúc Nội thất (DIVISION)
  ├── [K_XD] Khoa Xây dựng (FACULTY)
  │     ├── [BM_DDCN] Bộ môn Xây dựng Dân dụng & Công nghiệp (DIVISION)
  │     └── [BM_KCVL] Bộ môn Kết cấu & Vật liệu (DIVISION)
  ├── [P_TCHC] Phòng Tổ chức - Hành chính (DEPARTMENT)
  └── [P_DT] Phòng Đào tạo (DEPARTMENT)
```

Chi tiết bảng `OrganizationalUnit`:
| Code | Name | UnitType | Parent | OrderIndex |
| :--- | :--- | :--- | :--- | :---: |
| `BGH` | Ban Giám hiệu | `BOARD` | *null* | 1 |
| `K_KT` | Khoa Kiến trúc | `FACULTY` | `BGH` | 10 |
| `BM_KTCT` | Bộ môn Kiến trúc công trình | `DIVISION` | `K_KT` | 11 |
| `BM_LLLS` | Bộ môn Lý luận & Lịch sử Kiến trúc | `DIVISION` | `K_KT` | 12 |
| `BM_KTNT` | Bộ môn Kiến trúc Nội thất | `DIVISION` | `K_KT` | 13 |
| `K_XD` | Khoa Xây dựng | `FACULTY` | `BGH` | 20 |
| `BM_DDCN` | Bộ môn Xây dựng Dân dụng & Công nghiệp | `DIVISION` | `K_XD` | 21 |
| `BM_KCVL` | Bộ môn Kết cấu & Vật liệu | `DIVISION` | `K_XD` | 22 |
| `P_TCHC` | Phòng Tổ chức - Hành chính | `DEPARTMENT` | `BGH` | 30 |
| `P_DT` | Phòng Đào tạo | `DEPARTMENT` | `BGH` | 40 |

---

#### B. Danh mục Chức vụ & Chức danh (Positions)
| Code | Name | PositionType | LeadershipLevel |
| :--- | :--- | :--- | :---: |
| `HIEU_TRUONG` | Hiệu trưởng | `MANAGEMENT` | 1 |
| `PHO_HIEU_TRUONG` | Phó Hiệu trưởng | `MANAGEMENT` | 1 |
| `TRUONG_KHOA` | Trưởng Khoa | `MANAGEMENT` | 2 |
| `PHO_TRUONG_KHOA` | Phó Trưởng Khoa | `MANAGEMENT` | 2 |
| `TRUONG_PHONG` | Trưởng Phòng | `MANAGEMENT` | 2 |
| `PHO_TRUONG_PHONG` | Phó Trưởng Phòng | `MANAGEMENT` | 2 |
| `TRUONG_BO_MON` | Trưởng Bộ môn | `MANAGEMENT` | 3 |
| `PHO_TRUONG_BO_MON` | Phó Trưởng Bộ môn | `MANAGEMENT` | 3 |
| `GIANG_VIEN` | Giảng viên | `ACADEMIC` | 0 |
| `GIANG_VIEN_CHINH` | Giảng viên chính | `ACADEMIC` | 0 |
| `CHUYEN_VIEN` | Chuyên viên | `ADMINISTRATIVE` | 0 |
| `NHAN_VIEN` | Nhân viên | `ADMINISTRATIVE` | 0 |

---

#### C. Đặc tả 5 Tài khoản Mẫu & Băm Mật khẩu (5 Sample Accounts)

- **Thuật toán băm**: Argon2id (`$argon2id$v=19$m=65536,t=3,p=4$...`)
- **Mật khẩu dùng chung cho môi trường DEV**: `Admin@123456`
  *(Chuỗi hash Argon2id tham chiếu hoặc băm động tại thời điểm seed)*

| # | Nhóm Người dùng | Email Đăng nhập | Họ và tên | Mã CB | Chức vụ | Đơn vị | Role Code | Scope Đơn vị | Ghi chú |
|---|----------------|-----------------|-----------|-------|---------|--------|-----------|--------------|---------|
| 1 | **Super Admin** | `admin@dau.edu.vn` | Quản trị Hệ thống | *N/A* | *N/A* | *N/A* | `ROLE_SYSADMIN` | `ALL` (`scopeUnitId = null`) | Tài khoản kỹ thuật tối cao, xem log, quản trị users |
| 2 | **HR Manager** | `hrmanager@dau.edu.vn` | Nguyễn Văn Quản | `DAU200001` | Trưởng Phòng (`TRUONG_PHONG`) | Phòng Tổ chức - Hành chính (`P_TCHC`) | `ROLE_HR_OFFICER` | `ALL` (`scopeUnitId = null`) | Quản lý toàn bộ hồ sơ nhân sự, hợp đồng toàn trường |
| 3 | **Unit Head** | `unithead@dau.edu.vn` | Trần Kiến Trúc | `DAU210001` | Trưởng Khoa (`TRUONG_KHOA`) | Khoa Kiến trúc (`K_KT`) | `ROLE_UNIT_HEAD` | `TREE` (`scopeUnitId = K_KT.id`) | Quản lý nhân sự Khoa KT và các Bộ môn trực thuộc |
| 4 | **HR Specialist** | `hrspecialist@dau.edu.vn` | Lê Thị Nhân Sự | `DAU230001` | Chuyên viên (`CHUYEN_VIEN`) | Phòng Tổ chức - Hành chính (`P_TCHC`) | `ROLE_HR_OFFICER` | `ALL` (`scopeUnitId = null`) | Nghiệp vụ soạn thảo hợp đồng, hồ sơ nhân sự |
| 5 | **Employee (Giảng viên)** | `employee@dau.edu.vn` | Phạm Giảng Viên | `DAU240001` | Giảng viên (`GIANG_VIEN`) | Bộ môn Kiến trúc công trình (`BM_KTCT`) | `ROLE_EMPLOYEE` | `SELF` (`scopeUnitId = null`) | Tự phục vụ: xem hồ sơ cá nhân, đổi SĐT/địa chỉ |

---

### 4.3. Cấu trúc Gói (@bahau/database), Singleton PrismaClient & Scripts

#### A. Cấu trúc thư mục gói:
```
packages/database/
├── package.json
├── tsconfig.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── client.ts
    └── index.ts
```

#### B. Thiết kế Singleton PrismaClient (`src/client.ts` & `src/index.ts`):
```typescript
// packages/database/src/client.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
```

```typescript
// packages/database/src/index.ts
export * from "./client.js";
export * from "@prisma/client";
```

#### C. Kịch bản npm trong `packages/database/package.json`:
```json
{
  "name": "@bahau/database",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "generate": "prisma generate",
    "migrate:dev": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "push": "prisma db push",
    "seed": "tsx prisma/seed.ts",
    "studio": "prisma studio"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "@prisma/client": "^6.4.1",
    "@bahau/contracts": "*",
    "@node-rs/argon2": "^2.0.2"
  },
  "devDependencies": {
    "prisma": "^6.4.1",
    "typescript": "^5.7.3",
    "@types/node": "^22.13.9",
    "tsx": "^4.19.3"
  }
}
```

---

### 4.4. Đánh giá Rủi ro, Ràng buộc & Hướng xử lý Kỹ thuật

1. **Rủi ro Cài đặt Native Addon trên Windows (`argon2`)**:
   - Gói `argon2` gốc yêu cầu build tool Visual Studio C++.
   - **Giải pháp**: Ưu tiên sử dụng `@node-rs/argon2` (prebuilt N-API binary) để đảm bảo cài đặt trên Windows và Linux container không gặp lỗi biên dịch.
2. **Rủi ro Kết nối Cơ sở Dữ liệu**:
   - Khi chạy `db:generate`, Prisma chỉ biên dịch schema (không cần kết nối DB). Nhưng khi chạy `db:migrate` hoặc `db:seed`, PostgreSQL phải sẵn sàng.
   - **Giải pháp**: Cung cấp tài liệu rõ ràng yêu cầu `npm.cmd run docker:up` trước khi chạy migrate/seed.
3. **Rủi ro Xung đột quan hệ tuần hoàn (Circular Foreign Keys)**:
   - `OrganizationalUnit.managerEmployeeId` trỏ tới `Employee.id`, đồng thời `EmploymentAssignment.unitId` trỏ tới `OrganizationalUnit.id`.
   - **Giải pháp**: Cả hai đều cho phép nullable và được tạo theo thứ tự an toàn trong seeder: Tạo Units trước (với `managerEmployeeId = null`), tạo Employees và Assignments, sau đó cập nhật `managerEmployeeId` cho các Units.
4. **Rủi ro Chuẩn UUIDv7**:
   - Prisma ORM hỗ trợ native kiểu `Uuid` của PostgreSQL. Các UUIDv7 hợp lệ có thể được tạo từ application layer thông qua các hàm tiện ích và lưu trữ hoàn toàn khớp với trường `@db.Uuid`.

---

*Báo cáo hoàn tất và sẵn sàng chuyển giao cho các nhóm triển khai kỹ thuật.*
