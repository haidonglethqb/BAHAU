import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BAHAU — Quản trị Nhân sự Thông minh | Trường Đại học Kiến trúc Đà Nẵng",
  description:
    "Hệ thống Quản trị Nhân sự Thông minh cho Trường Đại học Kiến trúc Đà Nẵng (DAU) tích hợp AI Assistant và DevOps.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
            <div className="flex items-center space-x-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-900 font-black tracking-wider text-amber-400 shadow-sm">
                DAU
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900">BAHAU HRMS</h1>
                <p className="text-xs text-slate-500">
                  Trường Đại học Kiến trúc Đà Nẵng
                </p>
              </div>
            </div>

            <nav className="hidden items-center space-x-6 md:flex text-sm font-medium text-slate-600">
              <a href="/" className="hover:text-blue-900 transition-colors">
                Tổng quan
              </a>
              <a href="/employees" className="hover:text-blue-900 transition-colors">
                Hồ sơ CBGVNV
              </a>
              <a href="/units" className="hover:text-blue-900 transition-colors">
                Cơ cấu tổ chức
              </a>
              <a href="/#spaces" className="hover:text-blue-900 transition-colors">
                3 Không gian
              </a>
            </nav>

            <div className="flex items-center space-x-3">
              <a
                href="/login"
                className="rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-800 transition"
              >
                Đăng nhập
              </a>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
          <p>© 2026 BAHAU — Trường Đại học Kiến trúc Đà Nẵng (DAU). Bảo lưu mọi quyền.</p>
        </footer>
      </body>
    </html>
  );
}
