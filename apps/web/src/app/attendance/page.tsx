"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw, Lightbulb, Lock, XCircle, X, Camera, Clock, LogIn } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { FaceCheckInModal } from "../../components/FaceCheckInModal";
import { AuthGuard } from "../../components/AuthGuard";

interface AttendanceRecord {
  id: string;
  workDate: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  rawWorkingHours: number;
  status: "PRESENT" | "LATE" | "EARLY_LEAVE" | "ABSENT" | "ON_LEAVE" | "BUSINESS_TRIP" | "HOLIDAY" | "WEEKEND";
  deviceSource?: string | null;
  adjustmentRequestId?: string | null;
}

interface MonthlySummary {
  id: string;
  standardDays: number;
  actualWorkingDays: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  businessTripDays: number;
  lateCount: number;
  earlyLeaveCount: number;
  totalPayableDays: number;
  isFinalized: boolean;
}

interface PeriodInfo {
  id: string;
  month: number;
  year: number;
  startDate: string;
  endDate: string;
  standardWorkingDays: number;
  isLocked: boolean;
  lockedAt?: string | null;
  note?: string | null;
}

interface AdjustmentRequest {
  id: string;
  workDate: string;
  originalCheckIn?: string | null;
  originalCheckOut?: string | null;
  adjustedCheckIn?: string | null;
  adjustedCheckOut?: string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

function getVnDateStr(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getVnMonthYear(): { month: number; year: number } {
  const [y, m] = getVnDateStr().split("-").map(Number);
  return { month: m, year: y };
}

function formatVnTime(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getAuthHeaders(includeJson = false): Record<string, string> {
  const headers: Record<string, string> = {};
  if (includeJson) headers["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("bahau_session_id");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export default function AttendancePersonalPage() {
  const initialPeriod = getVnMonthYear();
  const [month, setMonth] = useState(initialPeriod.month);
  const [year, setYear] = useState(initialPeriod.year);
  const [period, setPeriod] = useState<PeriodInfo>({
    id: "",
    month: initialPeriod.month,
    year: initialPeriod.year,
    startDate: "",
    endDate: "",
    standardWorkingDays: 22,
    isLocked: false,
  });
  const [summary, setSummary] = useState<MonthlySummary>({
    id: "",
    standardDays: 22,
    actualWorkingDays: 0,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    businessTripDays: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    totalPayableDays: 0,
    isFinalized: false,
  });
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { user } = useAuth();
  const [showFaceModal, setShowFaceModal] = useState(false);

  // Active shift identification using Asia/Ho_Chi_Minh local date
  const todayDateStr = getVnDateStr();
  const todayRecord = records.find((r) => r.workDate === todayDateStr) || null;

  const hasCheckedIn = Boolean(todayRecord?.checkInTime);
  const hasCheckedOut = Boolean(todayRecord?.checkOutTime);
  const activeMode: "checkin" | "checkout" = hasCheckedIn && !hasCheckedOut ? "checkout" : "checkin";

  const fetchAttendance = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`/api/v1/attendance/me?month=${month}&year=${year}`, {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false || !json?.data) {
        setRecords([]);
        setAdjustments([]);
        setFetchError(json?.error?.message || `Không thể tải bảng chấm công (HTTP ${res.status}).`);
        return;
      }
      if (json.data.period) setPeriod(json.data.period);
      if (json.data.summary) setSummary(json.data.summary);
      setRecords(Array.isArray(json.data.records) ? json.data.records : []);
      setAdjustments(Array.isArray(json.data.adjustments) ? json.data.adjustments : []);
    } catch (err) {
      setRecords([]);
      setAdjustments([]);
      setFetchError(err instanceof Error ? err.message : "Lỗi kết nối máy chủ khi tải bảng công.");
    } finally {
      setIsLoading(false);
    }
  }, [month, year]);

  useEffect(() => {
    fetchAttendance();
  }, [fetchAttendance]);

  const handleFaceSuccess = () => {
    fetchAttendance();
  };

  // Modal nộp đơn giải trình
  const [showModal, setShowModal] = useState(false);
  const [formWorkDate, setFormWorkDate] = useState(() => getVnDateStr());
  const [formCheckIn, setFormCheckIn] = useState("07:55");
  const [formCheckOut, setFormCheckOut] = useState("17:00");
  const [formReason, setFormReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submittingAdjustment, setSubmittingAdjustment] = useState(false);

  const handleOpenAdjustment = (workDate?: string) => {
    if (period.isLocked) {
      setFetchError("Kỳ công tháng này đã bị khóa bởi Phòng TCHC, không thể tạo thêm đơn giải trình.");
      return;
    }
    setFormWorkDate(workDate || getVnDateStr());
    setFormReason("");
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formReason || formReason.trim().length < 5) {
      setFormError("Vui lòng nhập lý do giải trình chi tiết (tối thiểu 5 ký tự)");
      return;
    }

    setSubmittingAdjustment(true);
    try {
      const payload = {
        workDate: formWorkDate,
        adjustedCheckIn: `${formWorkDate}T${formCheckIn}:00+07:00`,
        adjustedCheckOut: `${formWorkDate}T${formCheckOut}:00+07:00`,
        reason: formReason.trim(),
      };

      const res = await fetch("/api/v1/attendance/adjustments", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success !== false && json?.data) {
        setFormSuccess("Đã gửi đơn giải trình thành công! Đang chuyển tiếp cho Trưởng đơn vị phê duyệt.");
        fetchAttendance();
        setTimeout(() => setShowModal(false), 1200);
      } else {
        setFormError(json?.error?.message || `Có lỗi xảy ra khi nộp đơn giải trình (HTTP ${res.status})`);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Không thể kết nối máy chủ để gửi đơn giải trình.");
    } finally {
      setSubmittingAdjustment(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PRESENT":
        return <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Đúng giờ</span>;
      case "LATE":
        return <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">Đi muộn</span>;
      case "EARLY_LEAVE":
        return <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-0.5 text-xs font-semibold text-orange-800 ring-1 ring-inset ring-orange-600/20">Về sớm</span>;
      case "ON_LEAVE":
        return <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/20">Nghỉ phép</span>;
      case "BUSINESS_TRIP":
        return <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-700/20">Công tác</span>;
      case "HOLIDAY":
        return <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">Nghỉ Lễ</span>;
      case "ABSENT":
        return <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-600/20">Vắng</span>;
      default:
        return <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">{status}</span>;
    }
  };

  return (
    <AuthGuard moduleName="Bảng Chấm Công Cá Nhân">
      <div className="space-y-8">
        {/* Top Banner & Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
                Bảng Chấm Công Cá Nhân
              </h1>
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                Dữ Liệu Chuẩn Hóa
              </span>
            </div>
          <p className="mt-1 text-sm text-slate-500">
            Dữ liệu điểm danh vân tay/khuôn mặt, đơn giải trình giờ công và tổng hợp chốt công tháng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            <button
              onClick={() => {
                if (month === 1) { setMonth(12); setYear(year - 1); }
                else { setMonth(month - 1); }
              }}
              className="rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              ◀
            </button>
            <span className="px-3 text-xs font-bold text-slate-800">
              Tháng {month}/{year}
            </span>
            <button
              onClick={() => {
                if (month === 12) { setMonth(1); setYear(year + 1); }
                else { setMonth(month + 1); }
              }}
              className="rounded px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              ▶
            </button>
          </div>

          <button
            onClick={() => handleOpenAdjustment()}
            disabled={period.isLocked}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow transition ${
              period.isLocked
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-blue-900 text-white hover:bg-blue-800"
            }`}
          >
            + Nộp Đơn Giải Trình Công
          </button>

          <a
            href="/attendance/manage"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            Quản trị Bảng công đơn vị →
          </a>
        </div>
      </div>

      {fetchError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="shrink-0 text-rose-600" />
          <span>{fetchError}</span>
        </div>
      )}

      {/* Lock Status Alert */}
      {period.isLocked ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Lock size={20} className="text-rose-700 shrink-0" />
            <div>
              <p className="text-sm font-bold">Kỳ công Tháng {month}/{year} ĐÃ KHÓA SỔ BẤT BIẾN</p>
              <p className="text-xs text-rose-700">
                Phòng TCHC đã hoàn tất đối soát và khóa số liệu để chuyển lập phiếu lương. Không thể sửa đổi bản ghi hoặc tạo mới đơn giải trình.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold rounded bg-rose-200/60 px-2.5 py-1 text-rose-950">
            Immutable
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <CheckCircle2 size={20} className="text-emerald-700 shrink-0" />
            <div>
              <p className="text-sm font-bold">Kỳ công Tháng {month}/{year} ĐANG MỞ GHI NHẬN</p>
              <p className="text-xs text-emerald-700">
                Hệ thống đang tiếp nhận dữ liệu quẹt thẻ từ cổng biometric và cho phép nộp giải trình trước ngày chốt công.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold rounded bg-emerald-200/60 px-2.5 py-1 text-emerald-950">
            Active Period
          </span>
        </div>
      )}

      
      {/* Live Shift Lifecycle & Biometric Action Banner */}
      <div className={`rounded-2xl border p-5 shadow-xs ${
        !hasCheckedIn
          ? "border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-white"
          : !hasCheckedOut
          ? "border-blue-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-white"
          : "border-slate-200 bg-gradient-to-r from-slate-50 via-emerald-50/30 to-white"
      }`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-md shrink-0 ${
              !hasCheckedIn ? "bg-emerald-600" : !hasCheckedOut ? "bg-blue-600" : "bg-slate-700"
            }`}>
              {!hasCheckedIn ? <LogIn size={24} /> : !hasCheckedOut ? <Clock size={24} /> : <CheckCircle2 size={24} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  {!hasCheckedIn
                    ? "Chưa Vào Ca Làm Việc Hôm Nay"
                    : !hasCheckedOut
                    ? "Đang Trong Ca Làm Việc"
                    : "Đã Hoàn Thành Ca Làm Việc Hôm Nay"}
                </h3>
                <span className={`rounded-full text-[10px] font-mono font-bold px-2 py-0.5 border ${
                  !hasCheckedIn
                    ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                    : !hasCheckedOut
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-slate-100 text-slate-700 border-slate-300"
                }`}>
                  {!hasCheckedIn
                    ? "CHỜ CHECK-IN"
                    : !hasCheckedOut
                    ? `ĐÃ VÀO CA ${formatVnTime(todayRecord?.checkInTime)}`
                    : "HOÀN TẤT CA"}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {!hasCheckedIn
                  ? "Camera AI sẽ tự động nhận diện khuôn mặt và ghi nhận Check-in ngay khi bạn nhìn thẳng (Quy chuẩn vào trước 08:00)."
                  : !hasCheckedOut
                  ? `Đã ghi nhận giờ vào ca (${formatVnTime(todayRecord?.checkInTime)}). Khi hết giờ làm việc, quét khuôn mặt để tự động ghi nhận Check-out (Quy chuẩn ra sau 17:00).`
                  : `Ca làm việc hôm nay: Vào ca lúc ${formatVnTime(todayRecord?.checkInTime)} · Hết ca lúc ${formatVnTime(todayRecord?.checkOutTime)} (Tổng ${todayRecord?.rawWorkingHours ?? 0} giờ công).`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {!hasCheckedIn ? (
              <button
                onClick={() => setShowFaceModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 text-xs shadow-md transition duration-150 cursor-pointer"
              >
                <Camera size={16} />
                <span>📸 Bật Camera Điểm Danh Vào Ca (Check-in)</span>
              </button>
            ) : !hasCheckedOut ? (
              <button
                onClick={() => setShowFaceModal(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold px-5 py-2.5 text-xs shadow-md transition duration-150 cursor-pointer animate-pulse"
              >
                <Camera size={16} />
                <span>📸 Bật Camera Điểm Danh Hết Ca (Check-out)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold px-4 py-2 text-xs">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>Ca Hôm Nay Đã Hoàn Tất</span>
                </span>
                <button
                  onClick={fetchAttendance}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold px-3 py-2 text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                  title="Tải lại dữ liệu chấm công từ máy chủ"
                >
                  <RefreshCw size={13} className={`text-blue-600 ${isLoading ? "animate-spin" : ""}`} />
                  <span>Làm mới</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layer 3: Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Công chuẩn DAU</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-slate-900">{summary.standardDays}</span>
            <span className="text-xs text-slate-500">ngày</span>
          </div>
          <span className="mt-1 block text-[11px] text-slate-400">Định mức tháng</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Đi làm thực tế</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-emerald-600">{summary.actualWorkingDays}</span>
            <span className="text-xs text-slate-500">ngày</span>
          </div>
          <span className="mt-1 block text-[11px] text-emerald-600 font-medium">Bản ghi hợp lệ</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Nghỉ phép hưởng lương</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-blue-600">{summary.paidLeaveDays}</span>
            <span className="text-xs text-slate-500">ngày</span>
          </div>
          <span className="mt-1 block text-[11px] text-blue-500">Từ Đơn nghỉ phép</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Đi công tác</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-purple-600">{summary.businessTripDays}</span>
            <span className="text-xs text-slate-500">ngày</span>
          </div>
          <span className="mt-1 block text-[11px] text-purple-500">Từ Lệnh công tác</span>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Vào muộn / Ra sớm</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-extrabold text-amber-600">
              {summary.lateCount + summary.earlyLeaveCount}
            </span>
            <span className="text-xs text-slate-500">lần</span>
          </div>
          <span className="mt-1 block text-[11px] text-amber-600">
            {summary.lateCount} muộn, {summary.earlyLeaveCount} sớm
          </span>
        </div>

        <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 shadow-sm">
          <span className="text-xs font-medium text-blue-900">Tổng công tính lương</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-900">{summary.totalPayableDays}</span>
            <span className="text-xs text-blue-700">ngày</span>
          </div>
          <span className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-blue-700">
            {summary.isFinalized ? (
              <>
                <CheckCircle2 size={12} />
                <span>Đã chốt lương</span>
              </>
            ) : (
              "Tạm tính"
            )}
          </span>
        </div>
      </div>

      {/* Layer 1: Daily Attendance Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Lớp 1: Nhật Ký Quẹt Thẻ Hàng Ngày (Biometric Raw Logs)
            </h2>
            <p className="text-xs text-slate-500">
              Chuẩn làm việc: 08:00 - 17:00 (Nghỉ trưa 12:00 - 13:00) • Chuẩn 8.0 giờ/ngày
            </p>
          </div>
          <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs text-slate-700 font-medium">
            {records.length} bản ghi
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3">Ngày làm việc</th>
                <th className="px-6 py-3">Giờ vào (Check-in)</th>
                <th className="px-6 py-3">Giờ ra (Check-out)</th>
                <th className="px-6 py-3">Thời gian ghi nhận</th>
                <th className="px-6 py-3">Trạng thái</th>
                <th className="px-6 py-3">Thiết bị / Nguồn</th>
                <th className="px-6 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((r) => {
                const [wy, wm, wd] = r.workDate.split("-").map(Number);
                const dateObj = new Date(Date.UTC(wy, wm - 1, wd));
                const dayOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][
                  dateObj.getUTCDay()
                ];
                const isLateOrEarly = r.status === "LATE" || r.status === "EARLY_LEAVE";

                return (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                      <div>{r.workDate}</div>
                      <div className="text-[11px] text-slate-400">{dayOfWeek}</div>
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-800">
                      {formatVnTime(r.checkInTime)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-800">
                      {formatVnTime(r.checkOutTime)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-800">
                      {r.rawWorkingHours > 0 ? `${r.rawWorkingHours} giờ` : "—"}
                    </td>
                    <td className="px-6 py-3.5">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-[11px]">
                      {r.deviceSource || "Hệ thống"}
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      {isLateOrEarly && !period.isLocked && (
                        <button
                          onClick={() => handleOpenAdjustment(r.workDate)}
                          className="rounded bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                        >
                          Giải trình công →
                        </button>
                      )}
                      {r.adjustmentRequestId && (
                        <span className="text-[11px] font-medium text-blue-600 block">
                          Đã có đơn giải trình
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Layer 2: Adjustment Requests Section */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/70 px-6 py-3.5 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Lớp 2: Danh Sách Đơn Giải Trình Giờ Công (Attendance Adjustment Requests)
            </h2>
            <p className="text-xs text-slate-500">
              Quy trình phê duyệt đa cấp chống tự duyệt: Trưởng đơn vị → Phòng TCHC thẩm định
            </p>
          </div>
          <span className="rounded bg-slate-200/80 px-2 py-0.5 text-xs text-slate-700 font-medium">
            {adjustments.length} yêu cầu
          </span>
        </div>

        {adjustments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Chưa có đơn giải trình nào trong tháng này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3">Ngày công</th>
                  <th className="px-6 py-3">Giờ quẹt gốc</th>
                  <th className="px-6 py-3">Giờ đề xuất sửa</th>
                  <th className="px-6 py-3">Lý do giải trình</th>
                  <th className="px-6 py-3">Trạng thái phê duyệt</th>
                  <th className="px-6 py-3">Thời gian gửi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{a.workDate}</td>
                    <td className="px-6 py-3.5 text-slate-500 font-mono">
                      {formatVnTime(a.originalCheckIn)}
                      {" - "}
                      {formatVnTime(a.originalCheckOut)}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-blue-900 font-mono">
                      {formatVnTime(a.adjustedCheckIn)}
                      {" - "}
                      {formatVnTime(a.adjustedCheckOut)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 max-w-xs truncate" title={a.reason}>
                      {a.reason}
                    </td>
                    <td className="px-6 py-3.5">
                      {a.status === "PENDING" && (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                          Chờ duyệt (2 cấp)
                        </span>
                      )}
                      {a.status === "APPROVED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 size={12} />
                          <span>Đã chấp thuận</span>
                        </span>
                      )}
                      {a.status === "REJECTED" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                          <XCircle size={12} />
                          <span>Từ chối</span>
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                      {new Date(a.createdAt).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal nộp đơn giải trình công */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Nộp Đơn Giải Trình / Điều Chỉnh Giờ Công
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200">
                {formError}
              </div>
            )}

            {formSuccess && (
              <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200">
                {formSuccess}
              </div>
            )}

            <form onSubmit={handleSubmitAdjustment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ngày làm việc cần giải trình *</label>
                <input
                  type="date"
                  value={formWorkDate}
                  onChange={(e) => setFormWorkDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ vào thực tế (Check-in)</label>
                  <input
                    type="time"
                    value={formCheckIn}
                    onChange={(e) => setFormCheckIn(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giờ ra thực tế (Check-out)</label>
                  <input
                    type="time"
                    value={formCheckOut}
                    onChange={(e) => setFormCheckOut(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Lý do giải trình (quên quẹt thẻ, sự cố máy vân tay, nhiệm vụ đột xuất) *
                </label>
                <textarea
                  rows={3}
                  value={formReason}
                  onChange={(e) => setFormReason(e.target.value)}
                  placeholder="Mô tả cụ thể lý do kèm minh chứng nếu có..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="rounded-lg bg-blue-50 p-3 text-slate-600 leading-relaxed text-[11px] flex items-start gap-1.5 border border-blue-200">
                <Lightbulb size={14} className="text-amber-600 shrink-0 mt-0.5" />
                <span>Đơn sau khi nộp sẽ được chuyển đến <strong>Trưởng đơn vị</strong> xác nhận, tiếp đó chuyển <strong>Phòng TCHC</strong> thẩm định cập nhật vào Bảng công tổng hợp.</span>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={submittingAdjustment}
                  className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800 transition disabled:opacity-50"
                >
                  {submittingAdjustment ? "Đang gửi..." : "Gửi Phê Duyệt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
      <FaceCheckInModal
        isOpen={showFaceModal}
        onClose={() => setShowFaceModal(false)}
        onSuccess={handleFaceSuccess}
        mode={activeMode}
        hasCheckedIn={hasCheckedIn}
        hasCheckedOut={hasCheckedOut}
        checkInTime={todayRecord?.checkInTime}
        checkOutTime={todayRecord?.checkOutTime}
      />
    </AuthGuard>
  );
}
