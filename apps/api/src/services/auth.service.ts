import { prisma } from "@bahau/database";
import { verify } from "@node-rs/argon2";
import { AppError } from "../middlewares/error.middleware.js";
import type { AuthUser } from "@bahau/contracts";

export class AuthService {
  /**
   * Xác thực tài khoản và khởi tạo phiên làm việc mới (Stateful Session)
   */
  public static async login(
    email: string,
    plainPassword: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ sessionId: string; expiresAt: Date; user: AuthUser }> {
    let user;
    try {
      user = await Promise.race([
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
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("DATABASE_TIMEOUT")), 3000)
        ),
      ]);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("[AuthService] Database connection/query failed:", errorMsg);
      throw new AppError(
        503,
        "DATABASE_UNAVAILABLE",
        "Không thể kết nối tới cơ sở dữ liệu PostgreSQL. Vui lòng kiểm tra cấu hình DATABASE_URL."
      );
    }

    if (!user || user.status !== "ACTIVE") {
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

    const authUser = this.mapToAuthUser(user);

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
    try {
      const session = await Promise.race([
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
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("DATABASE_TIMEOUT")), 3000)
        ),
      ]);

      if (!session || session.expiresAt < new Date() || session.user.status !== "ACTIVE") {
        return null;
      }

      return this.mapToAuthUser(session.user);
    } catch {
      return null;
    }
  }

  /**
   * Helper tổng hợp thông tin quyền, vai trò và đơn vị quản lý
   */
  private static mapToAuthUser(user: any): AuthUser {
    const rolesSet = new Set<string>();
    const permissionsSet = new Set<string>();
    const unitsManagedSet = new Set<string>();

    for (const ra of user.roleAssignments || []) {
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
