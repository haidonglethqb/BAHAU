"use client";

import React, { useState, useEffect } from "react";

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

import { Bell } from "lucide-react";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "sample-1",
      title: "Khóa bồi dưỡng BIM Revit Architecture 2026",
      content: "Phòng TCHC thông báo mở khóa đào tạo bồi dưỡng BIM Revit nâng cao cho CBGV Khoa Kiến trúc.",
      type: "TRAINING",
      isRead: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: "sample-2",
      title: "Nhắc nhở cập nhật chứng chỉ hành nghề",
      content: "Chứng chỉ Hành nghề KTS của bạn còn 25 ngày là hết hạn. Vui lòng nộp hồ sơ gia hạn lên Phòng TCHC.",
      type: "CERTIFICATE",
      isRead: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "sample-3",
      title: "Đơn xin nghỉ phép đã được phê duyệt",
      content: "Đơn xin nghỉ phép của bạn đã được Lãnh đạo phê duyệt và cập nhật vào sổ cái nghỉ phép.",
      type: "WORKFLOW",
      isRead: true,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
    },
  ]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 cursor-pointer"
        title="Thông báo"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full border-2 border-white bg-[#DC2626]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white p-4 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-slate-900 text-sm">Hộp Thông Báo</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">
                  {unreadCount} mới
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-500">
                Không có thông báo nào.
              </p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`cursor-pointer py-2.5 px-2 rounded-lg transition-colors ${
                    n.isRead ? "hover:bg-slate-50" : "bg-blue-50/60 hover:bg-blue-50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${
                          n.isRead ? "bg-slate-300" : "bg-blue-600"
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(n.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="mt-1 pl-3.5 text-xs text-slate-600 line-clamp-2">
                    {n.content}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-2 text-center">
            <span className="text-[11px] text-slate-400">
              Đồng bộ thông báo tự động thời gian thực — DAU HRMS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
