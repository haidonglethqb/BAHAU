"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AuthGuard } from "../../../components/AuthGuard";

interface EmployeeDetail {
  id: string;
  employeeCode: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  workEmail: string;
  phoneNumber?: string | null;
  academicTitle: string;
  academicDegree: string;
  employmentStatus: string;
  hireDate: string;
  primaryUnitName?: string | null;
  primaryPositionName?: string | null;
  citizenId?: string | null;
  taxCode?: string | null;
  bankAccountNumber?: string | null;
  bankName?: string | null;
}

interface ContractItem {
  id: string;
  contractNumber: string;
  contractType: string;
  signedDate: string;
  effectiveDate: string;
  expiryDate?: string | null;
  salaryCoefficient: number;
  status: string;
  daysRemaining?: number | null;
  alertLevel?: string;
  parentContractId?: string | null;
}

interface EmploymentEventItem {
  id: string;
  employeeId: string;
  eventType: "HIRED" | "APPOINTED" | "TRANSFERRED" | "CONCURRENT_ASSIGNED" | "PROMOTED" | "RESIGNED" | "RETIRED";
  decisionNumber?: string | null;
  decisionDate?: string | null;
  effectiveDate: string;
  fromUnitName?: string | null;
  toUnitName?: string | null;
  fromPositionName?: string | null;
  toPositionName?: string | null;
  note?: string | null;
  createdAt: string;
}

// Fallback demo data
const DEMO_EMPLOYEE: EmployeeDetail = {
  id: "e1",
  employeeCode: "DAU210001",
  fullName: "PGS.TS. Trần Thị Bình",
  gender: "FEMALE",
  workEmail: "tk.binh@dau.edu.vn",
  phoneNumber: "0905222333",
  academicTitle: "ASSOCIATE_PROFESSOR",
  academicDegree: "DOCTOR",
  employmentStatus: "ACTIVE",
  hireDate: "2017-09-01",
  primaryUnitName: "Khoa Kiến trúc",
  primaryPositionName: "Trưởng khoa",
  citizenId: "048185009999",
  taxCode: "8001234567",
  bankAccountNumber: "10188899999",
  bankName: "Vietcombank Đà Nẵng",
};

const DEMO_EVENTS: EmploymentEventItem[] = [
  {
    id: "ev-1",
    employeeId: "e1",
    eventType: "APPOINTED",
    decisionNumber: "QD-BGH/2021-012",
    decisionDate: "2021-01-10",
    effectiveDate: "2021-01-15",
    fromUnitName: "Bộ môn Kiến trúc công trình",
    toUnitName: "Khoa Kiến trúc",
    fromPositionName: "Giảng viên",
    toPositionName: "Trưởng khoa",
    note: "Bổ nhiệm giữ chức vụ Trưởng Khoa Kiến trúc nhiệm kỳ 2021 - 2026",
    createdAt: "2021-01-15T00:00:00Z",
  },
  {
    id: "ev-2",
    employeeId: "e1",
    eventType: "TRANSFERRED",
    decisionNumber: "QD-DC/2019-045",
    decisionDate: "2018-12-20",
    effectiveDate: "2019-01-01",
    fromUnitName: "Khoa Xây dựng",
    toUnitName: "Bộ môn Kiến trúc công trình",
    fromPositionName: "Giảng viên",
    toPositionName: "Giảng viên",
    note: "Điều chuyển công tác từ Khoa Xây dựng về Bộ môn Kiến trúc công trình",
    createdAt: "2019-01-01T00:00:00Z",
  },
  {
    id: "ev-3",
    employeeId: "e1",
    eventType: "HIRED",
    decisionNumber: "QD-TD/2017-065",
    decisionDate: "2017-08-15",
    effectiveDate: "2017-09-01",
    toUnitName: "Khoa Xây dựng",
    toPositionName: "Giảng viên",
    note: "Tuyển dụng mới vị trí Giảng viên cơ hữu Trường Đại học Kiến trúc Đà Nẵng",
    createdAt: "2017-09-01T00:00:00Z",
  },
];

const DEMO_CONTRACTS: ContractItem[] = [
  {
    id: "c-1",
    contractNumber: "HDLD-2021/003-DAU",
    contractType: "INDEFINITE_TERM",
    signedDate: "2021-01-15",
    effectiveDate: "2021-01-15",
    expiryDate: null,
    salaryCoefficient: 4.74,
    status: "ACTIVE",
    daysRemaining: null,
    alertLevel: "INDEFINITE",
  },
];

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;

  const [employee, setEmployee] = useState<EmployeeDetail>(DEMO_EMPLOYEE);
  const [events, setEvents] = useState<EmploymentEventItem[]>(DEMO_EVENTS);
  const [contracts, setContracts] = useState<ContractItem[]>(DEMO_CONTRACTS);
  const [activeTab, setActiveTab] = useState<"overview" | "contracts" | "timeline">("timeline");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"api" | "demo">("demo");

  // Add Event Modal
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    eventType: "APPOINTED",
    decisionNumber: "",
    decisionDate: new Date().toISOString().split("T")[0],
    effectiveDate: new Date().toISOString().split("T")[0],
    toUnitId: "",
    toPositionId: "",
    note: "",
    syncAssignment: true,
  });

  const [units, setUnits] = useState<Array<{ id: string; name: string }>>([
    { id: "u1", name: "Ban Giám hiệu" },
    { id: "u2", name: "Khoa Kiến trúc" },
    { id: "u3", name: "Bộ môn Kiến trúc công trình" },
    { id: "u4", name: "Phòng Tổ chức - Hành chính" },
    { id: "u5", name: "Khoa Xây dựng" },
  ]);

  const [positions, setPositions] = useState<Array<{ id: string; name: string }>>([
    { id: "p1", name: "Hiệu trưởng" },
    { id: "p2", name: "Trưởng khoa" },
    { id: "p3", name: "Phó Trưởng khoa" },
    { id: "p4", name: "Trưởng phòng" },
    { id: "p5", name: "Phó Trưởng phòng" },
    { id: "p6", name: "Trưởng bộ môn" },
    { id: "p7", name: "Giảng viên" },
    { id: "p8", name: "Chuyên viên" },
  ]);

  const [formMsg, setFormMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchEmployeeData();
  }, [employeeId]);

  async function fetchEmployeeData() {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

      const [resEmp, resEvents, resContracts, resUnits] = await Promise.all([
        fetch(`${apiUrl}/api/v1/employees/${employeeId}`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/employees/${employeeId}/events`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/contracts?employeeId=${employeeId}`, { credentials: "include" }),
        fetch(`${apiUrl}/api/v1/units/tree`, { credentials: "include" }),
      ]);

      if (resEmp.ok) {
        const dataEmp = await resEmp.json();
        if (dataEmp.success && dataEmp.data) {
          setEmployee(dataEmp.data);
          setDataSource("api");
        }
      }

      if (resEvents.ok) {
        const dataEvents = await resEvents.json();
        if (dataEvents.success && Array.isArray(dataEvents.data)) {
          setEvents(dataEvents.data);
        }
      }

      if (resContracts.ok) {
        const dataContracts = await resContracts.json();
        if (dataContracts.success && Array.isArray(dataContracts.data)) {
          setContracts(dataContracts.data);
        }
      }

      if (resUnits.ok) {
        const dataUnits = await resUnits.json();
        if (dataUnits.success && Array.isArray(dataUnits.data)) {
          setUnits(dataUnits.data);
        }
      }
    } catch {
      setDataSource("demo");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddEventSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setLoading(true);
      setFormMsg(null);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

      const res = await fetch(`${apiUrl}/api/v1/employees/${employeeId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          employeeId,
          eventType: eventForm.eventType,
          decisionNumber: eventForm.decisionNumber || null,
          decisionDate: eventForm.decisionDate || null,
          effectiveDate: eventForm.effectiveDate,
          toUnitId: eventForm.toUnitId || null,
          toPositionId: eventForm.toPositionId || null,
          note: eventForm.note || null,
          syncAssignment: eventForm.syncAssignment,
        }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        setFormMsg({
          type: "success",
          text: "Ghi nhận biến động công tác thành công!",
        });
        setTimeout(() => {
          setShowAddEventModal(false);
          fetchEmployeeData();
        }, 1200);
      } else {
        setFormMsg({
          type: "error",
          text: json.error?.message || "Lỗi khi ghi nhận sự kiện công tác.",
        });
      }
    } catch {
      setFormMsg({
        type: "error",
        text: "Lỗi kết nối máy chủ.",
      });
    } finally {
      setLoading(false);
    }
  }

  function getEventBadge(type: string) {
    switch (type) {
      case "HIRED":
        return <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-bold text-blue-800">Tuyển dụng mới</span>;
      case "APPOINTED":
        return <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-bold text-purple-800">Bổ nhiệm chức vụ</span>;
      case "TRANSFERRED":
        return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">Điều chuyển công tác</span>;
      case "CONCURRENT_ASSIGNED":
        return <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-[11px] font-bold text-cyan-800">Phân công kiêm nhiệm</span>;
      case "PROMOTED":
        return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">Thăng tiến / Nâng ngạch</span>;
      case "RESIGNED":
        return <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">Thôi việc</span>;
      case "RETIRED":
        return <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-[11px] font-bold text-slate-800">Nghỉ hưu</span>;
      default:
        return <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-700">{type}</span>;
    }
  }

  return (
    <AuthGuard moduleName="Hồ sơ Chi tiết Cán bộ Giảng viên">
      <div className="space-y-6">
      {/* Back link & Data source */}
      <div className="flex items-center justify-between">
        <Link
          href="/employees"
          className="inline-flex items-center text-xs font-semibold text-blue-900 hover:underline space-x-1"
        >
          <span>← Quay lại Danh sách Cán bộ Giảng viên</span>
        </Link>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            dataSource === "api"
              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
              : "bg-amber-100 text-amber-800 border border-amber-200"
          }`}
        >
          {dataSource === "api" ? "Đồng bộ Trực tuyến" : "Chế độ Dữ liệu Mẫu"}
        </span>
      </div>

      {/* Header Profile Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-900 font-bold text-2xl text-amber-400 shadow-md">
              {employee.fullName.split(" ").pop()?.charAt(0) || "CB"}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-slate-900">{employee.fullName}</h1>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-blue-900">
                  {employee.employeeCode}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1">
                {employee.primaryPositionName || "Cán bộ giảng viên"} —{" "}
                <strong className="text-slate-800">{employee.primaryUnitName || "Trường ĐH Kiến trúc Đà Nẵng"}</strong>
              </p>
              <div className="flex items-center space-x-2 mt-2 text-[11px] text-slate-500">
                <span>Học vị: <strong>{employee.academicDegree}</strong></span>
                {employee.academicTitle !== "NONE" && (
                  <span>• Học hàm: <strong>{employee.academicTitle}</strong></span>
                )}
                <span>• Tuyển dụng: <strong>{employee.hireDate}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setEventForm({
                  eventType: "APPOINTED",
                  decisionNumber: `QD-BGH/${new Date().getFullYear()}-${Math.floor(10 + Math.random() * 90)}`,
                  decisionDate: new Date().toISOString().split("T")[0],
                  effectiveDate: new Date().toISOString().split("T")[0],
                  toUnitId: units[1]?.id || "",
                  toPositionId: positions[1]?.id || "",
                  note: "",
                  syncAssignment: true,
                });
                setFormMsg(null);
                setShowAddEventModal(true);
              }}
              className="rounded-lg bg-blue-900 px-3.5 py-2 text-xs font-semibold text-white shadow hover:bg-blue-800 transition"
            >
              + Thêm Biến Động Công Tác
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mt-6 -mb-6 space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("timeline")}
            className={`pb-3 transition border-b-2 ${
              activeTab === "timeline"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Dòng Thời Gian Diễn Biến Công Tác ({events.length})
          </button>
          <button
            onClick={() => setActiveTab("contracts")}
            className={`pb-3 transition border-b-2 ${
              activeTab === "contracts"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Hợp Đồng Lao Động ({contracts.length})
          </button>
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 transition border-b-2 ${
              activeTab === "overview"
                ? "border-blue-900 text-blue-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Thông Tin Cá Nhân & Liên Hệ
          </button>
        </div>
      </div>

      {/* TAB 1: TIMELINE DIỄN BIẾN CÔNG TÁC */}
      {activeTab === "timeline" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Lịch Sử Biến Động Công Tác (Vertical Timeline)</h2>
              <p className="text-xs text-slate-500">
                Ghi nhận các quyết định tuyển dụng, bổ nhiệm, điều chuyển và thăng tiến gắn với số quyết định ban hành
              </p>
            </div>
          </div>

          <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {events.map((ev, index) => (
              <div key={ev.id} className="relative group">
                {/* Node icon dot */}
                <div className="absolute -left-6 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-900 text-white shadow ring-4 ring-white">
                  <span className="text-[10px] font-bold">{events.length - index}</span>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-slate-50 hover:shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      {getEventBadge(ev.eventType)}
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {ev.decisionNumber ? `Số QĐ: ${ev.decisionNumber}` : "Không có số QĐ"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
                      <span>Hiệu lực từ: <strong className="text-slate-800">{ev.effectiveDate}</strong></span>
                      {ev.decisionDate && <span>(Ký: {ev.decisionDate})</span>}
                    </div>
                  </div>

                  {/* Transition Info */}
                  {(ev.fromUnitName || ev.toUnitName) && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                      {ev.fromUnitName && (
                        <div className="text-slate-600">
                          Từ: <strong>{ev.fromUnitName}</strong> ({ev.fromPositionName || "—"})
                        </div>
                      )}
                      {ev.fromUnitName && ev.toUnitName && <span className="text-blue-900 font-bold">➔</span>}
                      {ev.toUnitName && (
                        <div className="text-blue-950 font-medium">
                          Đến: <strong>{ev.toUnitName}</strong> ({ev.toPositionName || "—"})
                        </div>
                      )}
                    </div>
                  )}

                  {ev.note && (
                    <p className="mt-2 text-xs text-slate-600 italic">
                      &ldquo;{ev.note}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: HỢP ĐỒNG LAO ĐỘNG */}
      {activeTab === "contracts" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Danh Sách Hợp Đồng Lao Động</h2>
              <p className="text-xs text-slate-500">Toàn bộ hợp đồng và phụ lục gia hạn của nhân sự</p>
            </div>
            <Link
              href="/contracts"
              className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-slate-200"
            >
              Đi đến Quản trị Hợp đồng ➔
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 uppercase">
                <tr>
                  <th className="px-4 py-3">Số Hợp Đồng</th>
                  <th className="px-4 py-3">Loại Hợp Đồng</th>
                  <th className="px-4 py-3">Ngày Ký</th>
                  <th className="px-4 py-3">Thời Hạn</th>
                  <th className="px-4 py-3 text-center">Hệ Số Lương</th>
                  <th className="px-4 py-3">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {contracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-blue-900">{c.contractNumber}</td>
                    <td className="px-4 py-3">{c.contractType}</td>
                    <td className="px-4 py-3 text-slate-600">{c.signedDate}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.effectiveDate} → {c.expiryDate || "Không thời hạn"}
                    </td>
                    <td className="px-4 py-3 text-center font-bold">{c.salaryCoefficient.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: THÔNG TIN CÁ NHÂN */}
      {activeTab === "overview" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-200 pb-3">
            Hồ Sơ Chi Tiết Cán Bộ Giảng Viên
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-50 p-3.5 rounded-xl">
              <span className="text-slate-500">Email làm việc:</span>
              <p className="font-mono font-bold text-slate-900 mt-1">{employee.workEmail}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl">
              <span className="text-slate-500">Số điện thoại:</span>
              <p className="font-bold text-slate-900 mt-1">{employee.phoneNumber || "Chưa cập nhật"}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl">
              <span className="text-slate-500">Giới tính:</span>
              <p className="font-bold text-slate-900 mt-1">{employee.gender}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl">
              <span className="text-slate-500">Số CCCD / CMND:</span>
              <p className="font-mono font-bold text-slate-900 mt-1">{employee.citizenId || "—"}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl">
              <span className="text-slate-500">Mã số thuế thu nhập cá nhân:</span>
              <p className="font-mono font-bold text-slate-900 mt-1">{employee.taxCode || "—"}</p>
            </div>
            <div className="bg-slate-50 p-3.5 rounded-xl">
              <span className="text-slate-500">Tài khoản ngân hàng:</span>
              <p className="font-bold text-slate-900 mt-1">
                {employee.bankAccountNumber ? `${employee.bankAccountNumber} (${employee.bankName})` : "—"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Ghi Nhận Biến Động Công Tác */}
      {showAddEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Thêm Biến Động Công Tác</h3>
                <p className="text-xs text-slate-500">
                  Ghi nhận sự kiện cho {employee.fullName} ({employee.employeeCode})
                </p>
              </div>
              <button onClick={() => setShowAddEventModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {formMsg && (
              <div
                className={`rounded-lg p-3 text-xs font-medium ${
                  formMsg.type === "success"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    : "bg-red-100 text-red-800 border border-red-300"
                }`}
              >
                {formMsg.text}
              </div>
            )}

            <form onSubmit={handleAddEventSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700">Loại Biến Động Công Tác *</label>
                <select
                  value={eventForm.eventType}
                  onChange={(e) => setEventForm({ ...eventForm, eventType: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-900 focus:outline-none"
                >
                  <option value="APPOINTED">Bổ nhiệm chức vụ quản lý (Trưởng/Phó Khoa, Bộ môn)</option>
                  <option value="TRANSFERRED">Điều chuyển công tác sang đơn vị khác</option>
                  <option value="CONCURRENT_ASSIGNED">Phân công kiêm nhiệm</option>
                  <option value="PROMOTED">Thăng hạng chức danh / Nâng ngạch</option>
                  <option value="RESIGNED">Thôi việc</option>
                  <option value="RETIRED">Nghỉ hưu</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700">Số Quyết Định Ban Hành</label>
                <input
                  type="text"
                  placeholder="Ví dụ: QD-BGH/2026-088"
                  value={eventForm.decisionNumber}
                  onChange={(e) => setEventForm({ ...eventForm, decisionNumber: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700">Ngày Ký Quyết Định</label>
                  <input
                    type="date"
                    value={eventForm.decisionDate}
                    onChange={(e) => setEventForm({ ...eventForm, decisionDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700">Ngày Có Hiệu Lực *</label>
                  <input
                    type="date"
                    required
                    value={eventForm.effectiveDate}
                    onChange={(e) => setEventForm({ ...eventForm, effectiveDate: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-900 focus:outline-none"
                  />
                </div>
              </div>

              {["APPOINTED", "TRANSFERRED", "CONCURRENT_ASSIGNED"].includes(eventForm.eventType) && (
                <div className="grid grid-cols-2 gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                  <div>
                    <label className="block font-semibold text-slate-700">Đơn Vị Mới</label>
                    <select
                      value={eventForm.toUnitId}
                      onChange={(e) => setEventForm({ ...eventForm, toUnitId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-900 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn đơn vị mới --</option>
                      {units.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700">Vị Trí / Chức Vụ Mới</label>
                    <select
                      value={eventForm.toPositionId}
                      onChange={(e) => setEventForm({ ...eventForm, toPositionId: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-900 focus:outline-none bg-white"
                    >
                      <option value="">-- Chọn chức vụ mới --</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700">Ghi Chú Chi Tiết</label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú nội dung quyết định..."
                  value={eventForm.note}
                  onChange={(e) => setEventForm({ ...eventForm, note: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 p-2.5 focus:border-blue-900 focus:outline-none"
                />
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="syncAssignment"
                  checked={eventForm.syncAssignment}
                  onChange={(e) => setEventForm({ ...eventForm, syncAssignment: e.target.checked })}
                  className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                />
                <label htmlFor="syncAssignment" className="text-xs text-slate-700 font-medium cursor-pointer">
                  Tự động đồng bộ sang Phân công công tác (EmploymentAssignment)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800 shadow disabled:opacity-50"
                >
                  {loading ? "Đang ghi nhận..." : "Ghi Nhận Sự Kiện"}
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
