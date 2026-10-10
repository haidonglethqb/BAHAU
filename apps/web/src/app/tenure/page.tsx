"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FilePlus,
  FileText,
  Filter,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { useAuth } from "../../context/AuthContext";
import type {
  TenureApplicationDto,
  ScientificWorkItem,
  AcademicRankTitle,
  CareerClassTitle,
  ScientificWorkType,
} from "@bahau/contracts";

const SAMPLE_APPLICATIONS: TenureApplicationDto[] = [
  {
    id: "tenure-dau-001",
    employeeId: "DAU260001-ID",
    employeeCode: "DAU260001",
    employeeName: "PGS.TS. Trần Thị Bình",
    unitName: "Khoa Kiến trúc",
    currentDegree: "DOCTOR",
    currentCareerClass: "PRINCIPAL_LECTURER",
    currentAcademicRank: "ASSOCIATE_PROFESSOR",
    currentSalaryCoeff: 6.78,
    targetCareerClass: "SENIOR_LECTURER",
    targetAcademicRank: "PROFESSOR",
    teachingYears: 16,
    status: "VOTED",
    totalScientificScore: 23.5,
    requiredScientificScore: 20.0,
    works: [
      {
        id: "w-01",
        workType: "SCOPUS_WOS_PAPER",
        title: "Sustainable Vernacular Architecture in Central Vietnam Coastal Region",
        publishedYear: 2023,
        role: "MAIN_AUTHOR",
        convertedScore: 3.0,
        evidenceUrl: "https://doi.org/10.1016/j.arch.2023.01.012",
        notes: "Tạp chí ISI/Scopus Q1",
      },
      {
        id: "w-02",
        workType: "ARCHITECTURAL_AWARD",
        title: "Trung tâm Văn hóa Cộng đồng Hòa Vang - Giải Bạc Giải thưởng Kiến trúc Quốc gia 2022",
        publishedYear: 2022,
        role: "PRINCIPAL_DESIGNER",
        convertedScore: 3.0,
        evidenceUrl: "https://kienviet.net/giai-thuong-ktqg-2022-hoa-vang",
        notes: "Công trình nghiệm thu đưa vào sử dụng",
      },
      {
        id: "w-03",
        workType: "BOOK_ISBN",
        title: "Giáo trình Nguyên lý Thiết kế Kiến trúc Đô thị Sinh thái",
        publishedYear: 2024,
        role: "MAIN_AUTHOR",
        convertedScore: 2.0,
        evidenceUrl: "ISBN 978-604-987-123-4",
        notes: "NXB Xây Dựng",
      },
      {
        id: "w-04",
        workType: "SCOPUS_WOS_PAPER",
        title: "Climate-Responsive Facade Systems for High-Rise Educational Buildings",
        publishedYear: 2024,
        role: "MAIN_AUTHOR",
        convertedScore: 3.0,
        evidenceUrl: "https://doi.org/10.1016/j.enbuild.2024.114002",
        notes: "Tạp chí Energy & Buildings (Q1)",
      },
      {
        id: "w-05",
        workType: "ARCHITECTURAL_AWARD",
        title: "Ashui Pavilion of the Year 2023 - Nhà triển lãm Tre & Đá Đà Nẵng",
        publishedYear: 2023,
        role: "PRINCIPAL_DESIGNER",
        convertedScore: 3.0,
        evidenceUrl: "https://ashui.com/awards/pavilion-2023",
        notes: "Giải thưởng Ashui Awards 2023",
      },
    ],
    councilVote: {
      votesYes: 15,
      votesNo: 0,
      totalVoters: 15,
      approvalRatio: 100.0,
      isPassed: true,
      votedDate: "2026-10-01T09:30:00.000Z",
      councilNotes: "Hội đồng nhất trí 15/15 phiếu (100%) đề nghị Hiệu trưởng bổ nhiệm chức danh Giáo sư.",
      foreignLanguagePass: true,
    },
    appointmentResolutionNumber: null,
    appointedSalaryCoeff: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-09-01T08:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: "tenure-dau-002",
    employeeId: "DAU260002-ID",
    employeeCode: "DAU260002",
    employeeName: "TS. Lê Hoàng Nam",
    unitName: "Khoa Xây dựng",
    currentDegree: "DOCTOR",
    currentCareerClass: "PRINCIPAL_LECTURER",
    currentAcademicRank: "NONE",
    currentSalaryCoeff: 5.64,
    targetCareerClass: "SENIOR_LECTURER",
    targetAcademicRank: "ASSOCIATE_PROFESSOR",
    teachingYears: 10,
    status: "IN_REVIEW",
    totalScientificScore: 12.0,
    requiredScientificScore: 10.0,
    works: [
      {
        id: "w-11",
        workType: "SCOPUS_WOS_PAPER",
        title: "Seismic Performance of Concrete Structures with Recycled Aggregate",
        publishedYear: 2023,
        role: "MAIN_AUTHOR",
        convertedScore: 3.0,
        evidenceUrl: "https://doi.org/10.1016/j.conbuildmat.2023.131102",
        notes: "Q1 Construction & Building Materials",
      },
      {
        id: "w-12",
        workType: "SCOPUS_WOS_PAPER",
        title: "Finite Element Modeling of Prestressed Composite Slabs under Fire Conditions",
        publishedYear: 2024,
        role: "MAIN_AUTHOR",
        convertedScore: 3.0,
        evidenceUrl: "https://doi.org/10.1016/j.firesaf.2024.103980",
        notes: "Q1 Fire Safety Journal",
      },
      {
        id: "w-13",
        workType: "RESEARCH_PROJECT",
        title: "Đề tài cấp Bộ: Ứng dụng vật liệu composite gia cường kết cấu ven biển",
        publishedYear: 2024,
        role: "MAIN_AUTHOR",
        convertedScore: 2.0,
        evidenceUrl: "https://dau.edu.vn/nckh/bo-nam-2024",
        notes: "Nghiệm thu Đạt",
      },
    ],
    councilVote: null,
    appointmentResolutionNumber: null,
    appointedSalaryCoeff: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-09-05T08:00:00.000Z",
    updatedAt: "2026-09-05T08:00:00.000Z",
  },
  {
    id: "tenure-dau-003",
    employeeId: "DAU260003-ID",
    employeeCode: "DAU260003",
    employeeName: "ThS. Nguyễn Văn An",
    unitName: "Khoa Kiến trúc",
    currentDegree: "MASTER",
    currentCareerClass: "LECTURER",
    currentAcademicRank: "NONE",
    currentSalaryCoeff: 4.98,
    targetCareerClass: "PRINCIPAL_LECTURER",
    targetAcademicRank: "NONE",
    teachingYears: 7,
    status: "SUBMITTED",
    totalScientificScore: 6.5,
    requiredScientificScore: 4.0,
    works: [
      {
        id: "w-20",
        workType: "ARCHITECTURAL_AWARD",
        title: "Nhà cộng đồng thôn Cẩm Phú - Giải Đồng Kiến trúc Xanh Quốc gia 2023",
        publishedYear: 2023,
        role: "PRINCIPAL_DESIGNER",
        convertedScore: 3.0,
        evidenceUrl: "https://kienviet.net/cam-phu-community",
        notes: "Giải thưởng Hội KTS Việt Nam",
      },
      {
        id: "w-21",
        workType: "BUILT_PROJECT",
        title: "Trường Tiểu học Hy Vọng Đà Nẵng",
        publishedYear: 2024,
        role: "PRINCIPAL_DESIGNER",
        convertedScore: 1.5,
        evidenceUrl: "https://dau.edu.vn/projects/hope-school",
        notes: "Công trình thực nghiệm trường học xanh",
      },
    ],
    councilVote: null,
    appointmentResolutionNumber: null,
    appointedSalaryCoeff: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-09-10T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  },
];

const WORK_TYPE_LABELS: Record<ScientificWorkType, { label: string; badgeColor: string }> = {
  SCOPUS_WOS_PAPER: { label: "Bài báo ISI/Scopus (Q1/Q2)", badgeColor: "bg-blue-50 text-blue-700 border-blue-200" },
  ARCHITECTURAL_AWARD: { label: "Giải thưởng KT Quốc gia/Quốc tế", badgeColor: "bg-amber-50 text-amber-700 border-amber-200" },
  BUILT_PROJECT: { label: "Công trình Thực tế Nghiệm thu", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  BOOK_ISBN: { label: "Giáo trình/Sách chuyên khảo ISBN", badgeColor: "bg-purple-50 text-purple-700 border-purple-200" },
  RESEARCH_PROJECT: { label: "Đề tài NCKH cấp Bộ/Tỉnh/Trường", badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  DOMESTIC_JOURNAL: { label: "Tạp chí Kiến trúc / HĐGSNN", badgeColor: "bg-stone-50 text-stone-700 border-stone-200" },
};

const CAREER_CLASS_LABELS: Record<CareerClassTitle, string> = {
  SENIOR_LECTURER: "Giảng viên cao cấp (Hạng I - V.07.01.01)",
  PRINCIPAL_LECTURER: "Giảng viên chính (Hạng II - V.07.01.02)",
  LECTURER: "Giảng viên (Hạng III - V.07.01.03)",
  ASSISTANT_LECTURER: "Trợ giảng (Hạng III - V.07.01.23)",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Bản nháp", color: "bg-neutral-100 text-neutral-700 border-neutral-300" },
  SUBMITTED: { label: "Đã nộp hồ sơ", color: "bg-sky-50 text-sky-700 border-sky-300" },
  IN_REVIEW: { label: "HĐ Chuyên ngành thẩm định", color: "bg-amber-50 text-amber-700 border-amber-300" },
  VOTED: { label: "HĐ Cơ sở đã bỏ phiếu tín nhiệm", color: "bg-purple-50 text-purple-700 border-purple-300" },
  APPOINTED: { label: "Đã Bổ nhiệm & Ký số PKI", color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
  REJECTED: { label: "Chưa đạt tín nhiệm (< 2/3)", color: "bg-rose-50 text-rose-700 border-rose-300" },
};

export default function TenurePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"portfolio" | "all">("portfolio");
  const [applications, setApplications] = useState<TenureApplicationDto[]>(SAMPLE_APPLICATIONS);
  const [currentApp, setCurrentApp] = useState<TenureApplicationDto>(SAMPLE_APPLICATIONS[0]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRank, setFilterRank] = useState<string>("ALL");
  const [showAddWorkModal, setShowAddWorkModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // New Work Form State
  const [workType, setWorkType] = useState<ScientificWorkType>("SCOPUS_WOS_PAPER");
  const [workTitle, setWorkTitle] = useState("");
  const [workYear, setWorkYear] = useState(2025);
  const [workRole, setWorkRole] = useState<"MAIN_AUTHOR" | "CO_AUTHOR" | "PRINCIPAL_DESIGNER">("MAIN_AUTHOR");
  const [workEvidence, setWorkEvidence] = useState("");

  useEffect(() => {
    async function loadApplications() {
      try {
        const res = await fetch("/api/v1/tenure/applications");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.length > 0) {
            setApplications(json.data);
            // Match current user application if available
            const myApp = json.data.find(
              (a: TenureApplicationDto) =>
                a.employeeCode === user?.code || a.employeeName === user?.fullName || a.employeeId === user?.id
            );
            if (myApp) {
              setCurrentApp(myApp);
            } else {
              setCurrentApp(json.data[0]);
            }
          }
        }
      } catch (err) {
        console.warn("Using offline sample tenure data", err);
      }
    }
    loadApplications();
  }, [user]);

  const handleAddWork = () => {
    if (!workTitle.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập tên công trình / tác phẩm kiến trúc." });
      return;
    }

    const isLead = workRole === "MAIN_AUTHOR" || workRole === "PRINCIPAL_DESIGNER";
    let score = 2.0;
    if (workType === "SCOPUS_WOS_PAPER" || workType === "ARCHITECTURAL_AWARD") {
      score = isLead ? 3.0 : 2.0;
    } else if (workType === "BUILT_PROJECT" || workType === "BOOK_ISBN") {
      score = isLead ? 2.0 : 1.0;
    } else if (workType === "RESEARCH_PROJECT") {
      score = isLead ? 2.0 : 1.0;
    } else {
      score = isLead ? 1.0 : 0.75;
    }

    const newWork: ScientificWorkItem = {
      id: `w-${Date.now()}`,
      workType,
      title: workTitle,
      publishedYear: workYear,
      role: workRole,
      convertedScore: score,
      evidenceUrl: workEvidence || null,
      notes: "Kê khai bổ sung e-Portfolio",
    };

    const updatedWorks = [newWork, ...currentApp.works];
    const newTotal = Math.round(updatedWorks.reduce((s, w) => s + w.convertedScore, 0) * 10) / 10;

    const updatedApp = {
      ...currentApp,
      works: updatedWorks,
      totalScientificScore: newTotal,
      updatedAt: new Date().toISOString(),
    };

    setCurrentApp(updatedApp);
    setApplications((prev) => prev.map((a) => (a.id === updatedApp.id ? updatedApp : a)));
    setShowAddWorkModal(false);
    setWorkTitle("");
    setWorkEvidence("");
    setNotice({ type: "success", text: `Đã thêm công trình "${workTitle}" (+${score} điểm).` });
  };

  const filteredApplications = applications.filter((app) => {
    const matchesSearch =
      app.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.unitName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRank =
      filterRank === "ALL" ||
      (filterRank === "PROFESSOR" && app.targetAcademicRank === "PROFESSOR") ||
      (filterRank === "ASSOCIATE_PROFESSOR" && app.targetAcademicRank === "ASSOCIATE_PROFESSOR") ||
      (filterRank === "SENIOR_LECTURER" && app.targetCareerClass === "SENIOR_LECTURER") ||
      (filterRank === "PRINCIPAL_LECTURER" && app.targetCareerClass === "PRINCIPAL_LECTURER");

    return matchesSearch && matchesRank;
  });

  const progressPercentage = Math.min(
    100,
    Math.round((currentApp.totalScientificScore / currentApp.requiredScientificScore) * 100)
  );

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Scale size={12} />
                QĐ 37/2018/QĐ-TTg & TT 40/2020/TT-BGDĐT
              </span>
              <span className="text-xs text-stone-500">
                Chuẩn hóa Chức danh Khoa học & Hạng Giảng viên
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
              Hội Đồng Xét Chức Danh GS/PGS & Thăng Hạng Nghề Nghiệp
            </h1>
            <p className="text-sm text-stone-600 mt-0.5">
              e-Portfolio thẩm định công trình kiến trúc / khoa học, rào chắn biểu quyết kín &ge; 2/3 và ký số bổ nhiệm PKI RSA-2048
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/tenure/council"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 shadow-sm transition"
            >
              <Users size={16} />
              Phiên họp Hội đồng Cơ sở
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {notice && (
          <div
            className={`p-3.5 rounded-lg border text-sm flex items-center justify-between ${
              notice.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <span>{notice.text}</span>
            <button
              onClick={() => setNotice(null)}
              className="text-xs underline hover:opacity-80"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-stone-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "portfolio"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            <BookOpen size={16} />
            e-Portfolio Thẩm định Công trình của tôi
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "all"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            <Users size={16} />
            Hồ sơ Ứng viên Toàn trường ({applications.length})
          </button>
        </div>

        {/* TAB 1: e-PORTFOLIO */}
        {activeTab === "portfolio" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cột trái: Thông tin ứng viên & Thước đo điểm chuẩn */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
                <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
                  <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center font-bold text-stone-700 text-lg">
                    {currentApp.employeeName.slice(-2)}
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900">{currentApp.employeeName}</h3>
                    <p className="text-xs text-stone-500 font-mono">
                      Mã CBGV: {currentApp.employeeCode} | {currentApp.unitName}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">Chức danh hiện tại:</span>
                    <span className="font-medium text-stone-800">
                      {currentApp.currentAcademicRank !== "NONE"
                        ? currentApp.currentAcademicRank === "PROFESSOR"
                          ? "Giáo sư (GS)"
                          : "Phó Giáo sư (PGS)"
                        : "Chưa phong"}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">Hạng nghề nghiệp hiện tại:</span>
                    <span className="font-medium text-stone-800">
                      {CAREER_CLASS_LABELS[currentApp.currentCareerClass]}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">Hệ số lương hiện tại:</span>
                    <span className="font-semibold text-stone-900">{currentApp.currentSalaryCoeff.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-stone-50">
                    <span className="text-stone-500">Thâm niên giảng dạy:</span>
                    <span className="font-medium text-stone-800">{currentApp.teachingYears} năm</span>
                  </div>
                </div>

                <div className="mt-5 p-3.5 rounded-lg bg-stone-50 border border-stone-200 space-y-2">
                  <span className="text-xs font-semibold text-stone-700 block uppercase tracking-wider">
                    Chức danh đăng ký xét:
                  </span>
                  <div className="flex items-center gap-2">
                    <Award className="text-amber-600" size={18} />
                    <span className="text-sm font-bold text-stone-900">
                      {currentApp.targetAcademicRank !== "NONE"
                        ? currentApp.targetAcademicRank === "PROFESSOR"
                          ? "Giáo sư (GS)"
                          : "Phó Giáo sư (PGS)"
                        : "Không xét GS/PGS"}
                    </span>
                  </div>
                  <div className="text-xs text-stone-600 font-medium">
                    Hạng chức danh: {CAREER_CLASS_LABELS[currentApp.targetCareerClass]}
                  </div>
                </div>

                {/* Score Benchmark Meter */}
                <div className="mt-5 p-4 rounded-xl border border-stone-200 bg-linear-to-b from-stone-50 to-white space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-stone-600">Điểm công trình khoa học & sáng tác</span>
                    <span className="font-bold text-stone-900">
                      {currentApp.totalScientificScore} / {currentApp.requiredScientificScore} điểm
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        currentApp.totalScientificScore >= currentApp.requiredScientificScore
                          ? "bg-emerald-600"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-stone-500">
                    <span>Chuẩn tối thiểu: {currentApp.requiredScientificScore} điểm</span>
                    <span
                      className={`font-semibold ${
                        currentApp.totalScientificScore >= currentApp.requiredScientificScore
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}
                    >
                      {currentApp.totalScientificScore >= currentApp.requiredScientificScore
                        ? "ĐẠT TIÊU CHUẨN ĐIỂM (100%)"
                        : "CÒN THIẾU ĐIỂM"}
                    </span>
                  </div>
                </div>

                {/* Status Box */}
                <div className="mt-5 pt-4 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-xs text-stone-500">Trạng thái hồ sơ:</span>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
                      STATUS_LABELS[currentApp.status]?.color || "bg-stone-100"
                    }`}
                  >
                    {STATUS_LABELS[currentApp.status]?.label || currentApp.status}
                  </span>
                </div>

                {/* Resolution Download if Appointed */}
                {currentApp.status === "APPOINTED" && (
                  <div className="mt-4 pt-3 border-t border-stone-100">
                    <a
                      href={`/api/v1/tenure/applications/${currentApp.id}/resolution/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition"
                    >
                      <FileText size={14} />
                      Tải Quyết định Bổ nhiệm (PDF Nghị định 30)
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Danh mục công trình khoa học & tác phẩm kiến trúc */}
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-200">
                  <div>
                    <h3 className="font-bold text-stone-900 text-base">
                      Công trình Khoa học & Tác phẩm Kiến trúc ({currentApp.works.length})
                    </h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Quy đổi điểm tự động theo tiêu chuẩn Hội đồng Giáo sư Nhà nước và Bộ Giáo dục & Đào tạo
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddWorkModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition"
                  >
                    <Plus size={14} />
                    Kê khai công trình mới
                  </button>
                </div>

                {/* Danh sách công trình */}
                <div className="divide-y divide-stone-100 mt-2">
                  {currentApp.works.map((work, idx) => {
                    const badgeInfo = WORK_TYPE_LABELS[work.workType] || {
                      label: work.workType,
                      badgeColor: "bg-stone-100 text-stone-700",
                    };
                    return (
                      <div key={work.id || idx} className="py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="space-y-1.5 max-w-xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${badgeInfo.badgeColor}`}
                            >
                              {badgeInfo.label}
                            </span>
                            <span className="text-xs text-stone-400">Năm {work.publishedYear}</span>
                            <span className="text-xs font-medium text-stone-600 bg-stone-100 px-1.5 py-0.5 rounded">
                              {work.role === "MAIN_AUTHOR"
                                ? "Tác giả chính"
                                : work.role === "PRINCIPAL_DESIGNER"
                                ? "Chủ trì thiết kế"
                                : "Đồng tác giả"}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-stone-900 leading-snug">
                            {work.title}
                          </h4>
                          {work.evidenceUrl && (
                            <div className="flex items-center gap-1 text-xs text-stone-500">
                              <ExternalLink size={12} className="text-stone-400" />
                              <a
                                href={work.evidenceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline text-sky-700 truncate max-w-md"
                              >
                                {work.evidenceUrl}
                              </a>
                            </div>
                          )}
                          {work.notes && (
                            <p className="text-xs text-stone-400 italic">{work.notes}</p>
                          )}
                        </div>

                        <div className="sm:text-right shrink-0">
                          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-stone-100 text-stone-900 border border-stone-200">
                            +{work.convertedScore.toFixed(1)} điểm
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer action */}
                <div className="mt-6 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-stone-500">
                    Tổng điểm đã kê khai:{" "}
                    <strong className="text-stone-900 font-bold text-sm">
                      {currentApp.totalScientificScore} điểm
                    </strong>
                  </div>
                  {currentApp.status === "SUBMITTED" || currentApp.status === "DRAFT" ? (
                    <button
                      onClick={() =>
                        setNotice({
                          type: "success",
                          text: "Hồ sơ đã được gửi đến Hội đồng cơ sở. Hãy chờ kết quả phiên họp biểu quyết.",
                        })
                      }
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition shadow-xs"
                    >
                      Cập nhật nộp hồ sơ Hội đồng Cơ sở
                    </button>
                  ) : (
                    <span className="text-xs text-stone-500 font-medium">
                      Hồ sơ đã được tiếp nhận tại Hội đồng Cơ sở
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TẤT CẢ ỨNG VIÊN */}
        {activeTab === "all" && (
          <div className="space-y-4">
            {/* Filter bar */}
            <div className="bg-white rounded-xl border border-stone-200 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  placeholder="Tìm ứng viên, mã số, khoa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900"
                />
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto">
                <span className="text-xs text-stone-500 flex items-center gap-1">
                  <Filter size={14} /> Lọc theo chức danh:
                </span>
                <select
                  value={filterRank}
                  onChange={(e) => setFilterRank(e.target.value)}
                  className="text-xs px-2.5 py-1.5 rounded-lg border border-stone-300 bg-white focus:outline-none"
                >
                  <option value="ALL">Tất cả chức danh</option>
                  <option value="PROFESSOR">Giáo sư (GS)</option>
                  <option value="ASSOCIATE_PROFESSOR">Phó Giáo sư (PGS)</option>
                  <option value="SENIOR_LECTURER">Giảng viên cao cấp (Hạng I)</option>
                  <option value="PRINCIPAL_LECTURER">Giảng viên chính (Hạng II)</option>
                </select>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-medium border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Ứng viên / CBGV</th>
                      <th className="px-4 py-3">Đơn vị công tác</th>
                      <th className="px-4 py-3">Chức danh đăng ký xét</th>
                      <th className="px-4 py-3 text-center">Điểm công trình</th>
                      <th className="px-4 py-3 text-center">Biểu quyết HĐ</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredApplications.map((app) => {
                      const status = STATUS_LABELS[app.status] || { label: app.status, color: "bg-stone-100" };
                      return (
                        <tr key={app.id} className="hover:bg-stone-50/60 transition">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-stone-900">{app.employeeName}</div>
                            <div className="text-[11px] text-stone-400 font-mono">{app.employeeCode}</div>
                          </td>
                          <td className="px-4 py-3.5 text-stone-600">{app.unitName}</td>
                          <td className="px-4 py-3.5">
                            <div className="font-medium text-stone-900">
                              {app.targetAcademicRank !== "NONE"
                                ? app.targetAcademicRank === "PROFESSOR"
                                  ? "Giáo sư (GS)"
                                  : "Phó Giáo sư (PGS)"
                                : "Xét Thăng hạng GV"}
                            </div>
                            <div className="text-[11px] text-stone-500">
                              {app.targetCareerClass === "SENIOR_LECTURER"
                                ? "Hạng I (V.07.01.01)"
                                : app.targetCareerClass === "PRINCIPAL_LECTURER"
                                ? "Hạng II (V.07.01.02)"
                                : "Hạng III"}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span
                              className={`font-bold ${
                                app.totalScientificScore >= app.requiredScientificScore
                                  ? "text-emerald-700"
                                  : "text-amber-700"
                              }`}
                            >
                              {app.totalScientificScore} / {app.requiredScientificScore}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {app.councilVote ? (
                              <div className="inline-block">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    app.councilVote.isPassed
                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                      : "bg-rose-50 text-rose-700 border border-rose-200"
                                  }`}
                                >
                                  {app.councilVote.approvalRatio}% ({app.councilVote.votesYes}/{app.councilVote.totalVoters})
                                </span>
                              </div>
                            ) : (
                              <span className="text-stone-400 text-[11px]">Chưa họp biểu quyết</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.color}`}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right space-x-2">
                            <button
                              onClick={() => {
                                setCurrentApp(app);
                                setActiveTab("portfolio");
                              }}
                              className="px-2.5 py-1 rounded border border-stone-200 text-stone-700 hover:bg-stone-100 transition"
                            >
                              Xem e-Portfolio
                            </button>
                            {app.status === "APPOINTED" && (
                              <a
                                href={`/api/v1/tenure/applications/${app.id}/resolution/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1 rounded bg-stone-900 text-white hover:bg-stone-800 transition"
                              >
                                Tải QĐ (PDF)
                              </a>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Kê khai công trình mới */}
        {showAddWorkModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl border border-stone-300 max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <h3 className="font-bold text-stone-900 text-base">
                  Kê khai Công trình Khoa học / Tác phẩm Kiến trúc
                </h3>
                <button
                  onClick={() => setShowAddWorkModal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Loại hình công trình / tác phẩm:
                  </label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value as ScientificWorkType)}
                    className="w-full p-2 rounded-lg border border-stone-300 bg-white"
                  >
                    <option value="SCOPUS_WOS_PAPER">Bài báo Tạp chí Quốc tế WoS/Scopus (2.0 - 3.0 điểm)</option>
                    <option value="ARCHITECTURAL_AWARD">Giải thưởng Kiến trúc Quốc gia / Quốc tế (2.0 - 3.0 điểm)</option>
                    <option value="BUILT_PROJECT">Công trình Kiến trúc Thực tế Nghiệm thu (1.0 - 2.0 điểm)</option>
                    <option value="BOOK_ISBN">Giáo trình / Sách chuyên khảo mã ISBN (1.5 - 2.0 điểm)</option>
                    <option value="RESEARCH_PROJECT">Đề tài NCKH cấp Bộ / Tỉnh / Cơ sở (1.0 - 2.0 điểm)</option>
                    <option value="DOMESTIC_JOURNAL">Bài báo Tạp chí Kiến trúc / HĐGSNN (0.75 - 1.0 điểm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Tên công trình / Bài báo / Tác phẩm kiến trúc:
                  </label>
                  <input
                    type="text"
                    value={workTitle}
                    onChange={(e) => setWorkTitle(e.target.value)}
                    placeholder="Ví dụ: Quy hoạch không gian ven biển Đà Nẵng..."
                    className="w-full p-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Năm công bố / Nghiệm thu:</label>
                    <input
                      type="number"
                      value={workYear}
                      onChange={(e) => setWorkYear(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Vai trò tham gia:</label>
                    <select
                      value={workRole}
                      onChange={(e) => setWorkRole(e.target.value as any)}
                      className="w-full p-2 rounded-lg border border-stone-300 bg-white"
                    >
                      <option value="MAIN_AUTHOR">Tác giả chính</option>
                      <option value="PRINCIPAL_DESIGNER">Chủ trì thiết kế kiến trúc</option>
                      <option value="CO_AUTHOR">Đồng tác giả / Cộng tác</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Đường dẫn minh chứng / Mã DOI / Mã ISBN:
                  </label>
                  <input
                    type="text"
                    value={workEvidence}
                    onChange={(e) => setWorkEvidence(e.target.value)}
                    placeholder="https://doi.org/... hoặc ISBN 978-..."
                    className="w-full p-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowAddWorkModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleAddWork}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800"
                >
                  Lưu vào e-Portfolio
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
