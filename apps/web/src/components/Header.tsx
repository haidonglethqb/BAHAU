"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
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
import { Avatar } from "./ui";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [showPayslip, setShowPayslip] = useState(false);
  const [showExecutive, setShowExecutive] = useState(false);

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

        {/* Dynamic Navigation Bar based on Auth status */}
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
            /* Authenticated Faculty/Staff Intranet Navigation */
            <>
              <Link href="/dashboard" className="px-2.5 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100 text-brand-600 font-bold">
                Dashboard
              </Link>
              <Link href="/employees" className="px-2.5 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100">
                CBGV
              </Link>
              <Link href="/contracts" className="px-2.5 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100">
                Hợp đồng
              </Link>
              <Link href="/leave" className="px-2.5 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100">
                Nghỉ phép
              </Link>
              <Link href="/attendance" className="px-2.5 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100">
                Chấm công
              </Link>
              <Link href="/workload" className="px-2.5 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100">
                Giờ chuẩn
              </Link>
              <Link href="/approvals" className="px-2.5 py-1.5 rounded-lg hover:text-ink hover:bg-slate-100">
                Phê duyệt
              </Link>
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
                <button
                  onClick={() => setShowPayslip(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  <Banknote size={14} /> Phiếu lương
                </button>
                <button
                  onClick={() => setShowExecutive(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300 text-xs font-semibold cursor-pointer shadow-2xs"
                >
                  <ScrollText size={14} /> QĐ NĐ 30
                </button>
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
