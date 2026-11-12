"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { FileText, CheckCircle2, XCircle, Clock, AlertTriangle, X, GraduationCap, Plus } from "lucide-react";
import { AuthGuard } from "../../../components/AuthGuard";

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const headers: Record<string, string> = { ...(extra || {}) };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bahau_session_id");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

async function parseErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const json = await res.json();
    return json?.error?.message || json?.message || `${fallback} (HTTP ${res.status})`;
  } catch {
    return `${fallback} (HTTP ${res.status})`;
  }
}

function getVnTodayDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

interface TrainingCourseAdminItem {
  id: string;
  code: string;
  name: string;
  category: "PEDAGOGY" | "PROFESSIONAL" | "POLITICAL" | "LANGUAGE_IT" | "OVERSEAS_POSTGRAD";
  provider: string;
  startDate: string;
  endDate: string;
  location?: string | null;
  budget?: number | null;
  status: "PLANNING" | "ONGOING" | "COMPLETED" | "CANCELLED";
  description?: string | null;
  participantCount: number;
}

interface CertificateAdminItem {
  id: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  unitName: string;
  certificateType: "PROFESSIONAL_PRACTICE" | "ACADEMIC_TITLE_DEGREE" | "LANGUAGE" | "INFORMATICS" | "POLITICAL_THEORY" | "OTHER";
  name: string;
  certificateNumber: string;
  issuedBy: string;
  issuedDate: string;
  expiryDate?: string | null;
  score?: string | null;
  fileUrl?: string | null;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  verifiedByName?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  daysUntilExpiry?: number | null;
  expiryAlertStatus?: "EXPIRED" | "CRITICAL_30" | "WARNING_60" | "WARNING_90" | "VALID" | null;
}

const DEMO_ALL_CERTIFICATES: CertificateAdminItem[] = [
  {
    id: "cert-1",
    employeeId: "emp-1",
    employeeCode: "DAU240001",
    employeeName: "ThS. Đỗ Tuấn Kiệt",
    unitName: "Khoa Kiến trúc",
    certificateType: "PROFESSIONAL_PRACTICE",
    name: "Chứng chỉ Hành nghề Kiến trúc sư (Hạng I - Thiết kế Kiến trúc công trình)",
    certificateNumber: "KTS-DN-2022-0012",
    issuedBy: "Sở Xây dựng TP. Đà Nẵng",
    issuedDate: "2022-05-10",
    expiryDate: "2027-05-10",
    score: "Hạng I",
    fileUrl: "https://dau.edu.vn/certificates/kts-kietdt-hang1.pdf",
    status: "VERIFIED",
    verifiedByName: "CN. Lê Thị Mai (TCHC)",
    verifiedAt: "2024-01-15",
    daysUntilExpiry: 234,
    expiryAlertStatus: "VALID",
  },
  {
    id: "cert-2",
    employeeId: "emp-1",
    employeeCode: "DAU240001",
    employeeName: "ThS. Đỗ Tuấn Kiệt",
    unitName: "Khoa Kiến trúc",
    certificateType: "LANGUAGE",
    name: "Chứng chỉ Tiếng Anh Quốc tế IELTS Academic (Overall 7.5)",
    certificateNumber: "23VN004125KIET",
    issuedBy: "British Council Vietnam",
    issuedDate: "2024-10-15",
    expiryDate: "2026-10-15",
    score: "7.5 Academic",
    fileUrl: "https://dau.edu.vn/certificates/ielts-kietdt-75.pdf",
    status: "VERIFIED",
    verifiedByName: "CN. Lê Thị Mai (TCHC)",
    verifiedAt: "2024-10-20",
    daysUntilExpiry: 27,
    expiryAlertStatus: "CRITICAL_30",
  },
  {
    id: "cert-3",
    employeeId: "emp-2",
    employeeCode: "DAU230015",
    employeeName: "TS. Nguyễn Hoàng Nam",
    unitName: "Khoa Xây dựng",
    certificateType: "PROFESSIONAL_PRACTICE",
    name: "Chứng chỉ Hành nghề Kỹ sư Thiết kế Kết cấu Công trình Hạng I",
    certificateNumber: "KS-XD-2021-0088",
    issuedBy: "Cục Quản lý Hoạt động Xây dựng - Bộ Xây dựng",
    issuedDate: "2021-08-12",
    expiryDate: "2026-08-12",
    score: "Hạng I",
    fileUrl: "https://dau.edu.vn/certificates/ks-namnh-ketcau.pdf",
    status: "VERIFIED",
    verifiedByName: "CN. Lê Thị Mai (TCHC)",
    verifiedAt: "2023-09-10",
    daysUntilExpiry: -37,
    expiryAlertStatus: "EXPIRED",
  },
  {
    id: "cert-4",
    employeeId: "emp-1",
    employeeCode: "DAU240001",
    employeeName: "ThS. Đỗ Tuấn Kiệt",
    unitName: "Khoa Kiến trúc",
    certificateType: "INFORMATICS",
    name: "Autodesk Certified Professional: Revit for Architectural Design",
    certificateNumber: "ARC-2026-99120",
    issuedBy: "Autodesk Inc.",
    issuedDate: "2026-03-01",
    expiryDate: "2029-03-01",
    score: "940/1000",
    fileUrl: "https://dau.edu.vn/certificates/revit-pro-kietdt.pdf",
    status: "PENDING",
    verifiedByName: null,
    verifiedAt: null,
    daysUntilExpiry: 924,
    expiryAlertStatus: "VALID",
  },
];

export default function TrainingManagePage() {
  const [certificates, setCertificates] = useState<CertificateAdminItem[]>(DEMO_ALL_CERTIFICATES);
  const [filterUnit, setFilterUnit] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterExpiry, setFilterExpiry] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modal Thẩm định
  const [activeManageTab, setActiveManageTab] = useState<"CERTIFICATES" | "COURSES">("CERTIFICATES");
  const [courses, setCourses] = useState<TrainingCourseAdminItem[]>([]);
  const [selectedCert, setSelectedCert] = useState<CertificateAdminItem | null>(null);
  const [verifyDecision, setVerifyDecision] = useState<"VERIFIED" | "REJECTED">("VERIFIED");
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Course creation & participant update state
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseCategory, setCourseCategory] = useState<TrainingCourseAdminItem["category"]>("PROFESSIONAL");
  const [courseProvider, setCourseProvider] = useState("Trường Đại học Kiến trúc Đà Nẵng");
  const [courseStartDate, setCourseStartDate] = useState(() => getVnTodayDate());
  const [courseEndDate, setCourseEndDate] = useState(() => getVnTodayDate());
  const [participantCourseId, setParticipantCourseId] = useState("");
  const [participantEmployeeId, setParticipantEmployeeId] = useState("");
  const [participantStatus, setParticipantStatus] = useState<"REGISTERED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "DROPPED">("COMPLETED");
  const [participantGrade, setParticipantGrade] = useState("Xuất sắc");

  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const headers = getAuthHeaders();
        const [certRes, courseRes] = await Promise.all([
          fetch("/api/v1/training/certificates", { headers, credentials: "include" }),
          fetch("/api/v1/training/courses", { headers, credentials: "include" }),
        ]);
        if (!active) return;

        if (!certRes.ok) {
          setMessage({
            type: "error",
            text: await parseErrorMessage(certRes, "Không thể tải danh sách chứng chỉ cần thẩm định"),
          });
        } else {
          const certJson = await certRes.json();
          if (Array.isArray(certJson?.data)) {
            setCertificates(certJson.data);
          }
        }

        if (courseRes.ok) {
          const courseJson = await courseRes.json();
          if (Array.isArray(courseJson?.data)) {
            setCourses(courseJson.data);
            if (courseJson.data.length > 0) {
              setParticipantCourseId(courseJson.data[0].id);
            }
          }
        }
      } catch (err) {
        if (active) {
          setMessage({
            type: "error",
            text: err instanceof Error ? err.message : "Lỗi kết nối máy chủ đào tạo.",
          });
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  // Statistics
  const totalCount = certificates.length;
  const pendingCount = certificates.filter((c) => c.status === "PENDING").length;
  const verifiedCount = certificates.filter((c) => c.status === "VERIFIED").length;
  const expiredCount = certificates.filter((c) => c.expiryAlertStatus === "EXPIRED").length;
  const criticalCount = certificates.filter(
    (c) => c.expiryAlertStatus === "CRITICAL_30" || c.expiryAlertStatus === "WARNING_60"
  ).length;

  // Filter
  const filteredCerts = certificates.filter((c) => {
    if (filterUnit !== "ALL" && c.unitName !== filterUnit) return false;
    if (filterType !== "ALL" && c.certificateType !== filterType) return false;
    if (filterStatus !== "ALL" && c.status !== filterStatus) return false;
    if (filterExpiry === "EXPIRING" && !["CRITICAL_30", "WARNING_60", "EXPIRED"].includes(c.expiryAlertStatus || "")) {
      return false;
    }
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = c.employeeName.toLowerCase().includes(term);
      const matchCode = c.employeeCode.toLowerCase().includes(term);
      const matchCert = c.name.toLowerCase().includes(term);
      const matchNum = c.certificateNumber.toLowerCase().includes(term);
      if (!matchName && !matchCode && !matchCert && !matchNum) return false;
    }
    return true;
  });

  const handleVerifySubmit = async () => {
    if (!selectedCert) return;

    if (verifyDecision === "REJECTED" && !rejectionReason.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập lý do từ chối để thông báo cho CBGV bổ sung hồ sơ." });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/training/certificates/${selectedCert.id}/verify`, {
        method: "PUT",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          status: verifyDecision,
          rejectionReason: verifyDecision === "REJECTED" ? rejectionReason.trim() : undefined,
        }),
      });

      if (!res.ok) {
        setMessage({
          type: "error",
          text: await parseErrorMessage(res, "Thẩm định chứng chỉ thất bại"),
        });
        return;
      }

      const json = await res.json();
      const updatedCert: CertificateAdminItem = json?.data;
      setCertificates((prev) =>
        prev.map((c) => (c.id === selectedCert.id ? updatedCert || { ...c, status: verifyDecision } : c))
      );

      setMessage({
        type: "success",
        text: `Đã hoàn tất thẩm định [${verifyDecision === "VERIFIED" ? "XÁC NHẬN HỢP LỆ" : "TỪ CHỐI"}] chứng chỉ cho ${selectedCert.employeeName}!`,
      });
      setSelectedCert(null);
      setRejectionReason("");
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi kết nối máy chủ khi thẩm định chứng chỉ.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/training/courses", {
        method: "POST",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({
          code: courseCode.trim(),
          name: courseName.trim(),
          category: courseCategory,
          provider: courseProvider.trim(),
          startDate: courseStartDate,
          endDate: courseEndDate,
        }),
      });
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await parseErrorMessage(res, "Mở khóa đào tạo mới thất bại"),
        });
        return;
      }
      const json = await res.json();
      if (json?.data) {
        setCourses((prev) => [json.data, ...prev]);
        setParticipantCourseId((prev) => prev || json.data.id);
      }
      setCourseCode("");
      setCourseName("");
      setMessage({ type: "success", text: "Đã mở khóa đào tạo bồi dưỡng mới thành công!" });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi kết nối khi tạo khóa đào tạo.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourseStatus = async (
    courseId: string,
    status: TrainingCourseAdminItem["status"]
  ) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/v1/training/courses/${courseId}/status`, {
        method: "PATCH",
        headers: getAuthHeaders({ "Content-Type": "application/json" }),
        credentials: "include",
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await parseErrorMessage(res, "Cập nhật trạng thái khóa học thất bại"),
        });
        return;
      }
      const json = await res.json();
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? json?.data || { ...c, status } : c))
      );
      setMessage({ type: "success", text: `Đã chuyển trạng thái khóa học sang ${status}.` });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi kết nối khi cập nhật trạng thái khóa học.",
      });
    }
  };

  const handleUpdateParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!participantCourseId || !participantEmployeeId.trim()) {
      setMessage({ type: "error", text: "Vui lòng chọn khóa học và nhập Employee ID học viên." });
      return;
    }
    setMessage(null);
    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/v1/training/courses/${participantCourseId}/participants/${encodeURIComponent(participantEmployeeId.trim())}`,
        {
          method: "PUT",
          headers: getAuthHeaders({ "Content-Type": "application/json" }),
          credentials: "include",
          body: JSON.stringify({
            status: participantStatus,
            grade: participantGrade.trim() || undefined,
            certificateIssued: participantStatus === "COMPLETED",
          }),
        }
      );
      if (!res.ok) {
        setMessage({
          type: "error",
          text: await parseErrorMessage(res, "Cập nhật kết quả học viên thất bại"),
        });
        return;
      }
      setMessage({
        type: "success",
        text: `Đã cập nhật trạng thái học viên [${participantEmployeeId.trim()}] thành ${participantStatus}.`,
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Lỗi kết nối khi cập nhật học viên.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200"><CheckCircle2 size={12} /> Đã thẩm định</span>;
      case "PENDING":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse"><Clock size={12} /> Chờ duyệt</span>;
      case "REJECTED":
        return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200"><XCircle size={12} /> Từ chối</span>;
      case "EXPIRED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300">Quá hạn</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const getExpiryBadge = (alert?: string | null, days?: number | null) => {
    if (!alert) return null;
    switch (alert) {
      case "EXPIRED":
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><span className="size-1.5 rounded-full bg-rose-600" /> Quá hạn</span>;
      case "CRITICAL_30":
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"><span className="size-1.5 rounded-full bg-rose-600" /> Còn {days} ngày</span>;
      case "WARNING_60":
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-800 border border-amber-300"><span className="size-1.5 rounded-full bg-amber-500" /> Còn {days} ngày</span>;
      case "VALID":
        return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><span className="size-1.5 rounded-full bg-emerald-600" /> Còn hạn</span>;
      default:
        return null;
    }
  };

  return (
    <AuthGuard
      allowedRoles={["UNIT_HEAD", "DEAN", "HR_SPECIALIST", "RECTOR"]}
      moduleName="Quản trị Đào tạo & Thẩm định Chứng chỉ"
    >
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Không gian Nhân sự & Quản trị</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Quản trị Đào tạo & Thẩm định Chứng chỉ</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Dành cho Phòng Tổ chức - Hành chính: Thẩm định hồ sơ chứng chỉ hành nghề, kiểm soát thời hạn và quy hoạch đào tạo cán bộ
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/training"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            ← Xem Hồ sơ Cá nhân
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between border ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
          <button onClick={() => setMessage(null)} className="text-sm text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tổng chứng chỉ toàn trường</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
            <span className="text-xs text-gray-500">văn bằng</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">Đã xác thực: <strong className="text-emerald-700">{verifiedCount}</strong></div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Cần Thẩm định (PENDING)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{pendingCount}</span>
            <span className="text-xs text-amber-600 font-medium">hồ sơ mới</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Cần đối chiếu bản gốc trong tuần</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Cảnh báo Quá hạn</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-700">{expiredCount}</span>
            <span className="text-xs text-red-600 font-medium">chứng chỉ</span>
          </div>
          <p className="mt-2 text-xs text-red-600 font-medium flex items-center gap-1">
            <AlertTriangle size={12} />
            <span>Đã hết hạn hành nghề</span>
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-orange-700 uppercase tracking-wide">Sắp hết hạn (&lt;= 60 ngày)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-orange-700">{criticalCount}</span>
            <span className="text-xs text-gray-500">chứng chỉ</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Cần nhắc nhở nộp hồ sơ gia hạn</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đơn vị:</label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả khoa/phòng</option>
              <option value="Khoa Kiến trúc">Khoa Kiến trúc</option>
              <option value="Khoa Xây dựng">Khoa Xây dựng</option>
              <option value="Phòng Tổ chức - Hành chính">Phòng Tổ chức - Hành chính</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Trạng thái thẩm định:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ thẩm định (PENDING)</option>
              <option value="VERIFIED">Đã thẩm định (VERIFIED)</option>
              <option value="REJECTED">Bị từ chối (REJECTED)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Cảnh báo hạn dùng:</label>
            <select
              value={filterExpiry}
              onChange={(e) => setFilterExpiry(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả</option>
              <option value="EXPIRING">Sắp hết hạn / Quá hạn</option>
            </select>
          </div>
        </div>

        <div className="w-full md:w-72">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm:</label>
          <input
            type="text"
            placeholder="Tìm theo tên cán bộ, số hiệu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="flex items-center gap-3 border-b border-gray-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveManageTab("CERTIFICATES")}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition ${
            activeManageTab === "CERTIFICATES"
              ? "bg-indigo-700 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          Thẩm định Chứng chỉ ({filteredCerts.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveManageTab("COURSES")}
          className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition flex items-center gap-1.5 ${
            activeManageTab === "COURSES"
              ? "bg-indigo-700 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <GraduationCap size={15} />
          <span>Quản lý Khóa Bồi dưỡng & Học viên ({courses.length})</span>
        </button>
      </div>

      {activeManageTab === "COURSES" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <form onSubmit={handleCreateCourse} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Plus size={16} className="text-indigo-700" />
                <span>Mở Khóa Đào tạo / Bồi dưỡng Mới</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <input
                  type="text"
                  required
                  placeholder="Mã khóa (VD: BD-BIM-2026)"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 font-mono"
                />
                <select
                  value={courseCategory}
                  onChange={(e) => setCourseCategory(e.target.value as TrainingCourseAdminItem["category"])}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="PROFESSIONAL">Chuyên môn / Kiến trúc</option>
                  <option value="PEDAGOGY">Nghiệp vụ sư phạm</option>
                  <option value="LANGUAGE_IT">Ngoại ngữ & Tin học</option>
                  <option value="POLITICAL">Lý luận chính trị</option>
                  <option value="OVERSEAS_POSTGRAD">Bồi dưỡng nước ngoài</option>
                </select>
              </div>
              <input
                type="text"
                required
                placeholder="Tên khóa đào tạo / bồi dưỡng"
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2"
              />
              <input
                type="text"
                required
                placeholder="Đơn vị tổ chức"
                value={courseProvider}
                onChange={(e) => setCourseProvider(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2"
              />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <input
                  type="date"
                  value={courseStartDate}
                  onChange={(e) => setCourseStartDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
                <input
                  type="date"
                  value={courseEndDate}
                  onChange={(e) => setCourseEndDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white disabled:opacity-50"
              >
                {isSubmitting ? "Đang tạo..." : "Mở Khóa Bồi dưỡng"}
              </button>
            </form>

            <form onSubmit={handleUpdateParticipant} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-gray-900">Cập nhật Kết quả / Trạng thái Học viên</h3>
              <select
                value={participantCourseId}
                onChange={(e) => setParticipantCourseId(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2"
              >
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.code}] {c.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Employee ID (UUID)"
                value={participantEmployeeId}
                onChange={(e) => setParticipantEmployeeId(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 font-mono"
              />
              <div className="grid grid-cols-2 gap-3 text-xs">
                <select
                  value={participantStatus}
                  onChange={(e) => setParticipantStatus(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="APPROVED">Đã duyệt tham gia (APPROVED)</option>
                  <option value="IN_PROGRESS">Đang học (IN_PROGRESS)</option>
                  <option value="COMPLETED">Hoàn thành & Cấp GCN (COMPLETED)</option>
                  <option value="FAILED">Không đạt (FAILED)</option>
                  <option value="DROPPED">Rút đăng ký (DROPPED)</option>
                </select>
                <input
                  type="text"
                  placeholder="Xếp loại / Điểm (VD: Xuất sắc)"
                  value={participantGrade}
                  onChange={(e) => setParticipantGrade(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white disabled:opacity-50"
              >
                Cập nhật Kết quả Học viên
              </button>
            </form>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Mã & Tên khóa</th>
                    <th className="px-4 py-3">Đơn vị tổ chức</th>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Sĩ số</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Chuyển trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {courses.map((course) => (
                    <tr key={course.id}>
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-indigo-700">{course.code}</div>
                        <div className="font-medium text-gray-900">{course.name}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{course.provider}</td>
                      <td className="px-4 py-3 text-gray-600">{course.startDate} → {course.endDate}</td>
                      <td className="px-4 py-3 font-semibold">{course.participantCount}</td>
                      <td className="px-4 py-3 font-bold">{course.status}</td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={course.status}
                          onChange={(e) => handleUpdateCourseStatus(course.id, e.target.value as TrainingCourseAdminItem["status"])}
                          className="border border-gray-300 rounded px-2 py-1 text-xs"
                        >
                          <option value="PLANNING">PLANNING</option>
                          <option value="ONGOING">ONGOING</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="CANCELLED">CANCELLED</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeManageTab === "CERTIFICATES" && (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            Danh sách Hồ sơ Chứng chỉ ({filteredCerts.length} hồ sơ)
          </h2>
          <span className="text-xs text-gray-500">Thẩm quyền: Phòng Tổ chức - Hành chính DAU</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Cán bộ / Giảng viên</th>
                <th className="px-4 py-3">Tên chứng chỉ & Số hiệu</th>
                <th className="px-4 py-3">Cơ quan cấp & Ngày cấp</th>
                <th className="px-4 py-3">Hạn sử dụng</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-4 py-3">Minh chứng scan</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredCerts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Không tìm thấy chứng chỉ nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredCerts.map((cert) => (
                  <tr key={cert.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{cert.employeeName}</div>
                      <div className="text-xs text-gray-500">{cert.employeeCode} • {cert.unitName}</div>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <div className="font-medium text-gray-900 leading-snug">{cert.name}</div>
                      <div className="font-mono text-xs text-blue-800 mt-0.5">{cert.certificateNumber}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-gray-800 text-xs">{cert.issuedBy}</div>
                      <div className="text-xs text-gray-500">{cert.issuedDate}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-gray-800">{cert.expiryDate || "Vô thời hạn"}</div>
                      <div className="mt-1">{getExpiryBadge(cert.expiryAlertStatus, cert.daysUntilExpiry)}</div>
                    </td>
                    <td className="px-4 py-4 text-center">{getStatusBadge(cert.status)}</td>
                    <td className="px-4 py-4">
                      {cert.fileUrl ? (
                        <a
                          href={cert.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-brand-600 hover:text-brand-700 text-xs font-medium underline flex items-center gap-1.5"
                        >
                          <FileText size={13} />
                          <span>Xem bản scan</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Chưa có</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedCert(cert);
                          setVerifyDecision(cert.status === "VERIFIED" ? "VERIFIED" : "VERIFIED");
                          setRejectionReason(cert.rejectionReason || "");
                        }}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg text-white bg-indigo-700 hover:bg-indigo-800 shadow-sm transition"
                      >
                        Thẩm định →
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* MODAL: Thẩm định Chứng chỉ */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">Phòng Tổ chức - Hành chính</span>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">Thẩm định Văn bằng / Chứng chỉ</h2>
              </div>
              <button
                onClick={() => setSelectedCert(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thông tin chứng chỉ */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">CBGV:</span>
                <strong className="text-gray-900">{selectedCert.employeeName} ({selectedCert.employeeCode})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Đơn vị:</span>
                <span className="text-gray-800">{selectedCert.unitName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tên chứng chỉ:</span>
                <strong className="text-blue-900 text-right max-w-xs">{selectedCert.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số hiệu:</span>
                <span className="font-mono text-gray-800">{selectedCert.certificateNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cơ quan cấp:</span>
                <span className="text-gray-800">{selectedCert.issuedBy}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Thời hạn:</span>
                <span className="text-gray-800">{selectedCert.issuedDate} → {selectedCert.expiryDate || "Vô thời hạn"}</span>
              </div>
              {selectedCert.fileUrl && (
                <div className="pt-2 border-t flex justify-end">
                  <a
                    href={selectedCert.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-600 hover:text-brand-800 font-bold underline flex items-center gap-1.5"
                  >
                    <FileText size={13} />
                    <span>Mở tệp scan minh chứng để đối chiếu bản gốc ↗</span>
                  </a>
                </div>
              )}
            </div>

            {/* Quyết định thẩm định */}
            <div className="space-y-3 text-sm">
              <label className="block text-xs font-semibold text-gray-700">Kết quả thẩm định của Chuyên viên:</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    value="VERIFIED"
                    checked={verifyDecision === "VERIFIED"}
                    onChange={() => setVerifyDecision("VERIFIED")}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm font-semibold text-emerald-700 flex items-center gap-1.5"><CheckCircle2 size={15} /> Xác nhận Hợp lệ (VERIFIED)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="decision"
                    value="REJECTED"
                    checked={verifyDecision === "REJECTED"}
                    onChange={() => setVerifyDecision("REJECTED")}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-semibold text-red-700 flex items-center gap-1.5"><XCircle size={15} /> Từ chối / Yêu cầu bổ sung (REJECTED)</span>
                </label>
              </div>

              {verifyDecision === "REJECTED" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Lý do từ chối (*):
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Nhập lý do chi tiết (ví dụ: Bản scan mờ, chưa mang văn bằng gốc đối chiếu, chứng chỉ không thuộc cơ sở được Bộ công nhận...)"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full text-xs border border-red-300 rounded-lg p-2.5 focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <button
                onClick={() => setSelectedCert(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Đóng
              </button>
              <button
                onClick={handleVerifySubmit}
                className="px-5 py-2 text-sm font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm transition"
              >
                Lưu Kết quả Thẩm định
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
