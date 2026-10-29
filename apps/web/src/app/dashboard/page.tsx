"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  Banknote,
  BookMarked,
  BookOpen,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Compass,
  Cpu,
  FileCheck,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HardDrive,
  Inbox,
  Layers,
  Lightbulb,
  Plane,
  Play,
  RotateCcw,
  ScrollText,
  Server,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { AuthGuard } from "../../components/AuthGuard";
import { Button, Card, StatCard, Badge, cx } from "../../components/ui";

export default function AdaptiveDashboardPage() {
  const { user } = useAuth();

  // Role detection: default to LECTURER if not logged in or during SSR
  const role = user?.role || "LECTURER";

  return (
    <AuthGuard moduleName="Bàn Làm Việc Đa Phân Cấp (Role-Adaptive Dashboard)">
      <div className="space-y-6">
        {/* Role indicator alert strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-brand-50 via-white to-slate-50 p-3.5 border border-brand-100 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-white font-bold text-xs shadow-2xs">
              {role === "LECTURER" ? "GV" : role === "DEAN" ? "TK" : role === "HR_SPECIALIST" ? "TC" : role === "RECTOR" ? "HT" : "AD"}
            </div>
            <div>
              <p className="text-xs font-bold text-ink leading-tight flex items-center gap-1.5">
                <span>{user?.fullName || "ThS. Nguyễn Văn An"}</span>
                <span className="text-[10px] rounded bg-brand-100 text-brand-800 px-1.5 py-0.2 font-semibold">
                  {user?.roleLabel || "Giảng viên (CBGV)"}
                </span>
              </p>
              <p className="text-[11px] text-muted">
                {user?.unitName || "Khoa Kiến trúc"} · Không gian làm việc được cá nhân hóa theo thẩm quyền
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[11px] text-slate-500 hidden sm:inline">Trải nghiệm vai trò khác:</span>
            <span className="text-[11px] font-semibold text-brand-600 bg-white px-2 py-1 rounded border border-line shadow-2xs">
              Sử dụng Menu góc trên bên phải để đổi vai trò Demo
            </span>
          </div>
        </div>

        {/* Render specific workspace based on detected role */}
        {role === "LECTURER" && <LecturerDashboardView user={user} />}
        {role === "DEAN" && <DeanDashboardView user={user} />}
        {role === "HR_SPECIALIST" && <HrDashboardView user={user} />}
        {role === "RECTOR" && <RectorDashboardView user={user} />}
        {role === "SYSTEM_ADMIN" && <SystemAdminDashboardView user={user} />}
      </div>
    </AuthGuard>
  );
}

// ============================================================================
// 1. VAI TRÒ 1: GIẢNG VIÊN / CBGV THƯỜNG (ThS. Nguyễn Văn An)
// ============================================================================
function LecturerDashboardView({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
              Góc Cá Nhân CBGV
            </span>
            <span className="text-xs text-muted">• Khoa Kiến trúc · Bộ môn Kiến trúc Công trình</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Bàn Làm Việc Giảng Viên — {user?.fullName || "ThS. Nguyễn Văn An"}
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Quản lý kế hoạch giảng dạy, định mức giờ chuẩn studio, phép năm và hồ sơ đào tạo cá nhân
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/leave"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs transition-colors"
          >
            <Wallet size={14} />
            <span>Tạo Đơn Xin Phép</span>
          </Link>
          <Link
            href="/workload"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <BookOpen size={14} />
            <span>Khai Báo Giờ Chuẩn</span>
          </Link>
        </div>
      </div>

      {/* 4 Thẻ KPI Giảng viên */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Định Mức Giờ Chuẩn 2025-2026"
          value="320 / 450h"
          icon={<BookOpen size={18} className="text-brand-600" />}
          trend={{ label: "Đạt 71.1%", tone: "success" }}
          subvalue={
            <div className="space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: "71.1%" }} />
              </div>
              <p className="text-[11px] text-muted">Còn 130 giờ để hoàn thành định mức năm</p>
            </div>
          }
        />

        <StatCard
          title="Số Ngày Phép Năm 2026"
          value="10.5 / 12 Ngày"
          icon={<Wallet size={18} className="text-emerald-600" />}
          subvalue={
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="text-emerald-700 font-semibold">10.5 ngày khả dụng</span>
              <span>•</span>
              <span>1.5 ngày đã nghỉ</span>
            </div>
          }
        />

        <StatCard
          title="Chấm Công & Điểm Danh Tháng 9"
          value="22 / 22 Buổi"
          icon={<CalendarCheck size={18} className="text-blue-600" />}
          trend={{ label: "100% Đúng giờ", tone: "success" }}
          subvalue={
            <div className="flex items-center gap-1 text-xs text-emerald-700">
              <CheckCircle2 size={12} className="shrink-0" />
              <span>Không có buổi trễ/quên quẹt thẻ</span>
            </div>
          }
        />

        <StatCard
          title="Đánh Giá KPI Giảng Viên (HK1)"
          value="92.5 / 100đ"
          icon={<Award size={18} className="text-amber-600" />}
          subvalue={
            <div className="flex items-center gap-1 text-xs text-brand-700 font-semibold">
              <span>Xếp loại: Xuất sắc</span>
              <span>•</span>
              <span className="text-muted font-normal">Hội đồng Khoa đã duyệt</span>
            </div>
          }
        />
      </div>

      {/* Grid 2 Cột: Lịch Giảng Dạy & Đồ Án / Đơn Từ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột 1 & 2: Lịch Giảng Dạy & Hướng Dẫn Đồ Án */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lịch Studio Tuần này */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Calendar size={16} className="text-brand-600" />
                <span>Lịch Giảng Dạy & Hướng Dẫn Studio Tuần Này (Tuần 08)</span>
              </h3>
              <Badge tone="brand">Học kỳ 1 / 2025-2026</Badge>
            </div>
            <div className="space-y-3">
              {[
                {
                  day: "Thứ Hai (29/09)",
                  time: "07:30 - 11:30",
                  subject: "Đồ án Kiến trúc Công cộng 1 (K23-KT)",
                  room: "Studio 402 - Nhà F",
                  students: 32,
                  status: "Đã hoàn thành",
                  done: true,
                },
                {
                  day: "Thứ Tư (01/10)",
                  time: "13:30 - 17:00",
                  subject: "Chấm duyệt phương án Đồ án Tốt nghiệp K20",
                  room: "Hội đồng 2 - Tầng 3",
                  students: 8,
                  status: "Sắp diễn ra",
                  done: false,
                },
                {
                  day: "Thứ Sáu (03/10)",
                  time: "08:00 - 10:30",
                  subject: "Sinh hoạt Chuyên môn Bộ môn Kiến trúc",
                  room: "Văn phòng Khoa KT",
                  students: 14,
                  status: "Định kỳ",
                  done: false,
                },
              ].map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-xl border border-line bg-slate-50/70 hover:bg-brand-50/50 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg bg-white p-2 border border-line text-center min-w-[70px]">
                      <span className="text-[11px] font-bold text-brand-700 block">{c.day.split(" ")[0]}</span>
                      <span className="text-[10px] text-muted">{c.day.split(" ")[1]}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-ink">{c.subject}</p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {c.time} · Phòng: <strong>{c.room}</strong> · {c.students} sinh viên
                      </p>
                    </div>
                  </div>
                  <Badge tone={c.done ? "success" : "info"}>{c.status}</Badge>
                </div>
              ))}
            </div>
          </Card>

          {/* Sinh Viên Hướng Dẫn Đồ Án */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Compass size={16} className="text-emerald-600" />
                <span>Tiến Độ Hướng Dẫn Đồ Án Tốt Nghiệp KTS (K21)</span>
              </h3>
              <span className="text-xs text-muted font-medium">8 Sinh viên phụ trách</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {[
                { name: "Lê Hoàng Phúc", topic: "Bảo tàng Văn hóa Biển Đà Nẵng", progress: 85, phase: "Giai đoạn 3: Chi tiết kiến trúc" },
                { name: "Trần Minh Châu", topic: "Trung tâm Đổi mới Sáng tạo Hòa Vang", progress: 70, phase: "Giai đoạn 2: Sơ đồ công năng" },
                { name: "Phạm Quốc Bảo", topic: "Tổ hợp Không gian Văn hóa Ngũ Hành Sơn", progress: 90, phase: "Giai đoạn 3: Phối cảnh & 3D" },
                { name: "Nguyễn Hải Yến", topic: "Thư viện Cộng đồng Bán đảo Sơn Trà", progress: 65, phase: "Giai đoạn 2: Mặt bằng kỹ thuật" },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl border border-line bg-white space-y-1.5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{s.name}</span>
                    <span className="font-mono text-emerald-700 font-bold">{s.progress}%</span>
                  </div>
                  <p className="text-[11px] text-muted truncate" title={s.topic}>{s.topic}</p>
                  <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div className="bg-emerald-500 h-1 rounded-full" style={{ width: `${s.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-500">{s.phase}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Cột 3: Đơn Từ Cá Nhân & Trợ Lý AI */}
        <div className="space-y-6">
          {/* Trạng thái Đơn từ gần đây */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Clock size={16} className="text-blue-600" />
                <span>Đơn Từ Của Tôi</span>
              </h3>
              <Link href="/leave" className="text-[11px] font-semibold text-brand-600 hover:underline">
                Xem tất cả →
              </Link>
            </div>
            <div className="space-y-3">
              <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Nghỉ phép năm (2 ngày)</span>
                  <Badge tone="success">Đã duyệt</Badge>
                </div>
                <p className="text-[11px] text-muted mt-1">Từ 22/09 đến 23/09 · ThS. Võ Hoàng Long dạy thay</p>
                <p className="text-[10px] text-emerald-800 mt-1 font-medium">✓ Trưởng Khoa đã ký duyệt ngày 20/09</p>
              </div>

              <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-ink">Giờ chuẩn NCKH & Hội thảo</span>
                  <Badge tone="warning">Đang thẩm định</Badge>
                </div>
                <p className="text-[11px] text-muted mt-1">Đề tài: Kiến trúc Xanh Thích ứng Biến đổi khí hậu</p>
                <p className="text-[10px] text-amber-800 mt-1 font-medium">⏳ Đang chờ Hội đồng Khoa học phê duyệt quy đổi (45 giờ)</p>
              </div>
            </div>
          </Card>

          {/* AI Trợ lý Gợi ý cá nhân */}
          <Card className="p-5 bg-gradient-to-br from-purple-50/70 to-white border-purple-200">
            <div className="flex items-center gap-2 text-purple-700 font-bold text-xs mb-2">
              <Sparkles size={16} />
              <span>Gợi Ý Từ AI Trợ Lý Đào Tạo</span>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Thầy An có <strong>1 bài báo khoa học</strong> vừa được chấp nhận đăng tại Tạp chí Khoa học & Công nghệ. Bạn có thể nộp minh chứng để tự động cộng <strong>40 giờ chuẩn NCKH</strong> vào hồ sơ năm học.
            </p>
            <Link
              href="/ai-assistant"
              className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:underline"
            >
              Hỏi chi tiết cách nộp minh chứng →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 2. VAI TRÒ 2: TRƯỞNG KHOA (PGS.TS. Trần Thị Bình - Khoa Kiến trúc)
// ============================================================================
function DeanDashboardView({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Header Điều hành Khoa */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
              Điều Hành Cấp Khoa
            </span>
            <span className="text-xs text-muted">• Khoa Kiến trúc DAU</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Trung Tâm Điều Hành Khoa Kiến Trúc — {user?.fullName || "PGS.TS. Trần Thị Bình"}
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Quản trị 48 CBGV, 12 Bộ môn/Xưởng đồ án, thẩm định giờ chuẩn và phê duyệt công tác cấp Khoa
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/approvals"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
          >
            <Inbox size={14} />
            <span>Duyệt Đơn Khoa (3 Chờ)</span>
          </Link>
          <Link
            href="/employees"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <Users size={14} />
            <span>Nhân Sự Khoa</span>
          </Link>
        </div>
      </div>

      {/* 4 Thẻ KPI Trưởng Khoa */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Đơn Chờ Trưởng Khoa Duyệt"
          value="3 Đơn"
          icon={<Inbox size={18} className="text-amber-600" />}
          trend={{ label: "Cần xử lý", tone: "warning" }}
          subvalue={
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="text-amber-800 font-semibold">2 đơn nghỉ phép</span>
              <span>•</span>
              <span>1 lệnh công tác</span>
            </div>
          }
        />

        <StatCard
          title="CBGV Thuộc Khoa Kiến Trúc"
          value="48 Cán bộ"
          icon={<Users size={18} className="text-brand-600" />}
          subvalue={
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>42 Cơ hữu</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">6 Thỉnh giảng KTS</span>
            </div>
          }
        />

        <StatCard
          title="Tiến Độ Giờ Chuẩn Toàn Khoa"
          value="84.2%"
          icon={<TrendingUp size={18} className="text-emerald-600" />}
          trend={{ label: "+6.4% so cùng kỳ", tone: "success" }}
          subvalue={
            <div className="flex items-center gap-1 text-xs text-amber-700 font-medium">
              <AlertTriangle size={12} className="shrink-0" />
              <span>3 GV có nguy cơ thiếu giờ studio</span>
            </div>
          }
        />

        <StatCard
          title="Xưởng Đồ Án / Studio Hoạt Động"
          value="24 Xưởng"
          icon={<Compass size={18} className="text-purple-600" />}
          subvalue={
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>312 Sinh viên</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">100% có GVHD</span>
            </div>
          }
        />
      </div>

      {/* Grid 2 Cột: Đơn Duyệt Cấp Khoa & Cảnh Báo Thiếu Giờ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hộp Thư Duyệt Cấp Khoa */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <Inbox size={16} className="text-amber-600" />
                <span>Đơn Từ Chờ Trưởng Khoa Phê Duyệt Cấp 1</span>
              </h3>
              <Badge tone="warning">3 Đơn Mới</Badge>
            </div>
            <div className="space-y-3">
              {[
                {
                  id: "app-101",
                  name: "ThS. Đỗ Tuấn Kiệt",
                  type: "Nghỉ phép năm (3 ngày)",
                  reason: "Giải quyết việc gia đình cá nhân",
                  substitute: "ThS. Nguyễn Văn An dạy thay môn KTS Công cộng",
                  time: "15 phút trước",
                  subOk: true,
                },
                {
                  id: "app-102",
                  name: "KTS. Phạm Thanh Hải",
                  type: "Lệnh công tác chuyên môn",
                  reason: "Tham gia Hội đồng Quy hoạch Đô thị tại TP. Tam Kỳ",
                  substitute: "Đã bố trí chuyển lịch sang tuần sau",
                  time: "2 giờ trước",
                  subOk: true,
                },
                {
                  id: "app-103",
                  name: "ThS. Võ Hoàng Long",
                  type: "Đăng ký Hội thảo Quốc tế",
                  reason: "Báo cáo bài báo tại Hội nghị Kiến trúc Xanh Châu Á",
                  substitute: "Có minh chứng thư mời chính thức",
                  time: "Hôm qua",
                  subOk: true,
                },
              ].map((req) => (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-line bg-white hover:border-amber-300 transition space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-ink">{req.name}</span>
                      <span className="ml-2 text-[11px] text-brand-700 bg-brand-50 px-2 py-0.5 rounded font-semibold">
                        {req.type}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted">{req.time}</span>
                  </div>
                  <p className="text-xs text-slate-700">Lý do: {req.reason}</p>
                  <div className="flex items-center justify-between pt-2 border-t border-line text-xs">
                    <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium">
                      <CheckCircle2 size={12} /> {req.substitute}
                    </span>
                    <div className="flex items-center gap-2">
                      <Link
                        href="/approvals"
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-bold text-white shadow-2xs transition"
                      >
                        Đồng Ý Duyệt
                      </Link>
                      <Link
                        href="/approvals"
                        className="rounded-lg border border-slate-300 hover:bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 transition"
                      >
                        Chi Tiết
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Cột Phụ: Cảnh Báo Thiếu Giờ Giảng Dạy Khoa */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-3">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" />
                <span>Cảnh Báo Định Mức Giờ Dạy</span>
              </h3>
              <Badge tone="danger">Cần Phân Bổ</Badge>
            </div>
            <p className="text-xs text-muted mb-3">
              Các giảng viên đang có tỷ lệ tích lũy giờ dưới 50%, cần phân công thêm đồ án chuyên ngành:
            </p>
            <div className="space-y-2.5 text-xs">
              {[
                { name: "ThS. Hoàng Văn Đức", progress: 42, missing: 155, note: "Bộ môn Công nghệ XD" },
                { name: "KTS. Lê Thị Thảo", progress: 45, missing: 140, note: "Bộ môn Quy hoạch" },
                { name: "ThS. Trần Đình Trọng", progress: 48, missing: 125, note: "Bộ môn Lý luận Kiến trúc" },
              ].map((g, i) => (
                <div key={i} className="p-3 rounded-lg border border-rose-100 bg-rose-50/40 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink">{g.name}</span>
                    <span className="font-mono text-rose-700 font-bold">{g.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                    <div className="bg-rose-500 h-1 rounded-full" style={{ width: `${g.progress}%` }} />
                  </div>
                  <p className="text-[10px] text-muted">Thiếu {g.missing} giờ · {g.note}</p>
                </div>
              ))}
            </div>
            <Link
              href="/workload"
              className="mt-4 block text-center rounded-lg bg-slate-100 hover:bg-slate-200 py-2 text-xs font-bold text-slate-700 transition"
            >
              Vào Bảng Phân Bổ Studio Khoa →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 3. VAI TRÒ 3: PHÒNG TỔ CHỨC - HÀNH CHÍNH (ThS. Lê Minh Cường)
// ============================================================================
function HrDashboardView({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Header Điều hành TCHC */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-blue-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-blue-700 border border-blue-200">
              Quản Trị Nhân Sự Toàn Trường
            </span>
            <span className="text-xs text-muted">• Phòng Tổ chức - Hành chính</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Trung Tâm Nghiệp Vụ Nhân Sự — {user?.fullName || "ThS. Lê Minh Cường"}
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Quản trị 428 hồ sơ CBGV, quản lý hợp đồng lao động, chốt công và lập bảng lương Nghị định 85
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/payroll"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
          >
            <Banknote size={14} />
            <span>Tính Lương NĐ 85</span>
          </Link>
          <Link
            href="/contracts"
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition-colors"
          >
            <FileText size={14} />
            <span>Hợp Đồng Hết Hạn</span>
          </Link>
        </div>
      </div>

      {/* 4 Thẻ KPI TCHC */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Hợp Đồng Sắp Hết Hạn (30-60 ngày)"
          value="8 Hợp đồng"
          icon={<FileText size={18} className="text-rose-600" />}
          trend={{ label: "Cần tái ký", tone: "danger" }}
          subvalue={
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span className="text-rose-700 font-semibold">2 HĐ còn dưới 30 ngày</span>
              <span>•</span>
              <span>6 HĐ còn 60 ngày</span>
            </div>
          }
        />

        <StatCard
          title="Chứng Chỉ KTS Cần Gia Hạn"
          value="14 Chứng chỉ"
          icon={<Compass size={18} className="text-amber-600" />}
          subvalue={
            <div className="flex items-center gap-1 text-xs text-amber-800">
              <AlertTriangle size={12} className="shrink-0" />
              <span>Phục vụ kiểm định chuẩn quốc gia</span>
            </div>
          }
        />

        <StatCard
          title="Quẹt Thẻ Bất Thường Tháng Này"
          value="12 Trường hợp"
          icon={<CalendarCheck size={18} className="text-blue-600" />}
          subvalue={
            <div className="flex items-center gap-1.5 text-xs text-muted">
              <span>9 trường hợp quên quẹt</span>
              <span>•</span>
              <span className="text-blue-700 font-semibold">Đã có giải trình</span>
            </div>
          }
        />

        <StatCard
          title="Kỳ Lương Tháng 9/2026"
          value="ĐANG MỞ KỲ"
          icon={<Banknote size={18} className="text-emerald-600" />}
          subvalue={
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
              <CheckCircle2 size={12} />
              <span>Đã nạp bảng công 100% CBGV</span>
            </div>
          }
        />
      </div>

      {/* Grid 2 Cột: Danh Sách HĐ Sắp Hết Hạn & Tiến Độ Lập Lương */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <FileText size={16} className="text-rose-600" />
                <span>Danh Sách Cán Bộ Sắp Hết Hạn Hợp Đồng Lao Động</span>
              </h3>
              <Link href="/contracts" className="text-xs font-semibold text-brand-600 hover:underline">
                Quản lý tất cả hợp đồng →
              </Link>
            </div>
            <div className="space-y-3">
              {[
                { name: "ThS. Nguyễn Văn Anh", unit: "Khoa Xây dựng", contract: "HDLD-2023/004-DAU", daysLeft: 20, type: "Xác định thời hạn 36 tháng", urgent: true },
                { name: "TS. Lê Thị Mai", unit: "Khoa CNTT", contract: "HDLD-2020/002-DAU", daysLeft: 45, type: "Xác định thời hạn 36 tháng", urgent: false },
                { name: "KTS. Đặng Thanh Tùng", unit: "Khoa Kiến trúc", contract: "HDLD-2025/089-DAU", daysLeft: 52, type: "Hợp đồng thử việc", urgent: false },
              ].map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-line bg-white hover:border-brand-300 transition shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-ink">{c.name}</span>
                      <span className="text-[11px] text-muted">({c.unit})</span>
                    </div>
                    <p className="text-[11px] text-muted">Số HĐ: <strong className="font-mono text-slate-700">{c.contract}</strong> · {c.type}</p>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge tone={c.urgent ? "danger" : "warning"}>Còn {c.daysLeft} ngày</Badge>
                    <p className="text-[10px] text-brand-600 font-semibold hover:underline cursor-pointer">Lập phụ lục gia hạn →</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Tiến Độ Chốt Lương Toàn Trường */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 border-b border-line pb-3 mb-3">
              <Banknote size={16} className="text-emerald-600" />
              <span>Tiến Độ Bảng Lương Tháng 9/2026</span>
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between text-muted">
                <span>1. Chốt dữ liệu chấm công:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">✓ Đã chốt</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>2. Tính toán lương tự động:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">✓ 428/428 CBGV</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>3. Phòng TCHC thẩm định:</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">✓ Đã ký duyệt</span>
              </div>
              <div className="flex items-center justify-between text-muted">
                <span>4. Hiệu trưởng ký số PKI:</span>
                <span className="font-bold text-amber-700 flex items-center gap-1">⏳ Đang trình ký</span>
              </div>
            </div>
            <Link
              href="/payroll"
              className="mt-4 block text-center rounded-lg bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-bold text-white transition shadow-2xs"
            >
              Mở Bảng Tính Lương Chi Tiết →
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 4. VAI TRÒ 4: HIỆU TRƯỞNG / BAN GIÁM HIỆU (GS.TS. Hoàng Đức Dũng)
// ============================================================================
function RectorDashboardView({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Header Điều Hành Ban Giám Hiệu */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-brand-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-brand-700 border border-brand-200">
              Executive Cockpit · Ban Giám Hiệu
            </span>
            <span className="text-xs text-muted">• Trường Đại học Kiến trúc Đà Nẵng</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Trung Tâm Điều Hành Chiến Lược DAU — {user?.fullName || "GS.TS. Hoàng Đức Dũng"}
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Báo cáo Hội đồng trường, ký số văn bản hành chính NĐ 30/2020/NĐ-CP và phê duyệt chi lương toàn trường
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/payroll"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
          >
            <Banknote size={14} />
            <span>Ký Duyệt Bảng Lương</span>
          </Link>
          <Link
            href="/admin/system"
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 px-3.5 py-2 text-xs font-semibold shadow-2xs transition-colors"
          >
            <Activity size={14} />
            <span>Control Center K8s</span>
          </Link>
        </div>
      </div>

      {/* 4 Thẻ KPI Ban Giám Hiệu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng Quỹ Lương Tháng 9/2026"
          value="~1.85 Tỷ VNĐ"
          icon={<Banknote size={18} className="text-emerald-600" />}
          trend={{ label: "Chờ Hiệu trưởng ký", tone: "warning" }}
          subvalue={
            <div className="flex items-center gap-1 text-xs text-muted">
              <span>Đã kiểm toán NĐ 85</span>
              <span>•</span>
              <span className="text-emerald-700 font-semibold">428 CBGV</span>
            </div>
          }
        />

        <StatCard
          title="Quyết Định Chờ Ký Số PKI"
          value="2 Quyết định"
          icon={<ScrollText size={18} className="text-amber-600" />}
          subvalue={
            <div className="flex items-center gap-1 text-xs text-amber-800 font-medium">
              <CheckCircle2 size={12} className="text-amber-600" />
              <span>Chuẩn thể thức NĐ 30/2020/NĐ-CP</span>
            </div>
          }
        />

        <StatCard
          title="Tỷ Lệ Giảng Viên Có Học Vị Cao"
          value="82.7%"
          icon={<GraduationCap size={18} className="text-brand-600" />}
          trend={{ label: "Đạt chuẩn KĐCL", tone: "success" }}
          subvalue={
            <div className="text-xs text-muted">
              86 Tiến sĩ · 268 Thạc sĩ · 4 GS · 22 PGS
            </div>
          }
        />

        <StatCard
          title="Tỷ Lệ Sinh Viên / Giảng Viên"
          value="18.4 SV/GV"
          icon={<Users size={18} className="text-blue-600" />}
          subvalue={
            <div className="text-xs text-emerald-700 font-semibold">
              Đạt chuẩn quy chuẩn Bộ GD&ĐT (&lt; 20 SV/GV)
            </div>
          }
        />
      </div>

      {/* Grid: Quyết định chờ ký số & Cơ cấu học vị toàn trường */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-line pb-3 mb-4">
              <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                <ScrollText size={16} className="text-amber-600" />
                <span>Quyết Định Hành Chính Đang Trình Hiệu Trưởng Ký Số Điện Tử (RSA-SHA256)</span>
              </h3>
              <Badge tone="warning">2 Hồ sơ chờ</Badge>
            </div>
            <div className="space-y-3">
              {[
                {
                  no: "QĐ-BGH/2026-118",
                  title: "Quyết định tái bổ nhiệm Trưởng Khoa Kiến trúc nhiệm kỳ 2026-2031",
                  recipient: "PGS.TS. Trần Thị Bình",
                  type: "Bổ nhiệm cán bộ",
                  date: "28/10/2026",
                },
                {
                  no: "QĐ-BGH/2026-119",
                  title: "Quyết định khen thưởng giảng viên có bài báo Quốc tế Q1 xuất sắc",
                  recipient: "TS. KTS. Nguyễn Văn Hùng & Nhóm Nghiên cứu",
                  type: "Khen thưởng NCKH",
                  date: "29/10/2026",
                },
              ].map((doc, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-line bg-white hover:border-amber-400 transition space-y-2 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand-700">{doc.no}</span>
                    <Badge tone="info">{doc.type}</Badge>
                  </div>
                  <p className="text-xs font-bold text-ink">{doc.title}</p>
                  <p className="text-[11px] text-muted">Người thụ hưởng: <strong>{doc.recipient}</strong> · Ngày trình: {doc.date}</p>
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
                    <button
                      onClick={() => alert(`Đã kích hoạt chữ ký số điện tử RSA-SHA256 cho ${doc.no} thành công!`)}
                      className="rounded-lg bg-brand-500 hover:bg-brand-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition"
                    >
                      Ký Số Điện Tử Ngay
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Cột Phụ: Cơ cấu học hàm học vị toàn trường */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2 border-b border-line pb-3 mb-3">
              <GraduationCap size={16} className="text-brand-600" />
              <span>Cơ Cấu Trình Độ Giảng Viên DAU</span>
            </h3>
            <div className="space-y-3">
              {[
                { label: "Tiến sĩ (Doctor)", count: 86, percent: 20.1, color: "bg-brand-500" },
                { label: "Thạc sĩ (Master)", count: 268, percent: 62.6, color: "bg-blue-400" },
                { label: "KTS / Kỹ sư / Cử nhân", count: 74, percent: 17.3, color: "bg-slate-300" },
              ].map((item, i) => (
                <div key={i} className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-700">{item.label}</span>
                    <span className="font-bold text-ink">{item.count} CB ({item.percent}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div className={`${item.color} h-1.5 rounded-full`} style={{ width: `${item.percent}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-line text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>Tỷ lệ giảng viên đạt chuẩn kiểm định MOET</span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// 5. VAI TRÒ 5: QUẢN TRỊ HỆ THỐNG (KS. Phạm Quản Trị)
// ============================================================================
function SystemAdminDashboardView({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      {/* Header Admin */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-emerald-400 border border-slate-700">
              DevOps & Infrastructure Center
            </span>
            <span className="text-xs text-muted">• Hạ tầng kỹ thuật hệ thống DAU</span>
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-ink">
            Trung Tâm Vận Hành Kỹ Thuật Hệ Thống — {user?.fullName || "KS. Phạm Quản Trị"}
          </h2>
          <p className="text-xs sm:text-sm text-muted">
            Giám sát thời gian thực Kubernetes Health Probes, Prometheus Metrics, Transactional Outbox và Worker Queue
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/system"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-colors"
          >
            <Activity size={14} />
            <span>Mở Control Center Chi Tiết</span>
          </Link>
        </div>
      </div>

      {/* 4 Thẻ KPI Kỹ thuật */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="K8s Liveness & Readiness"
          value="UP / READY"
          icon={<Server size={18} className="text-emerald-600" />}
          trend={{ label: "100% Khả dụng", tone: "success" }}
          subvalue={<p className="text-xs text-emerald-700">4/4 Phân hệ cốt lõi hoàn toàn sẵn sàng</p>}
        />

        <StatCard
          title="HTTP Request Throughput"
          value="~1.2k req/m"
          icon={<Zap size={18} className="text-blue-600" />}
          subvalue={<p className="text-xs text-muted">Độ trễ p95: 14ms · 0 lỗi 5xx</p>}
        />

        <StatCard
          title="Transactional Outbox Lag"
          value="0 Sự kiện"
          icon={<Layers size={18} className="text-purple-600" />}
          trend={{ label: "Đồng bộ 100%", tone: "success" }}
          subvalue={<p className="text-xs text-muted">Không có bản ghi tồn đọng</p>}
        />

        <StatCard
          title="Worker Queue Depth"
          value="0 Active / 0 Pending"
          icon={<Clock size={18} className="text-amber-600" />}
          subvalue={<p className="text-xs text-muted">Hàng đợi xử lý nền sạch</p>}
        />
      </div>

      {/* Card liên kết trực tiếp Control Center */}
      <Card className="p-6 bg-slate-900 text-white border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="text-emerald-400" size={20} />
              <span>Bảng Điều Khiển System Operations & Observability Center (/admin/system)</span>
            </h3>
            <p className="text-xs text-slate-300 max-w-2xl">
              Tích hợp đầy đủ các tính năng: kích hoạt thủ công quét Outbox, thử lại các tác vụ lỗi trong Dead-Letter Queue (DLQ), đẩy job tính lương hoặc render PDF NĐ 30 nền, và kiểm tra luồng phân tán OpenMetrics.
            </p>
          </div>
          <Link
            href="/admin/system"
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-xs font-bold text-slate-950 transition-colors shadow-xs shrink-0"
          >
            <span>Truy cập Control Center</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </Card>
    </div>
  );
}
