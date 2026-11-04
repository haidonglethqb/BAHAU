"use client";

import React from "react";
import Link from "next/link";
import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
  moduleName?: string;
}

export function AuthGuard({ children, allowedRoles, moduleName = "Phân hệ Nghiệp vụ" }: AuthGuardProps) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        <p className="text-xs text-muted">Đang kiểm tra quyền truy cập hệ thống...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto max-w-xl py-16 px-4">
        <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-xl">
          {/* Header Banner */}
          <div className="bg-brand-600 p-8 text-white text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-amber-300 backdrop-blur ring-1 ring-white/20">
              <Lock className="h-7 w-7" />
            </div>
            <span className="inline-flex items-center rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
              Khu Vực Dành Riêng Cho Cán Bộ & Giảng Viên
            </span>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight">
              Yêu Cầu Xác Thực Quyền Truy Cập
            </h2>
            <p className="mt-2 text-xs text-blue-100 max-w-md mx-auto leading-relaxed">
              Bạn đang yêu cầu truy cập <strong>{moduleName}</strong>. Đây là phân hệ chứa dữ liệu nhân sự nội bộ của Trường Đại học Kiến trúc Đà Nẵng, yêu cầu đăng nhập tài khoản công tác (@dau.edu.vn).
            </p>
          </div>

          {/* Body Actions */}
          <div className="p-8 space-y-6">
            <div className="text-center">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-brand-600 transition-colors cursor-pointer"
              >
                <span>Đi đến Cổng Đăng Nhập Chính Thức</span>
                <span className="ml-2">→</span>
              </Link>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-center text-[11px] text-muted border border-line flex items-center justify-center gap-2">
              <ShieldCheck size={15} className="text-emerald-600 shrink-0" />
              <span>Dữ liệu được bảo vệ tuân thủ Quy chế bảo mật thông tin nội bộ Trường ĐH Kiến trúc Đà Nẵng.</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check role authorization if specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto max-w-xl py-16 px-4 text-center">
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-bold">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            Giới Hạn Quyền Hạn Nghiệp Vụ (403 Forbidden)
          </h3>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Tài khoản của bạn (<strong>{user.fullName}</strong> — vai trò <strong>{user.roleLabel}</strong>) không thuộc phạm vi thẩm quyền truy cập phân hệ <strong>{moduleName}</strong>.
          </p>
          <div className="mt-3 text-[11px] text-amber-900 font-mono bg-amber-100/70 py-1.5 px-3 rounded-lg inline-block">
            Phân hệ này yêu cầu vai trò: {allowedRoles.join(", ")}
          </div>
          <div className="mt-6 flex justify-center space-x-3">
            <Link
              href="/"
              className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-300 transition"
            >
              Về Trang chủ
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
            >
              Vào Bàn làm việc
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
