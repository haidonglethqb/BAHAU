"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../../components/AuthGuard";

interface MonthlySummaryItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  unitName: string;
  periodId: string;
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
  standardWorkingDays: number;
  isLocked: boolean;
  lockedAt?: string | null;
  note?: string | null;
}

const DEMO_SUMMARIES: MonthlySummaryItem[] = [
  {
    id: "s1",
    employeeId: "e1",
    employeeCode: "DAU180001",
    fullName: "TS. Phạm Văn Dũng",
    unitName: "Ban Giám hiệu",
    periodId: "p1",
    standardDays: 22,
    actualWorkingDays: 22,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    businessTripDays: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    totalPayableDays: 22,
    isFinalized: false,
  },
  {
    id: "s2",
    employeeId: "e2",
    employeeCode: "DAU210001",
    fullName: "ThS. Hoàng Thị Lan",
    unitName: "Phòng Tổ chức - Hành chính",
    periodId: "p1",
    standardDays: 22,
    actualWorkingDays: 21,
    paidLeaveDays: 1,
    unpaidLeaveDays: 0,
    businessTripDays: 0,
    lateCount: 0,
    earlyLeaveCount: 0,
    totalPayableDays: 22,
    isFinalized: false,
  },
  {
    id: "s3",
    employeeId: "e3",
    employeeCode: "DAU190002",
    fullName: "PGS.TS. Trần Quốc Hùng",
    unitName: "Khoa Kiến trúc",
    periodId: "p1",
    standardDays: 22,
    actualWorkingDays: 20,
    paidLeaveDays: 0,
    unpaidLeaveDays: 0,
    businessTripDays: 2,
    lateCount: 0,
    earlyLeaveCount: 0,
    totalPayableDays: 22,
    isFinalized: false,
  },
  {
    id: "s4",
    employeeId: "e4",
    employeeCode: "DAU240001",
    fullName: "ThS. Đỗ Tuấn Kiệt",
    unitName: "Khoa Kiến trúc",
    periodId: "p1",
    standardDays: 22,
    actualWorkingDays: 19.5,
    paidLeaveDays: 1.5,
    unpaidLeaveDays: 0,
    businessTripDays: 0,
    lateCount: 1,
    earlyLeaveCount: 0,
    totalPayableDays: 21.0,
    isFinalized: false,
  },
];

export default function AttendanceManagePage() {
  const [month, setMonth] = useState(9);
  const [year, setYear] = useState(2026);
  const [items, setItems] = useState<MonthlySummaryItem[]>(DEMO_SUMMARIES);
  const [period, setPeriod] = useState<PeriodInfo>({
    id: "p-2026-09",
    month: 9,
    year: 2026,
    standardWorkingDays: 22,
    isLocked: false,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const [showLockModal, setShowLockModal] = useState(false);
  const [lockNote, setLockNote] = useState("Đã hoàn tất đối soát số liệu công tháng. Chuyển phòng Kế hoạch - Tài chính lập phiếu lương.");

  useEffect(() => {
    async function fetchManageAttendance() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/v1/attendance/unit?month=${month}&year=${year}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data) {
            if (json.data.period) setPeriod(json.data.period);
            if (json.data.items?.length > 0) setItems(json.data.items);
          }
        }
      } catch (e) {
        console.warn("Using demo manage data fallback");
      } finally {
        setIsLoading(false);
      }
    }
    fetchManageAttendance();
  }, [month, year]);

  const handleToggleLock = async () => {
    try {
      const nextLockedState = !period.isLocked;
      const res = await fetch("/api/v1/attendance/lock-period", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          isLocked: nextLockedState,
          note: lockNote,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setPeriod(json.data);
        setItems(items.map((it) => ({ ...it, isFinalized: nextLockedState })));
        setShowLockModal(false);
      } else {
        // Fallback simulation
        setPeriod({ ...period, isLocked: nextLockedState, note: lockNote });
        setItems(items.map((it) => ({ ...it, isFinalized: nextLockedState })));
        setShowLockModal(false);
      }
    } catch (e) {
      setPeriod({ ...period, isLocked: !period.isLocked, note: lockNote });
      setShowLockModal(false);
    }
  };

  const handleFillSampleImport = () => {
    const sample = [
      { employeeCode: "DAU240001", workDate: `${year}-${String(month).padStart(2, "0")}-09`, checkInTime: `${year}-${String(month).padStart(2, "0")}-09T07:50:00Z`, checkOutTime: `${year}-${String(month).padStart(2, "0")}-09T17:10:00Z`, deviceSource: "GATE_A" },
      { employeeCode: "DAU240001", workDate: `${year}-${String(month).padStart(2, "0")}-10`, checkInTime: `${year}-${String(month).padStart(2, "0")}-10T08:00:00Z`, checkOutTime: `${year}-${String(month).padStart(2, "0")}-10T17:05:00Z`, deviceSource: "GATE_A" },
      { employeeCode: "DAU190002", workDate: `${year}-${String(month).padStart(2, "0")}-09`, checkInTime: `${year}-${String(month).padStart(2, "0")}-09T07:55:00Z`, checkOutTime: `${year}-${String(month).padStart(2, "0")}-09T17:00:00Z`, deviceSource: "GATE_B" },
    ];
    setImportJson(JSON.stringify(sample, null, 2));
  };

  const handleImportSubmit = async () => {
    setImportStatus(null);
    try {
      const parsedRecords = JSON.parse(importJson);
      const res = await fetch("/api/v1/attendance/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          year,
          records: parsedRecords,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        setImportStatus(`✔ Import thành công ${json.data.importedCount} bản ghi quẹt thẻ!`);
        setTimeout(() => setShowImportModal(false), 1500);
      } else {
        const errJson = await res.json();
        setImportStatus(`❌ Lỗi: ${errJson.error?.message || "Không thể import dữ liệu"}`);
      }
    } catch (e: any) {
      setImportStatus(`❌ Lỗi cú pháp JSON hoặc kết nối: ${e.message}`);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchSearch =
      item.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchUnit = selectedUnit === "ALL" || item.unitName === selectedUnit;
    return matchSearch && matchUnit;
  });

  const totalStaff = filteredItems.length;
  const totalPayable = filteredItems.reduce((acc, it) => acc + it.totalPayableDays, 0);
  const totalLate = filteredItems.reduce((acc, it) => acc + it.lateCount, 0);

  return (
    <AuthGuard moduleName="Quản lý & Khóa Kỳ Chấm Công">
      <div className="space-y-8">
      {/* Navigation and Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <a href="/attendance" className="text-sm font-semibold text-blue-900 hover:underline">
              ← Bảng công cá nhân
            </a>
            <span className="text-slate-300">/</span>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Quản Trị Bảng Công Toàn Trường
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Dành cho Trưởng đơn vị & Phòng Tổ chức - Hành chính: Đối soát Lớp 1, 2, 3 và chốt sổ bất biến.
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
            onClick={() => {
              setImportStatus(null);
              setShowImportModal(true);
            }}
            disabled={period.isLocked}
            className={`rounded-lg px-3.5 py-2 text-sm font-semibold shadow transition ${
              period.isLocked
                ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                : "bg-white border border-slate-300 text-slate-800 hover:bg-slate-50"
            }`}
          >
            📥 Import Quẹt Thẻ (Lớp 1)
          </button>

          <button
            onClick={() => setShowLockModal(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold shadow transition ${
              period.isLocked
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-rose-700 text-white hover:bg-rose-800"
            }`}
          >
            {period.isLocked ? "🔓 Mở Khóa Kỳ Công" : "🔒 Chốt & Khóa Kỳ Công (Lớp 3)"}
          </button>
        </div>
      </div>

      {/* Lock Notice */}
      {period.isLocked && (
        <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="text-sm font-bold">KỲ CÔNG THÁNG {month}/{year} ĐANG Ở TRẠNG THÁI KHÓA SỔ (IMMUTABLE)</p>
              <p className="text-xs text-rose-700 mt-0.5">
                {period.note || "Toàn bộ số liệu công đã được đóng băng. Mọi thao tác ghi nhận hoặc nộp giải trình mới bị từ chối."}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold rounded bg-rose-200/80 px-3 py-1 text-rose-950">
            LOCKED
          </span>
        </div>
      )}

      {/* Aggregate KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Tổng số CBGV theo dõi</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-900">{totalStaff}</span>
            <span className="text-xs text-slate-500">nhân sự</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Tổng ngày công tính lương</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-blue-900">{totalPayable.toFixed(1)}</span>
            <span className="text-xs text-slate-500">ngày công</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Tổng số lượt đi muộn</span>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-amber-600">{totalLate}</span>
            <span className="text-xs text-slate-500">lượt vi phạm</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center gap-3">
          <input
            type="text"
            placeholder="Tìm theo Mã CBGV hoặc Họ tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          />
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
          >
            <option value="ALL">-- Tất cả đơn vị --</option>
            <option value="Ban Giám hiệu">Ban Giám hiệu</option>
            <option value="Phòng Tổ chức - Hành chính">Phòng Tổ chức - Hành chính</option>
            <option value="Khoa Kiến trúc">Khoa Kiến trúc</option>
            <option value="Khoa Xây dựng">Khoa Xây dựng</option>
          </select>
        </div>

        <div className="text-xs text-slate-500">
          Hiển thị <strong>{filteredItems.length}</strong> / {items.length} nhân sự
        </div>
      </div>

      {/* Layer 3: Summary Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3.5">Mã CBGV</th>
                <th className="px-6 py-3.5">Họ và tên</th>
                <th className="px-6 py-3.5">Đơn vị công tác</th>
                <th className="px-4 py-3.5 text-center">Định mức</th>
                <th className="px-4 py-3.5 text-center text-emerald-700">Thực làm</th>
                <th className="px-4 py-3.5 text-center text-blue-700">Nghỉ phép</th>
                <th className="px-4 py-3.5 text-center text-purple-700">Công tác</th>
                <th className="px-4 py-3.5 text-center text-amber-700">Đi muộn</th>
                <th className="px-6 py-3.5 text-center text-blue-900 font-bold">Tổng công lương</th>
                <th className="px-6 py-3.5 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-6 py-3.5 font-mono font-semibold text-slate-900">{row.employeeCode}</td>
                  <td className="px-6 py-3.5 font-bold text-slate-900">{row.fullName}</td>
                  <td className="px-6 py-3.5 text-slate-600">{row.unitName}</td>
                  <td className="px-4 py-3.5 text-center">{row.standardDays}</td>
                  <td className="px-4 py-3.5 text-center font-bold text-emerald-600">{row.actualWorkingDays}</td>
                  <td className="px-4 py-3.5 text-center font-medium text-blue-600">{row.paidLeaveDays}</td>
                  <td className="px-4 py-3.5 text-center font-medium text-purple-600">{row.businessTripDays}</td>
                  <td className="px-4 py-3.5 text-center font-semibold text-amber-600">{row.lateCount}</td>
                  <td className="px-6 py-3.5 text-center font-black text-blue-950 text-sm">
                    {row.totalPayableDays}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {period.isLocked || row.isFinalized ? (
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
                        Đã chốt sổ ✓
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-600/20">
                        Tạm tính
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Nạp Dữ Liệu Điểm Danh Quẹt Thẻ Hàng Loạt (Lớp 1)
              </h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Hỗ trợ nạp mảng bản ghi điểm danh thô từ máy quét vân tay / khuôn mặt. Hệ thống sẽ tự động phân loại đúng giờ, đi muộn, về sớm và đối soát nghỉ phép.
            </p>

            {importStatus && (
              <div className={`p-3 rounded-lg text-xs font-medium ${
                importStatus.startsWith("✔") ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"
              }`}>
                {importStatus}
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-slate-700">Dữ liệu đầu vào (JSON array):</span>
              <button
                type="button"
                onClick={handleFillSampleImport}
                className="text-xs text-blue-900 font-bold hover:underline"
              >
                + Điền dữ liệu mẫu demo
              </button>
            </div>

            <textarea
              rows={8}
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
              placeholder='[ { "employeeCode": "DAU240001", "workDate": "2026-09-09", "checkInTime": "2026-09-09T07:55:00Z", "checkOutTime": "2026-09-09T17:05:00Z" } ]'
              className="w-full rounded-lg border border-slate-300 p-3 font-mono text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 text-xs">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className="rounded-lg bg-blue-900 px-4 py-2 font-semibold text-white hover:bg-blue-800 transition"
              >
                Tiến Hành Nạp Dữ Liệu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock Confirmation Modal */}
      {showLockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {period.isLocked ? "Xác nhận Mở Khóa Kỳ Công" : "Xác nhận Khóa & Chốt Kỳ Công (Lớp 3)"}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed">
              {period.isLocked
                ? "Mở khóa kỳ công sẽ cho phép CBGV tiếp tục nộp giải trình và nạp thêm dữ liệu quẹt thẻ mới."
                : "Khi kỳ công được KHÓA SỔ, toàn bộ dữ liệu bảng công Tháng " + month + "/" + year + " sẽ trở thành BẤT BIẾN (immutable). Mọi đơn giải trình và import dữ liệu mới trong kỳ này sẽ bị chặn hoàn toàn."}
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ghi chú khóa sổ / chốt công:</label>
              <textarea
                rows={3}
                value={lockNote}
                onChange={(e) => setLockNote(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2 text-xs">
              <button
                type="button"
                onClick={() => setShowLockModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleToggleLock}
                className={`rounded-lg px-4 py-2 font-semibold text-white transition ${
                  period.isLocked ? "bg-amber-600 hover:bg-amber-700" : "bg-rose-700 hover:bg-rose-800"
                }`}
              >
                {period.isLocked ? "Thực Hiện Mở Khóa" : "Xác Nhận Khóa Bất Biến"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
