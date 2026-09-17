"use client";

import { useEffect, useState } from "react";

interface UnitNode {
  id: string;
  code: string;
  name: string;
  unitType: "BOARD" | "FACULTY" | "DEPARTMENT" | "DIVISION" | "CENTER";
  managerName?: string | null;
  isActive: boolean;
  orderIndex: number;
  children?: UnitNode[];
}

const UNIT_TYPE_BADGES: Record<string, { label: string; color: string }> = {
  BOARD: { label: "Ban Giám hiệu", color: "bg-purple-100 text-purple-800 border-purple-200" },
  FACULTY: { label: "Khoa Đào tạo", color: "bg-blue-100 text-blue-800 border-blue-200" },
  DEPARTMENT: { label: "Phòng chức năng", color: "bg-amber-100 text-amber-800 border-amber-200" },
  DIVISION: { label: "Bộ môn trực thuộc", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  CENTER: { label: "Viện / Trung tâm", color: "bg-slate-100 text-slate-800 border-slate-200" },
};

function UnitTreeItem({ node, level = 0 }: { node: UnitNode; level?: number }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const badge = UNIT_TYPE_BADGES[node.unitType] || { label: node.unitType, color: "bg-slate-100 text-slate-700" };

  return (
    <div className="space-y-2">
      <div
        className={`flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 ${
          level === 0 ? "border-l-4 border-l-blue-900 bg-blue-50/20" : ""
        }`}
        style={{ marginLeft: `${level * 24}px` }}
      >
        <div className="flex items-center space-x-3">
          {hasChildren && (
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200"
            >
              {isOpen ? "−" : "+"}
            </button>
          )}
          {!hasChildren && <span className="inline-block h-6 w-6" />}

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-xs font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {node.code}
              </span>
              <h3 className="text-sm font-bold text-slate-900">{node.name}</h3>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            {node.managerName && (
              <p className="mt-1 text-xs text-slate-500">
                Phụ trách: <span className="font-medium text-slate-700">{node.managerName}</span>
              </p>
            )}
          </div>
        </div>

        <span className="text-xs text-slate-400">Thứ tự: {node.orderIndex}</span>
      </div>

      {hasChildren && isOpen && (
        <div className="space-y-2">
          {node.children!.map((child) => (
            <UnitTreeItem key={child.id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function UnitsPage() {
  const [tree, setTree] = useState<UnitNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTree() {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
        const res = await fetch(`${apiUrl}/api/v1/units/tree`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setTree(data.data);
        } else {
          throw new Error("Dữ liệu không hợp lệ");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Lỗi kết nối");
      } finally {
        setLoading(false);
      }
    }

    fetchTree();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sơ đồ Cơ cấu Tổ chức</h1>
          <p className="text-xs text-slate-500">
            Cây phân cấp các khoa đào tạo, bộ môn, phòng ban chức năng Trường Đại học Kiến trúc Đà Nẵng
          </p>
        </div>
        <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-900 border border-blue-200">
          Cơ cấu DAU 2026
        </span>
      </div>

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Đang tải sơ đồ cơ cấu tổ chức...
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center text-sm text-rose-700">
          Không thể tải dữ liệu từ máy chủ ({error}). Vui lòng kiểm tra Backend API.
        </div>
      )}

      {!loading && !error && tree.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Chưa có dữ liệu cơ cấu tổ chức.
        </div>
      )}

      {!loading && !error && tree.length > 0 && (
        <div className="space-y-3">
          {tree.map((root) => (
            <UnitTreeItem key={root.id} node={root} level={0} />
          ))}
        </div>
      )}
    </div>
  );
}
