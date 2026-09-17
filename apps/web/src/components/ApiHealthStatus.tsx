"use client";

import { useEffect, useState } from "react";

interface HealthData {
  status: string;
  uptime: number;
  version: string;
  database: string;
}

interface HealthResponse {
  success: boolean;
  data: HealthData;
  meta: {
    timestamp: string;
    requestId: string;
  };
}

export function ApiHealthStatus() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";

    async function checkHealth() {
      try {
        setLoading(true);
        const res = await fetch(`${apiUrl}/api/v1/health`, {
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }

        const data: HealthResponse = await res.json();
        if (data.success && data.data) {
          setHealth(data.data);
          setError(null);
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Cannot connect to API");
        setHealth(null);
      } finally {
        setLoading(false);
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span
            className={`inline-block h-3 w-3 rounded-full ${
              loading
                ? "animate-pulse bg-amber-400"
                : health?.status === "ok"
                ? "bg-emerald-500"
                : "bg-rose-500"
            }`}
          />
          <h3 className="text-sm font-semibold text-slate-800">
            Trạng thái Backend API
          </h3>
        </div>
        <span className="text-xs font-mono text-slate-500">
          {health?.version ? `v${health.version}` : "v1.0.0"}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-slate-50 p-2.5">
          <span className="text-slate-500">Kết nối Database:</span>
          <p
            className={`font-semibold capitalize ${
              health?.database === "connected"
                ? "text-emerald-600"
                : "text-amber-600"
            }`}
          >
            {loading
              ? "Đang kiểm tra..."
              : health?.database === "connected"
              ? "Đã kết nối"
              : "Chưa kết nối"}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5">
          <span className="text-slate-500">API Status:</span>
          <p
            className={`font-semibold ${
              health?.status === "ok" ? "text-emerald-600" : "text-rose-600"
            }`}
          >
            {loading ? "Đang tải..." : health?.status === "ok" ? "Hoạt động" : "Ngoại tuyến"}
          </p>
        </div>
      </div>

      {error && (
        <p className="mt-2 text-xs text-rose-500">
          Lỗi: {error} (Khởi chạy backend qua `npm run dev --workspace=apps/api`)
        </p>
      )}
    </div>
  );
}

export default ApiHealthStatus;
