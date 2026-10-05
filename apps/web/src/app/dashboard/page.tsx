"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Lightbulb,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { Button, Card, StatCard, Badge } from "../../components/ui";

export default function ExecutiveDashboardPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "workforce" | "alerts">("overview");

  // Mock data mô phỏng số liệu thực tế của Trường ĐH Kiến trúc Đà Nẵng
  const overviewStats = {
    totalEmployees: 428,
    activeEmployees: 412,
    probationEmployees: 11,
    onLeaveEmployees: 5,
    doctorCount: 86,
    masterCount: 268,
    bachelorCount: 74,
    professorCount: 4,
    associateProfessorCount: 22,
    verifiedCertificatesCount: 168,
    expiringCertificatesCount: 14,
    expiringContractsCount: 8,
    pendingRequestsCount: 19,
  };

  const workforceDegree = [
    { label: "Tiến sĩ (Doctor)", count: 86, percentage: 20.1, color: "bg-brand-500" },
    { label: "Thạc sĩ (Master)", count: 268, percentage: 62.6, color: "bg-blue-400" },
    { label: "Cử nhân / KTS / Kỹ sư", count: 74, percentage: 17.3, color: "bg-slate-300" },
  ];

  const workforcePosition = [
    { label: "Giảng viên Giảng dạy (Academic)", count: 312, percentage: 72.9, color: "bg-emerald-600" },
    { label: "Chuyên viên Hành chính (Staff)", count: 88, percentage: 20.6, color: "bg-ochre-500" },
    { label: "Cán bộ Quản lý (Management)", count: 28, percentage: 6.5, color: "bg-brand-700" },
  ];

  const contractsData = [
    { label: "Không xác định thời hạn (Biên chế)", count: 236, percentage: 55.1 },
    { label: "Xác định thời hạn 36 tháng", count: 124, percentage: 29.0 },
    { label: "Xác định thời hạn 12 tháng", count: 42, percentage: 9.8 },
    { label: "Giảng viên Thỉnh giảng (Visiting)", count: 18, percentage: 4.2 },
    { label: "Hợp đồng Thử việc (Probation)", count: 8, percentage: 1.9 },
  ];

  const recentTurnovers = [
    {
      id: "ev-1",
      code: "DAU240001",
      name: "ThS. Đỗ Tuấn Kiệt",
      type: "PROMOTED",
      typeLabel: "Bổ nhiệm chức danh",
      decision: "QĐ-CD/2024-112",
      date: "2026-08-01",
      note: "Bổ nhiệm vào chức danh nghề nghiệp Giảng viên chính thức (Hạng III)",
    },
    {
      id: "ev-2",
      code: "DAU210001",
      name: "TS. KTS. Trần Quang Hưng",
      type: "APPOINTED",
      typeLabel: "Bổ nhiệm lãnh đạo",
      decision: "QĐ-BGH/2021-012",
      date: "2026-07-15",
      note: "Tái bổ nhiệm Trưởng Khoa Kiến trúc nhiệm kỳ 2026 - 2031",
    },
    {
      id: "ev-3",
      code: "DAU260012",
      name: "KTS. Nguyễn Hoàng Nam",
      type: "HIRED",
      typeLabel: "Tuyển dụng mới",
      decision: "QĐ-TD/2026-045",
      date: "2026-09-01",
      note: "Tuyển dụng Giảng viên Bộ môn Kiến trúc công trình",
    },
  ];

  const expiringContracts = [
    {
      id: "c-1",
      code: "DAU230001",
      name: "ThS. Nguyễn Văn Anh",
      unit: "Khoa Xây dựng",
      contractNo: "HDLD-2023/004-DAU",
      type: "DEFINITE_TERM_36M",
      expiryDate: "2026-10-08",
      daysLeft: 20,
    },
    {
      id: "c-2",
      code: "DAU200001",
      name: "TS. Lê Thị Mai",
      unit: "Khoa CNTT",
      contractNo: "HDLD-2020/002-DAU",
      type: "DEFINITE_TERM_36M",
      expiryDate: "2026-11-15",
      daysLeft: 58,
    },
  ];

  const expiringCerts = [
    {
      id: "cert-1",
      code: "DAU240001",
      name: "ThS. Đỗ Tuấn Kiệt",
      unit: "Khoa Kiến trúc",
      certName: "Chứng chỉ Hành nghề KTS - Chủ trì thiết kế",
      expiryDate: "2026-10-13",
      daysLeft: 25,
      level: "CRITICAL_30",
    },
    {
      id: "cert-2",
      code: "DAU210005",
      name: "KTS. Phạm Thanh Hải",
      unit: "Khoa Kiến trúc",
      certName: "Chứng chỉ Thiết kế Kết cấu Xây dựng",
      expiryDate: "2026-11-20",
      daysLeft: 63,
      level: "WARNING_90",
    },
  ];

  const pendingApprovals = [
    {
      id: "app-1",
      type: "LEAVE",
      typeLabel: "Nghỉ phép",
      title: "Đơn xin nghỉ phép thường niên (2 ngày)",
      submittedBy: "ThS. Đỗ Tuấn Kiệt",
      unit: "Khoa Kiến trúc",
      time: "10 phút trước",
    },
    {
      id: "app-2",
      type: "KPI",
      typeLabel: "KPI",
      title: "Phiếu đánh giá KPI Học kỳ 2 - Tự chấm 92.5đ",
      submittedBy: "ThS. Nguyễn Văn Anh",
      unit: "Khoa Xây dựng",
      time: "2 giờ trước",
    },
    {
      id: "app-3",
      type: "CERTIFICATE",
      typeLabel: "Chứng chỉ",
      title: "Thẩm định: Chứng chỉ Autodesk Certified Professional Revit",
      submittedBy: "ThS. Đỗ Tuấn Kiệt",
      unit: "Khoa Kiến trúc",
      time: "1 ngày trước",
    },
  ];

  return (
    <AuthGuard moduleName="Executive Dashboard Ban Giám hiệu">
      <div className="space-y-6">
        {/* Header Điều hành */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
          <div>
            <div className="flex items-center space-x-2">
              <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
                Executive Dashboard
              </span>
              <span className="text-xs text-muted">• Báo cáo Hội đồng Trường & Ban Giám hiệu</span>
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
              Trung Tâm Điều Hành Nhân Sự Chiến Lược DAU
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Dữ liệu thời gian thực tích hợp từ 6 phân hệ quản trị Trường Đại học Kiến trúc Đà Nẵng
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <Link
              href="/ai-assistant"
              className="inline-flex items-center space-x-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors"
            >
              <Sparkles size={14} />
              <span>Hỏi Trợ Lý AI</span>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => alert("Đã xuất báo cáo thống kê nhân sự quý dạng PDF")}
            >
              <FileSpreadsheet size={14} />
              <span>Xuất Báo Cáo</span>
            </Button>
          </div>
        </div>

        {/* 4 Thẻ KPI Chỉ số cốt lõi */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tổng CBGV Toàn Trường"
            value={overviewStats.totalEmployees}
            icon={<Users size={18} />}
            subvalue={
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span className="text-emerald-700 font-semibold">{overviewStats.activeEmployees} đang công tác</span>
                <span>•</span>
                <span>{overviewStats.probationEmployees} thử việc</span>
              </div>
            }
          />

          <StatCard
            title="Tỷ lệ Trình độ Cao (TS + ThS)"
            value={`${(((overviewStats.doctorCount + overviewStats.masterCount) / overviewStats.totalEmployees) * 100).toFixed(1)}%`}
            icon={<GraduationCap size={18} className="text-brand-600" />}
            subvalue={
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span>{overviewStats.doctorCount} TS, {overviewStats.masterCount} ThS</span>
                <span>•</span>
                <span className="text-emerald-700 font-semibold">Đạt chuẩn KĐCL</span>
              </div>
            }
          />

          <StatCard
            title="Chứng Chỉ Hành Nghề KTS / KS"
            value={overviewStats.verifiedCertificatesCount}
            icon={<Compass size={18} className="text-emerald-600" />}
            subvalue={
              <div className="flex items-center gap-1 text-xs text-amber-800">
                <AlertTriangle size={12} className="text-amber-600 shrink-0" />
                <span><b>{overviewStats.expiringCertificatesCount}</b> chứng chỉ cần gia hạn</span>
              </div>
            }
          />

          <StatCard
            title="Hồ Sơ Chờ Phê Duyệt"
            value={overviewStats.pendingRequestsCount}
            icon={<Zap size={18} className="text-amber-600" />}
            subvalue={
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <span>HĐ sắp hết hạn: <b className="text-rose-600">{overviewStats.expiringContractsCount}</b></span>
                <span>•</span>
                <Link href="/approvals" className="text-brand-600 hover:underline font-semibold flex items-center gap-0.5">
                  Xử lý ngay <ArrowRight size={11} />
                </Link>
              </div>
            }
          />
        </div>

        {/* Tabs chuyển đổi góc nhìn */}
        <div className="flex space-x-2 border-b border-line">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === "overview"
                ? "border-brand-500 text-brand-700 font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Cơ Cấu Học Thuật & Vị Trí
          </button>
          <button
            onClick={() => setActiveTab("workforce")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer ${
              activeTab === "workforce"
                ? "border-brand-500 text-brand-700 font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            Hợp Đồng & Biến Động Nhân Sự
          </button>
          <button
            onClick={() => setActiveTab("alerts")}
            className={`px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors border-b-2 -mb-px flex items-center space-x-1.5 cursor-pointer ${
              activeTab === "alerts"
                ? "border-brand-500 text-brand-700 font-bold"
                : "border-transparent text-muted hover:text-ink"
            }`}
          >
            <span>Trung Tâm Cảnh Báo Tập Trung</span>
            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
              {overviewStats.expiringContractsCount + overviewStats.expiringCertificatesCount}
            </span>
          </button>
        </div>

        {/* Tab 1: Cơ Cấu Học Thuật & Vị Trí Việc Làm */}
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Phân bố Trình độ Học vị */}
            <Card className="p-6">
              <h3 className="text-sm sm:text-base font-bold text-ink">
                Cơ Cấu Trình Độ Học Vị (Academic Degree)
              </h3>
              <p className="mt-1 text-xs text-muted">
                Tỷ lệ học vị chuyên môn theo chuẩn kiểm định đại học Bộ GD&ĐT
              </p>

              <div className="mt-6 space-y-4">
                {workforceDegree.map((d) => (
                  <div key={d.label}>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>{d.label}</span>
                      <span>
                        <b>{d.count} người</b> ({d.percentage}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${d.color}`}
                        style={{ width: `${d.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-lg bg-blue-50/70 p-3.5 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                <Lightbulb size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Chiến lược DAU:</span> Tiếp tục đẩy mạnh Đề án 89 đào tạo Tiến sĩ trong và ngoài nước cho CBGV Khoa Kiến trúc và Xây dựng để đạt mục tiêu 30% Tiến sĩ vào năm 2030.
                </div>
              </div>
            </Card>

            {/* Phân bố Vị trí việc làm */}
            <Card className="p-6">
              <h3 className="text-sm sm:text-base font-bold text-ink">
                Cơ Cấu Vị Trí Việc Làm (Position Classification)
              </h3>
              <p className="mt-1 text-xs text-muted">
                Phân bố nhân lực giữa công tác giảng dạy, nghiên cứu và hỗ trợ quản trị
              </p>

              <div className="mt-6 space-y-4">
                {workforcePosition.map((p) => (
                  <div key={p.label}>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>{p.label}</span>
                      <span>
                        <b>{p.count} người</b> ({p.percentage}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${p.color}`}
                        style={{ width: `${p.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-4 text-center">
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                  <span className="text-[10px] text-muted uppercase font-bold">Giáo sư</span>
                  <p className="text-lg font-bold text-ink font-mono">{overviewStats.professorCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                  <span className="text-[10px] text-muted uppercase font-bold">Phó Giáo sư</span>
                  <p className="text-lg font-bold text-ink font-mono">{overviewStats.associateProfessorCount}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-2 border border-slate-100">
                  <span className="text-[10px] text-muted uppercase font-bold">GV chính</span>
                  <p className="text-lg font-bold text-ink font-mono">48</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tab 2: Hợp Đồng & Dòng Biến Động */}
        {activeTab === "workforce" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h3 className="text-sm sm:text-base font-bold text-ink">
                Cơ Cấu Hợp Đồng Lao Động
              </h3>
              <p className="mt-1 text-xs text-muted">
                Phân loại hợp đồng lao động hiện đang có hiệu lực tại Trường DAU
              </p>

              <div className="mt-5 divide-y divide-line">
                {contractsData.map((c) => (
                  <div key={c.label} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-medium">{c.label}</span>
                    <div className="flex items-center space-x-3">
                      <span className="font-bold text-ink font-mono">{c.count}</span>
                      <span className="w-12 text-right text-muted">{c.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm sm:text-base font-bold text-ink">
                Nhật Ký Biến Động Nhân Sự Gần Nhất
              </h3>
              <p className="mt-1 text-xs text-muted">
                Các quyết định tuyển dụng, bổ nhiệm, điều chuyển nhân sự mới ban hành
              </p>

              <div className="mt-5 space-y-3">
                {recentTurnovers.map((ev) => (
                  <div
                    key={ev.id}
                    className="rounded-lg border border-line bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
                          {ev.typeLabel}
                        </span>
                        <span className="text-xs font-bold text-ink">{ev.name}</span>
                        <span className="text-[11px] font-mono text-muted">({ev.code})</span>
                      </div>
                      <span className="text-[11px] text-muted font-mono">{ev.date}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-600">{ev.note}</p>
                    <p className="mt-0.5 text-[10px] font-mono text-muted">
                      Số QĐ: {ev.decision}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Tab 3: Trung Tâm Cảnh Báo Điều Hành Tập Trung */}
        {activeTab === "alerts" && (
          <div className="space-y-6">
            {/* Cảnh báo Hợp đồng 60 ngày */}
            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center space-x-2">
                  <FileText size={17} className="text-brand-600" />
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    Hợp Đồng Sắp Hết Hạn Trong 60 Ngày
                  </h3>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
                    {expiringContracts.length} hợp đồng
                  </span>
                </div>
                <Link href="/contracts" className="text-xs font-semibold text-brand-600 hover:underline">
                  Quản lý Hợp đồng &rarr;
                </Link>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-slate-50 text-slate-600">
                      <th className="p-3">Mã CBGV</th>
                      <th className="p-3">Họ và Tên</th>
                      <th className="p-3">Đơn vị</th>
                      <th className="p-3">Số Hợp Đồng</th>
                      <th className="p-3">Hạn Hết</th>
                      <th className="p-3">Còn Lại</th>
                      <th className="p-3 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {expiringContracts.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-medium text-slate-700">{c.code}</td>
                        <td className="p-3 font-bold text-ink">{c.name}</td>
                        <td className="p-3 text-slate-600">{c.unit}</td>
                        <td className="p-3 font-mono text-muted">{c.contractNo}</td>
                        <td className="p-3 text-slate-600 font-mono">{c.expiryDate}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                            {c.daysLeft} ngày
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link
                            href="/contracts"
                            className="rounded bg-brand-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-brand-600 transition-colors shadow-2xs"
                          >
                            Tái Ký / Gia Hạn
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Cảnh báo Chứng chỉ sắp hết hạn */}
            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center space-x-2">
                  <Compass size={17} className="text-emerald-600" />
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    Chứng Chỉ Hành Nghề & Chuyên Môn Cần Gia Hạn
                  </h3>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {expiringCerts.length} chứng chỉ
                  </span>
                </div>
                <Link href="/training/manage" className="text-xs font-semibold text-brand-600 hover:underline">
                  Xem Phân hệ Đào tạo &rarr;
                </Link>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-slate-50 text-slate-600">
                      <th className="p-3">Mã CBGV</th>
                      <th className="p-3">Họ và Tên</th>
                      <th className="p-3">Đơn vị</th>
                      <th className="p-3">Tên Chứng Chỉ</th>
                      <th className="p-3">Ngày Hết Hạn</th>
                      <th className="p-3">Mức Cảnh Báo</th>
                      <th className="p-3 text-right">Nhắc Nhở</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {expiringCerts.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-50">
                        <td className="p-3 font-mono font-medium text-slate-700">{cert.code}</td>
                        <td className="p-3 font-bold text-ink">{cert.name}</td>
                        <td className="p-3 text-slate-600">{cert.unit}</td>
                        <td className="p-3 font-medium text-slate-800">{cert.certName}</td>
                        <td className="p-3 text-slate-600 font-mono">{cert.expiryDate}</td>
                        <td className="p-3">
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800 border border-amber-300">
                            {cert.daysLeft} ngày ({cert.level})
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => alert(`Đã gửi thông báo Outbox nhắc nhở cập nhật chứng chỉ tới ${cert.name}`)}
                            className="rounded border border-line px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Gửi Thông Báo
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Danh sách Việc chờ duyệt */}
            <Card className="p-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center space-x-2">
                  <Zap size={17} className="text-amber-600" />
                  <h3 className="text-sm sm:text-base font-bold text-ink">
                    Hồ Sơ Hành Chính Chờ Lãnh Đạo Phê Duyệt
                  </h3>
                </div>
                <Link href="/approvals" className="text-xs font-semibold text-brand-600 hover:underline">
                  Vào Hộp Thư Phê Duyệt &rarr;
                </Link>
              </div>

              <div className="mt-4 space-y-3">
                {pendingApprovals.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border border-line bg-slate-50/50 p-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="rounded bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
                          {app.typeLabel}
                        </span>
                        <span className="text-xs font-bold text-ink">{app.title}</span>
                      </div>
                      <p className="text-xs text-muted">
                        Người nộp: <b>{app.submittedBy}</b> • {app.unit} • <span className="text-slate-400 font-mono">{app.time}</span>
                      </p>
                    </div>
                    <Link
                      href="/approvals"
                      className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors shadow-2xs"
                    >
                      Xem & Duyệt
                    </Link>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
