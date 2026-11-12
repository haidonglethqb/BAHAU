import { prisma } from "@bahau/database";
import { verify } from "@node-rs/argon2";
import { AppError } from "../middlewares/error.middleware.js";
import type { AuthUser } from "@bahau/contracts";

export class AuthService {
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
