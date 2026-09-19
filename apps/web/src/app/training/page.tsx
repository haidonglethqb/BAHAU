"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGuard } from "../../components/AuthGuard";

interface CertificateItem {
  id: string;
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

interface TrainingCourseItem {
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
  isRegisteredByMe: boolean;
  myParticipantStatus?: "REGISTERED" | "APPROVED" | "IN_PROGRESS" | "COMPLETED" | "FAILED" | "DROPPED" | null;
}

const DEMO_CERTIFICATES: CertificateItem[] = [
  {
    id: "cert-1",
    certificateType: "PROFESSIONAL_PRACTICE",
    name: "Chứng chỉ Hành nghề Kiến trúc sư (Hạng I - Thiết kế Kiến trúc công trình)",
    certificateNumber: "KTS-DN-2022-0012",
    issuedBy: "Sở Xây dựng TP. Đà Nẵng",
    issuedDate: "2022-05-10",
    expiryDate: "2027-05-10",
    score: "Hạng I (Chủ trì thiết kế)",
    fileUrl: "https://dau.edu.vn/certificates/kts-kietdt-hang1.pdf",
    status: "VERIFIED",
    verifiedByName: "CN. Lê Thị Mai (Phòng TCHC)",
    verifiedAt: "2024-01-15T09:00:00Z",
    daysUntilExpiry: 234,
    expiryAlertStatus: "VALID",
  },
  {
    id: "cert-2",
    certificateType: "LANGUAGE",
    name: "Chứng chỉ Tiếng Anh Quốc tế IELTS Academic (Overall 7.5)",
    certificateNumber: "23VN004125KIET",
    issuedBy: "British Council Vietnam",
    issuedDate: "2024-10-15",
    expiryDate: "2026-10-15",
    score: "7.5 (L:8.0, R:8.0, W:7.0, S:7.0)",
    fileUrl: "https://dau.edu.vn/certificates/ielts-kietdt-75.pdf",
    status: "VERIFIED",
    verifiedByName: "CN. Lê Thị Mai (Phòng TCHC)",
    verifiedAt: "2024-10-20T10:30:00Z",
    daysUntilExpiry: 27,
    expiryAlertStatus: "CRITICAL_30",
  },
  {
    id: "cert-3",
    certificateType: "ACADEMIC_TITLE_DEGREE",
    name: "Chứng chỉ Bồi dưỡng Nghiệp vụ Sư phạm cho Giảng viên Đại học",
    certificateNumber: "NVSP-2020-0089",
    issuedBy: "Trường Đại học Sư phạm - Đại học Đà Nẵng",
    issuedDate: "2020-11-20",
    expiryDate: null,
    score: "Loại Giỏi",
    fileUrl: "https://dau.edu.vn/certificates/nvsp-kietdt.pdf",
    status: "VERIFIED",
    verifiedByName: "CN. Lê Thị Mai (Phòng TCHC)",
    verifiedAt: "2024-01-15T09:15:00Z",
    daysUntilExpiry: null,
    expiryAlertStatus: null,
  },
  {
    id: "cert-4",
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

const DEMO_COURSES: TrainingCourseItem[] = [
  {
    id: "course-1",
    code: "TC-BIM-2026",
    name: "Tập huấn Ứng dụng Mô hình Thông tin Công trình (BIM Revit) trong Đồ án Kiến trúc",
    category: "PROFESSIONAL",
    provider: "Viện Kiến trúc & Xây dựng DAU phối hợp Autodesk",
    startDate: "2026-03-15",
    endDate: "2026-05-15",
    location: "Phòng Lab BIM - Tòa nhà F, Trường ĐH Kiến trúc Đà Nẵng",
    budget: 45000000,
    status: "ONGOING",
    description: "Đào tạo giảng viên khoa Kiến trúc và Xây dựng làm chủ quy trình phối hợp mô hình BIM, phục vụ chuyển đổi số chương trình đào tạo kiến trúc sư theo chuẩn quốc tế.",
    participantCount: 24,
    isRegisteredByMe: true,
    myParticipantStatus: "IN_PROGRESS",
  },
  {
    id: "course-2",
    code: "TC-PED-2026",
    name: "Bồi dưỡng Nghiệp vụ Sư phạm Giảng dạy Đại học Hiện đại",
    category: "PEDAGOGY",
    provider: "Trường Đại học Sư phạm - ĐH Đà Nẵng",
    startDate: "2026-06-01",
    endDate: "2026-08-30",
    location: "Trung tâm Đào tạo Thường xuyên, DAU",
    budget: 30000000,
    status: "PLANNING",
    description: "Khóa học trang bị phương pháp sư phạm tích cực, kiểm tra đánh giá theo chuẩn đầu ra OBE cho giảng viên mới tuyển dụng.",
    participantCount: 15,
    isRegisteredByMe: false,
    myParticipantStatus: null,
  },
  {
    id: "course-3",
    code: "TC-RANK2-2025",
    name: "Bồi dưỡng Tiêu chuẩn Chức danh Nghề nghiệp Giảng viên chính (Hạng II)",
    category: "PROFESSIONAL",
    provider: "Học viện Quản lý Giáo dục",
    startDate: "2025-09-01",
    endDate: "2025-11-30",
    location: "Trực tuyến kết hợp trực tiếp",
    budget: 25000000,
    status: "COMPLETED",
    description: "Hoàn thiện chứng chỉ tiêu chuẩn chức danh nghề nghiệp cho các giảng viên thâm niên trên 5 năm tại DAU.",
    participantCount: 32,
    isRegisteredByMe: true,
    myParticipantStatus: "COMPLETED",
  },
];

export default function TrainingPersonalPage() {
  const [activeTab, setActiveTab] = useState<"CERTIFICATES" | "COURSES">("CERTIFICATES");
  const [certificates, setCertificates] = useState<CertificateItem[]>(DEMO_CERTIFICATES);
  const [courses, setCourses] = useState<TrainingCourseItem[]>(DEMO_COURSES);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form state cho nộp chứng chỉ mới
  const [formType, setFormType] = useState<string>("PROFESSIONAL_PRACTICE");
  const [formName, setFormName] = useState<string>("");
  const [formNumber, setFormNumber] = useState<string>("");
  const [formIssuer, setFormIssuer] = useState<string>("");
  const [formIssuedDate, setFormIssuedDate] = useState<string>("");
  const [formExpiryDate, setFormExpiryDate] = useState<string>("");
  const [formScore, setFormScore] = useState<string>("");
  const [formFileUrl, setFormFileUrl] = useState<string>("");

  // Statistics
  const totalCerts = certificates.length;
  const verifiedCerts = certificates.filter((c) => c.status === "VERIFIED").length;
  const pendingCerts = certificates.filter((c) => c.status === "PENDING").length;
  const expiringCerts = certificates.filter(
    (c) => c.expiryAlertStatus === "CRITICAL_30" || c.expiryAlertStatus === "WARNING_60" || c.expiryAlertStatus === "EXPIRED"
  ).length;

  // Filter certificates
  const filteredCerts = certificates.filter((c) => {
    if (filterType !== "ALL" && c.certificateType !== filterType) return false;
    return true;
  });

  const handleRegisterCourse = (courseId: string) => {
    setCourses((prev) =>
      prev.map((course) => {
        if (course.id === courseId) {
          return {
            ...course,
            isRegisteredByMe: true,
            participantCount: course.participantCount + 1,
            myParticipantStatus: "REGISTERED",
          };
        }
        return course;
      })
    );
    setMessage({ type: "success", text: "Đăng ký tham gia khóa đào tạo thành công! Phòng TCHC sẽ thẩm duyệt danh sách." });
  };

  const handleCreateCertificate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formNumber.trim() || !formIssuer.trim() || !formIssuedDate) {
      setMessage({ type: "error", text: "Vui lòng nhập đầy đủ các trường bắt buộc (*)" });
      return;
    }

    const newCert: CertificateItem = {
      id: `cert-${Date.now()}`,
      certificateType: formType as any,
      name: formName.trim(),
      certificateNumber: formNumber.trim(),
      issuedBy: formIssuer.trim(),
      issuedDate: formIssuedDate,
      expiryDate: formExpiryDate || null,
      score: formScore.trim() || null,
      fileUrl: formFileUrl.trim() || null,
      status: "PENDING",
      verifiedByName: null,
      verifiedAt: null,
      daysUntilExpiry: formExpiryDate ? 365 : null,
      expiryAlertStatus: "VALID",
    };

    setCertificates([newCert, ...certificates]);
    setMessage({
      type: "success",
      text: `Đã khai báo chứng chỉ [${newCert.name}] thành công! Hồ sơ đang ở trạng thái Chờ thẩm định (PENDING).`,
    });
    setIsModalOpen(false);

    // Reset form
    setFormName("");
    setFormNumber("");
    setFormIssuer("");
    setFormIssuedDate("");
    setFormExpiryDate("");
    setFormScore("");
    setFormFileUrl("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "VERIFIED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">✓ Đã thẩm định</span>;
      case "PENDING":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">⏳ Chờ thẩm định</span>;
      case "REJECTED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 border border-red-200">✕ Bị từ chối</span>;
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
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-red-600 text-white shadow-sm">🔴 Đã quá hạn</span>;
      case "CRITICAL_30":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-orange-100 text-orange-800 border border-orange-300 animate-pulse">🟠 Còn {days} ngày (Khẩn)</span>;
      case "WARNING_60":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800 border border-amber-300">🟡 Còn {days} ngày</span>;
      case "WARNING_90":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">🔵 Còn {days} ngày</span>;
      case "VALID":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">🟢 Còn hạn ({days} ngày)</span>;
      default:
        return null;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "PROFESSIONAL_PRACTICE":
        return "Chứng chỉ Hành nghề KTS/Kỹ sư";
      case "ACADEMIC_TITLE_DEGREE":
        return "Chức danh & Sư phạm";
      case "LANGUAGE":
        return "Ngoại ngữ Quốc tế";
      case "INFORMATICS":
        return "Tin học & Công nghệ BIM";
      case "POLITICAL_THEORY":
        return "Lý luận Chính trị & QLNN";
      default:
        return "Chứng chỉ khác";
    }
  };

  return (
    <AuthGuard moduleName="Hồ sơ Chứng chỉ & Đào tạo Cá nhân">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-600"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-700">Không gian Cá nhân</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Đào tạo, Bồi dưỡng & Chứng chỉ</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Quản lý hồ sơ chứng chỉ hành nghề, chức danh nghề nghiệp và theo dõi các khóa bồi dưỡng chuyên môn tại DAU
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/training/manage"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            Quản trị & Thẩm định Chứng chỉ →
          </Link>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-blue-900 hover:bg-blue-800 transition shadow-sm"
          >
            + Khai báo Chứng chỉ Mới
          </button>
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
            <span className="text-lg">{message.type === "success" ? "✓" : "⚠️"}</span>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
          <button onClick={() => setMessage(null)} className="text-sm text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tổng số chứng chỉ</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalCerts}</span>
            <span className="text-xs text-gray-500">văn bằng/chứng chỉ</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Đã cập nhật vào hồ sơ cán bộ</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-emerald-700 uppercase tracking-wide">Đã Thẩm định (VERIFIED)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">{verifiedCerts}</span>
            <span className="text-xs text-gray-500">hợp lệ</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Có giá trị pháp lý trong phân công</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-amber-700 uppercase tracking-wide">Chờ Thẩm định (PENDING)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700">{pendingCerts}</span>
            <span className="text-xs text-gray-500">hồ sơ</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Phòng TCHC đang đối chiếu bản gốc</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-red-700 uppercase tracking-wide">Cảnh báo Hạn sử dụng</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-red-700">{expiringCerts}</span>
            <span className="text-xs text-gray-500">chứng chỉ</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Sắp hết hạn trong vòng 60 ngày</p>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab("CERTIFICATES")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "CERTIFICATES"
                ? "border-blue-900 text-blue-900 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            📜 Chứng chỉ của tôi ({certificates.length})
          </button>
          <button
            onClick={() => setActiveTab("COURSES")}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === "COURSES"
                ? "border-blue-900 text-blue-900 font-bold"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            🎓 Khóa Bồi dưỡng & Đào tạo ({courses.length})
          </button>
        </nav>
      </div>

      {/* TAB 1: CERTIFICATES */}
      {activeTab === "CERTIFICATES" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-gray-600">Loại chứng chỉ:</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Tất cả chứng chỉ</option>
                <option value="PROFESSIONAL_PRACTICE">Hành nghề KTS & Kỹ sư Xây dựng</option>
                <option value="ACADEMIC_TITLE_DEGREE">Chức danh & Nghiệp vụ Sư phạm</option>
                <option value="LANGUAGE">Ngoại ngữ Quốc tế</option>
                <option value="INFORMATICS">Tin học & Công nghệ BIM</option>
                <option value="POLITICAL_THEORY">Lý luận Chính trị & QLNN</option>
              </select>
            </div>
            <span className="text-xs text-gray-500">
              Hiển thị <strong>{filteredCerts.length}</strong> / {certificates.length} chứng chỉ
            </span>
          </div>

          {/* Certificates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredCerts.length === 0 ? (
              <div className="md:col-span-2 text-center py-10 bg-white rounded-xl border border-gray-200 text-gray-500 text-sm">
                Không tìm thấy chứng chỉ nào phù hợp với bộ lọc
              </div>
            ) : (
              filteredCerts.map((cert) => (
                <div key={cert.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 transition space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-blue-50 text-blue-800 rounded">
                        {getTypeLabel(cert.certificateType)}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {getExpiryBadge(cert.expiryAlertStatus, cert.daysUntilExpiry)}
                        {getStatusBadge(cert.status)}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 leading-snug">{cert.name}</h3>

                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 pt-1">
                      <div>
                        <span className="text-gray-400 block">Số hiệu:</span>
                        <strong className="font-mono text-gray-800">{cert.certificateNumber}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Cơ quan cấp:</span>
                        <span className="text-gray-800">{cert.issuedBy}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Ngày cấp:</span>
                        <span className="text-gray-800">{cert.issuedDate}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Hạn sử dụng:</span>
                        <span className="text-gray-800">{cert.expiryDate || "Vô thời hạn"}</span>
                      </div>
                      {cert.score && (
                        <div className="col-span-2 bg-gray-50 p-2 rounded border text-xs">
                          <span className="text-gray-500">Điểm / Xếp loại: </span>
                          <strong className="text-blue-900">{cert.score}</strong>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    {cert.fileUrl ? (
                      <a
                        href={cert.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-700 hover:text-blue-900 font-medium underline flex items-center gap-1"
                      >
                        📄 Xem file scan / minh chứng
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Chưa đính kèm file</span>
                    )}

                    {cert.status === "VERIFIED" && cert.verifiedByName && (
                      <span className="text-gray-500">Thẩm định bởi: {cert.verifiedByName}</span>
                    )}
                    {cert.status === "REJECTED" && cert.rejectionReason && (
                      <span className="text-red-600 font-medium">Lý do từ chối: {cert.rejectionReason}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: COURSES */}
      {activeTab === "COURSES" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {courses.map((course) => (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-blue-300 transition flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {course.code}
                    </span>
                    <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {course.category === "PEDAGOGY" ? "Sư phạm" : course.category === "PROFESSIONAL" ? "Chuyên môn Kiến trúc/XD" : "Bồi dưỡng"}
                    </span>
                    {course.status === "ONGOING" && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Đang diễn ra
                      </span>
                    )}
                    {course.status === "PLANNING" && (
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Sắp khai giảng
                      </span>
                    )}
                    {course.status === "COMPLETED" && (
                      <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                        Đã kết thúc
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-gray-900">{course.name}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{course.description}</p>

                  <div className="flex flex-wrap gap-4 text-xs text-gray-500 pt-1">
                    <span>Đơn vị tổ chức: <strong className="text-gray-800">{course.provider}</strong></span>
                    <span>Thời gian: <strong className="text-gray-800">{course.startDate}</strong> đến <strong className="text-gray-800">{course.endDate}</strong></span>
                    {course.location && <span>Địa điểm: <strong className="text-gray-800">{course.location}</strong></span>}
                    <span>Học viên: <strong className="text-blue-900">{course.participantCount} CBGV</strong></span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  {course.isRegisteredByMe ? (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ✓ Đã đăng ký ({course.myParticipantStatus || "Đang học"})
                    </span>
                  ) : course.status === "COMPLETED" ? (
                    <button disabled className="px-4 py-2 text-xs font-medium rounded-lg text-gray-400 bg-gray-100 cursor-not-allowed">
                      Đã kết thúc
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRegisterCourse(course.id)}
                      className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-900 hover:bg-blue-800 transition shadow-sm"
                    >
                      Đăng ký tham gia →
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: Khai báo Chứng chỉ Mới */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h2 className="text-lg font-bold text-gray-900">Khai báo Chứng chỉ / Văn bằng Mới</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCertificate} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nhóm chứng chỉ (*):
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PROFESSIONAL_PRACTICE">Chứng chỉ Hành nghề KTS / Kỹ sư Xây dựng</option>
                  <option value="ACADEMIC_TITLE_DEGREE">Bồi dưỡng Chức danh Giảng viên / Sư phạm đại học</option>
                  <option value="LANGUAGE">Ngoại ngữ (IELTS / TOEFL / VSTEP)</option>
                  <option value="INFORMATICS">Tin học & Công nghệ BIM Revit / ArchiCAD</option>
                  <option value="POLITICAL_THEORY">Lý luận Chính trị & Quản lý Nhà nước</option>
                  <option value="OTHER">Chứng chỉ khác</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên chứng chỉ / văn bằng (*):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Chứng chỉ Hành nghề Thiết kế Kiến trúc Công trình"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Số hiệu chứng chỉ (*):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: KTS-2025-012"
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Cơ quan / Đơn vị cấp (*):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Sở Xây dựng TP. Đà Nẵng"
                    value={formIssuer}
                    onChange={(e) => setFormIssuer(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ngày cấp (*):
                  </label>
                  <input
                    type="date"
                    required
                    value={formIssuedDate}
                    onChange={(e) => setFormIssuedDate(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Ngày hết hạn (Nếu có):
                  </label>
                  <input
                    type="date"
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Điểm số / Hạng / Xếp loại:
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Hạng I, 7.5 IELTS, Xuất sắc..."
                  value={formScore}
                  onChange={(e) => setFormScore(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Đường dẫn file scan / minh chứng (PDF/Ảnh):
                </label>
                <input
                  type="url"
                  placeholder="https://dau.edu.vn/uploads/chung-chi-kts.pdf"
                  value={formFileUrl}
                  onChange={(e) => setFormFileUrl(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-blue-900 hover:bg-blue-800 rounded-lg shadow-sm transition"
                >
                  Gửi Hồ sơ Thẩm định
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
