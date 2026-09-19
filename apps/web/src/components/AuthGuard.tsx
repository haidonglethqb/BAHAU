"use client";

import React from "react";
import { useAuth, SAMPLE_USERS } from "../context/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  moduleName?: string;
}

export function AuthGuard({ children, allowedRoles, moduleName = "Phân hệ Nghiệp vụ" }: AuthGuardProps) {
  const { user, loading, login, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-900 border-t-transparent" />
        <p className="text-xs text-slate-500">Đang kiểm tra quyền truy cập hệ thống...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-2xl py-12 px-4">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-950 p-8 text-white text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-amber-400 backdrop-blur ring-1 ring-white/20">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
              Khu Vực Dành Riêng Cho Cán Bộ & Giảng Viên
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
              Yêu Cầu Xác Thực Quyền Truy Cập
            </h2>
            <p className="mt-2 text-xs text-blue-200 max-w-lg mx-auto leading-relaxed">
              Bạn đang yêu cầu truy cập <strong>{moduleName}</strong>. Đây là phân hệ chứa dữ liệu nhân sự nội bộ của Trường Đại học Kiến trúc Đà Nẵng, yêu cầu đăng nhập tài khoản CBGV (@dau.edu.vn).
            </p>
          </div>

          {/* Body Actions */}
          <div className="p-8 space-y-6">
            <div className="text-center">
              <a
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-blue-900 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-800 transition-all duration-200"
              >
                <span>Đi đến Cổng Đăng Nhập Chính Thức</span>
                <span className="ml-2">→</span>
              </a>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-3 text-slate-400 font-medium">
                  Hoặc trải nghiệm nhanh với các vai trò mẫu DAU
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.values(SAMPLE_USERS).map((sample) => (
                <button
                  key={sample.email}
                  onClick={() => login(sample)}
                  className="group flex flex-col p-3 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-blue-50/60 hover:border-blue-300 text-left transition-all duration-200"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-blue-900">
                      {sample.fullName}
                    </span>
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 border border-slate-200">
                      {sample.roleLabel.split(" ")[0]}
                    </span>
                  </div>
                  <span className="mt-1 text-[11px] text-slate-500 truncate">
                    {sample.title || sample.unitName}
                  </span>
                  <span className="mt-1 text-[10px] text-blue-600 font-medium group-hover:underline">
                    Đăng nhập vai trò này →
                  </span>
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center text-[11px] text-slate-500 border border-slate-100">
              🔒 Dữ liệu được bảo vệ tuân thủ Luật Bảo vệ Dữ liệu Cá nhân & Quy định bảo mật thông tin nội bộ DAU.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check role authorization if specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-xl py-12 px-4 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold text-xl">
            ⚠️
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Giới Hạn Quyền Hạn Nghiệp Vụ
          </h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Tài khoản của bạn ({user.fullName} — {user.roleLabel}) không thuộc phạm vi thẩm quyền truy cập phân hệ <strong>{moduleName}</strong>. Vui lòng liên hệ Trưởng đơn vị hoặc Phòng TCHC nếu bạn cần cấp quyền bổ sung.
          </p>
          <div className="mt-6 flex justify-center space-x-3">
            <a
              href="/"
              className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
            >
              Về Trang chủ
            </a>
            <a
              href="/dashboard"
              className="rounded-lg bg-blue-900 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 transition"
            >
              Vào Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
