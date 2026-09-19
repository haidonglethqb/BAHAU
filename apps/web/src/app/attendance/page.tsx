"use client";

import { useEffect, useState } from "react";
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

const DEMO_PERIOD: PeriodInfo = {
  id: "p-2026-09",
  month: 9,
  year: 2026,
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  standardWorkingDays: 22,
  isLocked: false,
  note: "Kỳ công tháng 9/2026 đang mở tiếp nhận quẹt thẻ và giải trình",
};

const DEMO_SUMMARY: MonthlySummary = {
  id: "s-2026-09",
  standardDays: 22,
  actualWorkingDays: 19.5,
  paidLeaveDays: 1.0,
  unpaidLeaveDays: 0,
  businessTripDays: 1.5,
  lateCount: 1,
  earlyLeaveCount: 0,
  totalPayableDays: 22.0,
  isFinalized: false,
};

const DEMO_RECORDS: AttendanceRecord[] = [
  {
    id: "r1",
    workDate: "2026-09-01",
    checkInTime: "2026-09-01T07:55:00Z",
    checkOutTime: "2026-09-01T17:05:00Z",
    rawWorkingHours: 8.0,
    status: "PRESENT",
    deviceSource: "BIOMETRIC_GATE_A",
  },
  {
    id: "r2",
    workDate: "2026-09-02",
    checkInTime: null,
    checkOutTime: null,
    rawWorkingHours: 0,
    status: "HOLIDAY",
    deviceSource: "CALENDAR",
  },
  {
    id: "r3",
    workDate: "2026-09-03",
    checkInTime: "2026-09-03T07:50:00Z",
    checkOutTime: "2026-09-03T17:15:00Z",
    rawWorkingHours: 8.0,
    status: "PRESENT",
    deviceSource: "BIOMETRIC_GATE_A",
  },
  {
    id: "r4",
    workDate: "2026-09-04",
    checkInTime: "2026-09-04T08:25:00Z",
    checkOutTime: "2026-09-04T17:00:00Z",
    rawWorkingHours: 7.58,
    status: "LATE",
    deviceSource: "BIOMETRIC_GATE_B",
    adjustmentRequestId: "adj-1",
  },
  {
    id: "r5",
    workDate: "2026-09-07",
    checkInTime: null,
    checkOutTime: null,
    rawWorkingHours: 0,
    status: "ON_LEAVE",
    deviceSource: "WORKFLOW_LEAVE",
  },
  {
    id: "r6",
    workDate: "2026-09-08",
    checkInTime: "2026-09-08T08:00:00Z",
    checkOutTime: "2026-09-08T17:00:00Z",
    rawWorkingHours: 8.0,
    status: "PRESENT",
    deviceSource: "BIOMETRIC_GATE_A",
  },
];

const DEMO_ADJUSTMENTS: AdjustmentRequest[] = [
  {
    id: "adj-1",
    workDate: "2026-09-04",
    originalCheckIn: "2026-09-04T08:25:00Z",
    originalCheckOut: "2026-09-04T17:00:00Z",
    adjustedCheckIn: "2026-09-04T07:55:00Z",
    adjustedCheckOut: "2026-09-04T17:00:00Z",
    reason: "Máy quét Cổng B gặp sự cố khởi động lại lúc 8h sáng, thực tế đã có mặt tại giảng đường lúc 7h55.",
    status: "PENDING",
    createdAt: "2026-09-04T09:00:00Z",
  },
];

export default function AttendancePersonalPage() {
  const [month, setMonth] = useState(9);
  const [year, setYear] = useState(2026);
  const [period, setPeriod] = useState<PeriodInfo>(DEMO_PERIOD);
  const [summary, setSummary] = useState<MonthlySummary>(DEMO_SUMMARY);
  const [records, setRecords] = useState<AttendanceRecord[]>(DEMO_RECORDS);
  const [adjustments, setAdjustments] = useState<AdjustmentRequest[]>(DEMO_ADJUSTMENTS);
  const [isLoading, setIsLoading] = useState(false);

  // Modal nộp đơn giải trình
  const [showModal, setShowModal] = useState(false);
  const [formWorkDate, setFormWorkDate] = useState("2026-09-04");
  const [formCheckIn, setFormCheckIn] = useState("07:55");
  const [formCheckOut, setFormCheckOut] = useState("17:00");
  const [formReason, setFormReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAttendance() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/attendance/me?month=${month}&year=${year}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            if (json.data.period) setPeriod(json.data.period);
            if (json.data.summary) setSummary(json.data.summary);
            if (json.data.records?.length > 0) setRecords(json.data.records);
            if (json.data.adjustments) setAdjustments(json.data.adjustments);
          }
        }
      } catch (e) {
        console.warn("Using demo attendance data fallback");
      } finally {
        setIsLoading(false);
      }
    }
    fetchAttendance();
  }, [month, year]);

  const handleOpenAdjustment = (workDate?: string) => {
    if (period.isLocked) {
      alert("Kỳ công tháng này đã bị khóa bởi Phòng TCHC, không thể tạo thêm đơn giải trình.");
      return;
    }
    if (workDate) setFormWorkDate(workDate);
    setFormReason("");
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!formReason || formReason.length < 5) {
      setFormError("Vui lòng nhập lý do giải trình chi tiết (tối thiểu 5 ký tự)");
      return;
    }

    try {
      const payload = {
        workDate: formWorkDate,
        adjustedCheckIn: `${formWorkDate}T${formCheckIn}:00Z`,
        adjustedCheckOut: `${formWorkDate}T${formCheckOut}:00Z`,
        reason: formReason,
      };

      const res = await fetch("/api/v1/attendance/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        setFormSuccess("Đã gửi đơn giải trình thành công! Đang chuyển tiếp cho Trưởng đơn vị phê duyệt.");
        setAdjustments([json.data, ...adjustments]);
        setTimeout(() => setShowModal(false), 1500);
      } else {
        const errJson = await res.json();
        setFormError(errJson.error?.message || "Có lỗi xảy ra khi nộp đơn giải trình");
      }
    } catch (err: any) {
      // Offline fallback simulation
      const newAdj: AdjustmentRequest = {
        id: `mock-adj-${Date.now()}`,
        workDate: formWorkDate,
        adjustedCheckIn: `${formWorkDate}T${formCheckIn}:00Z`,
        adjustedCheckOut: `${formWorkDate}T${formCheckOut}:00Z`,
        reason: formReason,
        status: "PENDING",
        createdAt: new Date().toISOString(),
      };
      setAdjustments([newAdj, ...adjustments]);
      setFormSuccess("Đã gửi đơn giải trình thành công (Lưu trữ cục bộ).");
      setTimeout(() => setShowModal(false), 1200);
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

      {/* Lock Status Alert */}
      {period.isLocked ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">🔒</span>
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
            <span className="text-xl">🟢</span>
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
          <span className="mt-1 block text-[11px] font-semibold text-blue-700">
            {summary.isFinalized ? "Đã chốt lương ✓" : "Tạm tính"}
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
                const dateObj = new Date(r.workDate);
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
                      {r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-slate-800">
                      {r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"}
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
                      {a.originalCheckIn ? new Date(a.originalCheckIn).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"}
                      {" - "}
                      {a.originalCheckOut ? new Date(a.originalCheckOut).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-blue-900 font-mono">
                      {a.adjustedCheckIn ? new Date(a.adjustedCheckIn).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"}
                      {" - "}
                      {a.adjustedCheckOut ? new Date(a.adjustedCheckOut).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"}
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
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                          Đã chấp thuận ✓
                        </span>
                      )}
                      {a.status === "REJECTED" && (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                          Từ chối ✕
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                      {new Date(a.createdAt).toLocaleDateString("vi-VN")}
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
                ✕
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

              <div className="rounded-lg bg-blue-50 p-3 text-slate-600 leading-relaxed text-[11px]">
                💡 Đơn sau khi nộp sẽ được chuyển đến <strong>Trưởng đơn vị</strong> xác nhận, tiếp đó chuyển <strong>Phòng TCHC</strong> thẩm định cập nhật vào Bảng công tổng hợp.
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
                  className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800 transition"
                >
                  Gửi Phê Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
