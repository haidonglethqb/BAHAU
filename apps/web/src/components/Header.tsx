"use client";

import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { NotificationDropdown } from "./NotificationDropdown";

export function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3">
          <a
            href="/"
            className="group flex items-center space-x-3 transition-transform duration-200 hover:scale-[1.02]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 via-blue-950 to-indigo-950 font-black tracking-wider text-amber-400 shadow-md ring-2 ring-blue-900/10 group-hover:shadow-blue-900/20 transition-all">
              DAU
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                  ĐH KIẾN TRÚC ĐÀ NẴNG
                </h1>
                {isAuthenticated ? (
                  <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                    CỔNG NỘI BỘ CBGV
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-800 border border-blue-200/60">
                    CỔNG THÔNG TIN ĐẠI HỌC
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {isAuthenticated
                  ? "Hệ Thống Quản Trị Nhân Lực & Giảng Viên (BAHAU)"
                  : "Danang Architecture University — Portal"}
              </p>
            </div>
          </a>
        </div>

        {/* Dynamic Navigation Bar based on Auth status */}
        <nav className="hidden lg:flex items-center space-x-1 xl:space-x-2 text-sm font-medium text-slate-600">
          {!isAuthenticated ? (
            /* Public University Navigation */
            <>
              <a
                href="/"
                className="px-3 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 font-semibold text-blue-900 transition-all duration-200"
              >
                Trang Chủ
              </a>
              <a
                href="/#about"
                className="px-3 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Giới Thiệu DAU
              </a>
              <a
                href="/#faculties"
                className="px-3 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Khoa & Đào Tạo
              </a>
              <a
                href="/#facilities"
                className="px-3 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Cơ Sở Vật Chất
              </a>
              <a
                href="/#news"
                className="px-3 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Tin Tức & Sự Kiện
              </a>
            </>
          ) : (
            /* Authenticated Faculty/Staff Intranet Navigation */
            <>
              <a
                href="/dashboard"
                className="px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 font-semibold text-blue-900 transition-all duration-200"
              >
                Dashboard
              </a>
              <a
                href="/employees"
                className="px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Hồ sơ CBGV
              </a>
              <a
                href="/contracts"
                className="px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Hợp đồng
              </a>
              <a
                href="/leave"
                className="px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Nghỉ phép
              </a>
              <a
                href="/attendance"
                className="px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Chấm công
              </a>
              <a
                href="/kpi"
                className="px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                KPI
              </a>
              <a
                href="/training"
                className="px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                Đào tạo & CC
              </a>
              <a
                href="/ai-assistant"
                className="group flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-800 hover:from-purple-100 hover:to-indigo-100 border border-purple-200/50 transition-all duration-200 font-semibold shadow-2xs"
              >
                <span className="group-hover:scale-125 transition-transform duration-200">✨</span>
                <span>AI Trợ lý</span>
              </a>
              <a
                href="/approvals"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:text-blue-950 hover:bg-slate-100 transition-all duration-200"
              >
                <span>Phê duyệt</span>
                <span className="rounded-full bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-900 border border-amber-200">
                  Inbox
                </span>
              </a>
            </>
          )}
        </nav>

        {/* Right Side Controls */}
        <div className="flex items-center space-x-3">
          {isAuthenticated && user ? (
            <>
              <NotificationDropdown />
              {/* User Identity Pill */}
              <div className="flex items-center space-x-2.5 pl-2 border-l border-slate-200">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-900 text-amber-400 font-bold text-xs shadow-xs">
                  {user.fullName.split(" ").pop()?.charAt(0) || "U"}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight">
                    {user.fullName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    {user.roleLabel}
                  </p>
                </div>
                <button
                  onClick={() => logout()}
                  title="Đăng xuất"
                  className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </>
          ) : (
            <a
              href="/login"
              className="group inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-900 to-indigo-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:from-blue-800 hover:to-indigo-800 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <span>Cổng Cán Bộ / Giảng Viên</span>
              <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
