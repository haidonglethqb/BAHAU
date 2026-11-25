import fs from "node:fs";
import path from "node:path";
import { AppError } from "../middlewares/error.middleware.js";

export const MAX_SNAPSHOT_CHARS = 180_000;
const SNAPSHOT_DATA_URL_REGEX = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export interface FaceEnrollmentRecord {
  employeeId: string;
  descriptor: number[];
  sampleImage?: string;
  enrolledAt: string;
}

type EnrollmentStore = Record<string, FaceEnrollmentRecord>;
type SnapshotStore = Record<string, string>;

function toVnDateParts(date: Date): { dateStr: string; hour: number; minute: number } {
  const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  const year = vn.getUTCFullYear();
  const month = vn.getUTCMonth() + 1;
  const day = vn.getUTCDate();
  return {
    dateStr: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    hour: vn.getUTCHours(),
    minute: vn.getUTCMinutes(),
  };
}

export class KioskBiometricService {
  private readonly biometricsPath: string;
  private readonly snapshotsPath: string;

  constructor(
    biometricsPath = path.resolve(process.cwd(), ".data/kiosk-biometrics.json"),
    snapshotsPath = path.resolve(process.cwd(), ".data/kiosk-snapshots.json")
  ) {
    this.biometricsPath = biometricsPath;
    this.snapshotsPath = snapshotsPath;
  }

  private readJsonFile<T extends Record<string, unknown>>(filePath: string): T {
    try {
      if (!fs.existsSync(filePath)) {
        return {} as T;
      }
      const raw = fs.readFileSync(filePath, "utf8");
      if (!raw.trim()) {
        return {} as T;
      }
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T;
      }
      return {} as T;
    } catch {
      return {} as T;
    }
  }

  private writeJsonFile(filePath: string, data: unknown): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  }

  public validateSnapshot(snapshot?: unknown): string | null {
    if (snapshot === undefined || snapshot === null || snapshot === "") {
      return null;
    }
    if (typeof snapshot !== "string") {
      throw new AppError(400, "BAD_REQUEST", "Ảnh chụp chấm công phải là chuỗi base64 hợp lệ.");
    }
    if (snapshot.length > MAX_SNAPSHOT_CHARS) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        `Ảnh chụp chấm công vượt quá kích thước tối đa (${MAX_SNAPSHOT_CHARS} ký tự).`
      );
    }
    if (!SNAPSHOT_DATA_URL_REGEX.test(snapshot)) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "Ảnh chụp chấm công phải có định dạng data:image/(jpeg|png|webp);base64,..."
      );
    }
    return snapshot;
  }

  public enrollFace(
    employeeId: string,
    descriptor: number[],
    sampleImage?: string
  ): FaceEnrollmentRecord {
    if (!employeeId || typeof employeeId !== "string") {
      throw new AppError(400, "BAD_REQUEST", "Thiếu mã nhân sự để đăng ký khuôn mặt.");
    }
    if (!Array.isArray(descriptor) || descriptor.length < 64 || descriptor.length > 512) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "Vector đặc trưng khuôn mặt phải là mảng có độ dài từ 64 đến 512 phần tử."
      );
    }
    if (!descriptor.every((v) => typeof v === "number" && Number.isFinite(v))) {
      throw new AppError(
        400,
        "BAD_REQUEST",
        "Vector đặc trưng khuôn mặt chỉ được chứa các giá trị số hữu hạn."
      );
    }

    const validSample = this.validateSnapshot(sampleImage);
    const store = this.readJsonFile<EnrollmentStore>(this.biometricsPath);

    const record: FaceEnrollmentRecord = {
      employeeId,
      descriptor,
      ...(validSample ? { sampleImage: validSample } : {}),
      enrolledAt: new Date().toISOString(),
    };

    store[employeeId] = record;
    this.writeJsonFile(this.biometricsPath, store);
    return record;
  }

  public getEnrollment(employeeId: string): FaceEnrollmentRecord | null {
    const store = this.readJsonFile<EnrollmentStore>(this.biometricsPath);
    return store[employeeId] ?? null;
  }

  public getAllEnrollments(): EnrollmentStore {
    return this.readJsonFile<EnrollmentStore>(this.biometricsPath);
  }

  public deleteEnrollment(employeeId: string): boolean {
    const store = this.readJsonFile<EnrollmentStore>(this.biometricsPath);
    if (!(employeeId in store)) {
      return false;
    }
    delete store[employeeId];
    this.writeJsonFile(this.biometricsPath, store);
    return true;
  }

  public savePunchSnapshot(
    dateStr: string,
    employeeId: string,
    mode: "checkin" | "checkout",
    snapshot: string
  ): void {
    const validSnapshot = this.validateSnapshot(snapshot);
    if (!validSnapshot) return;

    const store = this.readJsonFile<SnapshotStore>(this.snapshotsPath);
    const prefix = `${dateStr}:`;
    const pruned: SnapshotStore = {};

    for (const [key, value] of Object.entries(store)) {
      if (key.startsWith(prefix)) {
        pruned[key] = value;
      }
    }

    pruned[`${dateStr}:${employeeId}:${mode}`] = validSnapshot;
    this.writeJsonFile(this.snapshotsPath, pruned);
  }

  public getPunchSnapshot(
    dateStr: string,
    employeeId: string,
    mode: "checkin" | "checkout"
  ): string | null {
    const store = this.readJsonFile<SnapshotStore>(this.snapshotsPath);
    return store[`${dateStr}:${employeeId}:${mode}`] ?? null;
  }

  public clearDaySnapshotsForEmployee(dateStr: string, employeeId: string): void {
    const store = this.readJsonFile<SnapshotStore>(this.snapshotsPath);
    const checkInKey = `${dateStr}:${employeeId}:checkin`;
    const checkOutKey = `${dateStr}:${employeeId}:checkout`;
    let changed = false;

    if (checkInKey in store) {
      delete store[checkInKey];
      changed = true;
    }
    if (checkOutKey in store) {
      delete store[checkOutKey];
      changed = true;
    }

    if (changed) {
      this.writeJsonFile(this.snapshotsPath, store);
    }
  }

  public computeLateMinutes(checkInIso?: string | null): number {
    if (!checkInIso) return 0;
    const date = new Date(checkInIso);
    if (Number.isNaN(date.getTime())) return 0;

    const { hour, minute } = toVnDateParts(date);
    const totalMinutes = hour * 60 + minute;
    const standardCheckInMinutes = 8 * 60; // 08:00 GMT+7
    return totalMinutes > standardCheckInMinutes ? totalMinutes - standardCheckInMinutes : 0;
  }

  public computeEarlyLeaveMinutes(
    checkOutIso?: string | null,
    checkInIso?: string | null
  ): number {
    if (!checkOutIso) return 0;
    const outDate = new Date(checkOutIso);
    if (Number.isNaN(outDate.getTime())) return 0;

    const outVn = toVnDateParts(outDate);

    if (checkInIso) {
      const inDate = new Date(checkInIso);
      if (!Number.isNaN(inDate.getTime())) {
        if (outDate.getTime() < inDate.getTime()) return 0;
        const inVn = toVnDateParts(inDate);
        if (outVn.dateStr > inVn.dateStr) {
          return 0;
        }
      }
    }

    const totalMinutes = outVn.hour * 60 + outVn.minute;
    const standardCheckOutMinutes = 17 * 60; // 17:00 GMT+7
    return totalMinutes < standardCheckOutMinutes ? standardCheckOutMinutes - totalMinutes : 0;
  }
}

export const kioskBiometricService = new KioskBiometricService();
