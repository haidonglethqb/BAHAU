import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "@bahau/database";
import { AttendanceService } from "../services/attendance.service.js";
import { AppError } from "../middlewares/error.middleware.js";
import { kioskBiometricService } from "../services/kiosk-biometric.service.js";

/** Schema kiểm tra dữ liệu đầu vào hợp lệ cho điểm danh khuôn mặt (bỏ qua employeeId/timestamp từ client). */
export const FaceAttendanceSchema = z.preprocess(
  (val) => (val == null ? {} : val),
  z.object({
    snapshot: z.string().max(5_000_000, "Ảnh khuôn mặt vượt quá kích thước cho phép").optional(),
    deviceSource: z.string().trim().min(1).max(100).optional(),
    deviceInfo: z
      .union([
        z.string().trim().max(500),
        z.record(z.string().max(100), z.union([z.string().max(200), z.number(), z.boolean()])),
      ])
      .optional(),
  })
);

function getCurrentVnMonthYear(): { month: number; year: number } {
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return {
    month: vn.getUTCMonth() + 1,
    year: vn.getUTCFullYear(),
  };
}

export async function getMyAttendance(req: Request, res: Response): Promise<void> {
  const vnNow = getCurrentVnMonthYear();
  const month = req.query["month"] !== undefined ? Number(req.query["month"]) : vnNow.month;
  const year = req.query["year"] !== undefined ? Number(req.query["year"]) : vnNow.year;

  const data = await AttendanceService.getMyMonthlyAttendance(month, year, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function getUnitAttendance(req: Request, res: Response): Promise<void> {
  const vnNow = getCurrentVnMonthYear();
  const month = req.query["month"] !== undefined ? Number(req.query["month"]) : vnNow.month;
  const year = req.query["year"] !== undefined ? Number(req.query["year"]) : vnNow.year;
  const unitId = req.query["unitId"] ? String(req.query["unitId"]) : undefined;

  const data = await AttendanceService.getUnitAttendance(unitId, month, year, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function createAdjustmentRequest(req: Request, res: Response): Promise<void> {
  const created = await AttendanceService.createAdjustmentRequest(req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(201).json({
    success: true,
    data: created,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function importAttendanceData(req: Request, res: Response): Promise<void> {
  const result = await AttendanceService.importAttendanceData(req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function lockPeriod(req: Request, res: Response): Promise<void> {
  const result = await AttendanceService.lockPeriod(req.body, req.user!);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

async function handleFaceAttendance(
  req: Request,
  res: Response,
  mode: "checkin" | "checkout"
): Promise<void> {
  if (!req.user) {
    throw new AppError(401, "UNAUTHENTICATED", "Yêu cầu đăng nhập để thực hiện điểm danh.");
  }
  const employeeId = req.user.employeeId;
  if (!employeeId) {
    throw new AppError(403, "FORBIDDEN", "Tài khoản chưa được liên kết hồ sơ nhân sự để điểm danh.");
  }

  const body = (req.body ?? {}) as {
    snapshot?: string;
    deviceSource?: string;
    deviceInfo?: string | Record<string, string | number | boolean>;
  };

  const deviceSourceFromInfo =
    typeof body.deviceInfo === "string" && body.deviceInfo.trim()
      ? body.deviceInfo.trim().slice(0, 100)
      : undefined;

  // Luôn lấy thời gian máy chủ; tuyệt đối không tin employeeId/timestamp từ client
  const payload = {
    snapshot: body.snapshot,
    deviceSource: body.deviceSource || deviceSourceFromInfo || "BIOMETRIC_FACE_RECOGNITION",
    timestamp: new Date(),
  };

  const result =
    mode === "checkin"
      ? await AttendanceService.faceCheckIn(employeeId, payload)
      : await AttendanceService.faceCheckOut(employeeId, payload);
  const requestId = req.id || "00000000-0000-0000-0000-000000000000";

  res.status(200).json({
    success: true,
    data: result,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  });
}

export async function faceCheckIn(req: Request, res: Response): Promise<void> {
  await handleFaceAttendance(req, res, "checkin");
}

export async function faceCheckOut(req: Request, res: Response): Promise<void> {
  await handleFaceAttendance(req, res, "checkout");
}

function getVnTodayUtc(): { dateStr: string; workDateUtc: Date; month: number; year: number } {
  const vn = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth() + 1;
  const day = vn.getUTCDate();
  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const workDateUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  return { dateStr, workDateUtc, month, year };
}

export function requireKioskAccess(req: Request, _res: Response, next: NextFunction): void {
  const kioskApiKey = process.env.KIOSK_API_KEY;
  const providedKey = req.headers["x-kiosk-key"];
  const hasValidKioskKey =
    Boolean(kioskApiKey) && typeof providedKey === "string" && providedKey === kioskApiKey;

  if (req.user || hasValidKioskKey || process.env.NODE_ENV !== "production") {
    return next();
  }

  throw new AppError(
    401,
    "UNAUTHENTICATED",
    "Trạm chấm công Kiosk yêu cầu xác thực thiết bị hoặc đăng nhập."
  );
}

export async function getKioskStatus(req: Request, res: Response): Promise<void> {
  const { dateStr, workDateUtc, month, year } = getVnTodayUtc();
  try {
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: { notIn: ["RESIGNED", "RETIRED"] } },
      include: {
        assignments: {
          where: { status: "ACTIVE" },
          include: { unit: true, position: true },
        },
        attendanceRecords: {
          where: { workDate: workDateUtc },
        },
        monthlyTimesheets: {
          where: { period: { month, year } },
        },
      },
      orderBy: { employeeCode: "asc" },
    });

    const enrollments = kioskBiometricService.getAllEnrollments();

    const list = employees.map((emp) => {
      const primary = emp.assignments.find((a) => a.assignmentType === "PRIMARY") || emp.assignments[0];
      const todayRec = emp.attendanceRecords[0] || null;
      const summary = emp.monthlyTimesheets[0] || null;
      const enrollment = enrollments[emp.id] ?? null;

      const checkInIso = todayRec?.checkInTime?.toISOString() ?? null;
      const checkOutIso = todayRec?.checkOutTime?.toISOString() ?? null;
      const lateMinutes = kioskBiometricService.computeLateMinutes(checkInIso);
      const earlyLeaveMinutes = kioskBiometricService.computeEarlyLeaveMinutes(checkOutIso, checkInIso);
      const checkInSnapshot = checkInIso
        ? kioskBiometricService.getPunchSnapshot(dateStr, emp.id, "checkin")
        : null;
      const checkOutSnapshot = checkOutIso
        ? kioskBiometricService.getPunchSnapshot(dateStr, emp.id, "checkout")
        : null;

      return {
        id: emp.id,
        employeeCode: emp.employeeCode,
        fullName: emp.fullName,
        unitName: primary?.unit?.name || "ĐH Kiến trúc Đà Nẵng",
        positionName: primary?.position?.name || "Nhân sự / Giảng viên",
        hasFaceEnrolled: Boolean(enrollment),
        faceDescriptor: enrollment ? enrollment.descriptor : null,
        today: todayRec
          ? {
              workDate: dateStr,
              checkInTime: checkInIso,
              checkOutTime: checkOutIso,
              rawWorkingHours: Number(todayRec.rawWorkingHours),
              status: todayRec.status,
              deviceSource: todayRec.deviceSource,
              lateMinutes,
              earlyLeaveMinutes,
              checkInSnapshot,
              checkOutSnapshot,
            }
          : null,
        monthlyWorkingDays: summary ? Number(summary.actualWorkingDays) : 0,
        standardDays: summary ? Number(summary.standardDays) : 22,
      };
    });

    const todayLogs = list
      .flatMap((emp) => {
        const logs: Array<{
          id: string;
          employeeId: string;
          employeeCode: string;
          employeeName: string;
          unitName: string;
          mode: "checkin" | "checkout";
          timeIso: string;
          method: string | null;
          status: string;
          lateMinutes: number;
          earlyLeaveMinutes: number;
          snapshot: string | null;
        }> = [];

        if (emp.today?.checkInTime) {
          logs.push({
            id: `${emp.id}-checkin`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: emp.fullName,
            unitName: emp.unitName,
            mode: "checkin",
            timeIso: emp.today.checkInTime,
            method: emp.today.deviceSource,
            status: emp.today.status,
            lateMinutes: emp.today.lateMinutes,
            earlyLeaveMinutes: 0,
            snapshot: emp.today.checkInSnapshot,
          });
        }

        if (emp.today?.checkOutTime) {
          logs.push({
            id: `${emp.id}-checkout`,
            employeeId: emp.id,
            employeeCode: emp.employeeCode,
            employeeName: emp.fullName,
            unitName: emp.unitName,
            mode: "checkout",
            timeIso: emp.today.checkOutTime,
            method: emp.today.deviceSource,
            status: emp.today.status,
            lateMinutes: 0,
            earlyLeaveMinutes: emp.today.earlyLeaveMinutes,
            snapshot: emp.today.checkOutSnapshot,
          });
        }

        return logs;
      })
      .sort((a, b) => new Date(b.timeIso).getTime() - new Date(a.timeIso).getTime());

    const totalEmployees = list.length;
    const checkedInCount = list.filter((emp) => Boolean(emp.today?.checkInTime)).length;
    const lateCount = list.filter(
      (emp) => Boolean(emp.today?.checkInTime) && (emp.today?.lateMinutes ?? 0) > 0
    ).length;
    const onTimeCount = checkedInCount - lateCount;
    const checkedOutCount = list.filter((emp) => Boolean(emp.today?.checkOutTime)).length;
    const notCheckedInCount = totalEmployees - checkedInCount;

    const stats = {
      totalEmployees,
      checkedInCount,
      onTimeCount,
      lateCount,
      checkedOutCount,
      notCheckedInCount,
    };

    res.status(200).json({
      success: true,
      data: { workDate: dateStr, month, year, stats, employees: list, todayLogs },
    });
  } catch (err) {
    console.warn("[AttendanceController] getKioskStatus failed:", err);
    res.status(200).json({
      success: true,
      data: {
        workDate: dateStr,
        month,
        year,
        stats: {
          totalEmployees: 0,
          checkedInCount: 0,
          onTimeCount: 0,
          lateCount: 0,
          checkedOutCount: 0,
          notCheckedInCount: 0,
        },
        employees: [],
        todayLogs: [],
      },
    });
  }
}

export async function kioskPunch(req: Request, res: Response): Promise<void> {
  const { employeeId, employeeCode, mode, biometricMethod, snapshot } = (req.body ?? {}) as {
    employeeId?: string;
    employeeCode?: string;
    mode?: unknown;
    biometricMethod?: "FACE_ID" | "FINGERPRINT";
    snapshot?: unknown;
  };

  const resolvedMode = mode === undefined ? "checkin" : mode;
  if (resolvedMode !== "checkin" && resolvedMode !== "checkout" && resolvedMode !== "reset") {
    throw new AppError(
      400,
      "BAD_REQUEST",
      "Chế độ chấm công không hợp lệ. Chỉ chấp nhận checkin, checkout hoặc reset."
    );
  }

  const validSnapshot = kioskBiometricService.validateSnapshot(snapshot);

  let targetId = employeeId;
  if (!targetId && employeeCode) {
    const emp = await prisma.employee.findUnique({ where: { employeeCode } });
    targetId = emp?.id;
  }
  if (!targetId) {
    throw new AppError(400, "BAD_REQUEST", "Vui lòng chọn nhân sự để chấm công.");
  }

  const { dateStr } = getVnTodayUtc();

  const deviceSource =
    biometricMethod === "FINGERPRINT"
      ? "KIOSK_FINGERPRINT_OPTICAL"
      : "KIOSK_FACE_AI_CAMERA";

  if (resolvedMode === "reset") {
    if (process.env.NODE_ENV === "production") {
      const canReset = req.user?.roles.some((r) =>
        ["ROLE_SYSADMIN", "ROLE_HR_OFFICER"].includes(r)
      );
      if (!canReset) {
        throw new AppError(
          403,
          "FORBIDDEN",
          "Chỉ Quản trị viên hoặc Phòng TCHC mới được reset bản ghi chấm công."
        );
      }
    }

    const result = await AttendanceService.resetTodayAttendance(targetId);
    kioskBiometricService.clearDaySnapshotsForEmployee(dateStr, targetId);
    res.status(200).json({
      success: true,
      data: result,
    });
    return;
  }

  const result =
    resolvedMode === "checkout"
      ? await AttendanceService.faceCheckOut(targetId, {
          snapshot: validSnapshot ?? undefined,
          deviceSource,
          timestamp: new Date(),
        })
      : await AttendanceService.faceCheckIn(targetId, {
          snapshot: validSnapshot ?? undefined,
          deviceSource,
          timestamp: new Date(),
        });

  if (validSnapshot) {
    kioskBiometricService.savePunchSnapshot(dateStr, targetId, resolvedMode, validSnapshot);
  }

  const lateMinutes = kioskBiometricService.computeLateMinutes(result.checkInTime ?? null);
  const earlyLeaveMinutes = kioskBiometricService.computeEarlyLeaveMinutes(
    result.checkOutTime ?? null,
    result.checkInTime ?? null
  );

  res.status(200).json({
    success: true,
    data: {
      ...result,
      lateMinutes,
      earlyLeaveMinutes,
      snapshot: validSnapshot,
    },
  });
}

export async function kioskEnrollFace(req: Request, res: Response): Promise<void> {
  const { employeeId, employeeCode, descriptor, sampleImage } = (req.body ?? {}) as {
    employeeId?: string;
    employeeCode?: string;
    descriptor?: number[];
    sampleImage?: string;
  };

  let targetId = employeeId;
  if (!targetId && employeeCode) {
    const emp = await prisma.employee.findUnique({ where: { employeeCode } });
    targetId = emp?.id;
  }
  if (!targetId) {
    throw new AppError(400, "BAD_REQUEST", "Vui lòng chọn nhân sự để đăng ký khuôn mặt.");
  }

  const record = kioskBiometricService.enrollFace(
    targetId,
    descriptor as number[],
    sampleImage
  );

  res.status(200).json({
    success: true,
    data: {
      employeeId: targetId,
      enrolledAt: record.enrolledAt,
      hasFaceEnrolled: true,
    },
  });
}
