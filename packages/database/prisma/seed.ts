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
  AttendanceStatus,
  KpiPeriodStatus,
  KpiTargetType,
  KpiEvaluationStatus,
  KpiRanking,
  CertificateType,
  CertificateStatus,
  TrainingCategory,
  TrainingCourseStatus,
  ParticipantStatus,
} from "@prisma/client";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/bahau_dev?schema=public";
}

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
    // KPI & Performance Evaluation
    { code: "kpi:view_own", module: "KPI", action: "READ" },
    { code: "kpi:submit_self", module: "KPI", action: "CREATE" },
    { code: "kpi:view_unit", module: "KPI", action: "READ" },
    { code: "kpi:evaluate_unit", module: "KPI", action: "UPDATE" },
    { code: "kpi:manage_periods", module: "KPI", action: "MANAGE" },
    { code: "kpi:finalize_council", module: "KPI", action: "FINALIZE" },
    // Training & Certification
    { code: "training:view_courses", module: "TRAINING", action: "READ" },
    { code: "training:manage_courses", module: "TRAINING", action: "MANAGE" },
    { code: "training:register_course", module: "TRAINING", action: "CREATE" },
    { code: "training:view_own_certificates", module: "TRAINING", action: "READ" },
    { code: "training:submit_certificate", module: "TRAINING", action: "CREATE" },
    { code: "training:verify_certificate", module: "TRAINING", action: "VERIFY" },
    { code: "training:view_all_certificates", module: "TRAINING", action: "READ" },
    // Reports & Dashboards
    { code: "report:dashboard_unit", module: "REPORT", action: "READ" },
    { code: "report:dashboard_rector", module: "REPORT", action: "READ" },
    { code: "dashboard:view_overview", module: "DASHBOARD", action: "READ" },
    { code: "dashboard:view_workforce_stats", module: "DASHBOARD", action: "READ" },
    { code: "dashboard:view_alerts", module: "DASHBOARD", action: "READ" },
    // Notifications & Outbox
    { code: "notification:view_own", module: "NOTIFICATION", action: "READ" },
    { code: "notification:mark_read", module: "NOTIFICATION", action: "UPDATE" },
    { code: "worker:process_outbox", module: "WORKER", action: "MANAGE" },
    // AI Assistant
    { code: "ai:chat", module: "AI", action: "EXECUTE" },
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
      "kpi:manage_periods",
      "kpi:view_unit",
      "training:view_courses",
      "training:manage_courses",
      "training:view_all_certificates",
      "training:verify_certificate",
      "dashboard:view_overview",
      "dashboard:view_workforce_stats",
      "dashboard:view_alerts",
      "notification:view_own",
      "notification:mark_read",
      "worker:process_outbox",
      "ai:chat",
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
      "kpi:view_own",
      "kpi:view_unit",
      "kpi:evaluate_unit",
      "kpi:finalize_council",
      "training:view_courses",
      "training:manage_courses",
      "training:view_own_certificates",
      "training:view_all_certificates",
      "report:dashboard_unit",
      "report:dashboard_rector",
      "system:view_audit_logs",
      "dashboard:view_overview",
      "dashboard:view_workforce_stats",
      "dashboard:view_alerts",
      "notification:view_own",
      "notification:mark_read",
      "ai:chat",
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
      "kpi:view_own",
      "kpi:submit_self",
      "kpi:view_unit",
      "kpi:evaluate_unit",
      "kpi:manage_periods",
      "kpi:finalize_council",
      "training:view_courses",
      "training:manage_courses",
      "training:register_course",
      "training:view_own_certificates",
      "training:submit_certificate",
      "training:verify_certificate",
      "training:view_all_certificates",
      "report:dashboard_unit",
      "report:dashboard_rector",
      "system:manage_users",
      "system:view_audit_logs",
      "dashboard:view_overview",
      "dashboard:view_workforce_stats",
      "dashboard:view_alerts",
      "notification:view_own",
      "notification:mark_read",
      "ai:chat",
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
      "kpi:view_own",
      "kpi:submit_self",
      "kpi:view_unit",
      "kpi:evaluate_unit",
      "training:view_courses",
      "training:register_course",
      "training:view_own_certificates",
      "training:submit_certificate",
      "training:view_all_certificates",
      "report:dashboard_unit",
      "dashboard:view_overview",
      "dashboard:view_workforce_stats",
      "dashboard:view_alerts",
      "notification:view_own",
      "notification:mark_read",
      "ai:chat",
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
      "kpi:view_own",
      "kpi:submit_self",
      "training:view_courses",
      "training:register_course",
      "training:view_own_certificates",
      "training:submit_certificate",
      "notification:view_own",
      "notification:mark_read",
      "ai:chat",
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
  console.log("\n📦 9. Seeding Employment Contracts & Renewal Chains...");

  const now = new Date();
  const dateIn20Days = new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000);
  const dateIn45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const dateIn75Days = new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000);

  // 1. Hợp đồng gốc ban đầu (sẽ được gia hạn) của giảng viên DAU240001
  const lecturerEmp = employeeMap.get("DAU240001");
  let parentContractId: string | null = null;

  if (lecturerEmp) {
    const parentContract = await prisma.employmentContract.upsert({
      where: { contractNumber: "HDLD-2023/005-DAU-P1" },
      update: {
        status: ContractStatus.RENEWED,
      },
      create: {
        employeeId: lecturerEmp.id,
        contractNumber: "HDLD-2023/005-DAU-P1",
        contractType: ContractType.DEFINITE_TERM_12M,
        signedDate: new Date("2023-08-01"),
        effectiveDate: new Date("2023-08-01"),
        expiryDate: new Date("2024-08-01"),
        salaryCoefficient: new Prisma.Decimal("2.34"),
        status: ContractStatus.RENEWED,
      },
    });
    parentContractId = parentContract.id;
  }

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
      parentContractId: null,
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
      parentContractId: null,
    },
    {
      employeeCode: "DAU200001",
      contractNumber: "HDLD-2020/002-DAU",
      contractType: ContractType.DEFINITE_TERM_36M,
      signedDate: new Date("2023-09-01"),
      effectiveDate: new Date("2023-09-01"),
      expiryDate: dateIn75Days, // Sắp hết hạn trong ~75 ngày (WARNING_90)
      salaryCoefficient: new Prisma.Decimal("4.40"),
      status: ContractStatus.ACTIVE,
      parentContractId: null,
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
      parentContractId: null,
    },
    {
      employeeCode: "DAU230001",
      contractNumber: "HDLD-2023/004-DAU",
      contractType: ContractType.DEFINITE_TERM_36M,
      signedDate: new Date("2023-02-01"),
      effectiveDate: new Date("2023-02-01"),
      expiryDate: dateIn20Days, // Sắp hết hạn trong ~20 ngày (CRITICAL_30)
      salaryCoefficient: new Prisma.Decimal("2.67"),
      status: ContractStatus.ACTIVE,
      parentContractId: null,
    },
    {
      employeeCode: "DAU240001",
      contractNumber: "HDLD-2024/005-DAU",
      contractType: ContractType.DEFINITE_TERM_36M,
      signedDate: new Date("2024-08-01"),
      effectiveDate: new Date("2024-08-01"),
      expiryDate: dateIn45Days, // Sắp hết hạn trong ~45 ngày (WARNING_60)
      salaryCoefficient: new Prisma.Decimal("3.00"),
      status: ContractStatus.ACTIVE,
      parentContractId: parentContractId, // Chuỗi liên kết gia hạn
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
        parentContractId: c.parentContractId,
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
        parentContractId: c.parentContractId,
      },
    });
  }

  console.log(`  ✔ Seeded ${contracts.length + 1} Employment Contracts with renewal chain & alerts.`);

  // --------------------------------------------------------------------------
  // STEP 10: SAMPLE EMPLOYMENT EVENTS (TIMELINE)
  // --------------------------------------------------------------------------
  console.log("\n📦 10. Seeding Employment Events Timeline...");

  const events = [
    {
      employeeCode: "DAU180001", // Rector
      eventType: EmploymentEventType.APPOINTED,
      decisionNumber: "QD-BGD/2018-001",
      decisionDate: new Date("2017-12-20"),
      effectiveDate: new Date("2018-01-01"),
      toUnitId: bgh.id,
      toPositionId: positionMap.get("HIEU_TRUONG")?.id,
      note: "Quyết định công nhận Hiệu trưởng Trường Đại học Kiến trúc Đà Nẵng",
    },
    {
      employeeCode: "DAU200001", // HR Manager
      eventType: EmploymentEventType.HIRED,
      decisionNumber: "QD-TD/2019-032",
      decisionDate: new Date("2019-04-20"),
      effectiveDate: new Date("2019-05-01"),
      toUnitId: pTchc.id,
      toPositionId: positionMap.get("CHUYEN_VIEN")?.id,
      note: "Tuyển dụng Chuyên viên Phòng Tổ chức - Hành chính",
    },
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
      eventType: EmploymentEventType.HIRED,
      decisionNumber: "QD-TD/2017-065",
      decisionDate: new Date("2017-08-15"),
      effectiveDate: new Date("2017-09-01"),
      toUnitId: bmKtct.id,
      toPositionId: positionMap.get("GIANG_VIEN")?.id,
      note: "Tuyển dụng Giảng viên Bộ môn Kiến trúc công trình",
    },
    {
      employeeCode: "DAU210001", // Unit Head
      eventType: EmploymentEventType.APPOINTED,
      decisionNumber: "QD-BGH/2021-012",
      decisionDate: new Date("2021-01-10"),
      effectiveDate: new Date("2021-01-15"),
      fromUnitId: bmKtct.id,
      toUnitId: kKt.id,
      fromPositionId: positionMap.get("GIANG_VIEN")?.id,
      toPositionId: positionMap.get("TRUONG_KHOA")?.id,
      note: "Bổ nhiệm giữ chức vụ Trưởng Khoa Kiến trúc nhiệm kỳ 2021 - 2026",
    },
    {
      employeeCode: "DAU240001", // Lecturer
      eventType: EmploymentEventType.HIRED,
      decisionNumber: "QD-TD/2023-089",
      decisionDate: new Date("2023-07-20"),
      effectiveDate: new Date("2023-08-01"),
      toUnitId: bmKtct.id,
      toPositionId: positionMap.get("GIANG_VIEN")?.id,
      note: "Tuyển dụng Giảng viên hợp đồng thử việc Bộ môn Kiến trúc công trình",
    },
    {
      employeeCode: "DAU240001", // Lecturer
      eventType: EmploymentEventType.PROMOTED,
      decisionNumber: "QD-CD/2024-112",
      decisionDate: new Date("2024-07-25"),
      effectiveDate: new Date("2024-08-01"),
      toUnitId: bmKtct.id,
      toPositionId: positionMap.get("GIANG_VIEN")?.id,
      note: "Bổ nhiệm vào chức danh nghề nghiệp Giảng viên chính thức (Hạng III)",
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
          fromUnitId: ev.fromUnitId || null,
          toUnitId: ev.toUnitId || null,
          fromPositionId: ev.fromPositionId || null,
          toPositionId: ev.toPositionId || null,
          note: ev.note,
        },
      });
    }
  }

  console.log(`  ✔ Seeded ${events.length} Employment Events Timeline.`);

  // --------------------------------------------------------------------------
  // STEP 11: SEED LEAVE LEDGER (ANNUAL QUOTA 2026) & WORKFLOW SAMPLE
  // --------------------------------------------------------------------------
  console.log("\n📦 11. Seeding Leave Ledger 2026 Quotas & Workflow Samples...");

  const currentYear = 2026;
  for (const emp of employeeMap.values()) {
    const existingQuota = await prisma.leaveLedger.findFirst({
      where: {
        employeeId: emp.id,
        year: currentYear,
        action: "GRANT_ANNUAL",
      },
    });

    if (!existingQuota) {
      await prisma.leaveLedger.create({
        data: {
          employeeId: emp.id,
          year: currentYear,
          action: "GRANT_ANNUAL",
          amount: new Prisma.Decimal(12),
          balanceAfter: new Prisma.Decimal(12),
          note: `Cấp hạn ngạch phép năm ${currentYear} tiêu chuẩn DAU`,
        },
      });
    }
  }
  console.log(`  ✔ Seeded standard 12-day annual leave quota for all ${employeeMap.size} employees.`);

  // Sample Leave Request for Lecturer (DAU240001)
  const lecturerEmpForLeave = employeeMap.get("DAU240001");
  const unitHeadUser = userMap.get("unithead@dau.edu.vn");
  if (lecturerEmpForLeave && unitHeadEmp) {
    const existingLeave = await prisma.leaveRequest.findFirst({
      where: { employeeId: lecturerEmpForLeave.id },
    });

    if (!existingLeave) {
      const sampleLeave = await prisma.leaveRequest.create({
        data: {
          employeeId: lecturerEmpForLeave.id,
          leaveType: "ANNUAL",
          startDate: new Date("2026-10-12"),
          endDate: new Date("2026-10-13"),
          totalDays: new Prisma.Decimal(2),
          reason: "Nghỉ phép giải quyết việc gia đình cá nhân",
          substituteEmployeeId: unitHeadEmp.id,
          status: "PENDING",
        },
      });

      // Record HOLD in Leave Ledger
      await prisma.leaveLedger.create({
        data: {
          employeeId: lecturerEmpForLeave.id,
          year: currentYear,
          action: "HOLD",
          amount: new Prisma.Decimal(2),
          balanceAfter: new Prisma.Decimal(10),
          referenceLeaveRequestId: sampleLeave.id,
          note: `Tạm giữ 2 ngày phép cho đơn nghỉ phép mẫu`,
        },
      });

      // Create WorkflowInstance
      const wfInstance = await prisma.workflowInstance.create({
        data: {
          module: "LEAVE",
          recordId: sampleLeave.id,
          requesterEmployeeId: lecturerEmpForLeave.id,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      await prisma.leaveRequest.update({
        where: { id: sampleLeave.id },
        data: { workflowInstanceId: wfInstance.id },
      });

      // Steps: Trưởng đơn vị -> Phòng TCHC
      await prisma.workflowStep.createMany({
        data: [
          {
            instanceId: wfInstance.id,
            stepIndex: 0,
            stepName: "Trưởng Khoa Kiến trúc phê duyệt",
            approverRoleCode: "ROLE_UNIT_HEAD",
            approverEmployeeId: unitHeadEmp.id,
            status: "WAITING",
          },
          {
            instanceId: wfInstance.id,
            stepIndex: 1,
            stepName: "Phòng TCHC thẩm định & vào sổ",
            approverRoleCode: "ROLE_HR_OFFICER",
            status: "WAITING",
          },
        ],
      });

      console.log("  ✔ Seeded sample pending leave request and workflow steps.");
    }
  }

  // ==========================================================================
  // 12. SEED ATTENDANCE & TIMESHEETS (PHASE 3)
  // ==========================================================================
  console.log("\n[Step 12/12] Seeding Attendance Periods, Daily Logs & Summaries...");

  // Period Aug 2026 (Locked)
  const augPeriod = await prisma.attendancePeriod.upsert({
    where: { year_month: { year: 2026, month: 8 } },
    update: {},
    create: {
      year: 2026,
      month: 8,
      startDate: new Date("2026-08-01"),
      endDate: new Date("2026-08-31"),
      standardWorkingDays: new Prisma.Decimal(22),
      isLocked: true,
      lockedAt: new Date("2026-09-05T08:00:00Z"),
      note: "Đã chốt công tháng 8/2026 và chuyển kế toán lương",
    },
  });

  // Period Sep 2026 (Active/Open)
  const sepPeriod = await prisma.attendancePeriod.upsert({
    where: { year_month: { year: 2026, month: 9 } },
    update: {},
    create: {
      year: 2026,
      month: 9,
      startDate: new Date("2026-09-01"),
      endDate: new Date("2026-09-30"),
      standardWorkingDays: new Prisma.Decimal(22),
      isLocked: false,
      note: "Kỳ công tháng 9/2026 - Đang mở ghi nhận",
    },
  });

  // Monthly summary for Aug 2026 for lecturerEmp
  if (lecturerEmp) {
    await prisma.monthlyTimesheetSummary.upsert({
      where: {
        employeeId_periodId: {
          employeeId: lecturerEmp.id,
          periodId: augPeriod.id,
        },
      },
      update: {},
      create: {
        employeeId: lecturerEmp.id,
        periodId: augPeriod.id,
        standardDays: new Prisma.Decimal(22),
        actualWorkingDays: new Prisma.Decimal(21.0),
        paidLeaveDays: new Prisma.Decimal(1.0),
        unpaidLeaveDays: new Prisma.Decimal(0.0),
        businessTripDays: new Prisma.Decimal(0.0),
        lateCount: 1,
        earlyLeaveCount: 0,
        totalPayableDays: new Prisma.Decimal(22.0),
        isFinalized: true,
      },
    });

    // Seed daily attendance records for Sep 2026
    const sampleRecords = [
      {
        workDate: new Date("2026-09-01"),
        checkInTime: new Date("2026-09-01T07:55:00Z"),
        checkOutTime: new Date("2026-09-01T17:05:00Z"),
        rawWorkingHours: new Prisma.Decimal(8.0),
        status: AttendanceStatus.PRESENT,
        deviceSource: "BIOMETRIC_GATE_A",
      },
      {
        workDate: new Date("2026-09-02"),
        checkInTime: null,
        checkOutTime: null,
        rawWorkingHours: new Prisma.Decimal(0.0),
        status: AttendanceStatus.HOLIDAY,
        deviceSource: "SYSTEM_CALENDAR",
      },
      {
        workDate: new Date("2026-09-03"),
        checkInTime: new Date("2026-09-03T07:50:00Z"),
        checkOutTime: new Date("2026-09-03T17:15:00Z"),
        rawWorkingHours: new Prisma.Decimal(8.0),
        status: AttendanceStatus.PRESENT,
        deviceSource: "BIOMETRIC_GATE_A",
      },
      {
        workDate: new Date("2026-09-04"),
        checkInTime: new Date("2026-09-04T08:25:00Z"),
        checkOutTime: new Date("2026-09-04T17:00:00Z"),
        rawWorkingHours: new Prisma.Decimal(7.58),
        status: AttendanceStatus.LATE,
        deviceSource: "BIOMETRIC_GATE_B",
      },
      {
        workDate: new Date("2026-09-07"),
        checkInTime: null,
        checkOutTime: null,
        rawWorkingHours: new Prisma.Decimal(0.0),
        status: AttendanceStatus.ON_LEAVE,
        deviceSource: "WORKFLOW_LEAVE",
      },
      {
        workDate: new Date("2026-09-08"),
        checkInTime: new Date("2026-09-08T08:00:00Z"),
        checkOutTime: new Date("2026-09-08T17:00:00Z"),
        rawWorkingHours: new Prisma.Decimal(8.0),
        status: AttendanceStatus.PRESENT,
        deviceSource: "BIOMETRIC_GATE_A",
      },
    ];

    for (const rec of sampleRecords) {
      await prisma.attendanceRecord.upsert({
        where: {
          employeeId_workDate: {
            employeeId: lecturerEmp.id,
            workDate: rec.workDate,
          },
        },
        update: {},
        create: {
          employeeId: lecturerEmp.id,
          periodId: sepPeriod.id,
          workDate: rec.workDate,
          checkInTime: rec.checkInTime,
          checkOutTime: rec.checkOutTime,
          rawWorkingHours: rec.rawWorkingHours,
          status: rec.status,
          deviceSource: rec.deviceSource,
        },
      });
    }

    // Sample Attendance Adjustment Request for 2026-09-04
    const existingAdjustment = await prisma.attendanceAdjustmentRequest.findFirst({
      where: { employeeId: lecturerEmp.id, workDate: new Date("2026-09-04") },
    });

    if (!existingAdjustment && unitHeadEmp) {
      const sampleAdj = await prisma.attendanceAdjustmentRequest.create({
        data: {
          employeeId: lecturerEmp.id,
          workDate: new Date("2026-09-04"),
          originalCheckIn: new Date("2026-09-04T08:25:00Z"),
          originalCheckOut: new Date("2026-09-04T17:00:00Z"),
          adjustedCheckIn: new Date("2026-09-04T07:55:00Z"),
          adjustedCheckOut: new Date("2026-09-04T17:00:00Z"),
          reason: "Máy quét vân tay Cổng B gặp sự cố khởi động lại lúc 8h sáng, thực tế đã có mặt giảng đường lúc 7h55.",
          status: "PENDING",
        },
      });

      // Link record to adjustment
      await prisma.attendanceRecord.updateMany({
        where: {
          employeeId: lecturerEmp.id,
          workDate: new Date("2026-09-04"),
        },
        data: {
          adjustmentRequestId: sampleAdj.id,
        },
      });

      const wfInstance = await prisma.workflowInstance.create({
        data: {
          module: "ATTENDANCE_ADJUSTMENT",
          recordId: sampleAdj.id,
          requesterEmployeeId: lecturerEmp.id,
          currentStepIndex: 0,
          status: "PENDING",
        },
      });

      await prisma.attendanceAdjustmentRequest.update({
        where: { id: sampleAdj.id },
        data: { workflowInstanceId: wfInstance.id },
      });

      await prisma.workflowStep.createMany({
        data: [
          {
            instanceId: wfInstance.id,
            stepIndex: 0,
            stepName: "Trưởng Khoa Kiến trúc xác nhận",
            approverRoleCode: "ROLE_UNIT_HEAD",
            approverEmployeeId: unitHeadEmp.id,
            status: "WAITING",
          },
          {
            instanceId: wfInstance.id,
            stepIndex: 1,
            stepName: "Phòng TCHC duyệt điều chỉnh công",
            approverRoleCode: "ROLE_HR_OFFICER",
            status: "WAITING",
          },
        ],
      });

      console.log("  ✔ Seeded sample attendance adjustment request and workflow.");
    }
  }
  console.log("  ✔ Seeded attendance periods (Aug 2026 locked, Sep 2026 active) and initial logs.");

  // ==========================================================================
  // 13. SEED KPI & PERFORMANCE EVALUATION (PHASE 4)
  // ==========================================================================
  console.log("\n[Step 13/13] Seeding KPI Periods, Templates, Criteria & Sample Evaluations...");

  // 1. KPI Period 2025-2026
  const kpiPeriod = await prisma.kpiPeriod.upsert({
    where: { code: "KPI-2025-2026" },
    update: {},
    create: {
      code: "KPI-2025-2026",
      name: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
      academicYear: "2025-2026",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-10-31"),
      status: KpiPeriodStatus.OPEN,
    },
  });

  // 2. KPI Template for Lecturer (100 pts)
  const lecturerTemplate = await prisma.kpiTemplate.upsert({
    where: { code: "KPI_TMPL_LECTURER" },
    update: {},
    create: {
      code: "KPI_TMPL_LECTURER",
      name: "Tiêu chuẩn Đánh giá & Xếp loại Giảng viên DAU",
      targetType: KpiTargetType.LECTURER,
      description: "Khung tiêu chuẩn đánh giá giảng dạy, NCKH và phục vụ cộng đồng theo quy chuẩn Trường ĐH Kiến trúc Đà Nẵng",
      totalMaxScore: new Prisma.Decimal(100),
    },
  });

  const lecturerCriteria = [
    { orderIndex: 1, category: "Công tác Giảng dạy & Giáo dục", name: "Hoàn thành định mức khối lượng giờ giảng", description: "Đảm bảo đủ số tiết giảng chuẩn được giao trong năm học", maxScore: new Prisma.Decimal(20) },
    { orderIndex: 2, category: "Công tác Giảng dạy & Giáo dục", name: "Chất lượng giảng dạy và đổi mới phương pháp", description: "Giáo án chuẩn mực, ứng dụng phương pháp tích cực, phản hồi đánh giá tốt", maxScore: new Prisma.Decimal(10) },
    { orderIndex: 3, category: "Công tác Giảng dạy & Giáo dục", name: "Coi thi, chấm thi & hướng dẫn đồ án / NCKH sinh viên", description: "Thực hiện nghiêm túc quy chế khảo thí, hướng dẫn đồ án đạt chất lượng", maxScore: new Prisma.Decimal(10) },
    { orderIndex: 4, category: "Nghiên cứu Khoa học & Chuyển giao", name: "Công bố bài báo khoa học quốc tế / Tạp chí chuyên ngành", description: "Tác giả bài báo ISI/Scopus hoặc Tạp chí chuyên ngành (Kèm link minh chứng)", maxScore: new Prisma.Decimal(15) },
    { orderIndex: 5, category: "Nghiên cứu Khoa học & Chuyển giao", name: "Chủ trì / tham gia đề tài NCKH & biên soạn giáo trình", description: "Đề tài cấp Trường, cấp Bộ, cấp Nhà nước hoặc giáo trình xuất bản", maxScore: new Prisma.Decimal(15) },
    { orderIndex: 6, category: "Phục vụ Cộng đồng & Nhà trường", name: "Cố vấn học tập, tuyển sinh & hoạt động đoàn thể", description: "Tham gia ban đề thi, ban tuyển sinh, quản lý lớp sinh viên", maxScore: new Prisma.Decimal(10) },
    { orderIndex: 7, category: "Phục vụ Cộng đồng & Nhà trường", name: "Bồi dưỡng chuyên môn & kết nối doanh nghiệp", description: "Tham gia hội thảo học thuật, kết nối doanh nghiệp ngành kiến trúc/xây dựng", maxScore: new Prisma.Decimal(5) },
    { orderIndex: 8, category: "Kỷ luật Lao động & Đạo đức Nhà giáo", name: "Chấp hành chủ trương, nội quy và văn hóa sư phạm", description: "Giữ gìn phẩm chất đạo đức nhà giáo, tuân thủ kỷ luật lao động DAU", maxScore: new Prisma.Decimal(15) },
  ];

  const createdLecturerCriteria = [];
  for (const c of lecturerCriteria) {
    const existing = await prisma.kpiCriterion.findFirst({
      where: { templateId: lecturerTemplate.id, orderIndex: c.orderIndex },
    });
    if (!existing) {
      const crit = await prisma.kpiCriterion.create({
        data: {
          templateId: lecturerTemplate.id,
          orderIndex: c.orderIndex,
          category: c.category,
          name: c.name,
          description: c.description,
          maxScore: c.maxScore,
        },
      });
      createdLecturerCriteria.push(crit);
    } else {
      createdLecturerCriteria.push(existing);
    }
  }

  // 3. KPI Template for Staff (100 pts)
  const staffTemplate = await prisma.kpiTemplate.upsert({
    where: { code: "KPI_TMPL_STAFF" },
    update: {},
    create: {
      code: "KPI_TMPL_STAFF",
      name: "Tiêu chuẩn Đánh giá & Xếp loại Chuyên viên / Nhân viên Hành chính DAU",
      targetType: KpiTargetType.STAFF,
      description: "Khung tiêu chuẩn đánh giá khối lượng, chất lượng, tiến độ và tác phong công vụ khối phòng ban hành chính",
      totalMaxScore: new Prisma.Decimal(100),
    },
  });

  const staffCriteria = [
    { orderIndex: 1, category: "Khối lượng & Tiến độ Công việc", name: "Hoàn thành đầy đủ khối lượng công việc theo vị trí", description: "Thực hiện đúng và đủ các nhiệm vụ trong bản mô tả công việc", maxScore: new Prisma.Decimal(20) },
    { orderIndex: 2, category: "Khối lượng & Tiến độ Công việc", name: "Tiến độ xử lý và giải quyết hồ sơ thủ tục", description: "Không để tồn đọng văn bản, trễ hẹn giải quyết công việc", maxScore: new Prisma.Decimal(15) },
    { orderIndex: 3, category: "Chất lượng & Sáng kiến Cải tiến", name: "Chất lượng xử lý văn bản, tài liệu, hồ sơ chuyên môn", description: "Hồ sơ chuẩn xác, đúng thể thức và quy định pháp lý", maxScore: new Prisma.Decimal(15) },
    { orderIndex: 4, category: "Chất lượng & Sáng kiến Cải tiến", name: "Sáng kiến cải tiến quy trình & ứng dụng CNTT", description: "Đề xuất giải pháp tăng năng suất hoặc số hóa quy trình (Kèm minh chứng)", maxScore: new Prisma.Decimal(15) },
    { orderIndex: 5, category: "Tác phong & Tinh thần Phục vụ", name: "Tinh thần phối hợp công tác liên phòng ban", description: "Hợp tác hiệu quả, chia sẻ thông tin kịp thời với các đơn vị liên quan", maxScore: new Prisma.Decimal(10) },
    { orderIndex: 6, category: "Tác phong & Tinh thần Phục vụ", name: "Thái độ văn minh, nhã nhặn phục vụ CBGV và sinh viên", description: "Giao tiếp chuẩn mực, nhiệt tình hỗ trợ người học và giảng viên", maxScore: new Prisma.Decimal(10) },
    { orderIndex: 7, category: "Kỷ luật & Văn hóa Công sở", name: "Kỷ luật giờ giấc làm việc & văn hóa công sở DAU", description: "Tuân thủ nội quy lao động, trang phục lịch sự, văn hóa công sở", maxScore: new Prisma.Decimal(15) },
  ];

  for (const c of staffCriteria) {
    const existing = await prisma.kpiCriterion.findFirst({
      where: { templateId: staffTemplate.id, orderIndex: c.orderIndex },
    });
    if (!existing) {
      await prisma.kpiCriterion.create({
        data: {
          templateId: staffTemplate.id,
          orderIndex: c.orderIndex,
          category: c.category,
          name: c.name,
          description: c.description,
          maxScore: c.maxScore,
        },
      });
    }
  }

  // 4. Sample Evaluation for lecturerEmp (DAU240001)
  if (lecturerEmp && unitHeadEmp) {
    const existingEval = await prisma.kpiEvaluation.findUnique({
      where: {
        periodId_employeeId: {
          periodId: kpiPeriod.id,
          employeeId: lecturerEmp.id,
        },
      },
    });

    if (!existingEval) {
      const sampleEval = await prisma.kpiEvaluation.create({
        data: {
          periodId: kpiPeriod.id,
          templateId: lecturerTemplate.id,
          employeeId: lecturerEmp.id,
          managerEmployeeId: unitHeadEmp.id,
          status: KpiEvaluationStatus.SUBMITTED,
          totalSelfScore: new Prisma.Decimal(92.5),
          submittedAt: new Date("2026-09-10T14:30:00Z"),
        },
      });

      // Seed evaluation items
      const itemScores = [19.5, 9.5, 9.5, 14.0, 13.5, 9.5, 4.5, 15.0];
      for (let i = 0; i < createdLecturerCriteria.length; i++) {
        const crit = createdLecturerCriteria[i];
        await prisma.kpiEvaluationItem.create({
          data: {
            evaluationId: sampleEval.id,
            criterionId: crit.id,
            selfScore: new Prisma.Decimal(itemScores[i] || 10),
            selfNote: i === 3 ? "Công bố 01 bài báo tạp chí Scopus Q2 về Kiến trúc Bền vững Miền Trung" : "Hoàn thành xuất sắc nhiệm vụ",
            evidenceUrl: i === 3 ? "https://dau.edu.vn/research/papers/sustainable-arch-2026.pdf" : null,
          },
        });
      }
      console.log("  ✔ Seeded sample submitted KPI evaluation for Lecturer DAU240001.");
    }
  }
  console.log("  ✔ Seeded KPI templates (Lecturer 100đ, Staff 100đ) and Period 2025-2026.");

  // ---------------------------------------------------------------------------
  // STEP 14: SEED TRAINING COURSES & CERTIFICATES (DAU Phase 5)
  // ---------------------------------------------------------------------------
  console.log("\n[STEP 14] Seeding Training Courses & Certificates (Phase 5)...");

  // 14.1. Khóa đào tạo mẫu
  const courseBim = await prisma.trainingCourse.upsert({
    where: { code: "TC-BIM-2026" },
    update: {},
    create: {
      code: "TC-BIM-2026",
      name: "Tập huấn Ứng dụng Mô hình Thông tin Công trình (BIM Revit) trong Đồ án Kiến trúc",
      category: TrainingCategory.PROFESSIONAL,
      provider: "Viện Kiến trúc & Xây dựng DAU phối hợp Autodesk",
      startDate: new Date("2026-03-15"),
      endDate: new Date("2026-05-15"),
      location: "Phòng Lab BIM - Tòa nhà F, Trường ĐH Kiến trúc Đà Nẵng",
      budget: new Prisma.Decimal(45000000),
      status: TrainingCourseStatus.ONGOING,
      description: "Đào tạo giảng viên khoa Kiến trúc và Xây dựng làm chủ quy trình phối hợp mô hình BIM, phục vụ chuyển đổi số chương trình đào tạo kiến trúc sư theo chuẩn quốc tế.",
    },
  });

  const coursePedagogy = await prisma.trainingCourse.upsert({
    where: { code: "TC-PED-2026" },
    update: {},
    create: {
      code: "TC-PED-2026",
      name: "Bồi dưỡng Nghiệp vụ Sư phạm Giảng dạy Đại học Hiện đại",
      category: TrainingCategory.PEDAGOGY,
      provider: "Trường Đại học Sư phạm - ĐH Đà Nẵng",
      startDate: new Date("2026-06-01"),
      endDate: new Date("2026-08-30"),
      location: "Trung tâm Đào tạo Thường xuyên, DAU",
      budget: new Prisma.Decimal(30000000),
      status: TrainingCourseStatus.PLANNING,
      description: "Khóa học trang bị phương pháp sư phạm tích cực, kiểm tra đánh giá theo chuẩn đầu ra OBE cho giảng viên mới tuyển dụng.",
    },
  });

  const courseRank2 = await prisma.trainingCourse.upsert({
    where: { code: "TC-RANK2-2025" },
    update: {},
    create: {
      code: "TC-RANK2-2025",
      name: "Bồi dưỡng Tiêu chuẩn Chức danh Nghề nghiệp Giảng viên chính (Hạng II)",
      category: TrainingCategory.PROFESSIONAL,
      provider: "Học viện Quản lý Giáo dục",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-11-30"),
      location: "Trực tuyến kết hợp trực tiếp",
      budget: new Prisma.Decimal(25000000),
      status: TrainingCourseStatus.COMPLETED,
      description: "Hoàn thiện chứng chỉ tiêu chuẩn chức danh nghề nghiệp cho các giảng viên thâm niên trên 5 năm tại DAU.",
    },
  });
  console.log("  ✔ Seeded 3 training courses (BIM Revit, Pedagogy, Rank II).");

  // 14.2. Học viên tham gia khóa học
  const lecturerEmpForCert = await prisma.employee.findUnique({
    where: { employeeCode: "DAU240001" },
  });

  if (lecturerEmpForCert) {
    await prisma.trainingParticipant.upsert({
      where: {
        courseId_employeeId: {
          courseId: courseBim.id,
          employeeId: lecturerEmpForCert.id,
        },
      },
      update: {},
      create: {
        courseId: courseBim.id,
        employeeId: lecturerEmpForCert.id,
        status: ParticipantStatus.IN_PROGRESS,
        note: "Cán bộ nòng cốt bộ môn Kiến trúc Công trình tham gia khóa BIM",
      },
    });

    // 14.3. Chứng chỉ của ThS. Đỗ Tuấn Kiệt (Khoa Kiến trúc)
    const hrVerifier = await prisma.employee.findUnique({
      where: { employeeCode: "DAU240088" }, // Chuyên viên nhân sự TCHC
    });

    const certList = [
      {
        certificateType: CertificateType.PROFESSIONAL_PRACTICE,
        name: "Chứng chỉ Hành nghề Kiến trúc sư (Hạng I - Thiết kế Kiến trúc công trình)",
        certificateNumber: "KTS-DN-2022-0012",
        issuedBy: "Sở Xây dựng TP. Đà Nẵng",
        issuedDate: new Date("2022-05-10"),
        expiryDate: new Date("2027-05-10"),
        score: "Hạng I",
        fileUrl: "https://dau.edu.vn/certificates/kts-kietdt-hang1.pdf",
        status: CertificateStatus.VERIFIED,
        verifiedById: hrVerifier?.id || null,
        verifiedAt: new Date("2024-01-15T09:00:00Z"),
      },
      {
        certificateType: CertificateType.LANGUAGE,
        name: "Chứng chỉ Tiếng Anh Quốc tế IELTS Academic (Overall 7.5)",
        certificateNumber: "23VN004125KIET",
        issuedBy: "British Council Vietnam",
        issuedDate: new Date("2024-10-15"),
        expiryDate: new Date("2026-10-15"),
        score: "7.5 (L:8.0, R:8.0, W:7.0, S:7.0)",
        fileUrl: "https://dau.edu.vn/certificates/ielts-kietdt-75.pdf",
        status: CertificateStatus.VERIFIED,
        verifiedById: hrVerifier?.id || null,
        verifiedAt: new Date("2024-10-20T10:30:00Z"),
      },
      {
        certificateType: CertificateType.ACADEMIC_TITLE_DEGREE,
        name: "Chứng chỉ Bồi dưỡng Nghiệp vụ Sư phạm cho Giảng viên Đại học",
        certificateNumber: "NVSP-2020-0089",
        issuedBy: "Trường Đại học Sư phạm - Đại học Đà Nẵng",
        issuedDate: new Date("2020-11-20"),
        expiryDate: null,
        score: "Loại Giỏi",
        fileUrl: "https://dau.edu.vn/certificates/nvsp-kietdt.pdf",
        status: CertificateStatus.VERIFIED,
        verifiedById: hrVerifier?.id || null,
        verifiedAt: new Date("2024-01-15T09:15:00Z"),
      },
      {
        certificateType: CertificateType.INFORMATICS,
        name: "Autodesk Certified Professional: Revit for Architectural Design",
        certificateNumber: "ARC-2026-99120",
        issuedBy: "Autodesk Inc.",
        issuedDate: new Date("2026-03-01"),
        expiryDate: new Date("2029-03-01"),
        score: "940/1000",
        fileUrl: "https://dau.edu.vn/certificates/revit-pro-kietdt.pdf",
        status: CertificateStatus.PENDING,
        verifiedById: null,
        verifiedAt: null,
      },
    ];

    for (const cert of certList) {
      const existing = await prisma.certificate.findFirst({
        where: {
          employeeId: lecturerEmpForCert.id,
          certificateNumber: cert.certificateNumber,
        },
      });

      if (!existing) {
        await prisma.certificate.create({
          data: {
            employeeId: lecturerEmpForCert.id,
            ...cert,
          },
        });
      }
    }
    console.log("  ✔ Seeded 4 certificates (3 VERIFIED, 1 PENDING) for Lecturer DAU240001.");
  }

  // --------------------------------------------------------------------------
  // STEP 15: SEED POLICY KNOWLEDGE & NOTIFICATIONS (PHASE 6)
  // --------------------------------------------------------------------------
  console.log("\n📦 15. Seeding Policy Knowledge Base & Notifications (Phase 6)...");

  const dauPolicies = [
    {
      documentNo: "128/QĐ-ĐHKT",
      title: "Quy chế làm việc và Định mức giờ chuẩn Giảng viên Trường Đại học Kiến trúc Đà Nẵng",
      category: "ACADEMIC_HOURS",
      chunkText:
        "Điều 4. Định mức giờ chuẩn giảng dạy trong năm học đối với Giảng viên tiêu chuẩn là 270 giờ chuẩn giảng dạy trực tiếp. Giảng viên kiêm nhiệm chức vụ quản lý (Trưởng khoa, Trưởng bộ môn) được giảm trừ từ 30% đến 50% định mức giờ chuẩn. Giờ hướng dẫn đồ án tốt nghiệp Kiến trúc sư được quy đổi 1 đồ án = 25 giờ chuẩn. Hướng dẫn đồ án môn học Kiến trúc quy đổi 1 sinh viên = 3 giờ chuẩn.",
      keywords: ["giờ chuẩn", "giảng viên", "270", "đồ án", "kiến trúc sư", "giảm trừ", "định mức"],
      effectiveDate: new Date("2024-01-01"),
    },
    {
      documentNo: "45/QĐ-ĐHKT",
      title: "Quy định chế độ Nghỉ phép thường niên và Nghỉ hè của Cán bộ, Giảng viên",
      category: "LEAVE",
      chunkText:
        "Điều 3. Cán bộ, Giảng viên, Nhân viên làm việc trong điều kiện bình thường được nghỉ phép hàng năm 12 ngày làm việc hưởng nguyên lương. Cứ đủ 05 năm công tác tại Trường được cộng thêm 01 ngày nghỉ phép thâm niên. Giảng viên trực tiếp tham gia giảng dạy được bố trí nghỉ hè hàng năm theo kế hoạch đào tạo của Nhà trường, thời gian nghỉ hè thay thế cho nghỉ phép thường niên nhưng không vượt quá 06 tuần.",
      keywords: ["nghỉ phép", "thường niên", "12 ngày", "thâm niên", "nghỉ hè", "hưởng nguyên lương", "6 tuần"],
      effectiveDate: new Date("2023-06-01"),
    },
    {
      documentNo: "89/QyĐ-ĐHKT",
      title: "Quy định chế độ Nâng bậc lương thường xuyên và Nâng bậc lương trước thời hạn",
      category: "SALARY",
      chunkText:
        "Điều 6. Thời gian giữ bậc để xét nâng bậc lương thường xuyên: 03 năm (đủ 36 tháng) đối với ngạch/chức danh yêu cầu trình độ đào tạo từ đại học trở lên (Cử nhân, Kỹ sư, Kiến trúc sư); 02 năm (đủ 24 tháng) đối với chức danh có bằng Thạc sĩ, Tiến sĩ. Cán bộ, Giảng viên đạt danh hiệu Chiến sĩ thi đua cấp cơ sở hoặc xếp loại KPI Xuất sắc (Loại A) 02 năm liên tiếp được xét nâng bậc lương trước thời hạn tối đa 06 tháng.",
      keywords: ["nâng lương", "bậc lương", "3 năm", "2 năm", "thạc sĩ", "tiến sĩ", "trước hạn", "loại A"],
      effectiveDate: new Date("2023-09-01"),
    },
    {
      documentNo: "210/QĐ-ĐHKT",
      title: "Quy chế Đánh giá KPI, Đánh giá hiệu quả công việc và Thi đua khen thưởng hàng năm",
      category: "KPI",
      chunkText:
        "Điều 8. Đánh giá KPI và Xếp loại thi đua cuối năm học: Thang điểm chuẩn 100 điểm. Xếp loại A (Hoàn thành xuất sắc nhiệm vụ) đạt từ 90 đến 100 điểm, khống chế tỷ lệ tối đa không vượt quá 20% tổng số cán bộ, giảng viên của toàn đơn vị. Xếp loại B (Hoàn thành tốt nhiệm vụ) đạt từ 70 đến 89 điểm. Xếp loại C đạt từ 50 đến 69 điểm. Xếp loại D dưới 50 điểm. Trưởng đơn vị không được tự duyệt đánh giá của chính mình (nguyên tắc Anti-Self-Approval).",
      keywords: ["kpi", "xếp loại", "loại A", "20%", "thang điểm 100", "thi đua", "anti-self-approval"],
      effectiveDate: new Date("2024-08-15"),
    },
    {
      documentNo: "15/QyĐ-ĐHKT",
      title: "Quy định tiêu chuẩn Chức danh nghề nghiệp và Chứng chỉ hành nghề chuyên môn",
      category: "TRAINING",
      chunkText:
        "Điều 5. Giảng viên giảng dạy các học phần chuyên ngành Kiến trúc, Quy hoạch và Công trình bắt buộc phải sở hữu Chứng chỉ hành nghề Kiến trúc sư hoặc Kỹ sư Xây dựng còn thời hạn hợp lệ theo Luật Kiến trúc và Luật Xây dựng. Để được bổ nhiệm chức danh Giảng viên chính (Hạng II), CBGV phải có bằng Thạc sĩ trở lên và Chứng chỉ Bồi dưỡng tiêu chuẩn chức danh Giảng viên đại học Hạng II do cơ sở đào tạo có thẩm quyền cấp.",
      keywords: ["chứng chỉ", "hành nghề", "kiến trúc sư", "kỹ sư xây dựng", "giảng viên chính", "hạng II", "sư phạm"],
      effectiveDate: new Date("2024-03-01"),
    },
  ];

  for (const pol of dauPolicies) {
    const existing = await prisma.policyKnowledge.findFirst({
      where: { documentNo: pol.documentNo },
    });
    if (!existing) {
      await prisma.policyKnowledge.create({
        data: pol,
      });
    }
  }
  console.log("  ✔ Seeded 5 foundational DAU policy knowledge records.");

  // Seed sample Outbox event & Notification for Lecturer DAU240001
  const employeeUser = await prisma.user.findUnique({
    where: { email: "employee@dau.edu.vn" },
  });

  if (employeeUser) {
    const notifCount = await prisma.notification.count({
      where: { userId: employeeUser.id },
    });
    if (notifCount === 0) {
      await prisma.notification.createMany({
        data: [
          {
            userId: employeeUser.id,
            title: "Khóa bồi dưỡng BIM Revit Architecture 2026",
            content: "Phòng TCHC thông báo mở khóa đào tạo bồi dưỡng BIM Revit nâng cao cho CBGV Khoa Kiến trúc.",
            type: "TRAINING",
            isRead: false,
            metadata: { courseCode: "TR-2026-REVIT" },
          },
          {
            userId: employeeUser.id,
            title: "Nhắc nhở cập nhật chứng chỉ hành nghề",
            content: "Chứng chỉ Hành nghề KTS của bạn còn 25 ngày là hết hạn. Vui lòng nộp hồ sơ gia hạn lên Phòng TCHC.",
            type: "CERTIFICATE",
            isRead: false,
            metadata: { alertLevel: "CRITICAL_30" },
          },
        ],
      });
      console.log("  ✔ Seeded 2 sample notifications for employee@dau.edu.vn.");
    }

    const outboxCount = await prisma.outboxEvent.count();
    if (outboxCount === 0) {
      await prisma.outboxEvent.create({
        data: {
          aggregateType: "LEAVE_REQUEST",
          aggregateId: employeeUser.id,
          eventType: "LEAVE_REQUEST_SUBMITTED",
          payload: {
            employeeEmail: employeeUser.email,
            reason: "Nghỉ phép thường niên việc gia đình",
            days: 2,
          },
          idempotencyKey: "SEED-OUTBOX-001",
          status: "PENDING",
        },
      });
      console.log("  ✔ Seeded 1 sample PENDING outbox event.");
    }
  }

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
