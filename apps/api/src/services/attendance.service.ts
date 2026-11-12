import { prisma, AttendanceStatus, Prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { UnitService } from "./unit.service.js";
import { WorkflowService } from "./workflow.service.js";
import type {
  AuthUser,
  AttendancePeriodDto,
  AttendanceRecordDto,
  MonthlyTimesheetSummaryDto,
  AttendanceAdjustmentDto,
  AttendanceMonthDto,
  CreateAttendanceAdjustmentInput,
  ImportAttendanceBatchInput,
  LockPeriodInput,
} from "@bahau/contracts";

export type AttendanceDbClient = Prisma.TransactionClient | typeof prisma;

function isDbConnectionError(err: any): boolean {
  return Boolean(
    err?.code === "P1001" ||
      err?.code === "P1002" ||
      err?.code === "P1008" ||
      err?.message?.includes("connect") ||
      err?.message?.includes("Can't reach database")
  );
}

export class AttendanceService {
  private static getVnDateParts(date: Date = new Date()): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    dateStr: string;
    workDateUtc: Date;
  } {
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const year = vn.getUTCFullYear();
    const month = vn.getUTCMonth() + 1;
    const day = vn.getUTCDate();
    const hour = vn.getUTCHours();
    const minute = vn.getUTCMinutes();
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const workDateUtc = new Date(`${dateStr}T00:00:00.000Z`);
    return { year, month, day, hour, minute, dateStr, workDateUtc };
  }

  private static parseWorkDateStr(dateStr: string): {
    year: number;
    month: number;
    day: number;
    workDateUtc: Date;
  } {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
    if (!match) {
      throw new AppError(422, "VALIDATION_FAILED", `Ngày công không đúng định dạng YYYY-MM-DD: ${dateStr}`);
    }
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const d = new Date(Date.UTC(year, month - 1, day));
    if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
      throw new AppError(422, "VALIDATION_FAILED", `Ngày lịch không tồn tại: ${dateStr}`);
    }
    return { year, month, day, workDateUtc: d };
  }

  private static isLateTime(checkIn: Date): boolean {
    const { hour, minute } = this.getVnDateParts(checkIn);
    return hour > 8 || (hour === 8 && minute > 0);
  }

  private static isEarlyLeaveTime(checkOut: Date, checkIn?: Date | null): boolean {
    const outVn = this.getVnDateParts(checkOut);
    if (checkIn) {
      if (checkOut.getTime() < checkIn.getTime()) return false;
      const inVn = this.getVnDateParts(checkIn);
      if (outVn.dateStr > inVn.dateStr) {
        // Ca qua đêm sang ngày hôm sau
        return false;
      }
    }
    return outVn.hour < 17;
  }

  private static getMonthBoundaries(month: number, year: number): {
    startDate: Date;
    endDate: Date;
    endDateOnly: Date;
  } {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
    const endDateOnly = new Date(Date.UTC(year, month, 0));
    return { startDate, endDate, endDateOnly };
  }

  private static calculateDaysInMonth(
    startDate: Date,
    endDate: Date,
    totalDays: number,
    monthStart: Date,
    monthEndOnly: Date
  ): number {
    if (startDate >= monthStart && endDate <= monthEndOnly) {
      return totalDays;
    }
    const overlapStart = startDate > monthStart ? startDate : monthStart;
    const overlapEnd = endDate < monthEndOnly ? endDate : monthEndOnly;
    if (overlapEnd < overlapStart) return 0;

    let weekdays = 0;
    let calendarDays = 0;
    const cursor = new Date(
      Date.UTC(overlapStart.getUTCFullYear(), overlapStart.getUTCMonth(), overlapStart.getUTCDate())
    );
    const endUtc = new Date(
      Date.UTC(overlapEnd.getUTCFullYear(), overlapEnd.getUTCMonth(), overlapEnd.getUTCDate())
    );
    while (cursor <= endUtc) {
      const dow = cursor.getUTCDay();
      if (dow !== 0 && dow !== 6) weekdays++;
      calendarDays++;
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const effective = weekdays > 0 ? weekdays : calendarDays;
    return Math.min(totalDays, effective);
  }

  private static isDateInRanges(
    workDate: Date,
    ranges: Array<{ startDate: Date; endDate: Date }>
  ): boolean {
    const t = Date.UTC(workDate.getUTCFullYear(), workDate.getUTCMonth(), workDate.getUTCDate());
    return ranges.some((r) => {
      const s = Date.UTC(r.startDate.getUTCFullYear(), r.startDate.getUTCMonth(), r.startDate.getUTCDate());
      const e = Date.UTC(r.endDate.getUTCFullYear(), r.endDate.getUTCMonth(), r.endDate.getUTCDate());
      return t >= s && t <= e;
    });
  }

  private static mapPeriodDto(period: any): AttendancePeriodDto {
    return {
      id: period.id,
      month: period.month,
      year: period.year,
      startDate: period.startDate.toISOString().split("T")[0],
      endDate: period.endDate.toISOString().split("T")[0],
      standardWorkingDays: Number(period.standardWorkingDays),
      isLocked: period.isLocked,
      lockedAt: period.lockedAt ? period.lockedAt.toISOString() : null,
      lockedById: period.lockedById,
      note: period.note,
      createdAt: period.createdAt.toISOString(),
    };
  }

  /**
   * Tính toán thời gian làm việc và trạng thái quẹt thẻ
   * Chuẩn DAU:
   * - Giờ vào chuẩn: 08:00 (vào sau 08:00 -> LATE)
   * - Giờ ra chuẩn: 17:00 (ra trước 17:00 -> EARLY_LEAVE)
   * - Thiếu 1 lượt quẹt (chỉ vào hoặc chỉ ra) -> ABSENT (0h)
   */
  public static classifyAttendanceStatus(
    checkIn: Date | null,
    checkOut: Date | null,
    isOnLeave: boolean = false,
    isOnTrip: boolean = false,
    isHoliday: boolean = false
  ): {
    status: AttendanceStatus;
    hours: number;
    isLate: boolean;
    isEarlyLeave: boolean;
    missingPunch: boolean;
  } {
    if (isHoliday) {
      return { status: "HOLIDAY" as AttendanceStatus, hours: 0, isLate: false, isEarlyLeave: false, missingPunch: false };
    }
    if (isOnLeave) {
      return { status: "ON_LEAVE" as AttendanceStatus, hours: 0, isLate: false, isEarlyLeave: false, missingPunch: false };
    }
    if (isOnTrip) {
      return { status: "BUSINESS_TRIP" as AttendanceStatus, hours: 8.0, isLate: false, isEarlyLeave: false, missingPunch: false };
    }
    if (!checkIn && !checkOut) {
      return { status: "ABSENT" as AttendanceStatus, hours: 0, isLate: false, isEarlyLeave: false, missingPunch: false };
    }

    // Thiếu lượt vào hoặc lượt ra: không được tính PRESENT
    if (!checkIn || !checkOut) {
      const isLate = checkIn ? this.isLateTime(checkIn) : false;
      const isEarlyLeave = checkOut ? this.isEarlyLeaveTime(checkOut, null) : false;
      return {
        status: "ABSENT" as AttendanceStatus,
        hours: 0,
        isLate,
        isEarlyLeave,
        missingPunch: true,
      };
    }

    const diffMs = checkOut.getTime() - checkIn.getTime();
    const hours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);
    const isLate = this.isLateTime(checkIn);
    const isEarlyLeave = this.isEarlyLeaveTime(checkOut, checkIn);

    if (isLate) {
      return { status: "LATE" as AttendanceStatus, hours, isLate, isEarlyLeave, missingPunch: false };
    }
    if (isEarlyLeave) {
      return { status: "EARLY_LEAVE" as AttendanceStatus, hours, isLate, isEarlyLeave, missingPunch: false };
    }
    return { status: "PRESENT" as AttendanceStatus, hours, isLate: false, isEarlyLeave: false, missingPunch: false };
  }

  /**
   * Đọc kỳ công tháng (chỉ đọc, không ghi DB khi chưa tồn tại — dùng cho GET)
   */
  public static async getPeriodReadOnly(
    month: number,
    year: number
  ): Promise<AttendancePeriodDto & { existsInDb: boolean }> {
    try {
      const period = await prisma.attendancePeriod.findUnique({
        where: { year_month: { year, month } },
      });

      if (period) {
        return { ...this.mapPeriodDto(period), existsInDb: true };
      }

      const startDate = new Date(Date.UTC(year, month - 1, 1));
      const endDate = new Date(Date.UTC(year, month, 0));
      return {
        id: `00000000-0000-0000-0000-${String(month).padStart(2, "0")}${year}0000`,
        month,
        year,
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
        standardWorkingDays: 22,
        isLocked: false,
        lockedAt: null,
        lockedById: null,
        note: null,
        createdAt: new Date().toISOString(),
        existsInDb: false,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Tìm hoặc tự động khởi tạo kỳ công tháng (Attendance Period) — dùng cho luồng ghi dữ liệu
   */
  public static async getOrCreatePeriod(
    month: number,
    year: number,
    db: AttendanceDbClient = prisma
  ): Promise<AttendancePeriodDto> {
    try {
      let period = await db.attendancePeriod.findUnique({
        where: { year_month: { year, month } },
      });

      if (!period) {
        const startDate = new Date(Date.UTC(year, month - 1, 1));
        const endDate = new Date(Date.UTC(year, month, 0));
        try {
          period = await db.attendancePeriod.create({
            data: {
              year,
              month,
              startDate,
              endDate,
              standardWorkingDays: new Prisma.Decimal(22),
              isLocked: false,
            },
          });
        } catch (createErr: any) {
          if (createErr?.code === "P2002") {
            period = await db.attendancePeriod.findUnique({
              where: { year_month: { year, month } },
            });
          } else {
            throw createErr;
          }
        }
      }

      if (!period) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể khởi tạo kỳ chấm công.");
      }

      return this.mapPeriodDto(period);
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  private static computeMonthlySummaryValues(
    month: number,
    year: number,
    standardDays: number,
    records: Array<{
      workDate: Date;
      status: string;
      checkInTime: Date | null;
      checkOutTime: Date | null;
    }>,
    approvedLeaves: Array<{
      leaveType: string;
      startDate: Date;
      endDate: Date;
      totalDays: any;
    }>,
    approvedTrips: Array<{
      startDate: Date;
      endDate: Date;
      totalDays: any;
    }>
  ): {
    standardDays: number;
    actualWorkingDays: number;
    paidLeaveDays: number;
    unpaidLeaveDays: number;
    businessTripDays: number;
    lateCount: number;
    earlyLeaveCount: number;
    totalPayableDays: number;
  } {
    const { startDate: monthStart, endDateOnly: monthEndOnly } = this.getMonthBoundaries(month, year);

    const allLeaveRanges = approvedLeaves.map((l) => ({ startDate: l.startDate, endDate: l.endDate }));
    const unpaidLeaveRanges = approvedLeaves
      .filter((l) => l.leaveType === "UNPAID")
      .map((l) => ({ startDate: l.startDate, endDate: l.endDate }));
    const tripRanges = approvedTrips.map((t) => ({ startDate: t.startDate, endDate: t.endDate }));

    let actualWorkingDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let businessTripDays = 0;
    let lateCount = 0;
    let earlyLeaveCount = 0;

    for (const rec of records) {
      const isSinglePunch = Boolean(
        (rec.checkInTime && !rec.checkOutTime) || (!rec.checkInTime && rec.checkOutTime)
      );

      switch (rec.status) {
        case "PRESENT":
          if (!isSinglePunch) {
            actualWorkingDays += 1;
          }
          break;
        case "LATE":
          lateCount += 1;
          if (!isSinglePunch) {
            actualWorkingDays += 1;
            if (rec.checkOutTime && this.isEarlyLeaveTime(rec.checkOutTime, rec.checkInTime)) {
              earlyLeaveCount += 1;
            }
          }
          break;
        case "EARLY_LEAVE":
          earlyLeaveCount += 1;
          if (!isSinglePunch) {
            actualWorkingDays += 1;
            if (rec.checkInTime && this.isLateTime(rec.checkInTime)) {
              lateCount += 1;
            }
          }
          break;
        case "HOLIDAY":
          paidLeaveDays += 1;
          break;
        case "ON_LEAVE":
          if (!this.isDateInRanges(rec.workDate, allLeaveRanges)) {
            paidLeaveDays += 1;
          }
          break;
        case "BUSINESS_TRIP":
          if (!this.isDateInRanges(rec.workDate, tripRanges)) {
            businessTripDays += 1;
          }
          break;
        case "ABSENT":
          if (!this.isDateInRanges(rec.workDate, unpaidLeaveRanges)) {
            unpaidLeaveDays += 1;
          }
          break;
        default:
          break;
      }
    }

    for (const leave of approvedLeaves) {
      const days = this.calculateDaysInMonth(
        leave.startDate,
        leave.endDate,
        Number(leave.totalDays),
        monthStart,
        monthEndOnly
      );
      if (leave.leaveType === "UNPAID") {
        unpaidLeaveDays += days;
      } else {
        paidLeaveDays += days;
      }
    }

    for (const trip of approvedTrips) {
      const days = this.calculateDaysInMonth(
        trip.startDate,
        trip.endDate,
        Number(trip.totalDays),
        monthStart,
        monthEndOnly
      );
      businessTripDays += days;
    }

    const totalPayableDays = actualWorkingDays + paidLeaveDays + businessTripDays;

    return {
      standardDays,
      actualWorkingDays,
      paidLeaveDays,
      unpaidLeaveDays,
      businessTripDays,
      lateCount,
      earlyLeaveCount,
      totalPayableDays,
    };
  }

  /**
   * Lấy dữ liệu chấm công cá nhân theo tháng (Lớp 1, 2, 3) — không ghi DB trên GET
   */
  public static async getMyMonthlyAttendance(
    month: number,
    year: number,
    currentUser: AuthUser
  ): Promise<AttendanceMonthDto> {
    const employeeId = currentUser.employeeId;
    if (!employeeId) {
      throw new AppError(400, "BAD_REQUEST", "Tài khoản hiện tại chưa được liên kết với hồ sơ CBGV.");
    }

    try {
      const periodWithFlag = await this.getPeriodReadOnly(month, year);
      const { existsInDb, ...period } = periodWithFlag;
      const { startDate, endDate, endDateOnly } = this.getMonthBoundaries(month, year);

      const [records, adjustments, dbSummary] = await Promise.all([
        prisma.attendanceRecord.findMany({
          where: {
            employeeId,
            workDate: { gte: startDate, lte: endDate },
          },
          orderBy: { workDate: "asc" },
        }),
        prisma.attendanceAdjustmentRequest.findMany({
          where: {
            employeeId,
            workDate: { gte: startDate, lte: endDate },
          },
          orderBy: { workDate: "desc" },
        }),
        existsInDb
          ? prisma.monthlyTimesheetSummary.findUnique({
              where: {
                employeeId_periodId: {
                  employeeId,
                  periodId: period.id,
                },
              },
            })
          : Promise.resolve(null),
      ]);

      let summaryDto: MonthlyTimesheetSummaryDto | null = null;
      if (dbSummary) {
        summaryDto = {
          id: dbSummary.id,
          employeeId: dbSummary.employeeId,
          periodId: dbSummary.periodId,
          standardDays: Number(dbSummary.standardDays),
          actualWorkingDays: Number(dbSummary.actualWorkingDays),
          paidLeaveDays: Number(dbSummary.paidLeaveDays),
          unpaidLeaveDays: Number(dbSummary.unpaidLeaveDays),
          businessTripDays: Number(dbSummary.businessTripDays),
          lateCount: dbSummary.lateCount,
          earlyLeaveCount: dbSummary.earlyLeaveCount,
          totalPayableDays: Number(dbSummary.totalPayableDays),
          isFinalized: dbSummary.isFinalized,
          createdAt: dbSummary.createdAt.toISOString(),
        };
      } else {
        const [approvedLeaves, approvedTrips] = await Promise.all([
          prisma.leaveRequest.findMany({
            where: {
              employeeId,
              status: "APPROVED",
              startDate: { lte: endDateOnly },
              endDate: { gte: startDate },
            },
          }),
          prisma.businessTripRequest.findMany({
            where: {
              employeeId,
              status: "APPROVED",
              startDate: { lte: endDateOnly },
              endDate: { gte: startDate },
            },
          }),
        ]);
        const computed = this.computeMonthlySummaryValues(
          month,
          year,
          period.standardWorkingDays,
          records,
          approvedLeaves,
          approvedTrips
        );
        summaryDto = {
          id: `00000000-0000-0000-0000-000000000000`,
          employeeId,
          periodId: period.id,
          ...computed,
          isFinalized: period.isLocked,
        };
      }

      return {
        period,
        records: records.map((r) => ({
          id: r.id,
          employeeId: r.employeeId,
          periodId: r.periodId,
          workDate: r.workDate.toISOString().split("T")[0],
          checkInTime: r.checkInTime ? r.checkInTime.toISOString() : null,
          checkOutTime: r.checkOutTime ? r.checkOutTime.toISOString() : null,
          rawWorkingHours: Number(r.rawWorkingHours),
          status: r.status as any,
          deviceSource: r.deviceSource,
          importBatchId: r.importBatchId,
          adjustmentRequestId: r.adjustmentRequestId,
          createdAt: r.createdAt.toISOString(),
        })),
        summary: summaryDto,
        adjustments: adjustments.map((a) => ({
          id: a.id,
          employeeId: a.employeeId,
          workDate: a.workDate.toISOString().split("T")[0],
          originalCheckIn: a.originalCheckIn ? a.originalCheckIn.toISOString() : null,
          originalCheckOut: a.originalCheckOut ? a.originalCheckOut.toISOString() : null,
          adjustedCheckIn: a.adjustedCheckIn ? a.adjustedCheckIn.toISOString() : null,
          adjustedCheckOut: a.adjustedCheckOut ? a.adjustedCheckOut.toISOString() : null,
          reason: a.reason,
          status: a.status as any,
          workflowInstanceId: a.workflowInstanceId,
          createdAt: a.createdAt.toISOString(),
        })),
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Lấy bảng công tổng hợp toàn đơn vị (Dành cho Quản lý đơn vị & Phòng TCHC) — không ghi DB trên GET
   */
  public static async getUnitAttendance(
    unitId: string | undefined,
    month: number,
    year: number,
    currentUser: AuthUser
  ): Promise<{
    period: AttendancePeriodDto;
    items: MonthlyTimesheetSummaryDto[];
  }> {
    const periodWithFlag = await this.getPeriodReadOnly(month, year);
    const { existsInDb, ...period } = periodWithFlag;

    // Kiểm tra quyền hạn phạm vi (Scope)
    const isGlobalHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );

    let targetUnitIds: string[] = [];

    if (!isGlobalHR) {
      if (!currentUser.unitsManaged || currentUser.unitsManaged.length === 0) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền quản lý đơn vị để xem bảng công.");
      }

      if (unitId) {
        if (!currentUser.unitsManaged.includes(unitId)) {
          let isDescendant = false;
          for (const managedId of currentUser.unitsManaged) {
            const descendants = await UnitService.getDescendantUnitIds(managedId);
            if (descendants.includes(unitId)) {
              isDescendant = true;
              break;
            }
          }
          if (!isDescendant) {
            throw new AppError(403, "FORBIDDEN", "Bạn không có quyền truy cập bảng công đơn vị này.");
          }
        }
        targetUnitIds = [unitId];
      } else {
        const allUnits = new Set<string>();
        for (const managedId of currentUser.unitsManaged) {
          allUnits.add(managedId);
          const descendants = await UnitService.getDescendantUnitIds(managedId);
          descendants.forEach((d) => allUnits.add(d));
        }
        targetUnitIds = Array.from(allUnits);
      }
    } else if (unitId) {
      targetUnitIds = [unitId];
    }

    try {
      const whereEmployee: any = {
        employmentStatus: { in: ["ACTIVE", "PROBATION", "ON_LEAVE"] },
      };

      if (targetUnitIds.length > 0) {
        whereEmployee.assignments = {
          some: {
            unitId: { in: targetUnitIds },
            assignmentType: "PRIMARY",
            status: "ACTIVE",
          },
        };
      }

      const employees = await prisma.employee.findMany({
        where: whereEmployee,
        select: {
          id: true,
          employeeCode: true,
          fullName: true,
          assignments: {
            where: { assignmentType: "PRIMARY", status: "ACTIVE" },
            include: { unit: { select: { name: true } } },
            take: 1,
          },
        },
        orderBy: { fullName: "asc" },
      });

      const empIds = employees.map((e) => e.id);
      const summaries =
        existsInDb && empIds.length > 0
          ? await prisma.monthlyTimesheetSummary.findMany({
              where: {
                periodId: period.id,
                employeeId: { in: empIds },
              },
            })
          : [];

      const summaryMap = new Map(summaries.map((s) => [s.employeeId, s]));
      const missingEmpIds = empIds.filter((id) => !summaryMap.has(id));

      const { startDate, endDate, endDateOnly } = this.getMonthBoundaries(month, year);
      const [missingRecords, missingLeaves, missingTrips] =
        missingEmpIds.length > 0
          ? await Promise.all([
              prisma.attendanceRecord.findMany({
                where: {
                  employeeId: { in: missingEmpIds },
                  workDate: { gte: startDate, lte: endDate },
                },
              }),
              prisma.leaveRequest.findMany({
                where: {
                  employeeId: { in: missingEmpIds },
                  status: "APPROVED",
                  startDate: { lte: endDateOnly },
                  endDate: { gte: startDate },
                },
              }),
              prisma.businessTripRequest.findMany({
                where: {
                  employeeId: { in: missingEmpIds },
                  status: "APPROVED",
                  startDate: { lte: endDateOnly },
                  endDate: { gte: startDate },
                },
              }),
            ])
          : [[], [], []];

      const items: MonthlyTimesheetSummaryDto[] = [];
      for (const emp of employees) {
        const s = summaryMap.get(emp.id);
        const primaryAssignment = emp.assignments[0];

        if (s) {
          items.push({
            id: s.id,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            unitName: primaryAssignment?.unit?.name || "DAU",
            periodId: period.id,
            standardDays: Number(s.standardDays),
            actualWorkingDays: Number(s.actualWorkingDays),
            paidLeaveDays: Number(s.paidLeaveDays),
            unpaidLeaveDays: Number(s.unpaidLeaveDays),
            businessTripDays: Number(s.businessTripDays),
            lateCount: s.lateCount,
            earlyLeaveCount: s.earlyLeaveCount,
            totalPayableDays: Number(s.totalPayableDays),
            isFinalized: s.isFinalized,
            createdAt: s.createdAt.toISOString(),
          });
        } else {
          const computed = this.computeMonthlySummaryValues(
            month,
            year,
            period.standardWorkingDays,
            missingRecords.filter((r) => r.employeeId === emp.id),
            missingLeaves.filter((l) => l.employeeId === emp.id),
            missingTrips.filter((t) => t.employeeId === emp.id)
          );
          items.push({
            id: `00000000-0000-0000-0000-000000000000`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            fullName: emp.fullName,
            unitName: primaryAssignment?.unit?.name || "DAU",
            periodId: period.id,
            ...computed,
            isFinalized: period.isLocked,
          });
        }
      }

      return { period, items };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Tạo đơn giải trình / điều chỉnh giờ công (Lớp 2)
   */
  public static async createAdjustmentRequest(
    input: CreateAttendanceAdjustmentInput,
    currentUser: AuthUser
  ): Promise<AttendanceAdjustmentDto> {
    const employeeId = currentUser.employeeId;
    if (!employeeId) {
      throw new AppError(400, "BAD_REQUEST", "Tài khoản chưa được gán hồ sơ nhân sự.");
    }

    const { month, year, workDateUtc: workDateObj } = this.parseWorkDateStr(input.workDate);

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Kiểm tra kỳ công có bị khóa không
        const period = await this.getOrCreatePeriod(month, year, tx);
        if (period.isLocked) {
          throw new AppError(
            409,
            "PERIOD_LOCKED",
            `Kỳ công tháng ${month}/${year} đã được Phòng TCHC chốt và khóa. Không thể nộp đơn điều chỉnh.`
          );
        }

        // 2. Kiểm tra trùng lặp đơn đang chờ duyệt cho ngày này
        const existingPending = await tx.attendanceAdjustmentRequest.findFirst({
          where: {
            employeeId,
            workDate: workDateObj,
            status: "PENDING",
          },
        });

        if (existingPending) {
          throw new AppError(
            409,
            "RESOURCE_CONFLICT",
            `Bạn đã có đơn giải trình công cho ngày ${input.workDate} đang chờ duyệt.`
          );
        }

        // 3. Tìm bản ghi quẹt thẻ hiện có của ngày này
        const currentRecord = await tx.attendanceRecord.findUnique({
          where: {
            employeeId_workDate: {
              employeeId,
              workDate: workDateObj,
            },
          },
        });

        // 4. Tạo đơn giải trình
        const adj = await tx.attendanceAdjustmentRequest.create({
          data: {
            employeeId,
            workDate: workDateObj,
            originalCheckIn: currentRecord?.checkInTime || null,
            originalCheckOut: currentRecord?.checkOutTime || null,
            adjustedCheckIn: input.adjustedCheckIn ? new Date(input.adjustedCheckIn) : null,
            adjustedCheckOut: input.adjustedCheckOut ? new Date(input.adjustedCheckOut) : null,
            reason: input.reason,
            status: "PENDING",
          },
          include: {
            employee: { select: { fullName: true, employeeCode: true } },
          },
        });

        // Nếu đã có bản ghi quẹt thẻ thì liên kết đơn giải trình
        if (currentRecord) {
          await tx.attendanceRecord.update({
            where: { id: currentRecord.id },
            data: { adjustmentRequestId: adj.id },
          });
        }

        // 5. Khởi động quy trình phê duyệt đa cấp trong cùng transaction
        const wfInstanceId = await WorkflowService.startAdjustmentWorkflow(employeeId, adj.id, tx);

        return {
          id: adj.id,
          employeeId: adj.employeeId,
          employeeName: adj.employee.fullName,
          employeeCode: adj.employee.employeeCode,
          workDate: adj.workDate.toISOString().split("T")[0],
          originalCheckIn: adj.originalCheckIn ? adj.originalCheckIn.toISOString() : null,
          originalCheckOut: adj.originalCheckOut ? adj.originalCheckOut.toISOString() : null,
          adjustedCheckIn: adj.adjustedCheckIn ? adj.adjustedCheckIn.toISOString() : null,
          adjustedCheckOut: adj.adjustedCheckOut ? adj.adjustedCheckOut.toISOString() : null,
          reason: adj.reason,
          status: adj.status as any,
          workflowInstanceId: wfInstanceId,
          createdAt: adj.createdAt.toISOString(),
        };
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Import dữ liệu quẹt thẻ thô hàng loạt từ máy chấm công vân tay / khuôn mặt (Lớp 1)
   */
  public static async importAttendanceData(
    input: ImportAttendanceBatchInput,
    currentUser: AuthUser
  ): Promise<{ importedCount: number; batchId: string }> {
    const isHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_SYSADMIN"].includes(r)
    );

    if (!isHR) {
      throw new AppError(403, "FORBIDDEN", "Chỉ chuyên viên Phòng TCHC mới có quyền import dữ liệu chấm công.");
    }

    // Xác thực toàn bộ workDate thuộc đúng kỳ công (input.month, input.year)
    const parsedRecords = input.records.map((item) => {
      const parsed = this.parseWorkDateStr(item.workDate);
      if (parsed.month !== input.month || parsed.year !== input.year) {
        throw new AppError(
          422,
          "VALIDATION_FAILED",
          `Ngày công ${item.workDate} không thuộc kỳ công ${input.month}/${input.year}.`
        );
      }
      return { item, workDate: parsed.workDateUtc };
    });

    const batchId = input.batchId || `BATCH_${Date.now()}`;

    try {
      return await prisma.$transaction(async (tx) => {
        const period = await this.getOrCreatePeriod(input.month, input.year, tx);
        if (period.isLocked) {
          throw new AppError(
            409,
            "PERIOD_LOCKED",
            `Kỳ công tháng ${input.month}/${input.year} đã bị khóa, không thể import dữ liệu.`
          );
        }

        const employeeCodes = [...new Set(input.records.map((r) => r.employeeCode))];
        const employees = await tx.employee.findMany({
          where: { employeeCode: { in: employeeCodes } },
          select: { id: true, employeeCode: true },
        });

        const empMap = new Map(employees.map((e) => [e.employeeCode, e.id]));
        const affectedEmployeeIds = new Set<string>();
        let importedCount = 0;

        for (const { item, workDate } of parsedRecords) {
          const empId = empMap.get(item.employeeCode);
          if (!empId) continue;

          const checkIn = item.checkInTime ? new Date(item.checkInTime) : null;
          const checkOut = item.checkOutTime ? new Date(item.checkOutTime) : null;

          const approvedLeave = await tx.leaveRequest.findFirst({
            where: {
              employeeId: empId,
              status: "APPROVED",
              startDate: { lte: workDate },
              endDate: { gte: workDate },
            },
          });

          const approvedTrip = await tx.businessTripRequest.findFirst({
            where: {
              employeeId: empId,
              status: "APPROVED",
              startDate: { lte: workDate },
              endDate: { gte: workDate },
            },
          });

          let status: AttendanceStatus;
          let hours: number;
          let deviceSource = item.deviceSource || "BIOMETRIC_GATE";

          if (approvedLeave) {
            if (approvedLeave.leaveType === "UNPAID") {
              status = "ABSENT" as AttendanceStatus;
              hours = 0;
              deviceSource = item.deviceSource || "UNPAID_LEAVE";
            } else {
              const classified = this.classifyAttendanceStatus(checkIn, checkOut, true, false);
              status = classified.status;
              hours = classified.hours;
            }
          } else {
            const classified = this.classifyAttendanceStatus(
              checkIn,
              checkOut,
              false,
              Boolean(approvedTrip)
            );
            status = classified.status;
            hours = classified.hours;
          }

          await tx.attendanceRecord.upsert({
            where: {
              employeeId_workDate: {
                employeeId: empId,
                workDate,
              },
            },
            update: {
              checkInTime: checkIn,
              checkOutTime: checkOut,
              rawWorkingHours: new Prisma.Decimal(hours),
              status,
              deviceSource,
              importBatchId: batchId,
              periodId: period.id,
            },
            create: {
              employeeId: empId,
              periodId: period.id,
              workDate,
              checkInTime: checkIn,
              checkOutTime: checkOut,
              rawWorkingHours: new Prisma.Decimal(hours),
              status,
              deviceSource,
              importBatchId: batchId,
            },
          });

          affectedEmployeeIds.add(empId);
          importedCount++;
        }

        for (const empId of affectedEmployeeIds) {
          await this.recalculateMonthlySummary(empId, period.id, input.month, input.year, tx);
        }

        return { importedCount, batchId };
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Khóa / Mở khóa kỳ công tháng và chuyển dữ liệu sang trạng thái bất biến (Lớp 3)
   */
  public static async lockPeriod(
    input: LockPeriodInput,
    currentUser: AuthUser
  ): Promise<AttendancePeriodDto> {
    const isHR = currentUser.roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );

    if (!isHR) {
      throw new AppError(403, "FORBIDDEN", "Chỉ Lãnh đạo hoặc Phòng TCHC mới có thẩm quyền khóa kỳ công.");
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const period = await this.getOrCreatePeriod(input.month, input.year, tx);

        if (input.isLocked && !period.isLocked) {
          // Đảm bảo tổng hợp công cho nhân sự hoạt động được đồng bộ trước khi khóa kỳ
          const activeEmployees = await tx.employee.findMany({
            where: { employmentStatus: { in: ["ACTIVE", "PROBATION", "ON_LEAVE"] } },
            select: { id: true },
          });
          for (const emp of activeEmployees) {
            await this.recalculateMonthlySummary(emp.id, period.id, input.month, input.year, tx);
          }
        }

        const updated = await tx.attendancePeriod.update({
          where: { year_month: { year: input.year, month: input.month } },
          data: {
            isLocked: input.isLocked,
            lockedAt: input.isLocked ? new Date() : null,
            lockedById: input.isLocked ? currentUser.id : null,
            note: input.note || null,
          },
        });

        await tx.monthlyTimesheetSummary.updateMany({
          where: { periodId: updated.id },
          data: { isFinalized: input.isLocked },
        });

        return this.mapPeriodDto(updated);
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Tính toán và đồng bộ Bảng công tổng hợp chốt tháng (Lớp 3 - Monthly Timesheet Summary)
   */
  public static async recalculateMonthlySummary(
    employeeId: string,
    periodId: string,
    month: number,
    year: number,
    db: AttendanceDbClient = prisma
  ): Promise<any> {
    const [period, existingSummary] = await Promise.all([
      db.attendancePeriod.findUnique({ where: { id: periodId } }),
      db.monthlyTimesheetSummary.findUnique({
        where: {
          employeeId_periodId: {
            employeeId,
            periodId,
          },
        },
      }),
    ]);

    // Đóng băng dữ liệu khi kỳ công đã khóa hoặc bảng công đã chốt (isFinalized)
    if (period?.isLocked || existingSummary?.isFinalized) {
      return existingSummary;
    }

    const { startDate, endDate, endDateOnly } = this.getMonthBoundaries(month, year);

    const [records, approvedLeaves, approvedTrips] = await Promise.all([
      db.attendanceRecord.findMany({
        where: {
          employeeId,
          workDate: { gte: startDate, lte: endDate },
        },
      }),
      db.leaveRequest.findMany({
        where: {
          employeeId,
          status: "APPROVED",
          startDate: { lte: endDateOnly },
          endDate: { gte: startDate },
        },
      }),
      db.businessTripRequest.findMany({
        where: {
          employeeId,
          status: "APPROVED",
          startDate: { lte: endDateOnly },
          endDate: { gte: startDate },
        },
      }),
    ]);

    const standardDays = period ? Number(period.standardWorkingDays) : 22;
    const computed = this.computeMonthlySummaryValues(
      month,
      year,
      standardDays,
      records,
      approvedLeaves,
      approvedTrips
    );

    return await db.monthlyTimesheetSummary.upsert({
      where: {
        employeeId_periodId: {
          employeeId,
          periodId,
        },
      },
      update: {
        standardDays: new Prisma.Decimal(computed.standardDays),
        actualWorkingDays: new Prisma.Decimal(computed.actualWorkingDays),
        paidLeaveDays: new Prisma.Decimal(computed.paidLeaveDays),
        unpaidLeaveDays: new Prisma.Decimal(computed.unpaidLeaveDays),
        businessTripDays: new Prisma.Decimal(computed.businessTripDays),
        lateCount: computed.lateCount,
        earlyLeaveCount: computed.earlyLeaveCount,
        totalPayableDays: new Prisma.Decimal(computed.totalPayableDays),
      },
      create: {
        employeeId,
        periodId,
        standardDays: new Prisma.Decimal(computed.standardDays),
        actualWorkingDays: new Prisma.Decimal(computed.actualWorkingDays),
        paidLeaveDays: new Prisma.Decimal(computed.paidLeaveDays),
        unpaidLeaveDays: new Prisma.Decimal(computed.unpaidLeaveDays),
        businessTripDays: new Prisma.Decimal(computed.businessTripDays),
        lateCount: computed.lateCount,
        earlyLeaveCount: computed.earlyLeaveCount,
        totalPayableDays: new Prisma.Decimal(computed.totalPayableDays),
        isFinalized: false,
      },
    });
  }

  /**
   * Chấm công vào ca bằng nhận diện khuôn mặt (Face Recognition Check-in)
   */
  public static async faceCheckIn(
    employeeId: string,
    params: {
      snapshot?: string;
      deviceSource?: string;
      timestamp?: Date;
    } = {}
  ): Promise<any> {
    if (!employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản chưa được liên kết hồ sơ nhân sự để điểm danh.");
    }

    const now = params.timestamp ? new Date(params.timestamp) : new Date();
    const { year, month, hour: vnHour, minute: vnMin, dateStr: workDateStr, workDateUtc: workDate } =
      this.getVnDateParts(now);

    const isLate = vnHour > 8 || (vnHour === 8 && vnMin > 0);
    const initialStatus = isLate ? ("LATE" as AttendanceStatus) : ("PRESENT" as AttendanceStatus);

    try {
      return await prisma.$transaction(async (tx) => {
        const period = await this.getOrCreatePeriod(month, year, tx);
        if (period.isLocked) {
          throw new AppError(409, "PERIOD_LOCKED", `Kỳ công tháng ${month}/${year} đã khóa.`);
        }

        const existing = await tx.attendanceRecord.findUnique({
          where: {
            employeeId_workDate: {
              employeeId,
              workDate,
            },
          },
        });

        // Không ghi đè ngày nghỉ phép / lễ / công tác hoặc ghi đè checkInTime gốc khi quẹt trùng
        if (existing) {
          if (["ON_LEAVE", "HOLIDAY", "BUSINESS_TRIP"].includes(existing.status) || existing.checkInTime) {
            return {
              ...existing,
              workDate: existing.workDate.toISOString().split("T")[0],
              checkInTime: existing.checkInTime?.toISOString() ?? null,
              checkOutTime: existing.checkOutTime?.toISOString() ?? null,
              rawWorkingHours: Number(existing.rawWorkingHours),
            };
          }
        }

        const record = await tx.attendanceRecord.upsert({
          where: {
            employeeId_workDate: {
              employeeId,
              workDate,
            },
          },
          update: {
            periodId: period.id,
            checkInTime: now,
            status: initialStatus,
            deviceSource: params.deviceSource || "BIOMETRIC_FACE_RECOGNITION",
          },
          create: {
            employeeId,
            periodId: period.id,
            workDate,
            checkInTime: now,
            status: initialStatus,
            deviceSource: params.deviceSource || "BIOMETRIC_FACE_RECOGNITION",
            rawWorkingHours: new Prisma.Decimal(0),
          },
        });

        await this.recalculateMonthlySummary(employeeId, period.id, month, year, tx);

        return {
          ...record,
          status: record.status,
          workDate: workDateStr,
          checkInTime: record.checkInTime?.toISOString(),
          rawWorkingHours: Number(record.rawWorkingHours),
        };
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }

  /**
   * Chấm công hết ca bằng nhận diện khuôn mặt (Face Recognition Check-out)
   */
  public static async faceCheckOut(
    employeeId: string,
    params: {
      snapshot?: string;
      deviceSource?: string;
      timestamp?: Date;
    } = {}
  ): Promise<any> {
    if (!employeeId) {
      throw new AppError(403, "FORBIDDEN", "Tài khoản chưa được liên kết hồ sơ nhân sự để điểm danh.");
    }

    const now = params.timestamp ? new Date(params.timestamp) : new Date();
    const { year, month, dateStr: workDateStr, workDateUtc: workDate } = this.getVnDateParts(now);

    try {
      return await prisma.$transaction(async (tx) => {
        const period = await this.getOrCreatePeriod(month, year, tx);
        if (period.isLocked) {
          throw new AppError(409, "PERIOD_LOCKED", `Kỳ công tháng ${month}/${year} đã khóa.`);
        }

        const existing = await tx.attendanceRecord.findUnique({
          where: {
            employeeId_workDate: {
              employeeId,
              workDate,
            },
          },
        });

        if (!existing || !existing.checkInTime) {
          throw new AppError(
            422,
            "NO_CHECKIN_RECORD",
            "Chưa có bản ghi check-in cho ngày làm việc hôm nay, không thể thực hiện check-out."
          );
        }

        if (["ON_LEAVE", "HOLIDAY", "BUSINESS_TRIP"].includes(existing.status)) {
          return {
            ...existing,
            workDate: existing.workDate.toISOString().split("T")[0],
            checkInTime: existing.checkInTime?.toISOString() ?? null,
            checkOutTime: existing.checkOutTime?.toISOString() ?? null,
            rawWorkingHours: Number(existing.rawWorkingHours),
          };
        }

        const classified = this.classifyAttendanceStatus(existing.checkInTime, now);

        const record = await tx.attendanceRecord.update({
          where: {
            employeeId_workDate: {
              employeeId,
              workDate,
            },
          },
          data: {
            periodId: period.id,
            checkOutTime: now,
            rawWorkingHours: new Prisma.Decimal(classified.hours),
            status: classified.status,
            deviceSource: params.deviceSource || "BIOMETRIC_FACE_RECOGNITION",
          },
        });

        await this.recalculateMonthlySummary(employeeId, period.id, month, year, tx);

        return {
          ...record,
          status: classified.status,
          workDate: workDateStr,
          checkInTime: record.checkInTime?.toISOString(),
          checkOutTime: record.checkOutTime?.toISOString(),
          rawWorkingHours: Number(record.rawWorkingHours),
        };
      });
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (isDbConnectionError(err)) {
        throw new AppError(503, "DATABASE_UNAVAILABLE", "Không thể kết nối cơ sở dữ liệu.");
      }
      throw err;
    }
  }
}
