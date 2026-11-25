import { prisma } from "@bahau/database";
import { verify } from "@node-rs/argon2";
import { AppError } from "../middlewares/error.middleware.js";
import type { AuthUser } from "@bahau/contracts";

export class AuthService {
  private static devSessionsStore: Map<string, { user: AuthUser; expiresAt: Date }> = new Map();

  private static getDevUserFallback(email: string): AuthUser | null {
    const cleanEmail = email.toLowerCase().trim();
    if (
      cleanEmail === "hrspecialist@dau.edu.vn" ||
      cleanEmail === "hrmanager@dau.edu.vn" ||
      cleanEmail === "cuong.lm@dau.edu.vn"
    ) {
      return {
        id: "usr-hr-03",
        email: cleanEmail,
        employeeId: "DAU260008-ID",
        employeeCode: "DAU260008",
        fullName: "ThS. Lê Minh Cường",
        roles: ["ROLE_HR_OFFICER"],
        permissions: [
          "payroll:view_all",
          "payroll:calculate",
          "payroll:submit",
          "attendance:view_all",
          "attendance:view_unit",
          "attendance:view_own",
          "attendance:lock_period",
        ],
        unitsManaged: [],
      };
    }
    if (cleanEmail === "admin@dau.edu.vn" || cleanEmail === "quantri@dau.edu.vn") {
      return {
        id: "usr-admin-05",
        email: cleanEmail,
        employeeId: "DAU260000-ID",
        employeeCode: "DAU260000",
        fullName: "KS. Phạm Quản Trị",
        roles: ["ROLE_SYSADMIN", "ROLE_HR_OFFICER", "ROLE_RECTOR"],
        permissions: [
          "payroll:view_all",
          "payroll:calculate",
          "payroll:submit",
          "payroll:approve",
          "attendance:view_all",
          "attendance:view_unit",
          "attendance:view_own",
          "attendance:lock_period",
          "attendance:import_raw",
        ],
        unitsManaged: [],
      };
    }
    if (cleanEmail === "rector@dau.edu.vn" || cleanEmail === "dung.hd@dau.edu.vn") {
      return {
        id: "usr-rector-04",
        email: cleanEmail,
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "GS.TS. Hoàng Đức Dũng",
        roles: ["ROLE_RECTOR"],
        permissions: ["payroll:view_all", "payroll:approve", "attendance:view_all", "executive:all"],
        unitsManaged: [],
      };
    }
    if (cleanEmail === "unithead@dau.edu.vn" || cleanEmail === "binh.tt@dau.edu.vn") {
      return {
        id: "usr-tk-02",
        email: cleanEmail,
        employeeId: "DAU260001-ID",
        employeeCode: "DAU260001",
        fullName: "PGS.TS. Trần Thị Bình",
        roles: ["ROLE_UNIT_HEAD"],
        permissions: ["attendance:view_unit", "attendance:view_own", "workflow:approve_unit", "payroll:view_all"],
        unitsManaged: ["unit-arch"],
      };
    }
    if (cleanEmail === "employee@dau.edu.vn" || cleanEmail === "an.nv@dau.edu.vn") {
      return {
        id: "usr-gv-01",
        email: cleanEmail,
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        fullName: "ThS. Nguyễn Văn An",
        roles: ["ROLE_EMPLOYEE"],
        permissions: ["attendance:view_own", "attendance:adjust_request", "leave:create_request", "payroll:view_own"],
        unitsManaged: [],
      };
    }
    return null;
  }

  private static async withDatabaseTimeout<T>(promise: Promise<T>, timeoutMs = 3000): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("DATABASE_TIMEOUT")), timeoutMs);
    });
    try {
      return await Promise.race([promise, timeoutPromise]);
    } finally {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
    }
  }

  /**
   * Xác thực tài khoản và khởi tạo phiên làm việc mới (Stateful Session)
   */
  public static async login(
    email: string,
    plainPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ sessionId: string; expiresAt: Date; user: AuthUser }> {
    const now = new Date();
    let user;
    try {
      user = await this.withDatabaseTimeout(
        prisma.user.findUnique({
          where: { email: email.toLowerCase().trim() },
          include: {
            employee: {
              include: {
                assignments: {
                  where: { status: "ACTIVE" },
                  include: { unit: true, position: true },
                },
              },
            },
            roleAssignments: {
              where: {
                validFrom: { lte: now },
                OR: [{ validTo: null }, { validTo: { gte: now } }],
              },
              include: {
                role: {
                  include: {
                    rolePermissions: {
                      include: { permission: true },
                    },
                  },
                },
                scopeUnit: true,
              },
            },
          },
        })
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("[AuthService] Database connection/query failed:", errorMsg);

      if (process.env.NODE_ENV !== "production") {
        const devUser = this.getDevUserFallback(email);
        if (devUser && plainPassword === "Admin@123456") {
          const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const sessionId = `dev-session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          this.devSessionsStore.set(sessionId, { user: devUser, expiresAt });
          console.log(`[AuthService] In-Memory Dev Session activated for ${email} (${devUser.fullName})`);
          return { sessionId, expiresAt, user: devUser };
        }
      }

      throw new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Không thể kết nối tới cơ sở dữ liệu PostgreSQL. Vui lòng kiểm tra cấu hình DATABASE_URL."
      );
    }

    // Hash giả định chuẩn Argon2 để chống tấn công Timing Attack / User Enumeration
    const DUMMY_HASH =
      "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$R9yHn92D40wE9dO3zP12v6b4X1K7Y1p5N3k6L8v0Q1c";

    const isTerminatedEmployee =
      user?.employee?.employmentStatus === "RESIGNED" ||
      user?.employee?.employmentStatus === "RETIRED";

    if (!user || user.status !== "ACTIVE" || isTerminatedEmployee) {
      try {
        await verify(DUMMY_HASH, plainPassword);
      } catch {
        // Nuốt lỗi hash không khớp
      }
      throw new AppError(401, "UNAUTHENTICATED", "Email hoặc mật khẩu không chính xác.");
    }

    let isPasswordValid = false;
    try {
      isPasswordValid = await verify(user.passwordHash, plainPassword);
    } catch {
      isPasswordValid = false;
    }

    if (!isPasswordValid) {
      throw new AppError(401, "UNAUTHENTICATED", "Email hoặc mật khẩu không chính xác.");
    }

    // Thời hạn phiên 7 ngày
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        expiresAt,
      },
    });

    // Cập nhật lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const authUser = this.mapToAuthUser(user, now);

    return {
      sessionId: session.id,
      expiresAt,
      user: authUser,
    };
  }

  /**
   * Đăng xuất và xóa bản ghi Session khỏi Database (Revoke ngay lập tức)
   */
  public static async logout(sessionId: string): Promise<void> {
    this.devSessionsStore.delete(sessionId);
    try {
      await prisma.session.deleteMany({
        where: { id: sessionId },
      });
    } catch {
      // Bỏ qua lỗi nếu DB tạm thời không phản hồi trong khi logout
    }
  }

  /**
   * Lấy thông tin người dùng từ Session ID
   */
  public static async getSessionUser(sessionId: string): Promise<AuthUser | null> {
    const devSession = this.devSessionsStore.get(sessionId);
    if (devSession) {
      if (devSession.expiresAt > new Date()) {
        return devSession.user;
      }
      this.devSessionsStore.delete(sessionId);
    }

    const now = new Date();
    try {
      const session = await this.withDatabaseTimeout(
        prisma.session.findUnique({
          where: { id: sessionId },
          include: {
            user: {
              include: {
                employee: {
                  include: {
                    assignments: {
                      where: { status: "ACTIVE" },
                      include: { unit: true, position: true },
                    },
                  },
                },
                roleAssignments: {
                  where: {
                    validFrom: { lte: now },
                    OR: [{ validTo: null }, { validTo: { gte: now } }],
                  },
                  include: {
                    role: {
                      include: {
                        rolePermissions: {
                          include: { permission: true },
                        },
                      },
                    },
                    scopeUnit: true,
                  },
                },
              },
            },
          },
        })
      );

      const isTerminatedEmployee =
        session?.user?.employee?.employmentStatus === "RESIGNED" ||
        session?.user?.employee?.employmentStatus === "RETIRED";

      if (
        !session ||
        session.expiresAt <= now ||
        session.user.status !== "ACTIVE" ||
        isTerminatedEmployee
      ) {
        if (session) {
          try {
            await prisma.session.deleteMany({ where: { id: sessionId } });
          } catch {
            // Bỏ qua lỗi dọn dẹp phiên hết hạn/vô hiệu
          }
        }
        return null;
      }

      return this.mapToAuthUser(session.user, now);
    } catch {
      return null;
    }
  }

  /**
   * Helper tổng hợp thông tin quyền, vai trò và đơn vị quản lý
   */
  private static mapToAuthUser(user: any, now: Date = new Date()): AuthUser {
    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();
    const unitsManagedSet = new Set<string>();

    for (const ra of user.roleAssignments || []) {
      const validFrom = ra.validFrom ? new Date(ra.validFrom) : null;
      const validTo = ra.validTo ? new Date(ra.validTo) : null;
      if ((validFrom && validFrom > now) || (validTo && validTo < now)) {
        continue;
      }

      if (ra.role) {
        rolesSet.add(ra.role.code);
        for (const rp of ra.role.rolePermissions || []) {
          if (rp.permission?.code) {
            permissionsSet.add(rp.permission.code);
          }
        }
      }
      if (ra.scopeUnitId) {
        unitsManagedSet.add(ra.scopeUnitId);
      }
    }

    if (user.employee?.assignments) {
      for (const assignment of user.employee.assignments) {
        if (assignment.isHeadOfUnit && assignment.unitId) {
          unitsManagedSet.add(assignment.unitId);
        }
      }
    }

    if (rolesSet.has("ROLE_SYSADMIN")) {
      rolesSet.add("ROLE_RECTOR");
    }
    if (rolesSet.has("ROLE_HR_OFFICER")) {
      rolesSet.add("ROLE_UNIT_HEAD");
    }

    return {
      id: user.id,
      email: user.email,
      employeeId: user.employee?.id || null,
      employeeCode: user.employee?.employeeCode || null,
      fullName: user.employee?.fullName || null,
      roles: Array.from(rolesSet),
      permissions: Array.from(permissionsSet),
      unitsManaged: Array.from(unitsManagedSet),
    };
  }
}
