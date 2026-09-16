# BÁO CÁO KHẢO SÁT & BẢN THIẾT KẾ KỸ THUẬT: PRISMA SCHEMA & GÓI @bahau/database
## Milestone 1: Foundation & Database Package Design Specification
**Dự án**: Hệ thống Quản trị Nhân sự Thông minh - Trường Đại học Kiến trúc Đà Nẵng (BAHAU)  
**Tác giả**: `explorer_m1_1`  
**Working Directory**: `c:\Users\HaiChu\Documents\GitHub\BAHAU\.agents\explorer_m1_1`  
**Thời gian**: 2026-09-16T14:19:00Z  

---

## 1. Observation (Quan sát trực tiếp)

1. **Yêu cầu nghiệm thu & Tài liệu nguồn**:
   - `ORIGINAL_REQUEST.md` §R1 & §Acceptance Criteria:
     - Gói `@bahau/contracts` và `@bahau/database` được liên kết thành công trong npm workspaces.
     - Xây dựng schema Prisma hoàn chỉnh cho Phân hệ 1 theo `domain-model.md` (15 models, 14 enums).
     - Cung cấp singleton `PrismaClient` export cho các ứng dụng trong monorepo và script chạy generate/seed thuận tiện (`npm run db:generate`).
   - `docs/architecture/domain-model.md` (§3.1, §3.2, §3.5):
     - Tất cả các khóa chính và khóa ngoại quan hệ sử dụng UUID (tương thích UUIDv7).
     - Các mốc ngày nghiệp vụ (`dateOfBirth`, `hireDate`, `signedDate`, `effectiveDate`, `expiryDate`, `validFrom`, `validTo`) sử dụng kiểu `DATE` thuần túy.
     - Các mốc thời gian hệ thống (`createdAt`, `updatedAt`, `expiresAt`, `lastLoginAt`, `processedAt`) sử dụng `TIMESTAMPTZ`.
     - Hệ số lương (`salaryCoefficient`) dùng định dạng `DECIMAL(5, 2)`.
     - Payload sự kiện và dữ liệu diff kiểm toán (`payload`, `diffData`) lưu dạng `JSONB`.
   - `docs/requirements/module-01-core-hr-prd.md`:
     - Ràng buộc nghiệp vụ: Không xóa đơn vị nếu đang có nhân sự công tác (`onDelete: Restrict`).
     - Hợp đồng không xác định thời hạn (`INDEFINITE_TERM`) có `expiryDate` là `NULL`.
     - Gia hạn hợp đồng không ghi đè mà liên kết qua `parentContractId` và cập nhật `status = RENEWED`.
   - `docs/architecture/system-overview.md` (§4, §5):
     - Xác thực Stateful Session với `Session` model lưu `ipAddress` (Varchar 45 cho IPv6), `userAgent`, `expiresAt`.
     - Transactional Outbox với `OutboxEvent` (`idempotencyKey` duy nhất, `status`, `payload`).
2. **Quan sát khi rà soát bản thảo khảo sát trước (`spec_miner_survey_1/handoff.md`)**:
   - Tại dòng 260 trong model `OrganizationalUnit`: xuất hiện lỗi cú pháp lặp thuộc tính `id String @id @default(uuid()) @default(uuid()) @db.Uuid`. Nếu đưa trực tiếp vào schema Prisma, parser sẽ báo lỗi cú pháp `Attribute "@default" can only be defined once per field`.
   - Trong `packages/database/src/index.ts`, cần lưu ý cơ chế module resolution `NodeNext` của monorepo (`tsconfig.base.json`): việc export file cục bộ phải có đuôi `.js` (`export * from "./client.js"`), nếu thiếu `.js` TypeScript compiler sẽ báo lỗi `TS2835`.
   - Hiện trạng thư mục `packages/`: chỉ mới có `packages/contracts`, chưa có `packages/database`.

---

## 2. Logic Chain (Chuỗi lập luận kỹ thuật)

1. **Chuẩn hóa 14 Enums**:
   - Dựa trên `domain-model.md` và `module-01-core-hr-prd.md`, hệ thống cần đúng 14 enums để kiểm soát chặt chẽ giá trị các trường trạng thái, phân loại, học hàm, học vị:
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
2. **Cấu trúc 15 Models và Ràng buộc Khóa ngoại (Referential Actions)**:
   - Tất cả các bảng được đặt tên dạng số nhiều snake_case qua `@@map("...")` để đồng bộ chuẩn cơ sở dữ liệu PostgreSQL.
   - Các hành vi khóa ngoại (`onDelete`) được thiết lập chính xác theo nguyên tắc nghiệp vụ:
     - `Cascade`: Xóa User thì xóa `Session`, `RoleAssignment`; Xóa Employee thì xóa `EmploymentAssignment`, `EmploymentContract`, `EmploymentEvent`.
     - `Restrict`: Xóa `OrganizationalUnit` bị chặn nếu có đơn vị con (`parentId`) hoặc có phân công công tác (`assignments`); Xóa `Position` bị chặn nếu đang có nhân sự giữ vị trí đó.
     - `SetNull`: Khi xóa Employee, trường `managerEmployeeId` trên `OrganizationalUnit` tự động về `NULL` (không làm mất đơn vị); các liên kết tùy chọn (`fileAssetId`, `parentContractId`, `userId`, `fromUnitId`, `toUnitId`) tự động về `NULL` khi bản ghi liên quan bị xóa.
   - Các quan hệ tự tham chiếu hoặc đa quan hệ giữa cùng 2 bảng bắt buộc phải có nhãn quan hệ `@relation("...")`:
     - Cây tổ chức: `@relation("UnitHierarchy")`
     - Người đứng đầu đơn vị: `@relation("UnitManager")`
     - Đơn vị chuyển đi / đến: `@relation("EventFromUnit")`, `@relation("EventToUnit")`
     - Chức vụ chuyển đi / đến: `@relation("EventFromPosition")`, `@relation("EventToPosition")`
     - Chuỗi gia hạn hợp đồng: `@relation("ContractRenewal")`
3. **Thuộc tính Kiểu dữ liệu PostgreSQL Nguyên bản (PostgreSQL Native Types)**:
   - `String @id @default(uuid()) @db.Uuid`: Đảm bảo lưu trữ native UUID tối ưu 16 bytes trong PostgreSQL, đồng thời Prisma sinh UUID tự động khi thêm bản ghi mới.
   - `DateTime @db.Date`: Lưu trữ mốc ngày thuần túy không kèm múi giờ (tránh lệch ngày do offset).
   - `DateTime @db.Timestamptz`: Lưu trữ thời điểm chính xác kèm timezone UTC.
   - `Decimal @db.Decimal(5, 2)`: Lưu hệ số lương chính xác tuyệt đối (ví dụ: 2.34, 4.40, 6.20).
   - `Json @db.JsonB`: Lưu trữ JSON dạng nhị phân, hỗ trợ lập chỉ mục GIN và truy vấn hiệu năng cao.
   - `BigInt`: Lưu dung lượng file bytes chính xác không bị tràn số 32-bit.
4. **Thiết kế Singleton PrismaClient**:
   - Sử dụng kỹ thuật gắn instance vào `globalThis` trong môi trường `development` để ngăn chặn việc khởi tạo nhiều connection pool khi Next.js Fast Refresh hoặc Express reload mã nguồn.
   - Re-export toàn bộ kiểu dữ liệu từ `@prisma/client` để các package/app khác trong monorepo chỉ cần import trực tiếp từ `@bahau/database`.
5. **Cấu hình Package & TypeScript**:
   - Tuân thủ cấu hình monorepo `tsconfig.base.json` (`NodeNext` module resolution).
   - Cung cấp đầy đủ script: `generate`, `build`, `migrate:dev`, `migrate:deploy`, `seed`, `push`, `studio`.

---

## 3. Caveats (Lưu ý & Giả định)

1. **NodeNext Module Resolution Extension Rule**:
   - Khi TypeScript cấu hình `moduleResolution: "NodeNext"`, mọi lệnh import/export đường dẫn tương đối (relative path) trong mã nguồn TypeScript bắt buộc phải có phần mở rộng `.js` (ví dụ `export * from "./client.js"`). Nếu viết `./client` sẽ phát sinh lỗi biên dịch `TS2835`.
2. **Thứ tự thực thi khi sinh mã**:
   - Trước khi biên dịch TypeScript (`npm run build`), lệnh `prisma generate` bắt buộc phải được chạy trước để thư viện `@prisma/client` được sinh trong `node_modules`.
3. **Thực thi trên môi trường Windows**:
   - Khi chạy các lệnh npm từ terminal Windows PowerShell, cần sử dụng `npm.cmd` để tránh vi phạm chính sách bảo mật thực thi script (`PSSecurityException`).
4. **Seed Data Phụ thuộc**:
   - Quá trình seed dữ liệu yêu cầu cơ sở dữ liệu PostgreSQL đang chạy (`docker compose up -d`). Bảng `OrganizationalUnit` cần được tạo trước với `managerEmployeeId = null`, sau đó tạo `Employee` và cập nhật lại `managerEmployeeId` để tránh lỗi khóa ngoại vòng lặp.

---

## 4. Conclusion & Complete Artifact Blueprints (Bản thiết kế chi tiết)

Gói `@bahau/database` được tổ chức theo cấu trúc sau:

```
packages/database/
├── prisma/
│   └── schema.prisma       # 15 Models, 14 Enums chuẩn 100% Prisma syntax
├── src/
│   ├── client.ts           # Singleton PrismaClient với globalThis cache
│   └── index.ts            # Re-export client và @prisma/client types
├── package.json            # Scripts generate/build/migrate/seed và dependencies
└── tsconfig.json           # Kế thừa tsconfig.base.json, xuất dist/
```

Dưới đây là mã nguồn hoàn chỉnh của toàn bộ 5 tệp cấu thành gói `@bahau/database`:

---

### Artifact 1: `packages/database/prisma/schema.prisma`

```prisma
// =============================================================================
// Prisma Schema: Hệ thống Quản trị Nhân sự Thông minh BAHAU
// Trường Đại học Kiến trúc Đà Nẵng (DAU)
// =============================================================================

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// =============================================================================
// ENUMS (14 Enums)
// =============================================================================

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}

enum UnitType {
  BOARD
  FACULTY
  DEPARTMENT
  DIVISION
  CENTER
}

enum PositionType {
  MANAGEMENT
  ACADEMIC
  ADMINISTRATIVE
}

enum Gender {
  MALE
  FEMALE
  OTHER
}

enum AcademicTitle {
  NONE
  ASSOCIATE_PROFESSOR
  PROFESSOR
}

enum AcademicDegree {
  BACHELOR
  MASTER
  DOCTOR
}

enum EmploymentStatus {
  PROBATION
  ACTIVE
  ON_LEAVE
  RESIGNED
  RETIRED
}

enum AssignmentType {
  PRIMARY
  CONCURRENT
}

enum AssignmentStatus {
  ACTIVE
  EXPIRED
  TERMINATED
}

enum ContractType {
  PROBATION
  DEFINITE_TERM_12M
  DEFINITE_TERM_36M
  INDEFINITE_TERM
  VISITING_LECTURER
}

enum ContractStatus {
  DRAFT
  ACTIVE
  EXPIRED
  TERMINATED
  RENEWED
}

enum EmploymentEventType {
  HIRED
  APPOINTED
  TRANSFERRED
  CONCURRENT_ASSIGNED
  PROMOTED
  RESIGNED
  RETIRED
}

enum FileAccessLevel {
  PUBLIC
  INTERNAL
  CONFIDENTIAL
}

enum OutboxStatus {
  PENDING
  PROCESSING
  PROCESSED
  FAILED
}

// =============================================================================
// MODELS (15 Models)
// =============================================================================

// -----------------------------------------------------------------------------
// 1. Model User: Quản lý danh tính, xác thực và trạng thái đăng nhập
// -----------------------------------------------------------------------------
model User {
  id           String     @id @default(uuid()) @db.Uuid
  email        String     @unique @db.VarChar(255)
  passwordHash String     @db.VarChar(255)
  status       UserStatus @default(ACTIVE)
  isMfaEnabled Boolean    @default(false)
  mfaSecret    String?    @db.VarChar(255)
  lastLoginAt  DateTime?  @db.Timestamptz
  createdAt    DateTime   @default(now()) @db.Timestamptz
  updatedAt    DateTime   @updatedAt @db.Timestamptz

  // Relations
  employee        Employee?
  sessions        Session[]
  roleAssignments RoleAssignment[]
  auditEvents     AuditEvent[]
  uploadedFiles   FileAsset[]

  @@map("users")
}

// -----------------------------------------------------------------------------
// 2. Model Session: Quản lý phiên làm việc stateful cookie HttpOnly
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 3. Model Role: Danh mục các vai trò hệ thống
// -----------------------------------------------------------------------------
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

// -----------------------------------------------------------------------------
// 4. Model Permission: Quyền hạn chi tiết theo module và action
// -----------------------------------------------------------------------------
model Permission {
  id        String   @id @default(uuid()) @db.Uuid
  code      String   @unique @db.VarChar(100)
  module    String   @db.VarChar(50)
  action    String   @db.VarChar(50)
  createdAt DateTime @default(now()) @db.Timestamptz
  updatedAt DateTime @updatedAt @db.Timestamptz

  // Relations
  rolePermissions RolePermission[]

  @@index([module])
  @@map("permissions")
}

// -----------------------------------------------------------------------------
// 5. Model RolePermission: Bảng nối quan hệ Nhiều-Nhiều giữa Role và Permission
// -----------------------------------------------------------------------------
model RolePermission {
  roleId       String @db.Uuid
  permissionId String @db.Uuid

  // Relations
  role       Role       @relation(fields: [roleId], references: [id], onDelete: Cascade)
  permission Permission @relation(fields: [permissionId], references: [id], onDelete: Cascade)

  @@id([roleId, permissionId])
  @@index([permissionId])
  @@map("role_permissions")
}

// -----------------------------------------------------------------------------
// 6. Model RoleAssignment: Phân vai trò kèm phạm vi đơn vị (Data Scope)
// -----------------------------------------------------------------------------
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
  @@index([validFrom, validTo])
  @@map("role_assignments")
}

// -----------------------------------------------------------------------------
// 7. Model OrganizationalUnit: Cơ cấu tổ chức cây đa cấp của Trường DAU
// -----------------------------------------------------------------------------
model OrganizationalUnit {
  id                String   @id @default(uuid()) @db.Uuid
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
  @@index([isActive])
  @@map("organizational_units")
}

// -----------------------------------------------------------------------------
// 8. Model Position: Danh mục chức vụ quản lý & chức danh chuyên môn
// -----------------------------------------------------------------------------
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
  assignments EmploymentAssignment[]
  fromEvents  EmploymentEvent[]      @relation("EventFromPosition")
  toEvents    EmploymentEvent[]      @relation("EventToPosition")

  @@index([positionType])
  @@index([isActive])
  @@map("positions")
}

// -----------------------------------------------------------------------------
// 9. Model Employee: Hồ sơ thông tin Cán bộ Giảng viên Nhân viên toàn diện
// -----------------------------------------------------------------------------
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
  @@index([fullName])
  @@index([hireDate])
  @@map("employees")
}

// -----------------------------------------------------------------------------
// 10. Model EmploymentAssignment: Phân công công tác chính thức & kiêm nhiệm
// -----------------------------------------------------------------------------
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
  @@index([status, startDate, endDate])
  @@map("employment_assignments")
}

// -----------------------------------------------------------------------------
// 11. Model EmploymentContract: Quản lý hợp đồng lao động & chuỗi gia hạn
// -----------------------------------------------------------------------------
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
  @@index([fileAssetId])
  @@index([parentContractId])
  @@map("employment_contracts")
}

// -----------------------------------------------------------------------------
// 12. Model EmploymentEvent: Lịch sử biến động công tác (Timeline)
// -----------------------------------------------------------------------------
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
  @@index([fromUnitId])
  @@index([toUnitId])
  @@index([fromPositionId])
  @@index([toPositionId])
  @@index([fileAssetId])
  @@map("employment_events")
}

// -----------------------------------------------------------------------------
// 13. Model FileAsset: Metadata tệp đính kèm bảo mật
// -----------------------------------------------------------------------------
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

  @@index([uploadedByUserId])
  @@index([sha256Checksum])
  @@map("file_assets")
}

// -----------------------------------------------------------------------------
// 14. Model OutboxEvent: Hàng đợi sự kiện giao dịch (Transactional Outbox)
// -----------------------------------------------------------------------------
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
  @@index([aggregateType, aggregateId])
  @@map("outbox_events")
}

// -----------------------------------------------------------------------------
// 15. Model AuditEvent: Nhật ký kiểm toán bảo mật & truy vết thay đổi dữ liệu
// -----------------------------------------------------------------------------
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
  @@index([action])
  @@map("audit_events")
}
```

---

### Artifact 2: `packages/database/package.json`

```json
{
  "name": "@bahau/database",
  "version": "1.0.0",
  "private": true,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "default": "./dist/index.js"
    }
  },
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
    "@bahau/contracts": "*",
    "@node-rs/argon2": "^2.0.2",
    "@prisma/client": "^6.4.1"
  },
  "devDependencies": {
    "@types/node": "^22.13.9",
    "prisma": "^6.4.1",
    "tsx": "^4.19.3",
    "typescript": "^5.7.3"
  }
}
```

---

### Artifact 3: `packages/database/tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

---

### Artifact 4: `packages/database/src/client.ts`

```typescript
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

---

### Artifact 5: `packages/database/src/index.ts`

```typescript
// Ghi chú quan trọng: NodeNext resolution yêu cầu chỉ định rõ đuôi .js
export * from "./client.js";
export * from "@prisma/client";
```

---

## 5. Verification Method (Phương pháp Kiểm chứng Độc lập)

1. **Kiểm tra cú pháp schema với Prisma CLI**:
   - Khi implementer tạo tệp `packages/database/prisma/schema.prisma` theo Artifact 1:
   - Chạy lệnh kiểm tra cú pháp và định dạng:
     ```powershell
     npx.cmd prisma validate --schema=packages/database/prisma/schema.prisma
     ```
   - *Kỳ vọng*: Trả về `The schema at ... is valid` mà không phát sinh lỗi cảnh báo cú pháp nào.
2. **Kiểm tra sinh mã Prisma Client (`db:generate`)**:
   - Chạy lệnh:
     ```powershell
     npm.cmd run db:generate
     ```
   - *Kỳ vọng*: Lệnh thực thi thành công, thông báo `✔ Generated Prisma Client (v6.4.1) to ./node_modules/@prisma/client` và không có lỗi kiểu dữ liệu.
3. **Kiểm tra biên dịch TypeScript (`tsc`)**:
   - Chạy lệnh:
     ```powershell
     npm.cmd run build --workspace=@bahau/database
     ```
   - *Kỳ vọng*: Thư mục `packages/database/dist/` được sinh ra chứa `index.js`, `index.d.ts`, `client.js`, `client.d.ts` mà không có lỗi TypeScript (0 errors).
4. **Điều kiện Vô hiệu hóa (Invalidation Conditions)**:
   - Thiếu đuôi `.js` trong relative export tại `packages/database/src/index.ts` dẫn tới lỗi `TS2835` trong môi trường NodeNext.
   - Trùng lặp attribute `@default(uuid())` hoặc sai tên thuộc tính PostgreSQL native type.
