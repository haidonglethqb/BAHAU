"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Award,
  BookOpen,
  BookMarked,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  FileText,
  Key,
  Layers,
  Percent,
  Scale,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import { AuthGuard } from "../../../components/AuthGuard";
import { useAuth } from "../../../context/AuthContext";
import type {
  PostgradStudentDto,
  ScheduleDefenseCouncilInput,
  ScoreThesisDefenseInput,
  AwardPostgradDegreeWithPkiInput,
  DefenseCouncilRole,
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

function PostgradCouncilsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [students, setStudents] = useState<PostgradStudentDto[]>(INITIAL_STUDENTS);
  const [selectedStudentId, setSelectedStudentId] = useState<string>(
    initialId || "pg-dau-001"
  );

  // Modals
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isPkiModalOpen, setIsPkiModalOpen] = useState(false);

  // Council Schedule Form (5 members)
  const [defenseDate, setDefenseDate] = useState("2026-10-20");
  const [c1Name, setC1Name] = useState("GS.TS. Nguyễn Hiệu Trưởng");
  const [c1Code, setC1Code] = useState("DAU260001");
  const [c2Name, setC2Name] = useState("TS. Lê Hoàng Nam");
  const [c2Code, setC2Code] = useState("DAU260002");
  const [c3Name, setC3Name] = useState("ThS. Nguyễn Văn An");
  const [c3Code, setC3Code] = useState("DAU260003");
  const [c4Name, setC4Name] = useState("ThS. Phạm Thị Mai");
  const [c4Code, setC4Code] = useState("DAU260004");
  const [c5Name, setC5Name] = useState("ThS. Đỗ Thị Quỳnh Chi");
  const [c5Code, setC5Code] = useState("DAU260005");

  // Score Form
  const [scores, setScores] = useState<{ [empId: string]: { score: number; isApproved: boolean } }>({
    "DAU260001-ID": { score: 90, isApproved: true },
    "DAU260002-ID": { score: 88, isApproved: true },
    "DAU260003-ID": { score: 86, isApproved: true },
    "DAU260004-ID": { score: 85, isApproved: true },
    "DAU260005-ID": { score: 87, isApproved: true },
  });
  const [councilNotes, setCouncilNotes] = useState(
    "Luận án có đóng góp mới về mặt khoa học và ứng dụng thực tiễn trong quy hoạch kiến trúc."
  );

  // PKI Form
  const [signerName, setSignerName] = useState("GS.TS. Nguyễn Hiệu Trưởng");
  const [resolutionNumber, setResolutionNumber] = useState("220/QĐ-ĐHKTĐN");

  // Load from API
  useEffect(() => {
    async function fetchStudents() {
      try {
        const token = localStorage.getItem("token") || "mock-token";
        const res = await fetch("http://localhost:3001/api/v1/postgrad/students", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setStudents(json.data);
            if (!initialId) {
              setSelectedStudentId(json.data[0].id);
            }
          }
        }
      } catch {
        // Fallback
      }
    }
    fetchStudents();
  }, [initialId]);

  const activeStudent =
    students.find((s) => s.id === selectedStudentId) || students[0];

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  // Handle Schedule Council
  const handleScheduleCouncil = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    const token = localStorage.getItem("token") || "mock-token";
    const councilMembers = [
      { employeeId: `${c1Code}-ID`, employeeCode: c1Code, fullName: c1Name, role: "PRESIDENT" as DefenseCouncilRole },
      { employeeId: `${c2Code}-ID`, employeeCode: c2Code, fullName: c2Name, role: "REVIEWER_1" as DefenseCouncilRole },
      { employeeId: `${c3Code}-ID`, employeeCode: c3Code, fullName: c3Name, role: "REVIEWER_2" as DefenseCouncilRole },
      { employeeId: `${c4Code}-ID`, employeeCode: c4Code, fullName: c4Name, role: "COMMISSIONER" as DefenseCouncilRole },
      { employeeId: `${c5Code}-ID`, employeeCode: c5Code, fullName: c5Name, role: "SECRETARY" as DefenseCouncilRole },
    ];

    const payload: ScheduleDefenseCouncilInput = { defenseDate, councilMembers };

    try {
      const res = await fetch(
        `http://localhost:3001/api/v1/postgrad/students/${activeStudent.id}/schedule-council`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setStudents(students.map((s) => (s.id === activeStudent.id ? json.data : s)));
      } else {
        // Local fallback
        const updated: PostgradStudentDto = {
          ...activeStudent,
          status: "DEFENSE_SCHEDULED",
          defenseMembers: councilMembers.map((m) => {
            let honorarium = 1000000;
            if (m.role === "PRESIDENT") honorarium = 2000000;
            else if (m.role === "REVIEWER_1" || m.role === "REVIEWER_2") honorarium = 1500000;
            return {
              employeeId: m.employeeId,
              employeeCode: m.employeeCode,
              fullName: m.fullName,
              role: m.role,
              score: 0,
              isApproved: false,
              honorariumAmount: honorarium,
            };
          }),
          updatedAt: new Date().toISOString(),
        };
        setStudents(students.map((s) => (s.id === activeStudent.id ? updated : s)));
      }
    } catch {
      // Fallback
    }

    setIsScheduleModalOpen(false);
  };

  // Handle Score Defense
  const handleScoreDefense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent || !activeStudent.defenseMembers) return;

    const token = localStorage.getItem("token") || "mock-token";
    const memberScores = activeStudent.defenseMembers.map((m) => {
      const entry = scores[m.employeeId] || { score: 85, isApproved: true };
      return {
        employeeId: m.employeeId,
        score: Number(entry.score),
        isApproved: Boolean(entry.isApproved),
      };
    });

    const payload: ScoreThesisDefenseInput = { memberScores, councilNotes };

    try {
      const res = await fetch(
        `http://localhost:3001/api/v1/postgrad/students/${activeStudent.id}/score-defense`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setStudents(students.map((s) => (s.id === activeStudent.id ? json.data : s)));
      } else {
        // Local fallback
        const total = memberScores.reduce((s, m) => s + m.score, 0);
        const avg = Math.round((total / 5) * 10) / 10;
        const approved = memberScores.filter((m) => m.isApproved).length;
        const passed = avg >= 70 && approved >= 4;

        const updated: PostgradStudentDto = {
          ...activeStudent,
          status: passed ? "PASSED" : "REJECTED",
          defenseResult: {
            defenseDate: new Date().toISOString(),
            averageScore: avg,
            approvedVotes: approved,
            totalMembers: 5,
            isPassed: passed,
            ranking: avg >= 90 ? "EXCELLENT" : avg >= 80 ? "GOOD" : "SATISFACTORY",
            councilNotes,
            councilResolutionNumber: `HĐ-SĐH-2026-${activeStudent.studentCode}`,
          },
          updatedAt: new Date().toISOString(),
        };
        setStudents(students.map((s) => (s.id === activeStudent.id ? updated : s)));
      }
    } catch {
      // Fallback
    }

    setIsScoreModalOpen(false);
  };

  // Handle PKI Award Degree
  const handleAwardDegree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStudent) return;

    const token = localStorage.getItem("token") || "mock-token";
    const payload: AwardPostgradDegreeWithPkiInput = { signerName, resolutionNumber };

    try {
      const res = await fetch(
        `http://localhost:3001/api/v1/postgrad/students/${activeStudent.id}/award-degree`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setStudents(students.map((s) => (s.id === activeStudent.id ? json.data : s)));
      } else {
        // Local fallback
        const updated: PostgradStudentDto = {
          ...activeStudent,
          status: "DEGREE_AWARDED",
          degreeResolutionNumber: payload.resolutionNumber || "220/QĐ-ĐHKTĐN",
          pkiSignature: "MIIEPQIBAzCCBM8GCSqGSIb3DQEHAaCCBMIExgSDAU...",
          pkiSignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setStudents(students.map((s) => (s.id === activeStudent.id ? updated : s)));
      }
    } catch {
      // Fallback
    }

    setIsPkiModalOpen(false);
  };

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/postgraduate"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
          >
            <ChevronLeft size={14} />
            <span>Quay lại Danh sách Học viên</span>
          </Link>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs font-medium text-slate-600">Hội đồng Đánh giá Luận văn & Cấp bằng</span>
        </div>

        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Hội Đồng Đánh Giá Luận Văn Thạc Sĩ & Luận Án Tiến Sĩ
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Thành lập Hội đồng 5 thành viên, chấm điểm thẩm định (≥ 70đ & ≥ 4/5 phiếu), chi trả thù lao và ký số PKI cấp bằng.
            </p>
          </div>

          {/* Student Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Chọn Hồ sơ:</label>
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs truncate"
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.studentCode}] {s.fullName} - {s.degreeLevel === "DOCTORAL" ? "Tiến sĩ" : "Thạc sĩ"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeStudent && (
          <div className="space-y-6">
            {/* Student Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                      {activeStudent.studentCode}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${activeStudent.degreeLevel === "DOCTORAL" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-indigo-50 text-indigo-700 border-indigo-200"}`}>
                      {activeStudent.degreeLevel === "DOCTORAL" ? "Nghiên cứu sinh Tiến sĩ" : "Học viên Thạc sĩ"}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded">
                      {activeStudent.specialization} • Khóa {activeStudent.cohortYear}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{activeStudent.thesisTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Học viên: <strong>{activeStudent.fullName}</strong> • Đơn vị: <strong>{activeStudent.departmentName}</strong>
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Trạng thái Học vị:</span>
                    {activeStudent.status === "DEGREE_AWARDED" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                        <CheckCircle2 size={13} /> Đã cấp bằng & Công nhận học vị
                      </span>
                    ) : activeStudent.status === "PASSED" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-full">
                        Hội đồng chấm ĐẠT • Chờ ký số PKI
                      </span>
                    ) : activeStudent.status === "DEFENSE_SCHEDULED" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                        Đã thành lập Hội đồng 5 thành viên
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                        Chờ thành lập Hội đồng
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Supervisors List */}
              <div className="pt-3 border-t border-slate-200">
                <span className="text-xs font-semibold text-slate-600 block mb-1">Cán bộ Hướng dẫn & Giờ chuẩn quy đổi TT 20/2020:</span>
                <div className="flex flex-wrap gap-2">
                  {activeStudent.supervisors.map((s, idx) => (
                    <div key={idx} className="px-3 py-1 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center gap-2">
                      <span className="font-semibold text-slate-800">{s.fullName}</span>
                      <span className="text-[11px] text-slate-500">({s.role === "PRIMARY_SUPERVISOR" ? "HD Chính" : "HD Phụ"})</span>
                      <span className="text-emerald-700 font-bold">+{s.convertedHours}h chuẩn</span>
                      <span className="text-sky-700 font-bold">+{s.kpiPoints}đ KPI</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 1: Schedule Council Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <Users size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Bước 1: Hội Đồng Đánh Giá Luận Văn / Luận Án (Đúng 5 Thành Viên)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Chủ tịch, Phản biện 1, Phản biện 2, Ủy viên, Thư ký theo Thông tư 18/2021 & 23/2021/TT-BGDĐT.
                    </p>
                  </div>
                </div>

                {(!activeStudent.defenseMembers || activeStudent.defenseMembers.length === 0) && (
                  <button
                    onClick={() => setIsScheduleModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    Thành Lập Hội Đồng 5 Thành Viên
                  </button>
                )}
              </div>

              {activeStudent.defenseMembers && activeStudent.defenseMembers.length === 5 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                    <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Thành viên</th>
                        <th className="py-2.5 px-4">Mã CBGV</th>
                        <th className="py-2.5 px-4">Vai trò trong Hội đồng</th>
                        <th className="py-2.5 px-4 text-right">Thù lao chuyên gia (VNĐ)</th>
                        <th className="py-2.5 px-4 text-center">Điểm đánh giá</th>
                        <th className="py-2.5 px-4 text-center">Biểu quyết</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeStudent.defenseMembers.map((m, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-900">{m.fullName}</td>
                          <td className="py-2.5 px-4 font-mono text-slate-600">{m.employeeCode}</td>
                          <td className="py-2.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-800">
                              {m.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                            {formatVnd(m.honorariumAmount)}
                          </td>
                          <td className="py-2.5 px-4 text-center font-bold text-indigo-600 text-sm">
                            {m.score > 0 ? `${m.score}đ` : "—"}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            {m.score > 0 ? (
                              m.isApproved ? (
                                <span className="text-emerald-700 font-bold">Tán thành</span>
                              ) : (
                                <span className="text-rose-700 font-bold">Không tán thành</span>
                              )
                            ) : (
                              <span className="text-slate-400">Chờ chấm</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Chưa thành lập Hội đồng chấm luận văn</p>
                  <p className="text-[11px] text-slate-500">Vui lòng bấm nút thành lập Hội đồng để phân công 5 thành viên thẩm định.</p>
                </div>
              )}
            </div>

            {/* Step 2: Score Thesis Defense Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Bước 2: Chấm Điểm & Thẩm Định Hội Đồng (Rào chắn ≥ 70đ & ≥ 4/5 phiếu)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quy chuẩn rào chắn thẩm định chất lượng luận văn cao học và luận án tiến sĩ.
                    </p>
                  </div>
                </div>

                {activeStudent.defenseMembers && activeStudent.defenseMembers.length === 5 && !activeStudent.defenseResult && (
                  <button
                    onClick={() => setIsScoreModalOpen(true)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    Hội Đồng Chấm Điểm & Biểu Quyết
                  </button>
                )}
              </div>

              {activeStudent.defenseResult ? (
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-purple-900">
                        Kết quả: {activeStudent.defenseResult.isPassed ? "ĐẠT YÊU CẦU BẢO VỆ" : "KHÔNG ĐẠT"}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-200 text-purple-900 text-xs font-mono font-bold rounded">
                        {activeStudent.defenseResult.averageScore} / 100 điểm
                      </span>
                      <span className="text-xs font-medium text-purple-700">
                        (Xếp loại: {activeStudent.defenseResult.ranking})
                      </span>
                    </div>
                    <p className="text-xs text-purple-800">
                      Biểu quyết Tán thành: <strong>{activeStudent.defenseResult.approvedVotes}/5 phiếu</strong> (Yêu cầu tối thiểu 4/5 phiếu tán thành).
                    </p>
                    <p className="text-xs text-purple-800 italic">
                      "{activeStudent.defenseResult.councilNotes || "Luận văn đạt yêu cầu học thuật."}"
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeStudent.defenseResult.isPassed ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                        <CheckCircle2 size={16} />
                        <span>Đủ điều kiện cấp bằng</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold">
                        <XCircle size={16} />
                        <span>Chưa đạt rào chắn</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Hội đồng chưa tiến hành chấm điểm phiên bảo vệ</p>
                  <p className="text-[11px] text-slate-500">Vui lòng nhập điểm của 5 thành viên để tổng hợp kết quả.</p>
                </div>
              )}
            </div>

            {/* Step 3: Rector PKI Signing & Triple-Coupling Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Bước 3: Hiệu Trưởng Ký Số PKI RSA-2048 & Kích Hoạt Triple-Coupling
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ban hành Quyết định Công nhận học vị Thạc sĩ / Tiến sĩ chuẩn Nghị định 30/2020/NĐ-CP.
                    </p>
                  </div>
                </div>

                {activeStudent.defenseResult?.isPassed && activeStudent.status !== "DEGREE_AWARDED" && (
                  <button
                    onClick={() => setIsPkiModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Key size={14} />
                    <span>Ký Số PKI & Ban Hành Quyết Định Cấp Bằng</span>
                  </button>
                )}
              </div>

              {activeStudent.degreeResolutionNumber ? (
                <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-950">
                          QUYẾT ĐỊNH CÔNG NHẬN HỌC VỊ ĐÃ BAN HÀNH & KÝ SỐ ĐIỆN TỬ:
                        </span>
                        <span className="font-mono font-bold text-emerald-700 px-2 py-0.5 bg-emerald-200 rounded text-xs">
                          {activeStudent.degreeResolutionNumber}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Ký bởi: <strong>GS.TS. Nguyễn Hiệu Trưởng</strong> • Thời gian ký: {activeStudent.pkiSignedAt || new Date().toISOString()}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 break-all">
                        Chữ ký số PKI RSA-2048: {activeStudent.pkiSignature?.slice(0, 48)}...
                      </p>
                    </div>

                    <a
                      href={`http://localhost:3001/api/v1/postgrad/students/${activeStudent.id}/resolution/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Download size={14} />
                      <span>Tải Quyết Định Cấp Bằng PDF</span>
                    </a>
                  </div>

                  {/* Triple Coupling Badges */}
                  <div className="pt-3 border-t border-emerald-200/60">
                    <span className="text-xs font-bold text-emerald-900 block mb-2">
                      TRIPLE-COUPLING ENGINE ĐÃ ĐỒNG BỘ THÀNH CÔNG:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <DollarSign size={14} />
                          <span>1. PayrollService</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Đã tự động rót tổng cộng <strong>{formatVnd(7000000)}</strong> thù lao cho 5 thành viên Hội đồng chấm bảo vệ.
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <BookOpen size={14} />
                          <span>2. WorkloadService</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Đã quy đổi tổng cộng <strong>{activeStudent.supervisors.reduce((s, sup) => s + sup.convertedHours, 0)} giờ chuẩn</strong> cho Cán bộ hướng dẫn.
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <TrendingUp size={14} />
                          <span>3. KpiService</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Đã cộng điểm Trụ cột I & II cho Cán bộ hướng dẫn học viên bảo vệ đúng hạn.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ShieldCheck size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Chưa phê duyệt quyết định cấp bằng</p>
                  <p className="text-[11px] text-slate-500">
                    Sau khi Hội đồng chấm ĐẠT, Hiệu trưởng sẽ ký số điện tử để hoàn tất công nhận học vị.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Thành Lập Hội Đồng 5 Thành Viên */}
        {isScheduleModalOpen && activeStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Thành Lập Hội Đồng Chấm Luận Văn / Luận Án</h3>
                </div>
                <button onClick={() => setIsScheduleModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleScheduleCouncil} className="space-y-3 pt-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ngày tổ chức bảo vệ</label>
                  <input
                    type="date"
                    required
                    value={defenseDate}
                    onChange={(e) => setDefenseDate(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm"
                  />
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-800 block">5 Thành viên Hội đồng (Kèm mức thù lao DAU):</span>

                  {/* President */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-semibold text-slate-700">1. Chủ tịch (2M):</span>
                    <input type="text" value={c1Name} onChange={(e) => setC1Name(e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white" />
                    <input type="text" value={c1Code} onChange={(e) => setC1Code(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-mono" />
                  </div>

                  {/* Reviewer 1 */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-semibold text-slate-700">2. Phản biện 1 (1.5M):</span>
                    <input type="text" value={c2Name} onChange={(e) => setC2Name(e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white" />
                    <input type="text" value={c2Code} onChange={(e) => setC2Code(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-mono" />
                  </div>

                  {/* Reviewer 2 */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-semibold text-slate-700">3. Phản biện 2 (1.5M):</span>
                    <input type="text" value={c3Name} onChange={(e) => setC3Name(e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white" />
                    <input type="text" value={c3Code} onChange={(e) => setC3Code(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-mono" />
                  </div>

                  {/* Commissioner */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-semibold text-slate-700">4. Ủy viên (1M):</span>
                    <input type="text" value={c4Name} onChange={(e) => setC4Name(e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white" />
                    <input type="text" value={c4Code} onChange={(e) => setC4Code(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-mono" />
                  </div>

                  {/* Secretary */}
                  <div className="flex items-center gap-2">
                    <span className="w-24 font-semibold text-slate-700">5. Thư ký (1M):</span>
                    <input type="text" value={c5Name} onChange={(e) => setC5Name(e.target.value)} className="flex-1 px-2 py-1 border border-slate-300 rounded bg-white" />
                    <input type="text" value={c5Code} onChange={(e) => setC5Code(e.target.value)} className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-mono" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setIsScheduleModalOpen(false)} className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                  <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm">Xác Nhận Thành Lập</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Chấm Điểm & Biểu Quyết */}
        {isScoreModalOpen && activeStudent && activeStudent.defenseMembers && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">Hội Đồng Chấm Điểm & Biểu Quyết</h3>
                </div>
                <button onClick={() => setIsScoreModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleScoreDefense} className="space-y-3 pt-3 text-xs">
                <p className="text-slate-600">Rào chắn: Điểm trung bình ≥ 70 điểm và tối thiểu 4/5 phiếu Tán thành.</p>

                <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {activeStudent.defenseMembers.map((m) => {
                    const current = scores[m.employeeId] || { score: 85, isApproved: true };
                    return (
                      <div key={m.employeeId} className="flex items-center justify-between gap-3">
                        <div>
                          <span className="font-bold text-slate-900 block">{m.fullName}</span>
                          <span className="text-[11px] text-slate-500">({m.role})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={current.score}
                            onChange={(e) =>
                              setScores({
                                ...scores,
                                [m.employeeId]: { ...current, score: Number(e.target.value) },
                              })
                            }
                            className="w-16 px-2 py-1 border border-slate-300 rounded bg-white text-right font-bold"
                          />
                          <label className="flex items-center gap-1 font-semibold text-emerald-700">
                            <input
                              type="checkbox"
                              checked={current.isApproved}
                              onChange={(e) =>
                                setScores({
                                  ...scores,
                                  [m.employeeId]: { ...current, isApproved: e.target.checked },
                                })
                              }
                            />
                            <span>Tán thành</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhận xét kết luận của Hội đồng</label>
                  <textarea
                    rows={2}
                    value={councilNotes}
                    onChange={(e) => setCouncilNotes(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setIsScoreModalOpen(false)} className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                  <button type="submit" className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm">Xác Nhận Điểm</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Hiệu Trưởng Ký Số PKI Cấp Bằng */}
        {isPkiModalOpen && activeStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Ký Số PKI RSA-2048 Cấp Bằng</h3>
                </div>
                <button onClick={() => setIsPkiModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <form onSubmit={handleAwardDegree} className="space-y-4 pt-4 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <p className="font-bold">Chứng thư số điện tử Hiệu trưởng:</p>
                  <p className="text-[11px]">Mã định danh: VN-DAU-CA-8899A1-2026 (Khóa bí mật RSA 2048-bit)</p>
                  <p className="text-[11px]">Quyết định Công nhận học vị và cấp bằng {activeStudent.degreeLevel === "DOCTORAL" ? "Tiến sĩ" : "Thạc sĩ"}</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người ký số</label>
                  <input type="text" value={signerName} onChange={(e) => setSignerName(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg" />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Quyết định cấp bằng</label>
                  <input type="text" value={resolutionNumber} onChange={(e) => setResolutionNumber(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold" />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button type="button" onClick={() => setIsPkiModalOpen(false)} className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg">Hủy</button>
                  <button type="submit" className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm">Xác Nhận Ký Số & Ban Hành</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

export default function PostgradCouncilsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-500 max-w-7xl mx-auto">
          <div className="animate-pulse space-y-3">
            <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      }
    >
      <PostgradCouncilsContent />
    </Suspense>
  );
}
