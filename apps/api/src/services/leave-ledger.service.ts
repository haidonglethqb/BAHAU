import { prisma, Prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import type { LeaveBalanceDto, LeaveLedgerEntryDto } from "@bahau/contracts";

export type LeaveDbClient = Prisma.TransactionClient | typeof prisma;

function getCurrentVnYear(): number {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).getUTCFullYear();
}

function isDbConnectionError(err: any): boolean {
  return Boolean(
    err?.code === "P1001" ||
      err?.code === "P1002" ||
      err?.code === "P1008" ||
      err?.message?.includes("connect") ||
      err?.message?.includes("Can't reach database")
  );
}

export class LeaveLedgerService {
  /**
   * Tính toán số dư ngày phép hiện tại của nhân sự từ sổ cái bất biến (Double-entry Ledger)
   */
  public static async getBalance(
    employeeId: string,
    year = getCurrentVnYear(),
    db: LeaveDbClient = prisma
  ): Promise<LeaveBalanceDto> {
    try {
      const entries = await db.leaveLedger.findMany({
        where: {
          employeeId,
          year,
        },
        orderBy: { createdAt: "asc" },
      });

      let totalGranted = 0;
      let carriedForward = 0;
      let used = 0;
      let pendingHold = 0;
      let expired = 0;

      for (const entry of entries) {
        const amt = Number(entry.amount);
        switch (entry.action) {
          case "GRANT_ANNUAL":
            totalGranted += amt;
            break;
          case "CARRY_FORWARD":
            carriedForward += amt;
            break;
          case "USE":
            used += amt;
            break;
          case "HOLD":
            pendingHold += amt;
            break;
          case "RESTORE":
            // Release hold without masking negative anomalies mid-loop
            pendingHold -= amt;
            break;
          case "EXPIRE":
            expired += amt;
            break;
          default:
            break;
        }
      }

      const remaining = totalGranted + carriedForward - used - pendingHold - expired;

      return {
        year,
        totalGranted,
        carriedForward,
        used,
        pendingHold,
        remaining,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối tới cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Lấy lịch sử biến động sổ cái ngày phép của nhân sự
   */
  public static async getLedgerHistory(
    employeeId: string,
    year = getCurrentVnYear(),
    db: LeaveDbClient = prisma
  ): Promise<LeaveLedgerEntryDto[]> {
    try {
      const entries = await db.leaveLedger.findMany({
        where: {
          employeeId,
          year,
        },
        orderBy: { createdAt: "desc" },
      });

      return entries.map((entry) => ({
        id: entry.id,
        employeeId: entry.employeeId,
        year: entry.year,
        action: entry.action as any,
        amount: Number(entry.amount),
        balanceAfter: Number(entry.balanceAfter),
        referenceLeaveRequestId: entry.referenceLeaveRequestId || null,
        note: entry.note || null,
        createdAt: entry.createdAt.toISOString(),
      }));
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối tới cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Ghi nhận giao dịch TẠM GIỮ số ngày phép khi nộp đơn (HOLD)
   */
  public static async recordHold(
    employeeId: string,
    days: number,
    leaveRequestId: string,
    year = getCurrentVnYear(),
    db: LeaveDbClient = prisma
  ): Promise<void> {
    const balance = await this.getBalance(employeeId, year, db);
    if (balance.remaining < days) {
      throw new AppError(
        422,
        "INSUFFICIENT_LEAVE_BALANCE",
        `Số dư phép năm không đủ. Bạn còn ${balance.remaining} ngày khả dụng nhưng yêu cầu nghỉ ${days} ngày.`
      );
    }

    try {
      await db.leaveLedger.create({
        data: {
          employeeId,
          year,
          action: "HOLD",
          amount: days,
          balanceAfter: balance.remaining - days,
          referenceLeaveRequestId: leaveRequestId,
          note: `Tạm giữ ${days} ngày cho đơn nghỉ phép ${leaveRequestId}`,
        },
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối tới cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Ghi nhận TRỪ PHÉP CHÍNH THỨC khi đơn duyệt xong cấp cuối (USE)
   */
  public static async recordUse(
    employeeId: string,
    days: number,
    leaveRequestId: string,
    year = getCurrentVnYear(),
    db: LeaveDbClient = prisma
  ): Promise<void> {
    const balance = await this.getBalance(employeeId, year, db);

    try {
      // 1. Giải phóng HOLD
      await db.leaveLedger.create({
        data: {
          employeeId,
          year,
          action: "RESTORE",
          amount: days,
          balanceAfter: balance.remaining + days,
          referenceLeaveRequestId: leaveRequestId,
          note: `Giải phóng tạm giữ cho đơn đã duyệt ${leaveRequestId}`,
        },
      });

      // 2. Trừ phép chính thức
      await db.leaveLedger.create({
        data: {
          employeeId,
          year,
          action: "USE",
          amount: days,
          balanceAfter: balance.remaining,
          referenceLeaveRequestId: leaveRequestId,
          note: `Trừ ${days} ngày phép năm đã phê duyệt hoàn tất`,
        },
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối tới cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Giải phóng ngày phép bị tạm giữ khi đơn bị từ chối hoặc hủy (RESTORE)
   */
  public static async releaseHold(
    employeeId: string,
    days: number,
    leaveRequestId: string,
    year = getCurrentVnYear(),
    db: LeaveDbClient = prisma
  ): Promise<void> {
    const balance = await this.getBalance(employeeId, year, db);

    try {
      await db.leaveLedger.create({
        data: {
          employeeId,
          year,
          action: "RESTORE",
          amount: days,
          balanceAfter: balance.remaining + days,
          referenceLeaveRequestId: leaveRequestId,
          note: `Hoàn trả số ngày tạm giữ do đơn bị từ chối/hủy ${leaveRequestId}`,
        },
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối tới cơ sở dữ liệu.");
      }
      throw err;
    }
  }
}
