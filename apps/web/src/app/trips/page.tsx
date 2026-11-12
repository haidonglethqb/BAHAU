"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";

interface BusinessTripItem {
  id: string;
  purpose: string;
  destination: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  budgetEstimate?: number | null;
  fundingSource?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
  createdAt: string;
  steps?: {
    stepName: string;
    approverRoleCode?: string;
    approverEmployeeName?: string;
    status: string;
    comment?: string;
    actionAt?: string;
  }[];
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

function diffVnCalendarDays(startYmd: string, endYmd: string): number {
  const [sy, sm, sd] = startYmd.split("-").map(Number);
  const [ey, em, ed] = endYmd.split("-").map(Number);
  const startUtc = Date.UTC(sy, sm - 1, sd);
  const endUtc = Date.UTC(ey, em - 1, ed);
  return Math.round((endUtc - startUtc) / (1000 * 60 * 60 * 24)) + 1;
}

export default function BusinessTripsPage() {
  const [trips, setTrips] = useState<BusinessTripItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<BusinessTripItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    purpose: "",
    destination: "",
    startDate: "",
    endDate: "",
    totalDays: "1",
    budgetEstimate: "",
    fundingSource: "Ngân sách Trường",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/v1/trips/requests/my", {
        credentials: "include",
        headers: getAuthHeaders(),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        setTrips([]);
        setErrorMsg(json?.error?.message || `Không thể tải danh sách công tác (HTTP ${res.status}).`);
        return;
      }
      setTrips(Array.isArray(json?.data) ? json.data : []);
    } catch (err) {
      setTrips([]);
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối máy chủ.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  useEffect(() => {
    if (formData.startDate && formData.endDate && formData.endDate >= formData.startDate) {
      const diffDays = diffVnCalendarDays(formData.startDate, formData.endDate);
      if (diffDays > 0) {
        setFormData((prev) => ({ ...prev, totalDays: String(diffDays) }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const days = parseFloat(formData.totalDays);
    if (isNaN(days) || days <= 0) {
      setFormError("Số ngày công tác phải lớn hơn 0.");
      return;
    }

    if (formData.purpose.trim().length < 5) {
      setFormError("Mục đích công tác tối thiểu 5 ký tự.");
      return;
    }

    if (formData.destination.trim().length < 2) {
      setFormError("Địa điểm công tác không được để trống.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/trips/requests", {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({
          purpose: formData.purpose.trim(),
          destination: formData.destination.trim(),
          startDate: formData.startDate,
          endDate: formData.endDate,
          totalDays: days,
          budgetEstimate: formData.budgetEstimate ? parseFloat(formData.budgetEstimate) : null,
          fundingSource: formData.fundingSource.trim() || null,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        setFormError(json?.error?.message || `Không thể đăng ký công tác (HTTP ${res.status}).`);
        return;
      }

      setFormSuccess("Đăng ký chuyến công tác thành công! Hồ sơ đã được chuyển đến luồng phê duyệt.");
      fetchTrips();
      setTimeout(() => {
        setShowModal(false);
        setFormSuccess(null);
        setFormData({
          purpose: "",
          destination: "",
          startDate: "",
          endDate: "",
          totalDays: "1",
          budgetEstimate: "",
          fundingSource: "Ngân sách Trường",
        });
      }, 1000);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Lỗi kết nối máy chủ.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelTrip = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn hủy đăng ký chuyến công tác này?")) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/v1/trips/requests/${id}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: getAuthHeaders(true),
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || json?.success === false) {
        setErrorMsg(json?.error?.message || `Không thể hủy chuyến công tác (HTTP ${res.status}).`);
        return;
      }
      fetchTrips();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Lỗi kết nối máy chủ khi hủy chuyến công tác.");
    }
  };

  const totalBudgetApproved = trips
    .filter((t) => t.status === "APPROVED" && t.budgetEstimate)
    .reduce((sum, t) => sum + (t.budgetEstimate || 0), 0);

  return (
    <AuthGuard moduleName="Quản lý & Đăng ký Đi Công tác">
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
              Không gian Cá nhân
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">Năm 2026</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Quản lý & Đăng ký Đi Công tác (Business Trips)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Lập tờ trình công tác trong và ngoài nước, dự toán kinh phí và theo dõi tiến độ phê duyệt quyết định của Ban Giám hiệu.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center justify-center rounded-lg bg-blue-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-blue-800 transition"
        >
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Đăng ký chuyến công tác mới
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-800 flex items-center gap-2">
          <AlertTriangle size={16} className="shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng chuyến công tác
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-slate-900">{trips.length}</span>
            <span className="text-xs font-medium text-slate-500">chuyến</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Trong năm học 2026</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Tổng số ngày công tác
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-blue-900">
              {trips.filter((t) => t.status !== "CANCELLED").reduce((acc, t) => acc + t.totalDays, 0)}
            </span>
            <span className="text-xs font-medium text-slate-500">ngày</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Đã và đang phê duyệt</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Kinh phí đã giải ngân / duyệt
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-emerald-700">
              {totalBudgetApproved.toLocaleString("vi-VN")}
            </span>
            <span className="text-xs font-bold text-emerald-700">VNĐ</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Định mức quy chế chi tiêu DAU</p>
        </div>
      </div>

      {/* Trips Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Danh sách các chuyến công tác của tôi</h3>
          <span className="text-xs text-slate-500">Quy trình 2 cấp: Trưởng đơn vị → Ban Giám hiệu</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Mã & Địa điểm đến</th>
                <th className="px-6 py-4">Mục đích công tác</th>
                <th className="px-6 py-4">Thời gian</th>
                <th className="px-6 py-4">Số ngày</th>
                <th className="px-6 py-4">Dự toán kinh phí</th>
                <th className="px-6 py-4">Nguồn kinh phí</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-xs text-slate-500">
                    Đang tải danh sách công tác...
                  </td>
                </tr>
              ) : trips.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-xs text-slate-500">
                    Chưa có chuyến công tác nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                trips.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-900">{t.id}</div>
                    <div className="text-xs font-medium text-blue-900">{t.destination}</div>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-700 max-w-xs truncate" title={t.purpose}>
                    {t.purpose}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
                    {t.startDate} <span className="text-slate-400">đến</span> {t.endDate}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">
                    {t.totalDays} ngày
                  </td>
                  <td className="px-6 py-4 text-xs font-semibold text-slate-900">
                    {t.budgetEstimate ? t.budgetEstimate.toLocaleString("vi-VN") + " đ" : "Tự túc"}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {t.fundingSource || "—"}
                  </td>
                  <td className="px-6 py-4">
                    {t.status === "APPROVED" && (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                        Đã phê duyệt
                      </span>
                    )}
                    {t.status === "PENDING" && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                        Chờ BGH duyệt
                      </span>
                    )}
                    {t.status === "REJECTED" && (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-medium text-rose-800">
                        Đã từ chối
                      </span>
                    )}
                    {t.status === "CANCELLED" && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        Đã hủy
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => setSelectedTrip(t)}
                      className="text-xs font-semibold text-blue-900 hover:text-blue-700 underline"
                    >
                      Tiến trình
                    </button>
                    {t.status === "PENDING" && (
                      <button
                        onClick={() => handleCancelTrip(t.id)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-800"
                      >
                        Hủy
                      </button>
                    )}
                  </td>
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Đăng ký chuyến công tác */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-bold text-slate-900">Đăng ký chuyến công tác mới</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-lg bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200 flex items-center gap-1.5">
                <AlertTriangle size={14} />
                <span>{formError}</span>
              </div>
            )}

            {formSuccess && (
              <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                <span>{formSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Địa điểm đến công tác
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: TP. Hà Nội, Trường ĐH Xây dựng Miền Trung..."
                  value={formData.destination}
                  onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-900 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Từ ngày
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Đến ngày
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Tổng số ngày công tác
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.totalDays}
                    onChange={(e) => setFormData({ ...formData, totalDays: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase">
                    Dự toán kinh phí (VNĐ)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100000"
                    placeholder="Ví dụ: 5000000"
                    value={formData.budgetEstimate}
                    onChange={(e) => setFormData({ ...formData, budgetEstimate: e.target.value })}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Nguồn kinh phí chi trả
                </label>
                <select
                  value={formData.fundingSource}
                  onChange={(e) => setFormData({ ...formData, fundingSource: e.target.value })}
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-900 focus:outline-none"
                >
                  <option value="Ngân sách Trường">Ngân sách Trường (Kinh phí hành chính)</option>
                  <option value="Đề tài NCKH">Kinh phí Đề tài NCKH</option>
                  <option value="Dự án tài trợ quốc tế">Dự án tài trợ quốc tế / Đối tác</option>
                  <option value="Kinh phí cá nhân tự túc">Kinh phí cá nhân tự túc</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase">
                  Mục đích & Nội dung công tác
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  placeholder="Ghi rõ nhiệm vụ công tác, cơ quan làm việc và mục tiêu kết quả đạt được..."
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-900 px-5 py-2 text-sm font-medium text-white shadow hover:bg-blue-800 transition"
                >
                  Gửi tờ trình công tác
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem tiến trình Workflow */}
      {selectedTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Tiến trình Phê duyệt Chuyến công tác #{selectedTrip.id}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedTrip.destination} • {selectedTrip.totalDays} ngày ({selectedTrip.startDate} - {selectedTrip.endDate})
                </p>
              </div>
              <button
                onClick={() => setSelectedTrip(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 space-y-6">
              {selectedTrip.steps?.map((step, idx) => (
                <div key={idx} className="relative flex items-start space-x-4">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white shadow ${
                      step.status === "APPROVED"
                        ? "bg-emerald-600"
                        : step.status === "WAITING"
                        ? "bg-amber-500"
                        : "bg-rose-600"
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{step.stepName}</h4>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          step.status === "APPROVED"
                            ? "bg-emerald-100 text-emerald-800"
                            : step.status === "WAITING"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {step.status === "APPROVED"
                          ? "Đã duyệt"
                          : step.status === "WAITING"
                          ? "Đang chờ"
                          : "Từ chối"}
                      </span>
                    </div>

                    {step.approverEmployeeName && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Người thụ lý: <span className="font-semibold">{step.approverEmployeeName}</span>
                      </p>
                    )}

                    {step.comment && (
                      <div className="mt-2 rounded bg-slate-50 p-2.5 text-xs text-slate-700 italic border border-slate-200">
                        "{step.comment}"
                      </div>
                    )}

                    {step.actionAt && (
                      <p className="mt-1 text-[10px] text-slate-400">
                        Xử lý lúc: {new Date(step.actionAt).toLocaleString("vi-VN")}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end border-t border-slate-200 pt-3">
              <button
                onClick={() => setSelectedTrip(null)}
                className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
