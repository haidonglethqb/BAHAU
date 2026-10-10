"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  GraduationCap,
  Plus,
  Search,
  Users,
  Building2,
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Sparkles,
  Layers,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { useAuth } from "../../context/AuthContext";
import type {
  PostgradStudentDto,
  CreatePostgradStudentInput,
  PostgradDegreeLevel,
  PostgradSpecialization,
  ThesisDefenseStatus,
  SupervisionRole,
} from "@bahau/contracts";

const INITIAL_STUDENTS: PostgradStudentDto[] = [
  {
    id: "pg-dau-001",
    studentCode: "NCS2023-KT01",
    fullName: "NCS. ThS.KTS. Phan Đăng Nhật Minh",
    degreeLevel: "DOCTORAL",
    specialization: "ARCHITECTURE",
    thesisTitle: "Cấu trúc không gian vi khí hậu trong tổ chức quy hoạch nhà ở cao tầng thích ứng biến đổi khí hậu duyên hải Nam Trung Bộ",
    cohortYear: 2023,
    departmentName: "Khoa Kiến trúc",
    status: "DEFENSE_SCHEDULED",
    supervisors: [
      {
        employeeId: "DAU260001-ID",
        employeeCode: "DAU260001",
        fullName: "GS.TS. Nguyễn Hiệu Trưởng",
        academicTitle: "GS.TS",
        role: "PRIMARY_SUPERVISOR",
        convertedHours: 50,
        kpiPoints: 20,
      },
      {
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "TS. Lê Hoàng Nam",
        academicTitle: "TS",
        role: "CO_SUPERVISOR",
        convertedHours: 25,
        kpiPoints: 10,
      },
    ],
    defenseMembers: [
      {
        employeeId: "DAU260001-ID",
        employeeCode: "DAU260001",
        fullName: "GS.TS. Nguyễn Hiệu Trưởng",
        role: "PRESIDENT",
        score: 0,
        isApproved: false,
        honorariumAmount: 2000000,
      },
      {
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "TS. Lê Hoàng Nam",
        role: "REVIEWER_1",
        score: 0,
        isApproved: false,
        honorariumAmount: 1500000,
      },
      {
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        fullName: "ThS. Nguyễn Văn An",
        role: "REVIEWER_2",
        score: 0,
        isApproved: false,
        honorariumAmount: 1500000,
      },
      {
        employeeId: "DAU260004-ID",
        employeeCode: "DAU260004",
        fullName: "ThS. Phạm Thị Mai",
        role: "COMMISSIONER",
        score: 0,
        isApproved: false,
        honorariumAmount: 1000000,
      },
      {
        employeeId: "DAU260005-ID",
        employeeCode: "DAU260005",
        fullName: "ThS. Đỗ Thị Quỳnh Chi",
        role: "SECRETARY",
        score: 0,
        isApproved: false,
        honorariumAmount: 1000000,
      },
    ],
    defenseResult: null,
    degreeResolutionNumber: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2023-11-01T08:00:00.000Z",
    updatedAt: "2026-09-15T10:00:00.000Z",
  },
  {
    id: "pg-dau-002",
    studentCode: "CH2024-QH03",
    fullName: "HVCH. KTS. Trần Thanh Trúc",
    degreeLevel: "MASTER",
    specialization: "URBAN_PLANNING",
    thesisTitle: "Tái thiết hành lang xanh cảnh quan sinh thái ven sông Cu Đê, quận Liên Chiểu, TP. Đà Nẵng",
    cohortYear: 2024,
    departmentName: "Khoa Quy hoạch",
    status: "ASSIGNED",
    supervisors: [
      {
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "TS. Lê Hoàng Nam",
        academicTitle: "TS",
        role: "PRIMARY_SUPERVISOR",
        convertedHours: 30,
        kpiPoints: 15,
      },
    ],
    defenseMembers: [],
    defenseResult: null,
    degreeResolutionNumber: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2024-10-15T09:00:00.000Z",
    updatedAt: "2024-10-15T09:00:00.000Z",
  },
  {
    id: "pg-dau-003",
    studentCode: "CH2024-KT08",
    fullName: "HVCH. KTS. Nguyễn Lê Bảo Anh",
    degreeLevel: "MASTER",
    specialization: "ARCHITECTURE",
    thesisTitle: "Ứng dụng ngôn ngữ kiến trúc Chăm cổ trong thiết kế công trình văn hóa công cộng đương đại miền Trung",
    cohortYear: 2024,
    departmentName: "Khoa Kiến trúc",
    status: "RESEARCH_SUBMITTED",
    supervisors: [
      {
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        fullName: "ThS. Nguyễn Văn An",
        academicTitle: "ThS.KTS",
        role: "PRIMARY_SUPERVISOR",
        convertedHours: 30,
        kpiPoints: 15,
      },
    ],
    defenseMembers: [],
    defenseResult: null,
    degreeResolutionNumber: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2024-10-20T14:00:00.000Z",
    updatedAt: "2026-08-30T16:00:00.000Z",
  },
];

export default function PostgraduatePage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<PostgradStudentDto[]>(INITIAL_STUDENTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDegree, setSelectedDegree] = useState<string>("ALL");
  const [selectedSpec, setSelectedSpec] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Student Form State
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formDegree, setFormDegree] = useState<PostgradDegreeLevel>("DOCTORAL");
  const [formSpec, setFormSpec] = useState<PostgradSpecialization>("ARCHITECTURE");
  const [formThesisTitle, setFormThesisTitle] = useState("");
  const [formCohort, setFormCohort] = useState(2025);
  const [formDepartment, setFormDepartment] = useState("Khoa Kiến trúc");

  const [formSup1Name, setFormSup1Name] = useState("GS.TS. Nguyễn Hiệu Trưởng");
  const [formSup1Code, setFormSup1Code] = useState("DAU260001");
  const [formSup1Title, setFormSup1Title] = useState("GS.TS");
  const [formSup1Role, setFormSup1Role] = useState<SupervisionRole>("PRIMARY_SUPERVISOR");

  const [formSup2Name, setFormSup2Name] = useState("TS. Lê Hoàng Nam");
  const [formSup2Code, setFormSup2Code] = useState("DAU260002");
  const [formSup2Title, setFormSup2Title] = useState("TS");
  const [formSup2Role, setFormSup2Role] = useState<SupervisionRole>("CO_SUPERVISOR");

  // Load from API
  useEffect(() => {
    async function fetchStudents() {
      try {
        const token = localStorage.getItem("token") || "mock-token";
        const res = await fetch("/api/v1/postgrad/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setStudents(json.data);
          }
        }
      } catch {
        // Fallback to initial seed
      }
    }
    fetchStudents();
  }, []);

  // Metrics
  const totalStudents = students.length;
  const phdCount = students.filter((s) => s.degreeLevel === "DOCTORAL").length;
  const masterCount = students.filter((s) => s.degreeLevel === "MASTER").length;
  const totalSupervisionHours = students.reduce((sum, s) => {
    return sum + s.supervisors.reduce((hSum, sup) => hSum + sup.convertedHours, 0);
  }, 0);

  // Filtered List
  const filteredStudents = students.filter((s) => {
    if (selectedDegree !== "ALL" && s.degreeLevel !== selectedDegree) return false;
    if (selectedSpec !== "ALL" && s.specialization !== selectedSpec) return false;
    if (selectedStatus !== "ALL" && s.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.fullName.toLowerCase().includes(q);
      const matchCode = s.studentCode.toLowerCase().includes(q);
      const matchTitle = s.thesisTitle.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchTitle) return false;
    }
    return true;
  });

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token") || "mock-token";

    const supervisors = [
      {
        employeeId: `${formSup1Code}-ID`,
        employeeCode: formSup1Code,
        fullName: formSup1Name,
        academicTitle: formSup1Title,
        role: formSup1Role,
      },
    ];

    if (formSup2Name.trim()) {
      supervisors.push({
        employeeId: `${formSup2Code}-ID`,
        employeeCode: formSup2Code,
        fullName: formSup2Name,
        academicTitle: formSup2Title,
        role: formSup2Role,
      });
    }

    const payload: CreatePostgradStudentInput = {
      studentCode: formCode,
      fullName: formName,
      degreeLevel: formDegree,
      specialization: formSpec,
      thesisTitle: formThesisTitle,
      cohortYear: Number(formCohort),
      departmentName: formDepartment,
      supervisors,
    };

    try {
      const res = await fetch("/api/v1/postgrad/students", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        setStudents([json.data, ...students]);
        setIsCreateModalOpen(false);
      } else {
        // Fallback local append
        const isDoc = payload.degreeLevel === "DOCTORAL";
        const newStu: PostgradStudentDto = {
          id: `pg-dau-${Date.now().toString(36)}`,
          studentCode: payload.studentCode,
          fullName: payload.fullName,
          degreeLevel: payload.degreeLevel,
          specialization: payload.specialization,
          thesisTitle: payload.thesisTitle,
          cohortYear: payload.cohortYear,
          departmentName: payload.departmentName,
          status: "ASSIGNED",
          supervisors: supervisors.map((s) => ({
            ...s,
            convertedHours: isDoc ? (s.role === "PRIMARY_SUPERVISOR" ? 50 : 25) : 30,
            kpiPoints: isDoc ? (s.role === "PRIMARY_SUPERVISOR" ? 20 : 10) : 15,
          })),
          defenseMembers: [],
          defenseResult: null,
          degreeResolutionNumber: null,
          pkiSignature: null,
          pkiSignedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setStudents([newStu, ...students]);
        setIsCreateModalOpen(false);
      }
    } catch {
      setIsCreateModalOpen(false);
    }
  };

  const getStatusBadge = (status: ThesisDefenseStatus) => {
    switch (status) {
      case "ASSIGNED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">Đang nghiên cứu đề tài</span>;
      case "RESEARCH_SUBMITTED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Đã nộp bản thảo luận văn</span>;
      case "DEFENSE_SCHEDULED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Đã thành lập Hội đồng</span>;
      case "PASSED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Hội đồng chấm ĐẠT</span>;
      case "REJECTED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800">Bảo vệ không đạt</span>;
      case "DEGREE_AWARDED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 size={12} /> Đã công nhận học vị</span>;
    }
  };

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Banner Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-800">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-medium mb-3 border border-indigo-500/30">
                <BookMarked size={14} />
                <span>Thông tư 18/2021/TT-BGDĐT & Thông tư 23/2021/TT-BGDĐT</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Quản Lý Đào Tạo Sau Đại Học & Cán Bộ Hướng Dẫn
              </h1>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                Hệ thống theo dõi tiến độ nghiên cứu sinh và học viên cao học Kiến trúc - Quy hoạch, tích hợp cơ chế
                <strong className="text-indigo-300"> quy đổi giờ chuẩn giảng dạy (Workload)</strong>,
                <strong className="text-emerald-300"> chi trả thù lao Hội đồng (Payroll)</strong> và
                <strong className="text-sky-300"> ký số PKI cấp bằng Thạc sĩ / Tiến sĩ</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={16} />
                <span>Đăng ký Đề tài & Phân công CBHD</span>
              </button>

              <Link
                href="/postgraduate/councils"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-semibold rounded-xl flex items-center gap-2 transition-all"
              >
                <Award size={16} className="text-amber-300" />
                <span>Hội đồng Đánh giá & Cấp bằng</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Tổng Học viên Sau Đại học</span>
              <p className="text-2xl font-bold text-white mt-1">{totalStudents}</p>
              <span className="text-[11px] text-indigo-400">NCS & Học viên cao học</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Nghiên cứu sinh Tiến sĩ (PhD)</span>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{phdCount}</p>
              <span className="text-[11px] text-slate-400">50h - 75h quy đổi/năm</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Học viên Cao học Thạc sĩ</span>
              <p className="text-2xl font-bold text-amber-400 mt-1">{masterCount}</p>
              <span className="text-[11px] text-slate-400">30h quy đổi/năm</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Tổng Giờ chuẩn Hướng dẫn</span>
              <p className="text-2xl font-bold text-sky-400 mt-1">+{totalSupervisionHours}h</p>
              <span className="text-[11px] text-slate-400">Đã quy đổi vào Workload</span>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-96">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm tên học viên, mã số, đề tài, CBHD..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <select
                value={selectedDegree}
                onChange={(e) => setSelectedDegree(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả trình độ</option>
                <option value="DOCTORAL">Tiến sĩ (NCS)</option>
                <option value="MASTER">Thạc sĩ (Cao học)</option>
              </select>

              <select
                value={selectedSpec}
                onChange={(e) => setSelectedSpec(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả chuyên ngành</option>
                <option value="ARCHITECTURE">Kiến trúc</option>
                <option value="URBAN_PLANNING">Quy hoạch Đô thị</option>
                <option value="CIVIL_ENGINEERING">Kỹ thuật Xây dựng</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="ASSIGNED">Đang nghiên cứu</option>
                <option value="RESEARCH_SUBMITTED">Đã nộp bản thảo</option>
                <option value="DEFENSE_SCHEDULED">Đã lập Hội đồng</option>
                <option value="PASSED">Hội đồng chấm Đạt</option>
                <option value="DEGREE_AWARDED">Đã cấp bằng</option>
              </select>
            </div>
          </div>
        </div>

        {/* Students List */}
        <div className="grid grid-cols-1 gap-5">
          {filteredStudents.map((student) => {
            const isDoc = student.degreeLevel === "DOCTORAL";

            return (
              <div
                key={student.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md">
                        {student.studentCode}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${isDoc ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                        {isDoc ? "Nghiên cứu sinh Tiến sĩ" : "Học viên Thạc sĩ"}
                      </span>
                      <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                        Khóa {student.cohortYear} • {student.departmentName}
                      </span>
                      {getStatusBadge(student.status)}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug hover:text-indigo-600 transition-colors">
                      {student.thesisTitle}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        <span>Học viên: <strong className="text-slate-800">{student.fullName}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-400" />
                        <span>Chuyên ngành: <strong>{student.specialization}</strong></span>
                      </div>
                    </div>

                    {/* Supervisors List */}
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-500 block mb-1.5">Cán bộ Hướng dẫn Khoa học:</span>
                      <div className="flex flex-wrap gap-2">
                        {student.supervisors.map((sup, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <span className="font-medium text-slate-800">{sup.fullName}</span>
                            <span className="text-[10px] text-slate-500">({sup.role === "PRIMARY_SUPERVISOR" ? "HD Chính" : "HD Phụ"})</span>
                            <span className="text-[10px] text-emerald-600 font-bold">+{sup.convertedHours}h chuẩn</span>
                            <span className="text-[10px] text-sky-600 font-bold">+{sup.kpiPoints}đ KPI</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Council & Actions */}
                  <div className="lg:w-80 flex flex-col justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block mb-1">Tình trạng Đánh giá & Hội đồng:</span>
                      {student.defenseResult ? (
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs text-purple-900 space-y-1">
                          <div className="flex items-center justify-between font-semibold">
                            <span>Hội đồng đánh giá:</span>
                            <span className="px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded font-mono font-bold">
                              {student.defenseResult.averageScore} / 100đ
                            </span>
                          </div>
                          <p className="text-[11px] text-purple-700">
                            Biểu quyết: <strong>{student.defenseResult.approvedVotes}/5 Tán thành</strong> • Xếp loại: <strong>{student.defenseResult.ranking}</strong>
                          </p>
                        </div>
                      ) : student.status === "DEFENSE_SCHEDULED" ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-xs text-blue-900">
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Clock size={14} className="text-blue-600" />
                            <span>Đã lập Hội đồng 5 thành viên</span>
                          </div>
                          <span className="text-[11px] text-blue-700 block mt-1">Đang chờ tổ chức phiên bảo vệ chính thức</span>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 italic p-2 bg-white rounded border border-slate-200">
                          Chưa đến thời điểm thành lập Hội đồng chấm luận văn.
                        </div>
                      )}

                      {/* Resolution signed info */}
                      {student.degreeResolutionNumber && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-900 flex items-center gap-2 mt-2">
                          <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
                          <div className="text-[11px]">
                            <span className="font-semibold block">{student.degreeResolutionNumber}</span>
                            <span className="text-emerald-700">Ký số PKI RSA-2048 • Đã cấp bằng</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <Link
                        href={`/postgraduate/councils?id=${student.id}`}
                        className="flex-1 text-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                      >
                        {student.status === "DEGREE_AWARDED" ? "Xem Quyết Định Cấp Bằng" : "Hội Đồng Bảo Vệ & Chấm Điểm"}
                      </Link>

                      {student.status === "DEGREE_AWARDED" && (
                        <a
                          href={`/api/v1/postgrad/students/${student.id}/resolution/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                          title="Tải Quyết định Cấp bằng PDF"
                        >
                          <Download size={15} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredStudents.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
              <BookMarked size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">Không tìm thấy hồ sơ học viên phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Vui lòng điều chỉnh lại từ khóa tìm kiếm hoặc bộ lọc.</p>
            </div>
          )}
        </div>

        {/* Modal: Đăng ký Đề tài & Phân công CBHD mới */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Đăng Ký Đề Tài & Phân Công Cán Bộ Hướng Dẫn</h2>
                    <p className="text-xs text-slate-500">Chuẩn quy chế đào tạo Thông tư 18/2021 & Thông tư 23/2021/TT-BGDĐT</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateStudent} className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Mã học viên / NCS *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: NCS2025-KT02"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Họ và tên học viên *</label>
                    <input
                      type="text"
                      required
                      placeholder="VD: ThS.KTS. Hoàng Minh Trí"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Trình độ đào tạo</label>
                    <select
                      value={formDegree}
                      onChange={(e) => setFormDegree(e.target.value as PostgradDegreeLevel)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="DOCTORAL">Tiến sĩ (Nghiên cứu sinh)</option>
                      <option value="MASTER">Thạc sĩ (Cao học)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Chuyên ngành</label>
                    <select
                      value={formSpec}
                      onChange={(e) => setFormSpec(e.target.value as PostgradSpecialization)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ARCHITECTURE">Kiến trúc</option>
                      <option value="URBAN_PLANNING">Quy hoạch Đô thị & Nông thôn</option>
                      <option value="CIVIL_ENGINEERING">Kỹ thuật Xây dựng</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Khóa tuyển sinh</label>
                    <input
                      type="number"
                      value={formCohort}
                      onChange={(e) => setFormCohort(Number(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đề tài Luận văn Thạc sĩ / Luận án Tiến sĩ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Cấu trúc cảnh quan sinh thái đô thị..."
                    value={formThesisTitle}
                    onChange={(e) => setFormThesisTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Supervisors Form */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Cán bộ Hướng dẫn Khoa học (Tự động quy đổi Giờ chuẩn TT 20/2020)
                  </h4>

                  {/* Supervisor 1 */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Tên CBHD 1"
                      value={formSup1Name}
                      onChange={(e) => setFormSup1Name(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Mã CBGV"
                      value={formSup1Code}
                      onChange={(e) => setFormSup1Code(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                    <select
                      value={formSup1Role}
                      onChange={(e) => setFormSup1Role(e.target.value as SupervisionRole)}
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="PRIMARY_SUPERVISOR">Hướng dẫn Chính (50h NCS / 30h ThS)</option>
                      <option value="CO_SUPERVISOR">Hướng dẫn Phụ (25h NCS)</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Học hàm / học vị"
                      value={formSup1Title}
                      onChange={(e) => setFormSup1Title(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>

                  {/* Supervisor 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Tên CBHD 2 (nếu có)"
                      value={formSup2Name}
                      onChange={(e) => setFormSup2Name(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Mã CBGV"
                      value={formSup2Code}
                      onChange={(e) => setFormSup2Code(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                    <select
                      value={formSup2Role}
                      onChange={(e) => setFormSup2Role(e.target.value as SupervisionRole)}
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="CO_SUPERVISOR">Hướng dẫn Phụ (25h NCS)</option>
                      <option value="PRIMARY_SUPERVISOR">Đồng Hướng dẫn Chính</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Học hàm / học vị"
                      value={formSup2Title}
                      onChange={(e) => setFormSup2Title(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-all"
                  >
                    Xác nhận Đăng ký
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
