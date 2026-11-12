"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, X } from "lucide-react";
import { AuthGuard } from "../../../components/AuthGuard";
import { useAuth } from "../../../context/AuthContext";

interface EmployeeAssignmentInfo {
  unitId?: string;
  unitName?: string | null;
  positionId?: string;
  positionName?: string | null;
}

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
  assignments?: EmployeeAssignmentInfo[];
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
  eventType:
    | "HIRED"
    | "APPOINTED"
    | "TRANSFERRED"
    | "CONCURRENT_ASSIGNED"
    | "PROMOTED"
    | "RESIGNED"
    | "RETIRED";
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

interface UnitTreeNode {
  id: string;
  name: string;
  code?: string;
  unitType?: string;
  children?: UnitTreeNode[];
}

interface FlatUnitOption {
  id: string;
  name: string;
  label: string;
}

function getVnDateStr(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function flattenUnitTree(nodes: UnitTreeNode[], depth = 0): FlatUnitOption[] {
  const result: FlatUnitOption[] = [];
  for (const node of nodes) {
    const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";
    result.push({
      id: node.id,
      name: node.name,
      label: `${prefix}${node.name}`,
    });
    if (Array.isArray(node.children) && node.children.length > 0) {
      result.push(...flattenUnitTree(node.children, depth + 1));
    }
  }
  return result;
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

const DEGREE_LABELS: Record<string, string> = {
  BACHELOR: "Cử nhân / Kỹ sư / KTS",
  MASTER: "Thạc sĩ",
  DOCTOR: "Tiến sĩ",
};

const TITLE_LABELS: Record<string, string> = {
  NONE: "Không",
  ASSOCIATE_PROFESSOR: "Phó Giáo sư",
  PROFESSOR: "Giáo sư",
};

export default function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const employeeId = resolvedParams.id;
  const { user } = useAuth();
  const canAddEvent = user?.role === "HR_SPECIALIST" || user?.role === "RECTOR";

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [events, setEvents] = useState<EmploymentEventItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [activeTab, setActiveTab] = useState<"overview" | "contracts" | "timeline">("timeline");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({
    eventType: "APPOINTED",
    decisionNumber: "",
    decisionDate: getVnDateStr(),
    effectiveDate: getVnDateStr(),
    toUnitId: "",
    toPositionId: "",
    note: "",
    syncAssignment: true,
  });

  const [units, setUnits] = useState<FlatUnitOption[]>([]);
  const [positions, setPositions] = useState<Array<{ id: string; name: string }>>([]);
  const [formMsg, setFormMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchEmployeeData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const headers = getAuthHeaders();

      const [resEmp, resEvents, resContracts, resUnits] = await Promise.all([
        fetch(`/api/v1/employees/${employeeId}`, { credentials: "include", headers }),
        fetch(`/api/v1/employees/${employeeId}/events`, { credentials: "include", headers }),
        fetch(`/api/v1/contracts?employeeId=${employeeId}&pageSize=50`, { credentials: "include", headers }),
        fetch(`/api/v1/units/tree`, { credentials: "include", headers }),
      ]);

      const dataEmp = await resEmp.json().catch(() => null);
      if (resEmp.ok && dataEmp?.success && dataEmp.data) {
        setEmployee(dataEmp.data);
        const posMap = new Map<string, string>();
        if (Array.isArray(dataEmp.data.assignments)) {
          for (const a of dataEmp.data.assignments as EmployeeAssignmentInfo[]) {
            if (a.positionId && a.positionName) {
              posMap.set(a.positionId, a.positionName);
            }
          }
        }
        setPositions(Array.from(posMap.entries()).map(([id, name]) => ({ id, name })));
      } else {
        setEmployee(null);
        setErrorMsg(
          dataEmp?.error?.message || `Không thể tải hồ sơ nhân sự (HTTP ${resEmp.status}).`,
        );
      }

      if (resEvents.ok) {
        const dataEvents = await resEvents.json().catch(() => null);
        if (dataEvents?.success && Array.isArray(dataEvents.data)) {
          setEvents(dataEvents.data);
        }
      }

      if (resContracts.ok) {
        const dataContracts = await resContracts.json().catch(() => null);
        if (dataContracts?.success && Array.isArray(dataContracts.data)) {
          setContracts(dataContracts.data);
        }
      }

      if (resUnits.ok) {
        const dataUnits = await resUnits.json().catch(() => null);
        if (dataUnits?.success && Array.isArray(dataUnits.data)) {
          setUnits(flattenUnitTree(dataUnits.data));
        }
      }
    } catch (err) {
      setEmployee(null);
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    fetchEmployeeData();
  }, [fetchEmployeeData]);

  async function handleAddEventSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setFormMsg(null);

      const res = await fetch(`/api/v1/employees/${employeeId}/events`, {
        method: "POST",
        headers: getAuthHeaders(true),
        credentials: "include",
        body: JSON.stringify({
          employeeId,
          eventType: eventForm.eventType,
          decisionNumber: eventForm.decisionNumber.trim() || null,
          decisionDate: eventForm.decisionDate || null,
          effectiveDate: eventForm.effectiveDate,
          toUnitId: eventForm.toUnitId || null,
          toPositionId: eventForm.toPositionId || null,
          note: eventForm.note.trim() || null,
          syncAssignment: eventForm.syncAssignment,
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setFormMsg({
          type: "success",
          text: "Ghi nhận biến động công tác thành công!",
        });
        setShowAddEventModal(false);
        fetchEmployeeData();
      } else {
        setFormMsg({
          type: "error",
          text: json?.error?.message || `Lỗi khi ghi nhận sự kiện công tác (HTTP ${res.status}).`,
        });
      }
    } catch {
      setFormMsg({
        type: "error",
        text: "Lỗi kết nối máy chủ.",
      });
    } finally {
      setSubmitting(false);
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
        <div className="flex items-center justify-between">
          <Link
            href="/employees"
            className="inline-flex items-center text-xs font-semibold text-blue-900 hover:underline space-x-1"
          >
            <span>← Quay lại Danh sách Cán bộ Giảng viên</span>
          </Link>
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800">
            <AlertCircle size={17} className="shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading && !employee ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Đang tải hồ sơ cán bộ...
          </div>
        ) : !employee ? null : (
          <>
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
                      <strong className="text-slate-800">
                        {employee.primaryUnitName || "Trường ĐH Kiến trúc Đà Nẵng"}
                      </strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2 text-[11px] text-slate-500">
                      <span>
                        Học vị: <strong>{DEGREE_LABELS[employee.academicDegree] || employee.academicDegree}</strong>
                      </span>
                      {employee.academicTitle && employee.academicTitle !== "NONE" && (
                        <span>
                          • Học hàm: <strong>{TITLE_LABELS[employee.academicTitle] || employee.academicTitle}</strong>
                        </span>
                      )}
                      <span>
                        • Tuyển dụng: <strong>{employee.hireDate}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {canAddEvent && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const today = getVnDateStr();
                        setEventForm({
                          eventType: "APPOINTED",
                          decisionNumber: "",
                          decisionDate: today,
                          effectiveDate: today,
                          toUnitId: units[0]?.id || "",
                          toPositionId: "",
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
                )}
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
                  Thông Tin Cá Nhân &amp; Liên Hệ
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

                {events.length === 0 ? (
                  <p className="text-xs text-slate-500">Chưa ghi nhận biến động công tác nào.</p>
                ) : (
                  <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {events.map((ev, index) => (
                      <div key={ev.id} className="relative group">
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
                              <span>
                                Hiệu lực từ: <strong className="text-slate-800">{ev.effectiveDate}</strong>
                              </span>
                              {ev.decisionDate && <span>(Ký: {ev.decisionDate})</span>}
                            </div>
                          </div>

                          {(ev.fromUnitName || ev.toUnitName) && (
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs bg-white p-3 rounded-lg border border-slate-200">
                              {ev.fromUnitName && (
                                <div className="text-slate-600">
                                  Từ: <strong>{ev.fromUnitName}</strong> ({ev.fromPositionName || "—"})
                                </div>
                              )}
                              {ev.fromUnitName && ev.toUnitName && (
                                <ArrowRight size={14} className="text-blue-900 mx-1 inline" />
                              )}
                              {ev.toUnitName && (
                                <div className="text-blue-950 font-medium">
                                  Đến: <strong>{ev.toUnitName}</strong> ({ev.toPositionName || "—"})
                                </div>
                              )}
                            </div>
                          )}

                          {ev.note && (
                            <p className="mt-2 text-xs text-slate-600 italic">&ldquo;{ev.note}&rdquo;</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                    className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-blue-900 hover:bg-slate-200 inline-flex items-center gap-1.5"
                  >
                    <span>Đi đến Quản trị Hợp đồng</span>
                    <ArrowRight size={13} />
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
                      {contracts.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                            Chưa có dữ liệu hợp đồng lao động.
                          </td>
                        </tr>
                      ) : (
                        contracts.map((c) => (
                          <tr key={c.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-mono font-bold text-blue-900">{c.contractNumber}</td>
                            <td className="px-4 py-3">{c.contractType}</td>
                            <td className="px-4 py-3 text-slate-600">{c.signedDate}</td>
                            <td className="px-4 py-3 text-slate-600">
                              {c.effectiveDate} → {c.expiryDate || "Không thời hạn"}
                            </td>
                            <td className="px-4 py-3 text-center font-bold">{Number(c.salaryCoefficient).toFixed(2)}</td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                                {c.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
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
                      {employee.bankAccountNumber ? `${employee.bankAccountNumber} (${employee.bankName || ""})` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Modal: Ghi Nhận Biến Động Công Tác */}
        {showAddEventModal && employee && canAddEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Thêm Biến Động Công Tác</h3>
                  <p className="text-xs text-slate-500">
                    Ghi nhận sự kiện cho {employee.fullName} ({employee.employeeCode})
                  </p>
                </div>
                <button
                  onClick={() => setShowAddEventModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
                >
                  <X size={18} />
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
                        <option value="">-- Giữ nguyên / Không chọn --</option>
                        {units.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.label}
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
                        <option value="">-- Giữ nguyên / Không thay đổi --</option>
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
                    disabled={submitting}
                    className="rounded-lg bg-blue-900 px-5 py-2 font-semibold text-white hover:bg-blue-800 shadow disabled:opacity-50"
                  >
                    {submitting ? "Đang ghi nhận..." : "Ghi Nhận Sự Kiện"}
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
