"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Activity,
  Banknote,
  Building2,
  ChevronRight,
  LogOut,
  ScrollText,
  Sparkles,
  User,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { NotificationDropdown } from "./NotificationDropdown";
import { PayslipModal } from "./PayslipModal";
import { ExecutiveResolutionsModal } from "./ExecutiveResolutionsModal";
import { Avatar, cx } from "./ui";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showPayslip, setShowPayslip] = useState(false);
  const [showExecutive, setShowExecutive] = useState(false);

  // Helper sinh danh sách menu điều hướng động theo vai trò (Role-Based Navigation)
  const getNavLinks = (role?: string) => {
    switch (role) {
      case "LECTURER": // Cán bộ / Giảng viên thường
        return [
          { href: "/dashboard", label: "Bàn làm việc", highlight: true },
          { href: "/leave", label: "Nghỉ phép của tôi" },
          { href: "/attendance", label: "Chấm công" },
          { href: "/workload", label: "Giờ chuẩn" },
        ];

      case "DEAN": // Trưởng khoa / Quản lý đơn vị
        return [
          { href: "/dashboard", label: "Bàn làm việc", highlight: true },
          { href: "/approvals", label: "Phê duyệt Khoa" },
          { href: "/employees", label: "Nhân sự Khoa" },
          { href: "/workload", label: "Giờ chuẩn & Studio" },
          { href: "/leave", label: "Nghỉ phép" },
        ];

      case "HR_SPECIALIST": // Phòng Tổ chức - Hành chính
        return [
          { href: "/dashboard", label: "Bàn làm việc", highlight: true },
          { href: "/employees", label: "Quản trị CBGV" },
          { href: "/contracts", label: "Hợp đồng" },
          { href: "/attendance", label: "Chấm công" },
          { href: "/payroll", label: "Tính lương" },
          { href: "/approvals", label: "Phê duyệt" },
        ];

      case "RECTOR": // Ban Giám hiệu / Hiệu trưởng
        return [
          { href: "/dashboard", label: "Điều hành BGH", highlight: true },
          { href: "/approvals", label: "Phê duyệt" },
          { href: "/employees", label: "Nhân sự DAU" },
          { href: "/payroll", label: "Bảng lương" },
          { href: "/admin/system", label: "Hệ thống", isSystem: true },
        ];

      case "SYSTEM_ADMIN": // Quản trị hệ thống
        return [
          { href: "/admin/system", label: "Control Center", highlight: true, isSystem: true },
          { href: "/dashboard", label: "Bàn làm việc" },
          { href: "/employees", label: "Tài khoản CBGV" },
          { href: "/approvals", label: "Giám sát duyệt" },
        ];

      default: // Fallback mặc định
        return [
          { href: "/dashboard", label: "Bàn làm việc", highlight: true },
          { href: "/employees", label: "CBGV" },
          { href: "/leave", label: "Nghỉ phép" },
          { href: "/attendance", label: "Chấm công" },
          { href: "/workload", label: "Giờ chuẩn" },
        ];
    }
  };

  const navLinks = getNavLinks(user?.role);

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur-md shadow-2xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className="group flex items-center space-x-3 transition-transform duration-150"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500 font-bold text-white shadow-xs">
              <Building2 size={20} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-sm sm:text-base font-extrabold text-brand-700 tracking-tight">
                  ĐH KIẾN TRÚC ĐÀ NẴNG
                </h1>
                {isAuthenticated ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    NỘI BỘ CBGV
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-700 border border-brand-200">
                    CỔNG THÔNG TIN
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted font-medium">
                {isAuthenticated
                  ? "Hệ Thống Quản Trị Nhân Lực & Giảng Viên (BAHAU)"
                  : "Danang Architecture University — Portal"}
              </p>
            </div>
          </Link>
        </div>

        {/* Dynamic Navigation Bar based on Auth status & Role */}
        <nav className="hidden lg:flex items-center space-x-1 text-xs font-semibold text-muted">
          {!isAuthenticated ? (
            /* Public University Navigation */
            <>
              <Link href="/" className="px-3 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100 text-brand-600">
                Trang Chủ
              </Link>
              <a href="/#about" className="px-3 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100 transition-colors">
                Giới Thiệu
              </a>
              <a href="/#faculties" className="px-3 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100 transition-colors">
                Khoa & Đào Tạo
              </a>
              <a href="/#facilities" className="px-3 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100 transition-colors">
                Cơ Sở Vật Chất
              </a>
            </>
          ) : (
            /* Authenticated Dynamic Role-Based Intranet Navigation */
            <>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cx(
                    "px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1",
                    link.highlight && !link.isSystem
                      ? "text-brand-600 font-bold hover:bg-slate-100"
                      : link.isSystem
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-semibold"
                      : "hover:text-ink hover:bg-slate-100"
                  )}
                >
                  {link.isSystem && <Activity size={13} />}
                  <span>{link.label}</span>
                </Link>
              ))}

              <Link
                href="/ai-assistant"
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
              >
                <Sparkles size={13} />
                <span>AI Trợ lý</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {isAuthenticated && user ? (
            <>
              <div className="hidden sm:flex items-center space-x-1.5">
                {/* Phiếu lương: CBGV, Trưởng khoa, TCHC, Hiệu trưởng */}
                <button
                  onClick={() => setShowPayslip(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  <Banknote size={14} /> Phiếu lương
                </button>

                {/* QĐ NĐ 30: TCHC (soạn thảo), Hiệu trưởng (ký số), Admin */}
                {(user.role === "HR_SPECIALIST" || user.role === "RECTOR" || user.role === "SYSTEM_ADMIN") && (
                  <button
                    onClick={() => setShowExecutive(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 text-xs font-semibold cursor-pointer shadow-2xs"
                  >
                    <ScrollText size={14} /> QĐ NĐ 30
                  </button>
                )}
              </div>

              <NotificationDropdown />

              <div className="flex items-center space-x-2 pl-2 border-l border-line">
                <Avatar name={user.fullName} size={32} />
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-ink leading-tight">{user.fullName}</p>
                  <p className="text-[10px] text-muted">{user.roleLabel}</p>
                </div>
                <button
                  onClick={() => logout()}
                  title="Đăng xuất"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-600 transition-all cursor-pointer"
            >
              <span>Cổng Cán Bộ / Giảng Viên</span>
              <ChevronRight size={15} />
            </Link>
          )}
        </div>
      </div>

      {showPayslip && <PayslipModal onClose={() => setShowPayslip(false)} />}
      {showExecutive && <ExecutiveResolutionsModal onClose={() => setShowExecutive(false)} />}
    </header>
  );
}
