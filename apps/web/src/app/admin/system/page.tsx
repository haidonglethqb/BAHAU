"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Database,
  Eye,
  ExternalLink,
  FileText,
  HardDrive,
  Layers,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Trash2,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { AuthGuard } from "../../../components/AuthGuard";
import { Badge, Button, StatusPill, cx } from "../../../components/ui";

type TabType = "probes" | "metrics" | "outbox" | "jobs";

function getAuthHeaders(withJson = false): HeadersInit {
  const headers: Record<string, string> = {};
  if (withJson) headers["Content-Type"] = "application/json";
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("bahau_session_id");
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function sysFetchJson(url: string, init: RequestInit = {}) {
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers: {
      ...getAuthHeaders(Boolean(init.body)),
      ...((init.headers as Record<string, string>) || {}),
    },
  });
  const json = await res.json().catch(() => null);
  return { ok: res.ok && json?.success !== false, status: res.status, data: json?.data ?? json, error: json?.error?.message || (res.ok ? null : `HTTP ${res.status}`) };
}

async function sysFetchText(url: string) {
  const res = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: getAuthHeaders(false),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.text();
}

export default function AdminSystemPage() {
  const [activeTab, setActiveTab] = useState<TabType>("probes");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>("");

  // Health & Probes states
  const [healthData, setHealthData] = useState<any>(null);
  const [livenessData, setLivenessData] = useState<any>(null);
  const [readinessData, setReadinessData] = useState<any>(null);

  // Metrics states
  const [metricsJson, setMetricsJson] = useState<any>(null);
  const [rawMetrics, setRawMetrics] = useState<string | null>(null);
  const [showRawMetrics, setShowRawMetrics] = useState(false);

  // Outbox states
  const [outboxEvents, setOutboxEvents] = useState<any[]>([]);
  const [outboxTotal, setOutboxTotal] = useState(0);
  const [outboxStatus, setOutboxStatus] = useState<string>("ALL");
  const [outboxPage, setOutboxPage] = useState(1);
  const [selectedOutboxEvent, setSelectedOutboxEvent] = useState<any>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);

  // Job Queue states
  const [jobs, setJobs] = useState<any[]>([]);
  const [jobStats, setJobStats] = useState<any>({
    active: 0,
    pending: 0,
    completed: 0,
    failed: 0,
    total: 0,
  });
  const [jobStatus, setJobStatus] = useState<string>("ALL");
  const [jobPage, setJobPage] = useState(1);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [isPollingOutbox, setIsPollingOutbox] = useState(false);
  const [showEnqueueModal, setShowEnqueueModal] = useState(false);
  const [enqueueType, setEnqueueType] = useState<string>("PAYROLL_BATCH_CALC");
  const [enqueuePriority, setEnqueuePriority] = useState<"HIGH" | "NORMAL" | "LOW">("NORMAL");
  const [enqueuePayload, setEnqueuePayload] = useState<string>(
    JSON.stringify({ month: 9, year: 2026, faculty: "Khoa Kiến trúc" }, null, 2)
  );

  // Row-level action state
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error" | "info"; text: string } | null>(
    null
  );
  const [copiedText, setCopiedText] = useState(false);

  const showToast = (type: "success" | "error" | "info", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // ==========================================================================
  // DATA FETCHING ROUTINES
  // ==========================================================================
  const fetchProbes = useCallback(async () => {
    try {
      const [healthRes, liveRes, readyRes] = await Promise.allSettled([
        sysFetchJson("/api/v1/health"),
        sysFetchJson("/api/v1/health/live"),
        sysFetchJson("/api/v1/health/ready"),
      ]);

      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        setHealthData(healthRes.value.data);
      }
      if (liveRes.status === "fulfilled" && liveRes.value.ok) {
        setLivenessData(liveRes.value.data);
      }
      if (readyRes.status === "fulfilled") {
        setReadinessData(readyRes.value.data || null);
      }
    } catch (e) {
      console.warn("[AdminSystem] Failed to fetch probes", e);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await sysFetchJson("/api/v1/metrics/json");
      if (res.ok && res.data) {
        setMetricsJson(res.data);
      }
      if (showRawMetrics) {
        const text = await sysFetchText("/api/v1/metrics");
        setRawMetrics(text);
      }
    } catch (e) {
      console.warn("[AdminSystem] Failed to fetch metrics", e);
    }
  }, [showRawMetrics]);

  const fetchOutbox = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(outboxPage),
        limit: "15",
      });
      if (outboxStatus && outboxStatus !== "ALL") {
        params.set("status", outboxStatus);
      }
      const res = await sysFetchJson(`/api/v1/outbox/events?${params.toString()}`);
      if (res.ok && res.data) {
        setOutboxEvents(res.data.events || []);
        setOutboxTotal(res.data.total || 0);
      }
    } catch (e) {
      console.warn("[AdminSystem] Failed to fetch outbox", e);
    }
  }, [outboxStatus, outboxPage]);

  const fetchJobs = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: String(jobPage),
        limit: "15",
      });
      if (jobStatus && jobStatus !== "ALL") {
        params.set("status", jobStatus);
      }
      const [jobsRes, statsRes] = await Promise.allSettled([
        sysFetchJson(`/api/v1/jobs?${params.toString()}`),
        sysFetchJson("/api/v1/jobs/stats/summary"),
      ]);

      if (jobsRes.status === "fulfilled" && jobsRes.value.ok && jobsRes.value.data) {
        setJobs(jobsRes.value.data.items || []);
      }
      if (statsRes.status === "fulfilled" && statsRes.value.ok && statsRes.value.data) {
        setJobStats(statsRes.value.data);
      }
    } catch (e) {
      console.warn("[AdminSystem] Failed to fetch jobs", e);
    }
  }, [jobStatus, jobPage]);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([fetchProbes(), fetchMetrics(), fetchOutbox(), fetchJobs()]);
      setLastRefreshed(new Date().toLocaleTimeString("vi-VN"));
    } finally {
      setLoading(false);
    }
  }, [fetchProbes, fetchMetrics, fetchOutbox, fetchJobs]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      if (activeTab === "probes") fetchProbes();
      else if (activeTab === "metrics") fetchMetrics();
      else if (activeTab === "outbox") fetchOutbox();
      else if (activeTab === "jobs") fetchJobs();
      setLastRefreshed(new Date().toLocaleTimeString("vi-VN"));
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, activeTab, fetchProbes, fetchMetrics, fetchOutbox, fetchJobs]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================
  const handleRetryOutboxEvent = async (id: string) => {
    setActionInProgress(id);
    try {
      const res = await sysFetchJson(`/api/v1/outbox/events/${id}/retry`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast("success", `Đã đưa sự kiện ${id} vào hàng đợi thử lại thành công.`);
        fetchOutbox();
        fetchMetrics();
      } else {
        showToast("error", `Không thể retry: ${res.error || "Lỗi không xác định"}`);
      }
    } catch (e: any) {
      showToast("error", e.message || "Lỗi mạng khi retry sự kiện");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleProcessOutboxBatch = async () => {
    setIsProcessingBatch(true);
    try {
      const res = await sysFetchJson("/api/v1/outbox/process-batch", {
        method: "POST",
        body: JSON.stringify({ limit: 15 }),
      });
      if (res.ok) {
        const processed = res.data?.processedCount ?? 0;
        const failed = res.data?.failedCount ?? 0;
        showToast(
          "success",
          `Đã xử lý batch: ${processed} sự kiện thành công${failed > 0 ? `, ${failed} thất bại` : ""}.`
        );
        fetchOutbox();
        fetchMetrics();
      } else {
        showToast("error", `Lỗi xử lý batch: ${res.error || "Thao tác thất bại"}`);
      }
    } catch (e: any) {
      showToast("error", e.message || "Lỗi xử lý batch");
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const handleTriggerOutboxPoll = async () => {
    setIsPollingOutbox(true);
    try {
      const res = await sysFetchJson("/api/v1/jobs/trigger-outbox-poll", {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast("success", "Đã gửi tín hiệu kích hoạt Quét Outbox Nền (OUTBOX_POLL).");
        fetchJobs();
      } else {
        showToast("error", `Lỗi kích hoạt quét: ${res.error || "Thao bại"}`);
      }
    } catch (e: any) {
      showToast("error", e.message || "Lỗi kích hoạt");
    } finally {
      setIsPollingOutbox(false);
    }
  };

  const handleCancelJob = async (id: string) => {
    setActionInProgress(id);
    try {
      const res = await sysFetchJson(`/api/v1/jobs/${id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Hủy bởi Quản trị viên" }),
      });
      if (res.ok) {
        showToast("success", `Đã hủy Job ${id} thành công.`);
        fetchJobs();
      } else {
        showToast("error", `Không thể hủy: ${res.error || "Lỗi"}`);
      }
    } catch (e: any) {
      showToast("error", e.message || "Lỗi hủy job");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRetryJob = async (id: string) => {
    setActionInProgress(id);
    try {
      const res = await sysFetchJson(`/api/v1/jobs/${id}/retry`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (res.ok) {
        showToast("success", `Đã đưa Job ${id} trở lại hàng đợi PENDING.`);
        fetchJobs();
      } else {
        showToast("error", `Không thể retry: ${res.error || "Lỗi"}`);
      }
    } catch (e: any) {
      showToast("error", e.message || "Lỗi retry job");
    } finally {
      setActionInProgress(null);
    }
  };

  const handleEnqueueNewJob = async () => {
    try {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(enqueuePayload);
      } catch {
        showToast("error", "Payload JSON không hợp lệ. Vui lòng kiểm tra cú pháp.");
        return;
      }

      const res = await sysFetchJson("/api/v1/jobs/enqueue", {
        method: "POST",
        body: JSON.stringify({
          type: enqueueType,
          priority: enqueuePriority,
          payload: parsedPayload,
        }),
      });
      if (res.ok) {
        showToast("success", `Đã đẩy Job ${enqueueType} (${res.data?.id}) vào hàng đợi!`);
        setShowEnqueueModal(false);
        fetchJobs();
      } else {
        showToast("error", `Lỗi đẩy job: ${res.error || "Không thể enqueue"}`);
      }
    } catch (e: any) {
      showToast("error", e.message || "Lỗi khi enqueue job");
    }
  };

  // Subsystem checks status parser
  const checks = readinessData?.checks || {};
  const dbCheck = checks.database;
  const eventBusCheck = checks.eventBus;
  const outboxCheck = checks.outbox;
  const workerQueueCheck = checks.workerQueue;

  return (
    <AuthGuard
      allowedRoles={["SYSTEM_ADMIN"]}
      moduleName="Trung Tâm Quản Trị & Giám Sát Kỹ Thuật Hệ Thống"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        {/* Toast Notification */}
        {toast && (
          <div
            className={cx(
              "fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg border text-sm font-semibold transition-all duration-300",
              toast.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : toast.type === "error"
                ? "bg-rose-50 text-rose-800 border-rose-300"
                : "bg-blue-50 text-blue-800 border-blue-300"
            )}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : toast.type === "error" ? (
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
            ) : (
              <Activity size={18} className="text-blue-600 shrink-0" />
            )}
            <span>{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header Breadcrumb & Control Bar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-5">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-muted">
              <Link href="/dashboard" className="hover:text-ink">
                Bàn làm việc
              </Link>
              <span>/</span>
              <span className="text-brand-600">Quản trị & Giám sát kỹ thuật</span>
            </div>
            <h1 className="mt-1 text-2xl font-extrabold text-ink tracking-tight flex items-center gap-2.5">
              <Server className="text-brand-600" size={26} />
              <span>Trung Tâm Điều Hành Hệ Thống (Operations Center)</span>
            </h1>
            <p className="mt-0.5 text-xs text-muted">
              Kiến trúc phân tán Microservices-Ready: K8s Probes, Prometheus Metrics, Transactional Outbox & Background Worker Queue
            </p>
          </div>

          {/* Quick Health Badges & Refresh Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Liveness badge */}
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border",
                livenessData?.status === "UP"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : "bg-rose-50 text-rose-800 border-rose-300"
              )}
            >
              <span
                className={cx(
                  "h-2 w-2 rounded-full",
                  livenessData?.status === "UP" ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                )}
              />
              Liveness: {livenessData?.status || "UNKNOWN"}
            </span>

            {/* Readiness badge */}
            <span
              className={cx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border",
                readinessData?.status === "READY"
                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                  : readinessData?.status === "NOT_READY"
                  ? "bg-rose-50 text-rose-800 border-rose-300"
                  : "bg-amber-50 text-amber-800 border-amber-300"
              )}
            >
              <span
                className={cx(
                  "h-2 w-2 rounded-full",
                  readinessData?.status === "READY"
                    ? "bg-emerald-500"
                    : readinessData?.status === "NOT_READY"
                    ? "bg-rose-500"
                    : "bg-amber-500"
                )}
              />
              Readiness: {readinessData?.status || "CHECKING"}
            </span>

            {/* Auto-refresh Switch */}
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white border border-line rounded-lg px-2.5 py-1.5 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>Tự làm mới (5s)</span>
            </label>

            {/* Manual Refresh Button */}
            <button
              onClick={() => refreshAll()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 transition cursor-pointer"
            >
              <RefreshCw size={14} className={cx(loading && "animate-spin")} />
              <span>{loading ? "Đang tải..." : "Làm mới"}</span>
            </button>
          </div>
        </div>

        {lastRefreshed && (
          <div className="flex items-center justify-between text-[11px] text-muted -mt-3">
            <span>Cập nhật gần nhất lúc: <strong>{lastRefreshed}</strong></span>
            <span>Node.js Uptime: <strong>{readinessData?.uptime ? `${readinessData.uptime}s` : "N/A"}</strong></span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-line space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab("probes")}
            className={cx(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "probes"
                ? "border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg"
                : "border-transparent text-muted hover:text-ink hover:border-slate-300"
            )}
          >
            <Activity size={16} />
            <span>K8s Health Probes & Phân Hệ</span>
          </button>

          <button
            onClick={() => setActiveTab("metrics")}
            className={cx(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "metrics"
                ? "border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg"
                : "border-transparent text-muted hover:text-ink hover:border-slate-300"
            )}
          >
            <Cpu size={16} />
            <span>Prometheus Observability</span>
          </button>

          <button
            onClick={() => setActiveTab("outbox")}
            className={cx(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "outbox"
                ? "border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg"
                : "border-transparent text-muted hover:text-ink hover:border-slate-300"
            )}
          >
            <Layers size={16} />
            <span>Transactional Outbox & Audit</span>
            {outboxTotal > 0 && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                {outboxTotal}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("jobs")}
            className={cx(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer",
              activeTab === "jobs"
                ? "border-brand-500 text-brand-600 bg-brand-50/40 rounded-t-lg"
                : "border-transparent text-muted hover:text-ink hover:border-slate-300"
            )}
          >
            <Clock size={16} />
            <span>Worker Queue & Tác Vụ Nền</span>
            {jobStats?.active > 0 && (
              <span className="rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.2 text-[10px] font-bold animate-pulse">
                {jobStats.active} Đang chạy
              </span>
            )}
          </button>
        </div>

        {/* ================================================================== */}
        {/* TAB 1: KUBERNETES PROBES & SUBSYSTEMS                             */}
        {/* ================================================================== */}
        {activeTab === "probes" && (
          <div className="space-y-6">
            {/* 4 Core Subsystems Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Database */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                    <Database size={20} />
                  </div>
                  <span
                    className={cx(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold border",
                      dbCheck?.status === "HEALTHY"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : dbCheck?.status === "DEGRADED"
                        ? "bg-amber-50 text-amber-900 border-amber-300"
                        : "bg-rose-50 text-rose-800 border-rose-300"
                    )}
                  >
                    {dbCheck?.status || "HEALTHY"}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink">PostgreSQL / Prisma</h3>
                <p className="mt-1 text-xs text-muted line-clamp-2">
                  {dbCheck?.message || "Hệ quản trị CSDL trung tâm DAU"}
                </p>
                <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted flex items-center justify-between">
                  <span>Loại kết nối:</span>
                  <span className="font-mono font-semibold text-ink">
                    {dbCheck?.type || "PRISMA_POSTGRESQL"}
                  </span>
                </div>
              </div>

              {/* 2. Event Bus */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 border border-purple-200">
                    <Radio size={20} />
                  </div>
                  <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                    {eventBusCheck?.status || "HEALTHY"}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink">Domain Event Bus</h3>
                <p className="mt-1 text-xs text-muted line-clamp-2">
                  {eventBusCheck?.message || "In-Process Pub/Sub phi tập trung, phi đồng bộ"}
                </p>
                <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted flex items-center justify-between">
                  <span>Subscribers:</span>
                  <span className="font-mono font-bold text-brand-600">
                    {eventBusCheck?.details?.subscriberCount ?? 4} đăng ký
                  </span>
                </div>
              </div>

              {/* 3. Outbox Engine */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
                    <Layers size={20} />
                  </div>
                  <span
                    className={cx(
                      "rounded-md px-2 py-0.5 text-[10px] font-bold border",
                      outboxCheck?.status === "HEALTHY"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-amber-50 text-amber-800 border-amber-300"
                    )}
                  >
                    {outboxCheck?.status || "HEALTHY"}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink">Transactional Outbox</h3>
                <p className="mt-1 text-xs text-muted line-clamp-2">
                  {outboxCheck?.message || "Đảm bảo tính toàn vẹn 2-Phase Transaction"}
                </p>
                <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted flex items-center justify-between">
                  <span>Pending Lag:</span>
                  <span className="font-mono font-bold text-amber-700">
                    {metricsJson?.outboxPendingLag ?? 0} sự kiện
                  </span>
                </div>
              </div>

              {/* 4. Worker Queue */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs hover:shadow-xs transition">
                <div className="flex items-center justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200">
                    <Clock size={20} />
                  </div>
                  <span className="rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-bold">
                    {workerQueueCheck?.status || "HEALTHY"}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-ink">Worker Queue</h3>
                <p className="mt-1 text-xs text-muted line-clamp-2">
                  {workerQueueCheck?.message || "Điều phối tác vụ nền, tính lương, render PDF"}
                </p>
                <div className="mt-4 pt-3 border-t border-line text-[11px] text-muted flex items-center justify-between">
                  <span>Hàng đợi chờ:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {jobStats?.pending ?? 0} pending / {jobStats?.active ?? 0} active
                  </span>
                </div>
              </div>
            </div>

            {/* Kubernetes Probes Specifications Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xs">
              <h2 className="text-base font-extrabold text-ink flex items-center gap-2">
                <ShieldCheck className="text-emerald-600" size={20} />
                <span>Cấu Hình Kubernetes Probes & Endpoints Chuẩn Cloud-Native</span>
              </h2>
              <p className="mt-1 text-xs text-muted">
                Dùng cho cấu hình livenessProbe & readinessProbe trong K8s Deployment manifest (`apps/api/k8s/deployment.yaml`)
              </p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Liveness probe */}
                <div className="rounded-xl border border-line bg-slate-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">K8s Liveness Probe</span>
                    <Badge tone="success">HTTP 200</Badge>
                  </div>
                  <code className="block rounded bg-slate-900 p-2 text-[11px] text-emerald-400 font-mono select-all">
                    GET /api/v1/health/liveness
                  </code>
                  <p className="text-[11px] text-muted">
                    Kiểm tra tiến trình Node.js còn sống (restart container nếu fail liên tiếp 3 lần).
                  </p>
                </div>

                {/* Readiness probe */}
                <div className="rounded-xl border border-line bg-slate-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">K8s Readiness Probe</span>
                    <Badge tone={readinessData?.status === "READY" ? "success" : "warning"}>
                      {readinessData?.status === "READY" ? "HTTP 200" : "HTTP 503"}
                    </Badge>
                  </div>
                  <code className="block rounded bg-slate-900 p-2 text-[11px] text-emerald-400 font-mono select-all">
                    GET /api/v1/health/readiness
                  </code>
                  <p className="text-[11px] text-muted">
                    Kiểm tra 4 phân hệ (DB, Event Bus, Outbox, Worker) trước khi định tuyến traffic vào Pod.
                  </p>
                </div>

                {/* Basic health */}
                <div className="rounded-xl border border-line bg-slate-50/70 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Load Balancer Health</span>
                    <Badge tone="info">HTTP 200</Badge>
                  </div>
                  <code className="block rounded bg-slate-900 p-2 text-[11px] text-emerald-400 font-mono select-all">
                    GET /api/v1/health
                  </code>
                  <p className="text-[11px] text-muted">
                    Ping cơ bản cho Nginx Ingress Controller hoặc AWS ALB / GCP Cloud Load Balancing.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 2: PROMETHEUS OBSERVABILITY & METRICS                         */}
        {/* ================================================================== */}
        {activeTab === "metrics" && (
          <div className="space-y-6">
            {/* KPI Metrics Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* HTTP Requests */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Tổng Yêu Cầu HTTP</span>
                  <Server size={16} className="text-blue-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-ink font-mono">
                    {metricsJson?.httpRequestsTotal?.toLocaleString() ?? 0}
                  </span>
                  <span className="text-[11px] text-muted">requests</span>
                </div>
                <p className="mt-1 text-[11px] text-emerald-600 font-medium">
                  Tự động thu thập thời gian đáp ứng & latency buckets
                </p>
              </div>

              {/* Domain Events */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Domain Events Đã Phát</span>
                  <Zap size={16} className="text-purple-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-ink font-mono">
                    {metricsJson?.eventsPublishedTotal?.toLocaleString() ?? 0}
                  </span>
                  <span className="text-[11px] text-muted">events</span>
                </div>
                <p className="mt-1 text-[11px] text-purple-700 font-medium">
                  Đã phi tập trung qua In-Process Domain Event Bus
                </p>
              </div>

              {/* Memory Heap */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Bộ Nhớ Node.js (Heap / RSS)</span>
                  <HardDrive size={16} className="text-amber-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-2xl font-black text-ink font-mono">
                    {metricsJson?.memoryUsageMb?.heapUsed ?? 0}
                  </span>
                  <span className="text-[11px] text-muted">
                    / {metricsJson?.memoryUsageMb?.rss ?? 0} MB
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.round(
                          ((metricsJson?.memoryUsageMb?.heapUsed || 1) /
                            (metricsJson?.memoryUsageMb?.rss || 1)) *
                            100
                        )
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Outbox Pending Lag */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-2xs">
                <div className="flex items-center justify-between text-muted text-xs font-semibold">
                  <span>Outbox Pending Lag</span>
                  <Layers size={16} className="text-rose-500" />
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span
                    className={cx(
                      "text-2xl font-black font-mono",
                      (metricsJson?.outboxPendingLag ?? 0) > 0 ? "text-amber-600" : "text-emerald-600"
                    )}
                  >
                    {metricsJson?.outboxPendingLag ?? 0}
                  </span>
                  <span className="text-[11px] text-muted">chờ dispatch</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 font-medium">
                  {(metricsJson?.outboxPendingLag ?? 0) === 0
                    ? "Tất cả sự kiện đã được đồng bộ 100%"
                    : "Đang được Worker quét định kỳ"}
                </p>
              </div>
            </div>

            {/* Prometheus OpenMetrics Scraping Card */}
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-ink flex items-center gap-2">
                    <Terminal size={18} className="text-brand-600" />
                    <span>OpenMetrics Prometheus Endpoint (`/api/v1/metrics`)</span>
                  </h3>
                  <p className="text-xs text-muted">
                    Endpoint chuẩn OpenMetrics (text/plain; version=0.0.4) phục vụ Prometheus Server & Grafana Dashboards
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const nextShow = !showRawMetrics;
                      setShowRawMetrics(nextShow);
                      if (nextShow) {
                        try {
                          const txt = await sysFetchText("/api/v1/metrics");
                          setRawMetrics(txt);
                        } catch (e: any) {
                          setRawMetrics(`# Error loading metrics: ${e?.message || "HTTP error"}`);
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Eye size={14} />
                    <span>{showRawMetrics ? "Ẩn Raw Output" : "Xem Raw Metrics"}</span>
                  </button>
                  <a
                    href="/api/v1/metrics"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-50 text-brand-700 border border-brand-200 px-3 py-1.5 text-xs font-semibold hover:bg-brand-100 transition"
                  >
                    <span>Mở tab mới</span>
                    <ExternalLink size={13} />
                  </a>
                </div>
              </div>

              {showRawMetrics && (
                <div className="relative mt-2">
                  <pre className="max-h-96 overflow-y-auto rounded-xl bg-slate-950 p-4 font-mono text-xs text-emerald-400 select-all leading-relaxed border border-slate-800">
                    {rawMetrics || "# Đang tải OpenMetrics text data..."}
                  </pre>
                  {rawMetrics && (
                    <button
                      onClick={() => copyToClipboard(rawMetrics)}
                      className="absolute top-3 right-3 flex items-center gap-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 text-[11px] font-semibold text-slate-200 border border-slate-700 backdrop-blur cursor-pointer"
                    >
                      {copiedText ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedText ? "Đã copy!" : "Copy metrics"}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 3: TRANSACTIONAL OUTBOX AUDIT TRAIL                           */}
        {/* ================================================================== */}
        {activeTab === "outbox" && (
          <div className="space-y-4">
            {/* Filter Bar & Batch Dispatch Action */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Trạng thái:</span>
                {["ALL", "PENDING", "PROCESSING", "PROCESSED", "FAILED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setOutboxStatus(st);
                      setOutboxPage(1);
                    }}
                    className={cx(
                      "rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer",
                      outboxStatus === st
                        ? "bg-brand-500 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {st === "ALL"
                      ? "Tất cả"
                      : st === "PENDING"
                      ? "Chờ xử lý (PENDING)"
                      : st === "PROCESSING"
                      ? "Đang xử lý (PROCESSING)"
                      : st === "PROCESSED"
                      ? "Đã xử lý (PROCESSED)"
                      : "Thất bại / DLQ (FAILED)"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleProcessOutboxBatch}
                  disabled={isProcessingBatch}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 cursor-pointer transition"
                >
                  <Play size={14} className={cx(isProcessingBatch && "animate-spin")} />
                  <span>{isProcessingBatch ? "Đang xử lý batch..." : "Xử lý Batch Ngay (Dispatch)"}</span>
                </button>
              </div>
            </div>

            {/* Outbox Table */}
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Event ID / Hash</th>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Aggregate</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4">Thử lại</th>
                      <th className="py-3 px-4">Thời gian tạo</th>
                      <th className="py-3 px-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {outboxEvents.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted">
                          Không có sự kiện outbox nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      outboxEvents.map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            <span title={evt.id}>{evt.id.slice(0, 12)}...</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                              {evt.eventType}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600">
                            {evt.aggregateType} <span className="text-slate-400">({evt.aggregateId?.slice(0, 8)})</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cx(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border",
                                evt.status === "PROCESSED"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : evt.status === "FAILED"
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : "bg-amber-50 text-amber-900 border-amber-300"
                              )}
                            >
                              <span
                                className={cx(
                                  "h-1.5 w-1.5 rounded-full",
                                  evt.status === "PROCESSED"
                                    ? "bg-emerald-500"
                                    : evt.status === "FAILED"
                                    ? "bg-rose-500"
                                    : "bg-amber-500"
                                )}
                              />
                              {evt.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                            {evt.retryCount || 0} lần
                          </td>
                          <td className="py-3 px-4 text-muted font-mono text-[11px]">
                            {new Date(evt.createdAt).toLocaleString("vi-VN")}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedOutboxEvent(evt)}
                                title="Xem Payload JSON"
                                className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 cursor-pointer"
                              >
                                <Eye size={15} />
                              </button>
                              {evt.status === "FAILED" && (
                                <button
                                  onClick={() => handleRetryOutboxEvent(evt.id)}
                                  disabled={actionInProgress === evt.id}
                                  title="Thử lại (Retry sự kiện FAILED)"
                                  className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                                >
                                  <RotateCcw
                                    size={12}
                                    className={cx(actionInProgress === evt.id && "animate-spin")}
                                  />
                                  <span>Retry</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* TAB 4: ASYNCHRONOUS WORKER QUEUE MONITOR                          */}
        {/* ================================================================== */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            {/* Worker Queue KPI Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-line bg-surface p-4 text-center shadow-2xs">
                <span className="text-xs text-muted font-semibold">Tác Vụ Đang Xử Lý</span>
                <p className="mt-1 text-2xl font-black text-blue-600 font-mono">
                  {jobStats.active || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-4 text-center shadow-2xs">
                <span className="text-xs text-muted font-semibold">Hàng Đợi Chờ (Pending)</span>
                <p className="mt-1 text-2xl font-black text-amber-600 font-mono">
                  {jobStats.pending || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-4 text-center shadow-2xs">
                <span className="text-xs text-muted font-semibold">Đã Hoàn Thành</span>
                <p className="mt-1 text-2xl font-black text-emerald-600 font-mono">
                  {jobStats.completed || 0}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-surface p-4 text-center shadow-2xs">
                <span className="text-xs text-muted font-semibold">Thất Bại (Failed)</span>
                <p className="mt-1 text-2xl font-black text-rose-600 font-mono">
                  {jobStats.failed || 0}
                </p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Lọc trạng thái:</span>
                {["ALL", "PROCESSING", "PENDING", "COMPLETED", "FAILED", "CANCELLED"].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setJobStatus(st);
                      setJobPage(1);
                    }}
                    className={cx(
                      "rounded-lg px-3 py-1 text-xs font-semibold transition cursor-pointer",
                      jobStatus === st
                        ? "bg-brand-500 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    )}
                  >
                    {st === "ALL"
                      ? "Tất cả"
                      : st === "PROCESSING"
                      ? "Đang chạy"
                      : st === "PENDING"
                      ? "Đang chờ"
                      : st === "COMPLETED"
                      ? "Thành công"
                      : st === "CANCELLED"
                      ? "Đã hủy"
                      : "Thất bại"}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleTriggerOutboxPoll}
                  disabled={isPollingOutbox}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer shadow-2xs transition"
                >
                  <RotateCcw size={13} className={cx(isPollingOutbox && "animate-spin")} />
                  <span>Kích hoạt Quét Outbox</span>
                </button>

                <button
                  onClick={() => setShowEnqueueModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-brand-600 cursor-pointer transition"
                >
                  <Play size={13} />
                  <span>Đẩy Job Mới (Enqueue)</span>
                </button>
              </div>
            </div>

            {/* Jobs Table */}
            <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-line bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="py-3 px-4">Job ID</th>
                      <th className="py-3 px-4">Loại Tác Vụ</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4">Tiến Độ</th>
                      <th className="py-3 px-4">Lần Thử</th>
                      <th className="py-3 px-4">Thời Gian</th>
                      <th className="py-3 px-4 text-right">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {jobs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-muted">
                          Chưa có tác vụ nào trong hàng đợi hoặc khớp bộ lọc.
                        </td>
                      </tr>
                    ) : (
                      jobs.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 font-mono font-medium text-slate-800">
                            <span title={job.id}>{job.id.slice(0, 10)}...</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                              {job.type}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={cx(
                                "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-bold border",
                                job.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                  : job.status === "PROCESSING"
                                  ? "bg-blue-50 text-blue-800 border-blue-300 animate-pulse"
                                  : job.status === "FAILED"
                                  ? "bg-rose-50 text-rose-800 border-rose-300"
                                  : job.status === "CANCELLED"
                                  ? "bg-slate-100 text-slate-600 border-slate-300"
                                  : "bg-amber-50 text-amber-900 border-amber-300"
                              )}
                            >
                              {job.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 w-36">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-muted font-mono">
                                <span>{job.progress || 0}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={cx(
                                    "h-1.5 rounded-full transition-all duration-300",
                                    job.status === "COMPLETED"
                                      ? "bg-emerald-500"
                                      : job.status === "FAILED"
                                      ? "bg-rose-500"
                                      : "bg-blue-500"
                                  )}
                                  style={{ width: `${job.progress || 0}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-700">
                            {job.attempts || 0} / {job.maxAttempts || 3}
                          </td>
                          <td className="py-3 px-4 text-muted font-mono text-[11px]">
                            {new Date(job.createdAt).toLocaleTimeString("vi-VN")}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setSelectedJob(job)}
                                title="Xem chi tiết & Payload"
                                className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-800 cursor-pointer"
                              >
                                <Eye size={15} />
                              </button>

                              {job.status === "PENDING" && (
                                <button
                                  onClick={() => handleCancelJob(job.id)}
                                  disabled={actionInProgress === job.id}
                                  title="Hủy Job"
                                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                >
                                  <XCircle size={15} />
                                </button>
                              )}

                              {(job.status === "FAILED" || job.status === "CANCELLED") && (
                                <button
                                  onClick={() => handleRetryJob(job.id)}
                                  disabled={actionInProgress === job.id}
                                  title="Thử lại Job"
                                  className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer"
                                >
                                  <RotateCcw
                                    size={12}
                                    className={cx(actionInProgress === job.id && "animate-spin")}
                                  />
                                  <span>Retry</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL: OUTBOX PAYLOAD INSPECTOR                                    */}
        {/* ================================================================== */}
        {selectedOutboxEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Layers className="text-brand-600" size={20} />
                  <h3 className="text-base font-extrabold text-ink">
                    Chi Tiết Sự Kiện Outbox: {selectedOutboxEvent.eventType}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedOutboxEvent(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-muted">Event ID:</span>
                  <p className="font-mono text-ink select-all">{selectedOutboxEvent.id}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted">Trạng thái:</span>
                  <p className="font-bold text-ink">{selectedOutboxEvent.status}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted">Aggregate:</span>
                  <p className="text-ink">
                    {selectedOutboxEvent.aggregateType} ({selectedOutboxEvent.aggregateId})
                  </p>
                </div>
                <div>
                  <span className="font-semibold text-muted">Lần thử lại:</span>
                  <p className="font-mono text-ink">{selectedOutboxEvent.retryCount || 0}</p>
                </div>
              </div>

              {selectedOutboxEvent.lastError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle size={14} /> Nhật ký lỗi (Last Error):
                  </span>
                  <pre className="mt-1 font-mono text-[11px] whitespace-pre-wrap">
                    {selectedOutboxEvent.lastError}
                  </pre>
                </div>
              )}

              <div>
                <span className="text-xs font-bold text-slate-700">Dữ Liệu Payload (JSON):</span>
                <pre className="mt-1 max-h-64 overflow-y-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-emerald-400 select-all border border-slate-800">
                  {JSON.stringify(selectedOutboxEvent.payload, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                {selectedOutboxEvent.status === "FAILED" && (
                  <button
                    onClick={() => {
                      handleRetryOutboxEvent(selectedOutboxEvent.id);
                      setSelectedOutboxEvent(null);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                  >
                    <RotateCcw size={14} />
                    <span>Thử Lại Sự Kiện Này</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedOutboxEvent(null)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL: JOB DETAIL INSPECTOR                                        */}
        {/* ================================================================== */}
        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-2xl rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="text-purple-600" size={20} />
                  <h3 className="text-base font-extrabold text-ink">
                    Chi Tiết Tác Vụ: {selectedJob.type}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="font-semibold text-muted">Job ID:</span>
                  <p className="font-mono text-ink select-all">{selectedJob.id}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted">Trạng thái:</span>
                  <p className="font-bold text-ink">{selectedJob.status}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted">Tiến độ:</span>
                  <p className="font-bold text-ink font-mono">{selectedJob.progress || 0}%</p>
                </div>
                <div>
                  <span className="font-semibold text-muted">Lần thử:</span>
                  <p className="font-mono text-ink">
                    {selectedJob.attempts || 0} / {selectedJob.maxAttempts || 3}
                  </p>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700">Payload Đầu Vào:</span>
                <pre className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-emerald-400 select-all border border-slate-800">
                  {JSON.stringify(selectedJob.payload, null, 2)}
                </pre>
              </div>

              {selectedJob.result && (
                <div>
                  <span className="text-xs font-bold text-slate-700">Kết Quả Xử Lý (Result):</span>
                  <pre className="mt-1 max-h-48 overflow-y-auto rounded-xl bg-slate-950 p-3 font-mono text-xs text-sky-400 select-all border border-slate-800">
                    {JSON.stringify(selectedJob.result, null, 2)}
                  </pre>
                </div>
              )}

              {selectedJob.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-xs text-rose-800">
                  <span className="font-bold flex items-center gap-1">
                    <AlertTriangle size={14} /> Lỗi xảy ra:
                  </span>
                  <p className="mt-1 font-mono text-[11px]">{selectedJob.error}</p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  onClick={() => setSelectedJob(null)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* MODAL: ENQUEUE NEW DEMO JOB                                       */}
        {/* ================================================================== */}
        {showEnqueueModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div className="flex items-center gap-2">
                  <Play className="text-brand-600" size={20} />
                  <h3 className="text-base font-extrabold text-ink">
                    Đẩy Tác Vụ Mới Vào Hàng Đợi (Enqueue Job)
                  </h3>
                </div>
                <button
                  onClick={() => setShowEnqueueModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Loại tác vụ (Job Type):</label>
                  <select
                    value={enqueueType}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEnqueueType(val);
                      if (val === "PAYROLL_BATCH_CALC") {
                        setEnqueuePayload(
                          JSON.stringify({ month: 9, year: 2026, faculty: "Khoa Kiến trúc" }, null, 2)
                        );
                      } else if (val === "ND30_DECISION_PDF") {
                        setEnqueuePayload(
                          JSON.stringify(
                            {
                              decisionNumber: "128/QĐ-ĐHKT",
                              type: "APPOINTMENT",
                              recipientName: "PGS.TS. Trần Thị Bình",
                            },
                            null,
                            2
                          )
                        );
                      } else {
                        setEnqueuePayload(JSON.stringify({ triggeredBy: "Admin UI" }, null, 2));
                      }
                    }}
                    className="w-full rounded-lg border border-line p-2 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="PAYROLL_BATCH_CALC">
                      PAYROLL_BATCH_CALC — Tính toán bảng lương hàng loạt
                    </option>
                    <option value="ND30_DECISION_PDF">
                      ND30_DECISION_PDF — Tạo quyết định & chứng thực số NĐ 30
                    </option>
                    <option value="OUTBOX_POLL">
                      OUTBOX_POLL — Quét và giải phóng Outbox định kỳ
                    </option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Độ ưu tiên (Priority):</label>
                  <select
                    value={enqueuePriority}
                    onChange={(e) => setEnqueuePriority(e.target.value as "HIGH" | "NORMAL" | "LOW")}
                    className="w-full rounded-lg border border-line p-2 text-xs font-semibold text-slate-800 bg-white"
                  >
                    <option value="HIGH">HIGH — Ưu tiên cao</option>
                    <option value="NORMAL">NORMAL — Bình thường</option>
                    <option value="LOW">LOW — Thấp</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Tham số đầu vào (JSON Payload):
                  </label>
                  <textarea
                    rows={6}
                    value={enqueuePayload}
                    onChange={(e) => setEnqueuePayload(e.target.value)}
                    className="w-full rounded-xl border border-line bg-slate-950 p-3 font-mono text-xs text-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  onClick={() => setShowEnqueueModal(false)}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  onClick={handleEnqueueNewJob}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-brand-600 active:bg-brand-700 cursor-pointer"
                >
                  <Play size={13} />
                  <span>Xác nhận Đẩy Job</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
