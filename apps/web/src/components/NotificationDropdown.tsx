"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import apiClient from "../services/api-client";

interface NotificationItem {
  id: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationDropdown() {
  const { isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.notifications.getMy(20);
      if (res.ok && res.data) {
        const list = Array.isArray(res.data.notifications) ? res.data.notifications : [];
        setNotifications(list);
        setUnreadCount(
          typeof res.data.unreadCount === "number"
            ? res.data.unreadCount
            : list.filter((n: NotificationItem) => !n.isRead).length
        );
      } else {
        setNotifications([]);
        setUnreadCount(0);
        if (res.status !== 403 && res.status !== 401) {
          setError(res.error || "Không thể tải danh sách thông báo.");
        }
      }
    } catch {
      setNotifications([]);
      setUnreadCount(0);
      setError("Không thể kết nối tới dịch vụ thông báo.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleToggle = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    const res = await apiClient.notifications.markAllAsRead();
    if (res.ok) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    }
  };

  const markAsRead = async (id: string) => {
    const target = notifications.find((n) => n.id === id);
    if (!target || target.isRead) return;

    const res = await apiClient.notifications.markAsRead(id);
    if (res.ok) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleToggle}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:bg-slate-100 cursor-pointer"
        title="Thông báo"
        aria-label="Hộp thông báo"
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
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
              >
                Đọc tất cả
              </button>
            )}
          </div>

          <div className="mt-3 divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-500">
                <Loader2 size={14} className="animate-spin text-brand-500" />
                <span>Đang tải thông báo...</span>
              </div>
            ) : error ? (
              <div className="py-6 text-center text-xs text-rose-600">
                {error}
              </div>
            ) : notifications.length === 0 ? (
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          n.isRead ? "bg-slate-300" : "bg-blue-600"
                        }`}
                      />
                      <span className="text-xs font-semibold text-slate-900 line-clamp-1">
                        {n.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0">
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
              Thông báo cá nhân — DAU HRMS
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
