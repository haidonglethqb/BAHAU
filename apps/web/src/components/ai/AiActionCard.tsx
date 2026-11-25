"use client";

import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Loader2,
} from "lucide-react";
import type { AgentProposedAction } from "./ai-stream-client";

interface AiActionCardProps {
  action: AgentProposedAction;
  isConfirming?: boolean;
  onConfirmLeaveDraft?: (payload: Record<string, unknown>) => void;
  onCancelLeaveDraft?: () => void;
  onConfirmAttendanceAdjustment?: (payload: {
    workDate: string;
    requestedCheckIn?: string;
    requestedCheckOut?: string;
    reason: string;
  }) => void;
  onCancelAttendanceAdjustment?: () => void;
}

export function AiActionCard({
  action,
  isConfirming = false,
  onConfirmLeaveDraft,
  onCancelLeaveDraft,
  onConfirmAttendanceAdjustment,
  onCancelAttendanceAdjustment,
}: AiActionCardProps) {
  if (action.type === "NAVIGATE") {
    const safeHref = action.href.startsWith("/") ? action.href : "/dashboard";
    return (
      <Link
        href={safeHref}
        className="mt-2.5 flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2.5 text-xs hover:bg-blue-100/70 hover:border-blue-300 transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-white">
            <Compass size={15} />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-blue-950 truncate">{action.title}</div>
            <div className="text-[11px] text-blue-800/80 truncate">
              {action.subtitle}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 shrink-0 rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-blue-900 border border-blue-200 group-hover:translate-x-0.5 transition-transform">
          <span>Mở trang</span>
          <ArrowRight size={12} />
        </span>
      </Link>
    );
  }

  if (action.type === "ATTENDANCE_ADJUSTMENT_DRAFT") {
    const status = action.status || "CONFIRMATION_REQUIRED";
    const payload = action.payload;

    return (
      <div className="mt-3 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/80 p-4 text-xs text-sky-950">
        <div className="flex items-center justify-between gap-2 border-b border-sky-200 pb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock size={15} className="text-sky-700 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-sm text-sky-950 truncate">
                {action.title || "Đề Xuất Giải Trình Chấm Công Chờ Xác Nhận"}
              </div>
              {action.subtitle && (
                <div className="text-[11px] text-sky-800 truncate">
                  {action.subtitle}
                </div>
              )}
            </div>
          </div>
          <span
            className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
              status === "SUBMITTED"
                ? "bg-emerald-200 text-emerald-900"
                : status === "CANCELLED"
                  ? "bg-slate-200 text-slate-700"
                  : "bg-sky-200 text-sky-900"
            }`}
          >
            {status === "SUBMITTED"
              ? "SUBMITTED · ĐÃ GỬI"
              : status === "CANCELLED"
                ? "CANCELLED · ĐÃ HỦY"
                : "CHỜ XÁC NHẬN"}
          </span>
        </div>

        <p className="mt-2.5 text-slate-800 font-medium leading-relaxed">
          {action.summary}
        </p>

        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-lg bg-white/80 border border-sky-200/80 p-2.5 text-[11px] text-slate-700">
          <div className="flex items-center gap-1.5">
            <Calendar size={12} className="text-sky-700 shrink-0" />
            <span className="text-slate-500">Ngày công:</span>
            <span className="font-semibold text-slate-900 font-mono">
              {payload.workDate}
            </span>
          </div>

          {(payload.requestedCheckIn || payload.requestedCheckOut) && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} className="text-sky-700 shrink-0" />
              <span className="text-slate-500">Giờ đề xuất:</span>
              <span className="font-semibold text-slate-900 font-mono">
                {payload.requestedCheckIn || "--:--"} &rarr;{" "}
                {payload.requestedCheckOut || "--:--"}
              </span>
            </div>
          )}

          {payload.reason && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">Lý do giải trình: </span>
              <span className="text-slate-800 font-medium">{payload.reason}</span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-end gap-2">
          {status === "CONFIRMATION_REQUIRED" ? (
            <>
              <button
                type="button"
                onClick={onCancelAttendanceAdjustment}
                disabled={isConfirming}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-sky-100 disabled:opacity-50 cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => onConfirmAttendanceAdjustment?.(payload)}
                disabled={isConfirming}
                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-sky-800 transition disabled:opacity-50 cursor-pointer"
              >
                {isConfirming ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={13} />
                )}
                <span>{isConfirming ? "Đang gửi..." : "Xác nhận gửi giải trình"}</span>
              </button>
            </>
          ) : status === "CANCELLED" ? (
            <span className="text-xs text-slate-500 font-medium">
              Đã hủy bản giải trình
            </span>
          ) : (
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
              <CheckCircle2 size={13} />
              <span>
                Đã gửi giải trình chấm công vào hàng đợi phê duyệt
                {action.createdRecordId ? ` (${action.createdRecordId})` : ""}
              </span>
            </span>
          )}
        </div>
      </div>
    );
  }

  // LEAVE_DRAFT
  const status = action.status || "CONFIRMATION_REQUIRED";
  const payload = action.payload || {};
  const startDate = typeof payload.startDate === "string" ? payload.startDate : null;
  const endDate = typeof payload.endDate === "string" ? payload.endDate : null;
  const totalDays =
    typeof payload.totalDays === "number" || typeof payload.totalDays === "string"
      ? payload.totalDays
      : null;
  const leaveType = typeof payload.leaveType === "string" ? payload.leaveType : null;
  const reason = typeof payload.reason === "string" ? payload.reason : null;

  return (
    <div className="mt-3 rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/80 p-4 text-xs text-amber-950">
      <div className="flex items-center justify-between gap-2 border-b border-amber-200 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={15} className="text-amber-700 shrink-0" />
          <div className="min-w-0">
            <div className="font-bold text-sm text-amber-950 truncate">
              {action.title || "Đề Xuất Đơn Nghỉ Phép Chờ Xác Nhận"}
            </div>
            {action.subtitle && (
              <div className="text-[11px] text-amber-800 truncate">
                {action.subtitle}
              </div>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold ${
            status === "SUBMITTED"
              ? "bg-emerald-200 text-emerald-900"
              : status === "CANCELLED"
                ? "bg-slate-200 text-slate-700"
                : "bg-amber-200 text-amber-900"
          }`}
        >
          {status === "SUBMITTED"
            ? "SUBMITTED · ĐÃ NỘP"
            : status === "CANCELLED"
              ? "CANCELLED · ĐÃ HỦY"
              : "CHỜ XÁC NHẬN"}
        </span>
      </div>

      <p className="mt-2.5 text-slate-800 font-medium leading-relaxed">
        {action.summary}
      </p>

      {(startDate || endDate || totalDays || leaveType || reason) && (
        <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 rounded-lg bg-white/80 border border-amber-200/80 p-2.5 text-[11px] text-slate-700">
          {leaveType && (
            <div>
              <span className="text-slate-500">Loại phép: </span>
              <span className="font-semibold text-slate-900">{leaveType}</span>
            </div>
          )}
          {totalDays !== null && (
            <div>
              <span className="text-slate-500">Số ngày: </span>
              <span className="font-semibold text-slate-900">{totalDays} ngày</span>
            </div>
          )}
          {(startDate || endDate) && (
            <div className="sm:col-span-2 flex items-center gap-1.5">
              <Calendar size={12} className="text-amber-700 shrink-0" />
              <span className="text-slate-500">Thời gian:</span>
              <span className="font-mono font-semibold text-slate-900">
                {startDate || "?"} &rarr; {endDate || "?"}
              </span>
            </div>
          )}
          {reason && (
            <div className="sm:col-span-2">
              <span className="text-slate-500">Lý do: </span>
              <span className="text-slate-800">{reason}</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center justify-end gap-2">
        {status === "CONFIRMATION_REQUIRED" ? (
          <>
            <button
              type="button"
              onClick={onCancelLeaveDraft}
              disabled={isConfirming}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={() => onConfirmLeaveDraft?.(payload)}
              disabled={isConfirming}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition disabled:opacity-50 cursor-pointer"
            >
              {isConfirming ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <CheckCircle2 size={13} />
              )}
              <span>{isConfirming ? "Đang gửi..." : "Xác nhận gửi đơn"}</span>
            </button>
          </>
        ) : status === "CANCELLED" ? (
          <span className="text-xs text-slate-500 font-medium">
            Đã hủy bản nháp
          </span>
        ) : (
          <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
            <CheckCircle2 size={13} />
            <span>
              Đã ghi vào hàng đợi phê duyệt
              {action.createdRecordId ? ` (${action.createdRecordId})` : ""}
            </span>
          </span>
        )}
      </div>
    </div>
  );
}
