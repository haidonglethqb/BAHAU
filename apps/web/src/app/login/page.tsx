"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  // Quick fill demo accounts
  const sampleAccounts = [
    { role: "Giảng viên (CBGV)", email: "gv.an@dau.edu.vn", name: "Nguyễn Văn An" },
    { role: "Trưởng khoa (Khoa KT)", email: "tk.binh@dau.edu.vn", name: "Trần Thị Bình" },
    { role: "Phòng TCHC (Nhân sự)", email: "hr.cuong@dau.edu.vn", name: "Lê Văn Cường" },
    { role: "Hiệu trưởng (Lãnh đạo)", email: "rector.dung@dau.edu.vn", name: "Phạm Văn Dũng" },
    { role: "Quản trị (Admin)", email: "admin@dau.edu.vn", name: "Hệ thống DAU" },
  ];

  const handleFill = (accEmail: string) => {
    setEmail(accEmail);
    setPassword("Bahaudau@2026");
    setMessage(`Đã điền tài khoản mẫu: ${accEmail}`);
    setIsError(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
      const res = await fetch(`${apiUrl}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error?.message || "Đăng nhập thất bại");
      }

      setIsError(false);
      setMessage(`Đăng nhập thành công! Chào mừng ${data.data?.user?.fullName || email}`);
    } catch (err: unknown) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : "Không thể kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6 pt-4">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-900 font-black tracking-wider text-amber-400 shadow-md">
          DAU
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Cổng Đăng nhập</h1>
        <p className="mt-1 text-xs text-slate-500">
          Hệ thống Quản trị Nhân sự — Trường Đại học Kiến trúc Đà Nẵng
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Email công tác (@dau.edu.vn)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ten.ho@dau.edu.vn"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Mật khẩu
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
            />
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 text-xs ${
                isError
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-900 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-800 disabled:opacity-50 transition"
          >
            {loading ? "Đang xác thực..." : "Đăng nhập hệ thống"}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-600 mb-2">
            Tài khoản thử nghiệm mẫu (Seed Data DAU):
          </p>
          <div className="space-y-1.5">
            {sampleAccounts.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleFill(acc.email)}
                className="w-full flex items-center justify-between rounded-md bg-slate-50 px-2.5 py-1.5 text-left text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-900 transition"
              >
                <span className="font-medium">{acc.role}</span>
                <span className="text-[11px] text-slate-500">{acc.email}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[10px] text-slate-400 text-center">
            Mật khẩu mặc định cho các tài khoản mẫu: <code>Bahaudau@2026</code>
          </p>
        </div>
      </div>
    </div>
  );
}
