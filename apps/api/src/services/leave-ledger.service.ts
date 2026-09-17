import { prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import type { LeaveBalanceDto } from "@bahau/contracts";

export class LeaveLedgerService {
  /**
   * Tính toán số dư ngày phép hiện tại của nhân sự từ sổ cái bất biến
   */
  public static async getBalance(employeeId: string, year = new Date().getFullYear()): Promise<LeaveBalanceDto> {
    const entries = await prisma.leaveLedger.findMany({
      where: {
        employeeId,
        year,
      },
      orderBy: { createdAt: "asc" },
    });

    // Mặc định nhân sự mới có 12 ngày phép năm tiêu chuẩn nếu chưa được cấp
    let totalGranted = 12;
    let carriedForward = 0;
    let used = 0;
    let pendingHold = 0;

    for (const entry of entries) {
      const amt = Number(entry.amount);
      switch (entry.action) {
        case "GRANT_ANNUAL":
          totalGranted = amt;
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
          // Release hold
          pendingHold = Math.max(0, pendingHold - amt);
          break;
        default:
          break;
      }
    }

    const remaining = Math.max(0, totalGranted + carriedForward - used - pendingHold);

    return {
      year,
      totalGranted,
      carriedForward,
      used,
      pendingHold,
      remaining,
    };
  }

  /**
   * Ghi nhận giao dịch TẠM GIỮ số ngày phép khi nộp đơn (HOLD)
   */
  public static async recordHold(
    employeeId: string,
    days: number,
    leaveRequestId: string,
    year = new Date().getFullYear()
  ): Promise<void> {
    const balance = await this.getBalance(employeeId, year);
    if (balance.remaining < days) {
      throw new AppError(
        422,
        "INSUFFICIENT_LEAVE_BALANCE",
        `Số dư phép năm không đủ. Bạn còn ${balance.remaining} ngày khả dụng nhưng yêu cầu nghỉ ${days} ngày.`
      );
    }

    await prisma.leaveLedger.create({
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
  }

  /**
   * Ghi nhận TRỪ PHÉP CHÍNH THỨC khi đơn duyệt xong cấp cuối (USE)
   */
  public static async recordUse(
    employeeId: string,
    days: number,
    leaveRequestId: string,
    year = new Date().getFullYear()
  ): Promise<void> {
    const balance = await this.getBalance(employeeId, year);

    // 1. Giải phóng HOLD
    await prisma.leaveLedger.create({
      data: {
        employeeId,
        year,
        action: "RESTORE",
        amount: days,
        balanceAfter: balance.remaining,
        referenceLeaveRequestId: leaveRequestId,
        note: `Giải phóng tạm giữ cho đơn đã duyệt ${leaveRequestId}`,
      },
    });

    // 2. Trừ phép chính thức
    await prisma.leaveLedger.create({
      data: {
        employeeId,
        year,
        action: "USE",
        amount: days,
        balanceAfter: balance.remaining - days,
        referenceLeaveRequestId: leaveRequestId,
        note: `Trừ ${days} ngày phép năm đã phê duyệt hoàn tất`,
      },
    });
  }

  /**
   * Giải phóng ngày phép bị tạm giữ khi đơn bị từ chối hoặc hủy (RESTORE)
   */
  public static async releaseHold(
    employeeId: string,
    days: number,
    leaveRequestId: string,
    year = new Date().getFullYear()
  ): Promise<void> {
    const balance = await this.getBalance(employeeId, year);

    await prisma.leaveLedger.create({
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
  }
}
