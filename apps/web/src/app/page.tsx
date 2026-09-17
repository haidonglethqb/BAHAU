import ApiHealthStatus from "../components/ApiHealthStatus";

export default function HomePage() {
  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 p-8 text-white shadow-lg sm:p-12">
        <div className="max-w-3xl space-y-4">
          <span className="inline-flex items-center rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300 backdrop-blur">
            Kiến trúc Nền tảng 2026
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Hệ thống Quản trị Nhân sự Thông minh (BAHAU)
          </h1>
          <p className="text-sm leading-relaxed text-blue-100 sm:text-base">
            Nền tảng số hóa quản trị nhân sự tập trung cho Trường Đại học Kiến trúc Đà Nẵng (DAU).
            Tích hợp mô hình 3 Không gian làm việc, chuỗi phê duyệt phân cấp chống tự duyệt,
            sổ cái giao dịch bất biến và quy chuẩn bảo vệ dữ liệu cá nhân.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a
              href="/login"
              className="rounded-lg bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-md hover:bg-amber-400 transition"
            >
              Vào Cổng Đăng nhập →
            </a>
            <a
              href="#spaces"
              className="rounded-lg border border-blue-300/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/20 transition"
            >
              Tìm hiểu 3 Không gian
            </a>
          </div>
        </div>
      </section>

      {/* Grid: Health Check & System Info */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <ApiHealthStatus />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-base font-bold text-slate-900 mb-3">
            Thông tin Nền tảng Kỹ thuật
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block">Frontend Stack</span>
              <span className="font-semibold text-slate-800">Next.js 15 (App Router)</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block">Backend API</span>
              <span className="font-semibold text-slate-800">Express 4 + TypeScript</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block">ORM & Database</span>
              <span className="font-semibold text-slate-800">Prisma 6 + PostgreSQL 17</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block">Single Source of Truth</span>
              <span className="font-semibold text-slate-800">@bahau/contracts (Zod)</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block">Cơ chế Xác thực</span>
              <span className="font-semibold text-slate-800">Stateful Session (HttpOnly)</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <span className="text-slate-500 block">Quy chuẩn Dữ liệu</span>
              <span className="font-semibold text-slate-800">Luật 91/2025/QH15</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Spaces Section */}
      <section id="spaces" className="space-y-4">
        <div className="border-b border-slate-200 pb-3">
          <h2 className="text-xl font-bold text-slate-900">
            3 Không gian Làm việc Chuyên biệt (3-Space Model)
          </h2>
          <p className="text-xs text-slate-500">
            Hệ thống tự động phân phối giao diện dựa trên vai trò và phạm vi đơn vị phụ trách của người dùng.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-blue-300 transition">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-900 font-bold">
              1
            </div>
            <h3 className="text-base font-bold text-slate-900">Không gian Cá nhân</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Dành cho 100% Cán bộ, Giảng viên, Nhân viên: Xem hồ sơ, nộp đơn nghỉ phép,
              đăng ký công tác, xem bảng công, tự đánh giá KPI, và cập nhật thông tin liên hệ.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-amber-300 transition">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-900 font-bold">
              2
            </div>
            <h3 className="text-base font-bold text-slate-900">Không gian Quản lý Đơn vị</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Dành cho Trưởng/Phó Khoa, Trưởng Bộ môn, Trưởng Phòng: Phê duyệt đơn từ cấp dưới,
              đánh giá KPI nhân sự trực thuộc, và đối chiếu bảng công đơn vị (kèm bộ lọc kiêm nhiệm).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:border-indigo-300 transition">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 text-indigo-900 font-bold">
              3
            </div>
            <h3 className="text-base font-bold text-slate-900">Không gian Nhân sự & Quản trị</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Dành cho Phòng Tổ chức - Hành chính và Lãnh đạo Trường: Quản trị hồ sơ toàn trường,
              cây cơ cấu tổ chức, hợp đồng, kỳ đánh giá, khóa kỳ công, và báo cáo tổng hợp.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
