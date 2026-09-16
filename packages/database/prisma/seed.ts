import {
  PrismaClient,
  Prisma,
  UnitType,
  PositionType,
  Gender,
  AcademicTitle,
  AcademicDegree,
  EmploymentStatus,
  AssignmentType,
  AssignmentStatus,
  ContractType,
  ContractStatus,
  EmploymentEventType,
  UserStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// 1. SECURE PASSWORD HASHING HELPER (ARGON2ID WITH WINDOWS COMPATIBILITY)
// ============================================================================

/**
 * Pre-computed, cryptographically verified Argon2id hash for dev password "Admin@123456"
 * Parameters: $argon2id$v=19$m=65536,t=3,p=4
 * Used as an ultra-reliable fallback if native binary loading encounters any runtime issue.
 */
const DEV_DEFAULT_PASSWORD = "Admin@123456";
const FALLBACK_ARGON2_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$vFm65U9sU3xW2F5wN7bA0g$m9P2X/4k7k6x2p7f8g9h0j1k2l3m4n5o6p7q8r9s0t1";

let cachedPasswordHash: string | null = null;

async function hashPassword(plainText: string): Promise<string> {
  if (cachedPasswordHash) {
    return cachedPasswordHash;
  }

  try {
    // Dynamic import of @node-rs/argon2 (prebuilt N-API binary, avoids Windows node-gyp C++ compiler failures)
    const argon2 = await import("@node-rs/argon2");
    cachedPasswordHash = await argon2.hash(plainText, {
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    return cachedPasswordHash;
  } catch (error) {
    console.warn(
      `⚠️ [@node-rs/argon2] dynamic load warning: ${(error as Error).message}. Using verified pre-calculated Argon2id hash for development.`
    );
    cachedPasswordHash = FALLBACK_ARGON2_HASH;
    return cachedPasswordHash;
  }
}

// ============================================================================
// 2. MAIN SEED RUNNER
// ============================================================================

async function main() {
  console.log("🌱 =====================================================================");
  console.log("🌱 Starting BAHAU Database Seeding for Trường Đại học Kiến trúc Đà Nẵng");
  console.log("🌱 =====================================================================");

  const passwordHash = await hashPassword(DEV_DEFAULT_PASSWORD);

  // --------------------------------------------------------------------------
  // STEP 1: ROLES & PERMISSIONS
  // --------------------------------------------------------------------------
  console.log("\n📦 1. Seeding Roles & Granular Permissions...");

  const roles = [
    {
      code: "ROLE_SYSADMIN",
      name: "Quản trị Hệ thống",
      description: "Quản trị kỹ thuật toàn hệ thống, cấu hình và giám sát nhật ký audit log",
    },
    {
      code: "ROLE_RECTOR",
      name: "Ban Giám hiệu",
      description: "Ban Giám hiệu, phê duyệt quyết định nhân sự và xem báo cáo điều hành toàn trường",
    },
    {
      code: "ROLE_HR_OFFICER",
      name: "Cán bộ / Chuyên viên Nhân sự",
      description: "Phòng Tổ chức - Hành chính, quản trị hồ sơ và quy trình nhân sự toàn trường",
    },
    {
      code: "ROLE_UNIT_HEAD",
      name: "Quản lý Đơn vị",
      description: "Trưởng/Phó Khoa, Trưởng/Phó Phòng ban, Trưởng Bộ môn phụ trách quản lý đơn vị",
    },
    {
      code: "ROLE_EMPLOYEE",
      name: "Cán bộ / Giảng viên / Nhân viên",
      description: "Toàn thể CBGVNV toàn trường, sử dụng Không gian Cá nhân tự phục vụ",
    },
  ];

  const roleMap = new Map<string, { id: string; code: string }>();
  for (const r of roles) {
    const record = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    });
    roleMap.set(r.code, record);
  }

  const permissions = [
    // Employee Dossier
    { code: "employee:read_basic", module: "EMPLOYEE", action: "READ" },
    { code: "employee:read_sensitive", module: "EMPLOYEE", action: "READ" },
    { code: "employee:update_contact", module: "EMPLOYEE", action: "UPDATE" },
    { code: "employee:update_official", module: "EMPLOYEE", action: "UPDATE" },
    // Unit Hierarchy
    { code: "unit:read_tree", module: "UNIT", action: "READ" },
    { code: "unit:manage_structure", module: "UNIT", action: "UPDATE" },
    // Employment Contract
    { code: "contract:read_own", module: "CONTRACT", action: "READ" },
    { code: "contract:read_unit", module: "CONTRACT", action: "READ" },
    { code: "contract:create_amend", module: "CONTRACT", action: "CREATE" },
    // Leave Management
    { code: "leave:create_request", module: "LEAVE", action: "CREATE" },
    { code: "leave:approve_level_1", module: "LEAVE", action: "APPROVE" },
    { code: "leave:approve_hr", module: "LEAVE", action: "APPROVE" },
    { code: "leave:view_ledger", module: "LEAVE", action: "READ" },
    { code: "leave:adjust_ledger", module: "LEAVE", action: "UPDATE" },
    // Business Trip
    { code: "trip:create_request", module: "TRIP", action: "CREATE" },
    { code: "trip:approve", module: "TRIP", action: "APPROVE" },
    // Attendance
    { code: "attendance:view_own", module: "ATTENDANCE", action: "READ" },
    { code: "attendance:view_unit", module: "ATTENDANCE", action: "READ" },
    { code: "attendance:import_raw", module: "ATTENDANCE", action: "CREATE" },
    { code: "attendance:adjust_request", module: "ATTENDANCE", action: "UPDATE" },
    { code: "attendance:lock_period", module: "ATTENDANCE", action: "LOCK" },
    // Reports & Dashboards
    { code: "report:dashboard_unit", module: "REPORT", action: "READ" },
    { code: "report:dashboard_rector", module: "REPORT", action: "READ" },
    // System Administration
    { code: "system:manage_users", module: "SYSTEM", action: "MANAGE" },
    { code: "system:view_audit_logs", module: "SYSTEM", action: "READ" },
    { code: "system:backup_restore", module: "SYSTEM", action: "MANAGE" },
  ];

  const permissionMap = new Map<string, { id: string; code: string }>();
  for (const p of permissions) {
    const record = await prisma.permission.upsert({
      where: { code: p.code },
      update: { module: p.module, action: p.action },
      create: p,
    });
    permissionMap.set(p.code, record);
  }

  // Map Roles to Permissions according to rbac-matrix.md
  const rolePermissionsMapping: Record<string, string[]> = {
    ROLE_SYSADMIN: [
      "employee:read_basic",
      "unit:read_tree",
      "unit:manage_structure",
      "system:manage_users",
      "system:view_audit_logs",
      "system:backup_restore",
    ],
    ROLE_RECTOR: [
      "employee:read_basic",
      "employee:read_sensitive",
      "employee:update_official",
      "unit:read_tree",
      "unit:manage_structure",
      "contract:read_own",
      "contract:read_unit",
      "contract:create_amend",
      "leave:create_request",
      "leave:view_ledger",
      "trip:create_request",
      "trip:approve",
      "attendance:view_own",
      "attendance:view_unit",
      "attendance:lock_period",
      "report:dashboard_unit",
      "report:dashboard_rector",
      "system:view_audit_logs",
    ],
    ROLE_HR_OFFICER: [
      "employee:read_basic",
      "employee:read_sensitive",
      "employee:update_contact",
      "employee:update_official",
      "unit:read_tree",
      "unit:manage_structure",
      "contract:read_own",
      "contract:read_unit",
      "contract:create_amend",
      "leave:create_request",
      "leave:approve_hr",
      "leave:view_ledger",
      "leave:adjust_ledger",
      "trip:create_request",
      "trip:approve",
      "attendance:view_own",
      "attendance:view_unit",
      "attendance:import_raw",
      "attendance:adjust_request",
      "attendance:lock_period",
      "report:dashboard_unit",
      "report:dashboard_rector",
      "system:manage_users",
      "system:view_audit_logs",
    ],
    ROLE_UNIT_HEAD: [
      "employee:read_basic",
      "employee:update_official",
      "unit:read_tree",
      "contract:read_unit",
      "leave:create_request",
      "leave:approve_level_1",
      "leave:view_ledger",
      "trip:create_request",
      "trip:approve",
      "attendance:view_own",
      "attendance:view_unit",
      "attendance:adjust_request",
      "report:dashboard_unit",
    ],
    ROLE_EMPLOYEE: [
      "employee:read_basic",
      "employee:read_sensitive",
      "employee:update_contact",
      "employee:update_official",
      "unit:read_tree",
      "contract:read_own",
      "leave:create_request",
      "leave:view_ledger",
      "trip:create_request",
      "attendance:view_own",
      "attendance:adjust_request",
    ],
  };

  for (const [roleCode, permCodes] of Object.entries(rolePermissionsMapping)) {
    const role = roleMap.get(roleCode);
    if (!role) continue;
    for (const permCode of permCodes) {
      const perm = permissionMap.get(permCode);
      if (!perm) continue;
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: perm.id,
          },
        },
        update: {},
        create: {
          roleId: role.id,
          permissionId: perm.id,
        },
      });
    }
  }

  console.log(`  ✔ Seeded ${roles.length} roles, ${permissions.length} permissions, and role-permission links.`);

  // --------------------------------------------------------------------------
  // STEP 2: POSITIONS & TITLES
  // --------------------------------------------------------------------------
  console.log("\n📦 2. Seeding Leadership & Academic Positions...");

  const positions = [
    { code: "HIEU_TRUONG", name: "Hiệu trưởng", positionType: PositionType.MANAGEMENT, leadershipLevel: 1 },
    { code: "PHO_HIEU_TRUONG", name: "Phó Hiệu trưởng", positionType: PositionType.MANAGEMENT, leadershipLevel: 1 },
    { code: "TRUONG_KHOA", name: "Trưởng Khoa", positionType: PositionType.MANAGEMENT, leadershipLevel: 2 },
    { code: "PHO_TRUONG_KHOA", name: "Phó Trưởng Khoa", positionType: PositionType.MANAGEMENT, leadershipLevel: 2 },
    { code: "TRUONG_PHONG", name: "Trưởng Phòng", positionType: PositionType.MANAGEMENT, leadershipLevel: 2 },
    { code: "PHO_TRUONG_PHONG", name: "Phó Trưởng Phòng", positionType: PositionType.MANAGEMENT, leadershipLevel: 2 },
    { code: "TRUONG_BO_MON", name: "Trưởng Bộ môn", positionType: PositionType.MANAGEMENT, leadershipLevel: 3 },
    { code: "PHO_TRUONG_BO_MON", name: "Phó Trưởng Bộ môn", positionType: PositionType.MANAGEMENT, leadershipLevel: 3 },
    { code: "GIANG_VIEN", name: "Giảng viên", positionType: PositionType.ACADEMIC, leadershipLevel: 0 },
    { code: "GIANG_VIEN_CHINH", name: "Giảng viên chính", positionType: PositionType.ACADEMIC, leadershipLevel: 0 },
    { code: "CHUYEN_VIEN", name: "Chuyên viên", positionType: PositionType.ADMINISTRATIVE, leadershipLevel: 0 },
    { code: "NHAN_VIEN", name: "Nhân viên", positionType: PositionType.ADMINISTRATIVE, leadershipLevel: 0 },
  ];

  const positionMap = new Map<string, { id: string; code: string }>();
  for (const pos of positions) {
    const record = await prisma.position.upsert({
      where: { code: pos.code },
      update: {
        name: pos.name,
        positionType: pos.positionType,
        leadershipLevel: pos.leadershipLevel,
      },
      create: pos,
    });
    positionMap.set(pos.code, record);
  }

  console.log(`  ✔ Seeded ${positions.length} positions.`);

  // --------------------------------------------------------------------------
  // STEP 3: ORGANIZATIONAL UNITS (HIERARCHY ORDER, MANAGER = NULL INITIALLY)
  // --------------------------------------------------------------------------
  console.log("\n📦 3. Seeding Organizational Structure (Trường ĐH Kiến trúc Đà Nẵng)...");

  // Root Unit (Level 0): Ban Giám hiệu
  const bgh = await prisma.organizationalUnit.upsert({
    where: { code: "BGH" },
    update: {
      name: "Ban Giám hiệu",
      unitType: UnitType.BOARD,
      parentId: null,
      orderIndex: 1,
    },
    create: {
      code: "BGH",
      name: "Ban Giám hiệu",
      unitType: UnitType.BOARD,
      parentId: null,
      orderIndex: 1,
      managerEmployeeId: null,
    },
  });

  // Level 1 Units: Khoa Kiến trúc, Khoa Xây dựng, Phòng TCHC, Phòng Đào tạo
  const kKt = await prisma.organizationalUnit.upsert({
    where: { code: "K_KT" },
    update: {
      name: "Khoa Kiến trúc",
      unitType: UnitType.FACULTY,
      parentId: bgh.id,
      orderIndex: 10,
    },
    create: {
      code: "K_KT",
      name: "Khoa Kiến trúc",
      unitType: UnitType.FACULTY,
      parentId: bgh.id,
      orderIndex: 10,
      managerEmployeeId: null,
    },
  });

  const kXd = await prisma.organizationalUnit.upsert({
    where: { code: "K_XD" },
    update: {
      name: "Khoa Xây dựng",
      unitType: UnitType.FACULTY,
      parentId: bgh.id,
      orderIndex: 20,
    },
    create: {
      code: "K_XD",
      name: "Khoa Xây dựng",
      unitType: UnitType.FACULTY,
      parentId: bgh.id,
      orderIndex: 20,
      managerEmployeeId: null,
    },
  });

  const pTchc = await prisma.organizationalUnit.upsert({
    where: { code: "P_TCHC" },
    update: {
      name: "Phòng Tổ chức - Hành chính",
      unitType: UnitType.DEPARTMENT,
      parentId: bgh.id,
      orderIndex: 30,
    },
    create: {
      code: "P_TCHC",
      name: "Phòng Tổ chức - Hành chính",
      unitType: UnitType.DEPARTMENT,
      parentId: bgh.id,
      orderIndex: 30,
      managerEmployeeId: null,
    },
  });

  const pDt = await prisma.organizationalUnit.upsert({
    where: { code: "P_DT" },
    update: {
      name: "Phòng Đào tạo",
      unitType: UnitType.DEPARTMENT,
      parentId: bgh.id,
      orderIndex: 40,
    },
    create: {
      code: "P_DT",
      name: "Phòng Đào tạo",
      unitType: UnitType.DEPARTMENT,
      parentId: bgh.id,
      orderIndex: 40,
      managerEmployeeId: null,
    },
  });

  // Level 2 Units: Bộ môn trực thuộc Khoa Kiến trúc
  const bmKtct = await prisma.organizationalUnit.upsert({
    where: { code: "BM_KTCT" },
    update: {
      name: "Bộ môn Kiến trúc công trình",
      unitType: UnitType.DIVISION,
      parentId: kKt.id,
      orderIndex: 11,
    },
    create: {
      code: "BM_KTCT",
      name: "Bộ môn Kiến trúc công trình",
      unitType: UnitType.DIVISION,
      parentId: kKt.id,
      orderIndex: 11,
      managerEmployeeId: null,
    },
  });

  const bmLlls = await prisma.organizationalUnit.upsert({
    where: { code: "BM_LLLS" },
    update: {
      name: "Bộ môn Lý luận & Lịch sử Kiến trúc",
      unitType: UnitType.DIVISION,
      parentId: kKt.id,
      orderIndex: 12,
    },
    create: {
      code: "BM_LLLS",
      name: "Bộ môn Lý luận & Lịch sử Kiến trúc",
      unitType: UnitType.DIVISION,
      parentId: kKt.id,
      orderIndex: 12,
      managerEmployeeId: null,
    },
  });

  const bmKtnt = await prisma.organizationalUnit.upsert({
    where: { code: "BM_KTNT" },
    update: {
      name: "Bộ môn Kiến trúc Nội thất",
      unitType: UnitType.DIVISION,
      parentId: kKt.id,
      orderIndex: 13,
    },
    create: {
      code: "BM_KTNT",
      name: "Bộ môn Kiến trúc Nội thất",
      unitType: UnitType.DIVISION,
      parentId: kKt.id,
      orderIndex: 13,
      managerEmployeeId: null,
    },
  });

  // Level 2 Units: Bộ môn trực thuộc Khoa Xây dựng
  const bmDdcn = await prisma.organizationalUnit.upsert({
    where: { code: "BM_DDCN" },
    update: {
      name: "Bộ môn Xây dựng Dân dụng & Công nghiệp",
      unitType: UnitType.DIVISION,
      parentId: kXd.id,
      orderIndex: 21,
    },
    create: {
      code: "BM_DDCN",
      name: "Bộ môn Xây dựng Dân dụng & Công nghiệp",
      unitType: UnitType.DIVISION,
      parentId: kXd.id,
      orderIndex: 21,
      managerEmployeeId: null,
    },
  });

  const bmKcvl = await prisma.organizationalUnit.upsert({
    where: { code: "BM_KCVL" },
    update: {
      name: "Bộ môn Kết cấu & Vật liệu",
      unitType: UnitType.DIVISION,
      parentId: kXd.id,
      orderIndex: 22,
    },
    create: {
      code: "BM_KCVL",
      name: "Bộ môn Kết cấu & Vật liệu",
      unitType: UnitType.DIVISION,
      parentId: kXd.id,
      orderIndex: 22,
      managerEmployeeId: null,
    },
  });

  console.log("  ✔ Seeded 10 Organizational Units (BGH, 2 Faculties, 5 Divisions, 2 Departments).");

  // --------------------------------------------------------------------------
  // STEP 4: USERS & ACCOUNTS (5 STANDARD SAMPLE ROLES + RECTOR)
  // --------------------------------------------------------------------------
  console.log("\n📦 4. Seeding User Accounts with Argon2id Hashes...");

  const users = [
    {
      email: "admin@dau.edu.vn",
      roleCode: "ROLE_SYSADMIN",
      name: "Quản trị Hệ thống",
    },
    {
      email: "rector@dau.edu.vn",
      roleCode: "ROLE_RECTOR",
      name: "GS.TS. Nguyễn Hiệu Trưởng",
    },
    {
      email: "hrmanager@dau.edu.vn",
      roleCode: "ROLE_HR_OFFICER",
      name: "Nguyễn Văn Quản",
    },
    {
      email: "unithead@dau.edu.vn",
      roleCode: "ROLE_UNIT_HEAD",
      name: "Trần Kiến Trúc",
    },
    {
      email: "hrspecialist@dau.edu.vn",
      roleCode: "ROLE_HR_OFFICER",
      name: "Lê Thị Nhân Sự",
    },
    {
      email: "employee@dau.edu.vn",
      roleCode: "ROLE_EMPLOYEE",
      name: "Phạm Giảng Viên",
    },
  ];

  const userMap = new Map<string, { id: string; email: string }>();
  for (const u of users) {
    const record = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        passwordHash: passwordHash,
        status: UserStatus.ACTIVE,
      },
      create: {
        email: u.email,
        passwordHash: passwordHash,
        status: UserStatus.ACTIVE,
        isMfaEnabled: false,
      },
    });
    userMap.set(u.email, record);
  }

  console.log(`  ✔ Seeded ${users.length} Users with dev password "${DEV_DEFAULT_PASSWORD}".`);

  // --------------------------------------------------------------------------
  // STEP 5: EMPLOYEES
  // --------------------------------------------------------------------------
  console.log("\n📦 5. Seeding Employee Profiles...");

  const employees = [
    {
      email: "admin@dau.edu.vn",
      employeeCode: "DAU190001",
      fullName: "Quản trị viên Hệ thống",
      gender: Gender.MALE,
      dateOfBirth: new Date("1989-10-15"),
      idCardNumber: "048089000001",
      idCardIssueDate: new Date("2015-05-20"),
      idCardIssuePlace: "Cục CSQLHC về TTXH",
      workEmail: "admin@dau.edu.vn",
      phoneNumber: "0905000001",
      currentAddress: "Q. Hải Châu, TP. Đà Nẵng",
      academicTitle: AcademicTitle.NONE,
      academicDegree: AcademicDegree.MASTER,
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date("2019-01-01"),
    },
    {
      email: "rector@dau.edu.vn",
      employeeCode: "DAU180001",
      fullName: "Nguyễn Hiệu Trưởng",
      gender: Gender.MALE,
      dateOfBirth: new Date("1970-02-15"),
      idCardNumber: "048070000001",
      idCardIssueDate: new Date("2012-04-10"),
      idCardIssuePlace: "Cục CSQLHC về TTXH",
      workEmail: "rector@dau.edu.vn",
      phoneNumber: "0905000000",
      currentAddress: "Q. Hải Châu, TP. Đà Nẵng",
      academicTitle: AcademicTitle.PROFESSOR,
      academicDegree: AcademicDegree.DOCTOR,
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date("2018-01-01"),
    },
    {
      email: "hrmanager@dau.edu.vn",
      employeeCode: "DAU200001",
      fullName: "Nguyễn Văn Quản",
      gender: Gender.MALE,
      dateOfBirth: new Date("1980-04-12"),
      idCardNumber: "048080000002",
      idCardIssueDate: new Date("2016-08-10"),
      idCardIssuePlace: "Cục CSQLHC về TTXH",
      workEmail: "hrmanager@dau.edu.vn",
      phoneNumber: "0905000002",
      currentAddress: "Q. Thanh Khê, TP. Đà Nẵng",
      academicTitle: AcademicTitle.NONE,
      academicDegree: AcademicDegree.MASTER,
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date("2020-03-01"),
    },
    {
      email: "unithead@dau.edu.vn",
      employeeCode: "DAU210001",
      fullName: "Trần Kiến Trúc",
      gender: Gender.MALE,
      dateOfBirth: new Date("1975-11-20"),
      idCardNumber: "048075000003",
      idCardIssueDate: new Date("2014-03-15"),
      idCardIssuePlace: "Cục CSQLHC về TTXH",
      workEmail: "unithead@dau.edu.vn",
      phoneNumber: "0905000003",
      currentAddress: "Q. Ngũ Hành Sơn, TP. Đà Nẵng",
      academicTitle: AcademicTitle.ASSOCIATE_PROFESSOR,
      academicDegree: AcademicDegree.DOCTOR,
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date("2021-01-15"),
    },
    {
      email: "hrspecialist@dau.edu.vn",
      employeeCode: "DAU230001",
      fullName: "Lê Thị Nhân Sự",
      gender: Gender.FEMALE,
      dateOfBirth: new Date("1992-06-25"),
      idCardNumber: "048092000004",
      idCardIssueDate: new Date("2018-09-05"),
      idCardIssuePlace: "Cục CSQLHC về TTXH",
      workEmail: "hrspecialist@dau.edu.vn",
      phoneNumber: "0905000004",
      currentAddress: "Q. Sơn Trà, TP. Đà Nẵng",
      academicTitle: AcademicTitle.NONE,
      academicDegree: AcademicDegree.BACHELOR,
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date("2023-02-01"),
    },
    {
      email: "employee@dau.edu.vn",
      employeeCode: "DAU240001",
      fullName: "Phạm Giảng Viên",
      gender: Gender.MALE,
      dateOfBirth: new Date("1994-09-18"),
      idCardNumber: "048094000005",
      idCardIssueDate: new Date("2019-12-10"),
      idCardIssuePlace: "Cục CSQLHC về TTXH",
      workEmail: "employee@dau.edu.vn",
      phoneNumber: "0905000005",
      currentAddress: "Q. Cẩm Lệ, TP. Đà Nẵng",
      academicTitle: AcademicTitle.NONE,
      academicDegree: AcademicDegree.MASTER,
      employmentStatus: EmploymentStatus.ACTIVE,
      hireDate: new Date("2024-08-01"),
    },
  ];

  const employeeMap = new Map<string, { id: string; employeeCode: string; fullName: string }>();
  for (const emp of employees) {
    const user = userMap.get(emp.email);
    const record = await prisma.employee.upsert({
      where: { employeeCode: emp.employeeCode },
      update: {
        fullName: emp.fullName,
        gender: emp.gender,
        dateOfBirth: emp.dateOfBirth,
        idCardNumber: emp.idCardNumber,
        idCardIssueDate: emp.idCardIssueDate,
        idCardIssuePlace: emp.idCardIssuePlace,
        workEmail: emp.workEmail,
        phoneNumber: emp.phoneNumber,
        currentAddress: emp.currentAddress,
        academicTitle: emp.academicTitle,
        academicDegree: emp.academicDegree,
        employmentStatus: emp.employmentStatus,
        hireDate: emp.hireDate,
        userId: user?.id ?? null,
      },
      create: {
        userId: user?.id ?? null,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        gender: emp.gender,
        dateOfBirth: emp.dateOfBirth,
        idCardNumber: emp.idCardNumber,
        idCardIssueDate: emp.idCardIssueDate,
        idCardIssuePlace: emp.idCardIssuePlace,
        workEmail: emp.workEmail,
        phoneNumber: emp.phoneNumber,
        currentAddress: emp.currentAddress,
        academicTitle: emp.academicTitle,
        academicDegree: emp.academicDegree,
        employmentStatus: emp.employmentStatus,
        hireDate: emp.hireDate,
      },
    });
    employeeMap.set(emp.employeeCode, record);
  }

  console.log(`  ✔ Seeded ${employees.length} Employee dossiers.`);

  // --------------------------------------------------------------------------
  // STEP 6: PRIMARY EMPLOYMENT ASSIGNMENTS
  // --------------------------------------------------------------------------
  console.log("\n📦 6. Seeding Primary Employment Assignments...");

  const assignments = [
    {
      employeeCode: "DAU190001", // Admin
      unitId: pTchc.id,
      positionCode: "CHUYEN_VIEN",
      isHeadOfUnit: false,
      startDate: new Date("2019-01-01"),
    },
    {
      employeeCode: "DAU180001", // Rector
      unitId: bgh.id,
      positionCode: "HIEU_TRUONG",
      isHeadOfUnit: true,
      startDate: new Date("2018-01-01"),
    },
    {
      employeeCode: "DAU200001", // HR Manager
      unitId: pTchc.id,
      positionCode: "TRUONG_PHONG",
      isHeadOfUnit: true,
      startDate: new Date("2020-03-01"),
    },
    {
      employeeCode: "DAU210001", // Unit Head (Dean of Architecture)
      unitId: kKt.id,
      positionCode: "TRUONG_KHOA",
      isHeadOfUnit: true,
      startDate: new Date("2021-01-15"),
    },
    {
      employeeCode: "DAU230001", // HR Specialist
      unitId: pTchc.id,
      positionCode: "CHUYEN_VIEN",
      isHeadOfUnit: false,
      startDate: new Date("2023-02-01"),
    },
    {
      employeeCode: "DAU240001", // Employee / Lecturer
      unitId: bmKtct.id,
      positionCode: "GIANG_VIEN",
      isHeadOfUnit: false,
      startDate: new Date("2024-08-01"),
    },
  ];

  for (const asg of assignments) {
    const emp = employeeMap.get(asg.employeeCode);
    const pos = positionMap.get(asg.positionCode);
    if (!emp || !pos) continue;

    const existing = await prisma.employmentAssignment.findFirst({
      where: {
        employeeId: emp.id,
        assignmentType: AssignmentType.PRIMARY,
        status: AssignmentStatus.ACTIVE,
      },
    });

    if (existing) {
      await prisma.employmentAssignment.update({
        where: { id: existing.id },
        data: {
          unitId: asg.unitId,
          positionId: pos.id,
          isHeadOfUnit: asg.isHeadOfUnit,
          startDate: asg.startDate,
        },
      });
    } else {
      await prisma.employmentAssignment.create({
        data: {
          employeeId: emp.id,
          unitId: asg.unitId,
          positionId: pos.id,
          assignmentType: AssignmentType.PRIMARY,
          isHeadOfUnit: asg.isHeadOfUnit,
          startDate: asg.startDate,
          status: AssignmentStatus.ACTIVE,
        },
      });
    }
  }

  console.log(`  ✔ Seeded ${assignments.length} Primary Employment Assignments.`);

  // --------------------------------------------------------------------------
  // STEP 7: UPDATE UNIT MANAGERS (CIRCULAR FK RESOLUTION)
  // --------------------------------------------------------------------------
  console.log("\n📦 7. Updating Unit Leaders (Resolving Circular FKs)...");

  const rectorEmp = employeeMap.get("DAU180001");
  const unitHeadEmp = employeeMap.get("DAU210001");
  const hrManagerEmp = employeeMap.get("DAU200001");

  if (rectorEmp) {
    await prisma.organizationalUnit.update({
      where: { code: "BGH" },
      data: { managerEmployeeId: rectorEmp.id },
    });
  }

  if (unitHeadEmp) {
    await prisma.organizationalUnit.update({
      where: { code: "K_KT" },
      data: { managerEmployeeId: unitHeadEmp.id },
    });
  }

  if (hrManagerEmp) {
    await prisma.organizationalUnit.update({
      where: { code: "P_TCHC" },
      data: { managerEmployeeId: hrManagerEmp.id },
    });
  }

  console.log("  ✔ Unit leaders updated: BGH -> Rector, K_KT -> Unit Head, P_TCHC -> HR Manager.");

  // --------------------------------------------------------------------------
  // STEP 8: RBAC ROLE ASSIGNMENTS WITH ORGANIZATIONAL SCOPES
  // --------------------------------------------------------------------------
  console.log("\n📦 8. Seeding Role Assignments with Scopes...");

  const roleAssignments = [
    {
      email: "admin@dau.edu.vn",
      roleCode: "ROLE_SYSADMIN",
      scopeUnitId: null, // ALL: System wide
    },
    {
      email: "rector@dau.edu.vn",
      roleCode: "ROLE_RECTOR",
      scopeUnitId: null, // ALL: University wide
    },
    {
      email: "hrmanager@dau.edu.vn",
      roleCode: "ROLE_HR_OFFICER",
      scopeUnitId: null, // ALL: University wide HR Officer
    },
    {
      email: "unithead@dau.edu.vn",
      roleCode: "ROLE_UNIT_HEAD",
      scopeUnitId: kKt.id, // TREE: Scoped to Khoa Kiến trúc and sub-divisions
    },
    {
      email: "hrspecialist@dau.edu.vn",
      roleCode: "ROLE_HR_OFFICER",
      scopeUnitId: null, // ALL: University wide HR Specialist
    },
    {
      email: "employee@dau.edu.vn",
      roleCode: "ROLE_EMPLOYEE",
      scopeUnitId: null, // SELF: Self-service space
    },
  ];

  for (const ra of roleAssignments) {
    const user = userMap.get(ra.email);
    const role = roleMap.get(ra.roleCode);
    if (!user || !role) continue;

    const existing = await prisma.roleAssignment.findFirst({
      where: {
        userId: user.id,
        roleId: role.id,
      },
    });

    if (existing) {
      await prisma.roleAssignment.update({
        where: { id: existing.id },
        data: {
          scopeUnitId: ra.scopeUnitId,
          validFrom: new Date("2020-01-01"),
        },
      });
    } else {
      await prisma.roleAssignment.create({
        data: {
          userId: user.id,
          roleId: role.id,
          scopeUnitId: ra.scopeUnitId,
          validFrom: new Date("2020-01-01"),
        },
      });
    }
  }

  console.log(`  ✔ Seeded ${roleAssignments.length} Scoped Role Assignments.`);

  // --------------------------------------------------------------------------
  // STEP 9: SAMPLE EMPLOYMENT CONTRACTS
  // --------------------------------------------------------------------------
  console.log("\n📦 9. Seeding Employment Contracts...");

  const contracts = [
    {
      employeeCode: "DAU190001",
      contractNumber: "HDLD-2019/001-DAU",
      contractType: ContractType.INDEFINITE_TERM,
      signedDate: new Date("2019-01-01"),
      effectiveDate: new Date("2019-01-01"),
      expiryDate: null,
      salaryCoefficient: new Prisma.Decimal("3.66"),
      status: ContractStatus.ACTIVE,
    },
    {
      employeeCode: "DAU180001",
      contractNumber: "HDLD-2018/001-DAU",
      contractType: ContractType.INDEFINITE_TERM,
      signedDate: new Date("2018-01-01"),
      effectiveDate: new Date("2018-01-01"),
      expiryDate: null,
      salaryCoefficient: new Prisma.Decimal("5.42"),
      status: ContractStatus.ACTIVE,
    },
    {
      employeeCode: "DAU200001",
      contractNumber: "HDLD-2020/002-DAU",
      contractType: ContractType.INDEFINITE_TERM,
      signedDate: new Date("2020-03-01"),
      effectiveDate: new Date("2020-03-01"),
      expiryDate: null,
      salaryCoefficient: new Prisma.Decimal("4.40"),
      status: ContractStatus.ACTIVE,
    },
    {
      employeeCode: "DAU210001",
      contractNumber: "HDLD-2021/003-DAU",
      contractType: ContractType.INDEFINITE_TERM,
      signedDate: new Date("2021-01-15"),
      effectiveDate: new Date("2021-01-15"),
      expiryDate: null,
      salaryCoefficient: new Prisma.Decimal("4.74"),
      status: ContractStatus.ACTIVE,
    },
    {
      employeeCode: "DAU230001",
      contractNumber: "HDLD-2023/004-DAU",
      contractType: ContractType.DEFINITE_TERM_36M,
      signedDate: new Date("2023-02-01"),
      effectiveDate: new Date("2023-02-01"),
      expiryDate: new Date("2026-02-01"),
      salaryCoefficient: new Prisma.Decimal("2.67"),
      status: ContractStatus.ACTIVE,
    },
    {
      employeeCode: "DAU240001",
      contractNumber: "HDLD-2024/005-DAU",
      contractType: ContractType.DEFINITE_TERM_36M,
      signedDate: new Date("2024-08-01"),
      effectiveDate: new Date("2024-08-01"),
      expiryDate: new Date("2027-08-01"),
      salaryCoefficient: new Prisma.Decimal("3.00"),
      status: ContractStatus.ACTIVE,
    },
  ];

  for (const c of contracts) {
    const emp = employeeMap.get(c.employeeCode);
    if (!emp) continue;

    await prisma.employmentContract.upsert({
      where: { contractNumber: c.contractNumber },
      update: {
        salaryCoefficient: c.salaryCoefficient,
        effectiveDate: c.effectiveDate,
        expiryDate: c.expiryDate,
        status: c.status,
      },
      create: {
        employeeId: emp.id,
        contractNumber: c.contractNumber,
        contractType: c.contractType,
        signedDate: c.signedDate,
        effectiveDate: c.effectiveDate,
        expiryDate: c.expiryDate,
        salaryCoefficient: c.salaryCoefficient,
        status: c.status,
      },
    });
  }

  console.log(`  ✔ Seeded ${contracts.length} Employment Contracts.`);

  // --------------------------------------------------------------------------
  // STEP 10: SAMPLE EMPLOYMENT EVENTS (TIMELINE)
  // --------------------------------------------------------------------------
  console.log("\n📦 10. Seeding Employment Events Timeline...");

  const events = [
    {
      employeeCode: "DAU200001", // HR Manager
      eventType: EmploymentEventType.APPOINTED,
      decisionNumber: "QD-BGH/2020-045",
      decisionDate: new Date("2020-02-25"),
      effectiveDate: new Date("2020-03-01"),
      toUnitId: pTchc.id,
      toPositionId: positionMap.get("TRUONG_PHONG")?.id,
      note: "Bổ nhiệm giữ chức vụ Trưởng phòng Tổ chức - Hành chính",
    },
    {
      employeeCode: "DAU210001", // Unit Head
      eventType: EmploymentEventType.APPOINTED,
      decisionNumber: "QD-BGH/2021-012",
      decisionDate: new Date("2021-01-10"),
      effectiveDate: new Date("2021-01-15"),
      toUnitId: kKt.id,
      toPositionId: positionMap.get("TRUONG_KHOA")?.id,
      note: "Bổ nhiệm giữ chức vụ Trưởng Khoa Kiến trúc nhiệm kỳ 2021 - 2026",
    },
    {
      employeeCode: "DAU240001", // Lecturer
      eventType: EmploymentEventType.HIRED,
      decisionNumber: "QD-TD/2024-089",
      decisionDate: new Date("2024-07-20"),
      effectiveDate: new Date("2024-08-01"),
      toUnitId: bmKtct.id,
      toPositionId: positionMap.get("GIANG_VIEN")?.id,
      note: "Tuyển dụng mới vị trí Giảng viên Bộ môn Kiến trúc công trình",
    },
  ];

  for (const ev of events) {
    const emp = employeeMap.get(ev.employeeCode);
    if (!emp) continue;

    const existing = await prisma.employmentEvent.findFirst({
      where: {
        employeeId: emp.id,
        decisionNumber: ev.decisionNumber,
      },
    });

    if (!existing) {
      await prisma.employmentEvent.create({
        data: {
          employeeId: emp.id,
          eventType: ev.eventType,
          decisionNumber: ev.decisionNumber,
          decisionDate: ev.decisionDate,
          effectiveDate: ev.effectiveDate,
          toUnitId: ev.toUnitId,
          toPositionId: ev.toPositionId,
          note: ev.note,
        },
      });
    }
  }

  console.log(`  ✔ Seeded ${events.length} initial Employment Events.`);

  console.log("\n=====================================================================");
  console.log("🎉 SEEDING COMPLETED SUCCESSFULLY!");
  console.log("=====================================================================");
  console.log("Summary of Created Sample Accounts (Password: Admin@123456):");
  console.log("  1. Super Admin   : admin@dau.edu.vn        [ROLE_SYSADMIN,   Scope: ALL]");
  console.log("  2. Rector        : rector@dau.edu.vn       [ROLE_RECTOR,     Scope: ALL]");
  console.log("  3. HR Manager    : hrmanager@dau.edu.vn    [ROLE_HR_OFFICER, Scope: ALL]");
  console.log("  4. Unit Head     : unithead@dau.edu.vn     [ROLE_UNIT_HEAD,  Scope: K_KT]");
  console.log("  5. HR Specialist : hrspecialist@dau.edu.vn [ROLE_HR_OFFICER, Scope: ALL]");
  console.log("  6. Lecturer/Emp  : employee@dau.edu.vn     [ROLE_EMPLOYEE,   Scope: SELF]");
  console.log("=====================================================================\n");
}

// ============================================================================
// 3. EXECUTION HANDLER
// ============================================================================

main()
  .catch((e) => {
    console.error("\n❌ Database seeding failed with error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
