"use client";

import { useEffect, useState } from "react";

interface EmployeeItem {
  id: string;
  employeeCode: string;
  fullName: string;
  gender: "MALE" | "FEMALE" | "OTHER";
  workEmail: string;
  phoneNumber?: string | null;
  academicTitle: string;
  academicDegree: string;
  employmentStatus: string;
  hireDate: string;
  primaryUnitName?: string | null;
  primaryPositionName?: string | null;
}

// Fallback seed data if backend is offline
const DEMO_EMPLOYEES: EmployeeItem[] = [
  {
    id: "1",
    employeeCode: "DAU260001",
    fullName: "TS. Phạm Văn Dũng",
    gender: "MALE",
    workEmail: "rector.dung@dau.edu.vn",
    phoneNumber: "0905111222",
    academicTitle: "NONE",
    academicDegree: "DOCTOR",
    employmentStatus: "ACTIVE",
    hireDate: "2015-09-01",
    primaryUnitName: "Ban Giám hiệu",
    primaryPositionName: "Hiệu trưởng",
  },
  {
    id: "2",
    employeeCode: "DAU260002",
    fullName: "PGS.TS. Trần Thị Bình",
    gender: "FEMALE",
    workEmail: "tk.binh@dau.edu.vn",
    phoneNumber: "0905222333",
    academicTitle: "ASSOCIATE_PROFESSOR",
    academicDegree: "DOCTOR",
    employmentStatus: "ACTIVE",
    hireDate: "2018-03-15",
    primaryUnitName: "Khoa Kiến trúc",
    primaryPositionName: "Trưởng khoa",
  },
  {
    id: "3",
    employeeCode: "DAU260003",
    fullName: "ThS. Nguyễn Văn An",
    gender: "MALE",
    workEmail: "gv.an@dau.edu.vn",
    phoneNumber: "0905333444",
    academicTitle: "NONE",
    academicDegree: "MASTER",
    employmentStatus: "ACTIVE",
    hireDate: "2020-10-01",
    primaryUnitName: "Bộ môn Kiến trúc công trình",
    primaryPositionName: "Giảng viên",
  },
  {
    id: "4",
    employeeCode: "DAU260004",
    fullName: "ThS. Lê Văn Cường",
    gender: "MALE",
    workEmail: "hr.cuong@dau.edu.vn",
    phoneNumber: "0905444555",
    academicTitle: "NONE",
    academicDegree: "MASTER",
    employmentStatus: "ACTIVE",
    hireDate: "2019-05-20",
    primaryUnitName: "Phòng Tổ chức - Hành chính",
    primaryPositionName: "Phó Trưởng phòng",
  },
  {
    id: "5",
    employeeCode: "DAU260005",
    fullName: "KS. Hoàng Thị Mai",
    gender: "FEMALE",
    workEmail: "mai.ht@dau.edu.vn",
    phoneNumber: "0905555666",
    academicTitle: "NONE",
    academicDegree: "BACHELOR",
    employmentStatus: "ACTIVE",
    hireDate: "2022-01-10",
    primaryUnitName: "Khoa Xây dựng",
    primaryPositionName: "Giảng viên",
  },
];

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeItem[]>(DEMO_EMPLOYEES);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataSource, setDataSource] = useState<"api" | "demo">("demo");

  useEffect(() => {
    async function fetchEmployees() {
      try {
        setLoading(true);
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
        const res = await fetch(`${apiUrl}/api/v1/employees?pageSize=50`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            setEmployees(data.data);
            setDataSource("api");
          }
        }
      } catch {
        // Keep fallback data
        setDataSource("demo");
      } finally {
        setLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  const filtered = employees.filter((emp) => {
    const term = search.toLowerCase();
    return (
      emp.fullName.toLowerCase().includes(term) ||
      emp.employeeCode.toLowerCase().includes(term) ||
      emp.workEmail.toLowerCase().includes(term) ||
      (emp.primaryUnitName && emp.primaryUnitName.toLowerCase().includes(term))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Danh sách Cán bộ Giảng viên Nhân viên</h1>
          <p className="text-xs text-slate-500">
            Quản trị hồ sơ nhân sự tập trung Trường Đại học Kiến trúc Đà Nẵng (DAU)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              dataSource === "api"
                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                : "bg-amber-100 text-amber-800 border border-amber-200"
            }`}
          >
            {dataSource === "api" ? "Dữ liệu Live API" : "Dữ liệu Mô phỏng DAU"}
          </span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm theo họ tên, mã CBGV, email, đơn vị..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 py-2 pl-3 pr-8 text-sm focus:border-blue-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
        <span className="text-xs text-slate-500">
          Hiển thị <strong>{filtered.length}</strong> nhân sự
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Mã CBGV</th>
                <th className="px-4 py-3">Họ và tên</th>
                <th className="px-4 py-3">Đơn vị công tác</th>
                <th className="px-4 py-3">Chức danh / Vị trí</th>
                <th className="px-4 py-3">Học vị / Học hàm</th>
                <th className="px-4 py-3">Email làm việc</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {filtered.map((emp) => (
                <tr key={emp.id} className="hover:bg-blue-50/40 transition">
                  <td className="px-4 py-3.5 font-mono font-bold text-blue-900">
                    {emp.employeeCode}
                  </td>
                  <td className="px-4 py-3.5 font-medium text-slate-900">
                    {emp.fullName}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {emp.primaryUnitName || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {emp.primaryPositionName || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-slate-600">
                    {emp.academicDegree}
                    {emp.academicTitle !== "NONE" ? ` / ${emp.academicTitle}` : ""}
                  </td>
                  <td className="px-4 py-3.5 font-mono text-[11px] text-slate-500">
                    {emp.workEmail}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                      {emp.employmentStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
