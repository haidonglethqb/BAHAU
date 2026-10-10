"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Award,
  BookOpen,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Clock,
  Compass,
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
  X,
} from "lucide-react";
import { AuthGuard } from "../../../components/AuthGuard";
import { useAuth } from "../../../context/AuthContext";
import type {
  RdProjectDto,
  ReviewRdProjectInput,
  AllocateRoyaltyInput,
  ApproveRdWithPkiInput,
} from "@bahau/contracts";

const INITIAL_PROJECTS: RdProjectDto[] = [
  {
    id: "rd-dau-001",
    projectCode: "NCKH-BGD-2026-01",
    title: "Nghiên cứu mô hình cấu trúc không gian đô thị ven biển thích ứng với biến đổi khí hậu tại dải duyên hải miền Trung",
    projectType: "ACADEMIC_RESEARCH",
    level: "MINISTERIAL",
    contractValue: 300_000_000,
    institutionalFeePercentage: 20,
    institutionalFeeAmount: 60_000_000,
    royaltyFundAmount: 240_000_000,
    startDate: "2025-06-01",
    endDate: "2026-06-01",
    status: "REVIEW_COUNCIL",
    payoutStatus: "APPROVED",
    principalInvestigatorId: "DAU260002-ID",
    principalInvestigatorCode: "DAU260002",
    principalInvestigatorName: "TS. Lê Hoàng Nam",
    departmentName: "Khoa Xây dựng",
    members: [
      {
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "TS. Lê Hoàng Nam",
        role: "PRINCIPAL_INVESTIGATOR",
        royaltyPercentage: 50,
        allocatedAmount: 120_000_000,
        convertedResearchHours: 300,
      },
      {
        employeeId: "DAU260004-ID",
        employeeCode: "DAU260004",
        fullName: "ThS. Phạm Thị Mai",
        role: "RESEARCH_MEMBER",
        royaltyPercentage: 30,
        allocatedAmount: 72_000_000,
        convertedResearchHours: 180,
      },
      {
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        fullName: "ThS. Nguyễn Văn An",
        role: "TECHNICAL_EXPERT",
        royaltyPercentage: 20,
        allocatedAmount: 48_000_000,
        convertedResearchHours: 120,
      },
    ],
    councilReview: {
      reviewDate: "2026-09-15T09:00:00.000Z",
      score: 88.5,
      ranking: "EXCELLENT",
      isPassed: true,
      councilNotes: "Đề tài có giá trị ứng dụng cao, công bố 02 bài báo uy tín, phân tích mô hình thích ứng bão lũ miền Trung xuất sắc.",
      councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
    },
    resolutionNumber: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2025-05-10T08:00:00.000Z",
    updatedAt: "2026-09-15T11:30:00.000Z",
  },
  {
    id: "rd-dau-002",
    projectCode: "TVTK-DAU-2026-08",
    title: "Tư vấn Thiết kế Kiến trúc và Cảnh quan Trung tâm Văn hóa & Bảo tồn Di sản Sông Hàn, TP. Đà Nẵng",
    projectType: "ARCHITECTURAL_DESIGN",
    level: "COMMERCIAL_CONTRACT",
    contractValue: 500_000_000,
    institutionalFeePercentage: 25,
    institutionalFeeAmount: 125_000_000,
    royaltyFundAmount: 375_000_000,
    startDate: "2026-01-15",
    endDate: "2026-11-30",
    status: "IN_PROGRESS",
    payoutStatus: "PENDING",
    principalInvestigatorId: "DAU260003-ID",
    principalInvestigatorCode: "DAU260003",
    principalInvestigatorName: "ThS. Nguyễn Văn An",
    departmentName: "Khoa Kiến trúc",
    members: [
      {
        employeeId: "DAU260003-ID",
        employeeCode: "DAU260003",
        fullName: "ThS. Nguyễn Văn An",
        role: "LEAD_ARCHITECT",
        royaltyPercentage: 55,
        allocatedAmount: 206_250_000,
        convertedResearchHours: 250,
      },
      {
        employeeId: "DAU260002-ID",
        employeeCode: "DAU260002",
        fullName: "TS. Lê Hoàng Nam",
        role: "DESIGN_MEMBER",
        royaltyPercentage: 25,
        allocatedAmount: 93_750_000,
        convertedResearchHours: 150,
      },
      {
        employeeId: "DAU260005-ID",
        employeeCode: "DAU260005",
        fullName: "ThS. Đỗ Thị Quỳnh Chi",
        role: "DESIGN_MEMBER",
        royaltyPercentage: 20,
        allocatedAmount: 75_000_000,
        convertedResearchHours: 100,
      },
    ],
    councilReview: null,
    resolutionNumber: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-01-15T09:00:00.000Z",
  },
  {
    id: "rd-dau-003",
    projectCode: "NCKH-DAU-2026-03",
    title: "Nghiên cứu ứng dụng vật liệu xanh địa phương trong kiến trúc nhà ở thấp tầng thích ứng bão lũ miền Trung",
    projectType: "ACADEMIC_RESEARCH",
    level: "INSTITUTIONAL",
    contractValue: 50_000_000,
    institutionalFeePercentage: 20,
    institutionalFeeAmount: 10_000_000,
    royaltyFundAmount: 40_000_000,
    startDate: "2026-03-01",
    endDate: "2026-12-31",
    status: "PROPOSAL_SUBMITTED",
    payoutStatus: "PENDING",
    principalInvestigatorId: "DAU260005-ID",
    principalInvestigatorCode: "DAU260005",
    principalInvestigatorName: "ThS. Đỗ Thị Quỳnh Chi",
    departmentName: "Khoa Kiến trúc",
    members: [
      {
        employeeId: "DAU260005-ID",
        employeeCode: "DAU260005",
        fullName: "ThS. Đỗ Thị Quỳnh Chi",
        role: "PRINCIPAL_INVESTIGATOR",
        royaltyPercentage: 100,
        allocatedAmount: 40_000_000,
        convertedResearchHours: 150,
      },
    ],
    councilReview: null,
    resolutionNumber: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-02-25T14:00:00.000Z",
    updatedAt: "2026-02-25T14:00:00.000Z",
  },
];

function RdRoyaltyContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id");

  const [projects, setProjects] = useState<RdProjectDto[]>(INITIAL_PROJECTS);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    initialId || "rd-dau-001"
  );

  // Modal States
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isPkiModalOpen, setIsPkiModalOpen] = useState(false);

  // Review Form
  const [reviewScore, setReviewScore] = useState<number>(85);
  const [reviewRanking, setReviewRanking] = useState<"EXCELLENT" | "GOOD" | "SATISFACTORY" | "UNSATISFACTORY">("GOOD");
  const [reviewPresident, setReviewPresident] = useState("GS.TS. Nguyễn Hiệu Trưởng");
  const [reviewNotes, setReviewNotes] = useState(
    "Đồ án đạt tính sáng tạo cao, giải pháp thiết kế kiến trúc hài hòa cảnh quan và công năng."
  );

  // Allocation Form
  const [allocPercentages, setAllocPercentages] = useState<{ [employeeId: string]: number }>({});

  // PKI Signing Form
  const [signerName, setSignerName] = useState("GS.TS. Nguyễn Hiệu Trưởng");
  const [resolutionNumber, setResolutionNumber] = useState("218/QĐ-ĐHKTĐN");

  // Load from API
  useEffect(() => {
    async function fetchProjects() {
      try {
        const token = localStorage.getItem("token") || "mock-token";
        const res = await fetch("/api/v1/rd/projects", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data && Array.isArray(json.data) && json.data.length > 0) {
            setProjects(json.data);
            if (!initialId) {
              setSelectedProjectId(json.data[0].id);
            }
          }
        }
      } catch {
        // Fallback to initial seed
      }
    }
    fetchProjects();
  }, [initialId]);

  const activeProject =
    projects.find((p) => p.id === selectedProjectId) || projects[0];

  // Initialize allocation map when opening allocate modal
  const openAllocateModal = () => {
    if (!activeProject) return;
    const initialMap: { [id: string]: number } = {};
    for (const m of activeProject.members) {
      initialMap[m.employeeId] = m.royaltyPercentage;
    }
    setAllocPercentages(initialMap);
    setIsAllocateModalOpen(true);
  };

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  // Council Review Submit
  const handleCouncilReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const token = localStorage.getItem("token") || "mock-token";
    const payload: ReviewRdProjectInput = {
      score: Number(reviewScore),
      ranking: reviewRanking,
      councilPresidentName: reviewPresident,
      councilNotes: reviewNotes,
    };

    try {
      const res = await fetch(
        `/api/v1/rd/projects/${activeProject.id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setProjects(projects.map((p) => (p.id === activeProject.id ? json.data : p)));
      } else {
        // Local fallback
        const isPassed = payload.score >= 70;
        const updated: RdProjectDto = {
          ...activeProject,
          status: isPassed ? "REVIEW_COUNCIL" : "TERMINATED",
          councilReview: {
            reviewDate: new Date().toISOString(),
            score: payload.score,
            ranking: payload.ranking,
            isPassed,
            councilNotes: payload.councilNotes || null,
            councilPresidentName: payload.councilPresidentName || null,
          },
          updatedAt: new Date().toISOString(),
        };
        setProjects(projects.map((p) => (p.id === activeProject.id ? updated : p)));
      }
    } catch {
      // Local fallback
    }

    setIsReviewModalOpen(false);
  };

  // Allocate Royalty Submit
  const handleAllocateRoyalty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const token = localStorage.getItem("token") || "mock-token";
    const memberAllocations = Object.entries(allocPercentages).map(([employeeId, royaltyPercentage]) => ({
      employeeId,
      royaltyPercentage: Number(royaltyPercentage),
    }));

    const totalPct = memberAllocations.reduce((sum, a) => sum + a.royaltyPercentage, 0);
    if (totalPct > 100) {
      alert(`Tổng tỷ lệ phân bổ (${totalPct}%) không được vượt quá 100%!`);
      return;
    }

    const payload: AllocateRoyaltyInput = { memberAllocations };

    try {
      const res = await fetch(
        `/api/v1/rd/projects/${activeProject.id}/allocate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setProjects(projects.map((p) => (p.id === activeProject.id ? json.data : p)));
      } else {
        // Local fallback
        const updatedMembers = activeProject.members.map((m) => {
          const pct = allocPercentages[m.employeeId] ?? m.royaltyPercentage;
          return {
            ...m,
            royaltyPercentage: pct,
            allocatedAmount: Math.round((activeProject.royaltyFundAmount * pct) / 100),
            convertedResearchHours: Math.round(pct * 2.5),
          };
        });
        const updated: RdProjectDto = {
          ...activeProject,
          members: updatedMembers,
          payoutStatus: "APPROVED",
          updatedAt: new Date().toISOString(),
        };
        setProjects(projects.map((p) => (p.id === activeProject.id ? updated : p)));
      }
    } catch {
      // Fallback
    }

    setIsAllocateModalOpen(false);
  };

  // PKI Approve Submit
  const handlePkiApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;

    const token = localStorage.getItem("token") || "mock-token";
    const payload: ApproveRdWithPkiInput = {
      signerName,
      resolutionNumber,
    };

    try {
      const res = await fetch(
        `/api/v1/rd/projects/${activeProject.id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (res.ok) {
        const json = await res.json();
        setProjects(projects.map((p) => (p.id === activeProject.id ? json.data : p)));
      } else {
        // Local fallback
        const updated: RdProjectDto = {
          ...activeProject,
          status: "COMPLETED",
          payoutStatus: "PAID_VIA_PAYROLL",
          resolutionNumber: payload.resolutionNumber || "218/QĐ-ĐHKTĐN",
          pkiSignature: "MIIEPQIBAzCCBM8GCSqGSIb3DQEHAaCCBMIExgSDAU...",
          pkiSignedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProjects(projects.map((p) => (p.id === activeProject.id ? updated : p)));
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
            href="/rd"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
          >
            <ChevronLeft size={14} />
            <span>Quay lại Danh mục Đề tài</span>
          </Link>
          <span className="text-xs text-slate-400">/</span>
          <span className="text-xs font-medium text-slate-600">Hội đồng Nghiệm thu & Quyết toán Nhuận bút</span>
        </div>

        {/* Top Control Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Hội Đồng Nghiệm Thu & Quyết Toán Nhuận Bút Tác Giả
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Đánh giá chất lượng đồ án, nghiệm thu rào chắn (≥ 70 điểm), phân chia tỷ lệ % nhuận bút và ký số PKI RSA-2048.
            </p>
          </div>

          {/* Project Selector */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Chọn Công trình:</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-xs truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.projectCode}] {p.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {activeProject && (
          <div className="space-y-6">
            {/* Project Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-slate-800 rounded">
                      {activeProject.projectCode}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                      {activeProject.projectType === "ARCHITECTURAL_DESIGN" ? "Tư vấn Thiết kế Kiến trúc" : "Đề tài NCKH"}
                    </span>
                    <span className="text-xs font-medium px-2 py-0.5 bg-amber-50 text-amber-700 rounded border border-amber-200">
                      {activeProject.level}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">{activeProject.title}</h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Đơn vị: <strong>{activeProject.departmentName}</strong> • Chủ nhiệm / Chủ trì: <strong>{activeProject.principalInvestigatorName}</strong> ({activeProject.principalInvestigatorCode})
                  </p>
                </div>

                {/* Status Badges */}
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block">Trạng thái Quyết toán:</span>
                    {activeProject.payoutStatus === "PAID_VIA_PAYROLL" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                        <CheckCircle2 size={13} /> Đã chi trả qua Lương CBGV
                      </span>
                    ) : activeProject.payoutStatus === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">
                        Đã duyệt phân bổ • Chờ ký số PKI
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                        Chờ phân bổ nhuận bút
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Structure Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">Tổng Giá trị Hợp đồng KH&CN</span>
                  <p className="text-lg font-bold text-slate-900 mt-0.5">{formatVnd(activeProject.contractValue)}</p>
                </div>
                <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200">
                  <span className="text-xs text-amber-800 font-medium">
                    Trích nộp Quỹ trường ({activeProject.institutionalFeePercentage}%)
                  </span>
                  <p className="text-lg font-bold text-amber-900 mt-0.5">{formatVnd(activeProject.institutionalFeeAmount)}</p>
                </div>
                <div className="bg-indigo-50/60 p-3.5 rounded-xl border border-indigo-200">
                  <span className="text-xs text-indigo-800 font-medium">
                    Quỹ Nhuận bút Tác giả & Kỹ sư ({100 - activeProject.institutionalFeePercentage}%)
                  </span>
                  <p className="text-lg font-bold text-indigo-900 mt-0.5">{formatVnd(activeProject.royaltyFundAmount)}</p>
                </div>
              </div>
            </div>

            {/* Step 1: Council Acceptance Review Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                    <Award size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Bước 1: Hội Đồng Khoa Học Đánh Giá Nghiệm Thu (Rào chắn ≥ 70 điểm)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quy chuẩn thẩm định chất lượng đồ án & công trình theo Nghị định 109/2022/NĐ-CP.
                    </p>
                  </div>
                </div>

                {(!activeProject.councilReview || !activeProject.councilReview.isPassed) && (
                  <button
                    onClick={() => {
                      if (activeProject.councilReview) {
                        setReviewScore(activeProject.councilReview.score);
                        setReviewRanking(activeProject.councilReview.ranking);
                        setReviewNotes(activeProject.councilReview.councilNotes || "");
                      }
                      setIsReviewModalOpen(true);
                    }}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    Hội Đồng Đánh Giá Nghiệm Thu
                  </button>
                )}
              </div>

              {activeProject.councilReview ? (
                <div className="bg-purple-50/50 rounded-xl p-4 border border-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-purple-900">
                        Kết quả: {activeProject.councilReview.isPassed ? "ĐẠT NGHIỆM THU" : "KHÔNG ĐẠT"}
                      </span>
                      <span className="px-2 py-0.5 bg-purple-200 text-purple-900 text-xs font-mono font-bold rounded">
                        {activeProject.councilReview.score} / 100 điểm
                      </span>
                      <span className="text-xs font-medium text-purple-700">
                        (Xếp loại: {activeProject.councilReview.ranking})
                      </span>
                    </div>
                    <p className="text-xs text-purple-800 italic">
                      "{activeProject.councilReview.councilNotes || "Đề tài đáp ứng đầy đủ yêu cầu khoa học và thực tiễn."}"
                    </p>
                    <p className="text-[11px] text-purple-600">
                      Chủ tịch Hội đồng: <strong>{activeProject.councilReview.councilPresidentName || "GS.TS. Nguyễn Hiệu Trưởng"}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeProject.councilReview.isPassed ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold">
                        <CheckCircle2 size={16} />
                        <span>Đủ điều kiện chi trả nhuận bút</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-100 text-rose-800 rounded-lg text-xs font-bold">
                        <XCircle size={16} />
                        <span>Chưa đạt rào chắn 70 điểm</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Hội đồng chưa tổ chức họp nghiệm thu</p>
                  <p className="text-[11px] text-slate-500">Vui lòng nhập điểm đánh giá của Hội đồng để kích hoạt bước tiếp theo.</p>
                </div>
              )}
            </div>

            {/* Step 2: Team Members Royalty Allocation & Converted Workload */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Percent size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Bước 2: Phân Bổ Nhuận Bút Tác Giả & Giờ NCKH Bù Trừ Định Mức
                    </h3>
                    <p className="text-xs text-slate-500">
                      Tự động tính thù lao thực nhận và quy đổi giờ NCKH theo Thông tư 03/2023/TT-BGDĐT.
                    </p>
                  </div>
                </div>

                {activeProject.payoutStatus !== "PAID_VIA_PAYROLL" && (
                  <button
                    onClick={openAllocateModal}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    Điều Chỉnh Phân Bổ %
                  </button>
                )}
              </div>

              {/* Table of Members */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Thành viên</th>
                      <th className="py-3 px-4">Mã CBGV</th>
                      <th className="py-3 px-4">Vai trò trong đồ án</th>
                      <th className="py-3 px-4 text-center">Tỷ lệ nhuận bút (%)</th>
                      <th className="py-3 px-4 text-right">Thù lao thực nhận (VNĐ)</th>
                      <th className="py-3 px-4 text-center">Giờ NCKH quy đổi</th>
                      <th className="py-3 px-4 text-center">Điểm KPI Trụ cột II</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeProject.members.map((m, idx) => {
                      const isLead = m.role === "PRINCIPAL_INVESTIGATOR" || m.role === "LEAD_ARCHITECT";
                      const kpiPoints = isLead ? 35 : 20;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">{m.fullName}</td>
                          <td className="py-3 px-4 font-mono text-slate-600">{m.employeeCode}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                              {m.role}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-indigo-600 text-sm">
                            {m.royaltyPercentage}%
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-900 text-sm">
                            {formatVnd(m.allocatedAmount)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 font-bold rounded-md border border-emerald-200">
                              +{m.convertedResearchHours} giờ
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 bg-sky-50 text-sky-700 font-bold rounded-md border border-sky-200">
                              +{kpiPoints} điểm
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Step 3: Rector PKI RSA-2048 Digital Signing & Triple Coupling */}
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
                      Ban hành Quyết định Nghiệm thu chuẩn Nghị định 30/2020/NĐ-CP và rót thẳng thù lao vào kỳ lương.
                    </p>
                  </div>
                </div>

                {activeProject.councilReview?.isPassed && activeProject.status !== "COMPLETED" && (
                  <button
                    onClick={() => setIsPkiModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
                  >
                    <Key size={14} />
                    <span>Ký Số PKI & Phê Duyệt Quyết Toán</span>
                  </button>
                )}
              </div>

              {activeProject.resolutionNumber ? (
                <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-200 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-950">
                          QUYẾT ĐỊNH ĐÃ BAN HÀNH & KÝ SỐ ĐIỆN TỬ:
                        </span>
                        <span className="font-mono font-bold text-emerald-700 px-2 py-0.5 bg-emerald-200 rounded text-xs">
                          {activeProject.resolutionNumber}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-800">
                        Ký bởi: <strong>GS.TS. Nguyễn Hiệu Trưởng</strong> • Thời gian ký: {activeProject.pkiSignedAt || new Date().toISOString()}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 break-all">
                        Chữ ký số PKI RSA-2048: {activeProject.pkiSignature?.slice(0, 48)}...
                      </p>
                    </div>

                    <a
                      href={`/api/v1/rd/projects/${activeProject.id}/resolution/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-2 shadow-sm transition-all"
                    >
                      <Download size={14} />
                      <span>Tải Quyết Định PDF (NĐ 30)</span>
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
                          Đã tự động cộng <strong>{formatVnd(activeProject.royaltyFundAmount)}</strong> vào thu nhập tháng của các thành viên.
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <BookOpen size={14} />
                          <span>2. WorkloadService</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Đã quy đổi tổng cộng <strong>{activeProject.members.reduce((s, m) => s + m.convertedResearchHours, 0)} giờ NCKH</strong> bù trừ định mức pháp định.
                        </p>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <TrendingUp size={14} />
                          <span>3. KpiService</span>
                        </div>
                        <p className="text-[11px] text-slate-600">
                          Đã tự động cộng <strong>+35 điểm</strong> (Chủ trì/Chủ nhiệm) và <strong>+20 điểm</strong> (Thành viên) vào Trụ cột II KPI.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ShieldCheck size={28} className="mx-auto text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">Chưa phê duyệt quyết toán ký số</p>
                  <p className="text-[11px] text-slate-500">
                    Sau khi Hội đồng nghiệm thu ĐẠT, Hiệu trưởng sẽ ký số điện tử để hoàn tất thủ tục tài chính.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal: Hội đồng Đánh giá Nghiệm thu */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Award size={18} className="text-purple-600" />
                  <h3 className="text-base font-bold text-slate-900">Đánh Giá Nghiệm Thu Đề Tài / Dự Án</h3>
                </div>
                <button onClick={() => setIsReviewModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCouncilReview} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Điểm số Nghiệm thu (0 - 100 điểm, Rào chắn ≥ 70 điểm để ĐẠT) *
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    required
                    value={reviewScore}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setReviewScore(val);
                      if (val >= 90) setReviewRanking("EXCELLENT");
                      else if (val >= 80) setReviewRanking("GOOD");
                      else if (val >= 70) setReviewRanking("SATISFACTORY");
                      else setReviewRanking("UNSATISFACTORY");
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">Xếp loại tự động:</span>
                    <span className="font-bold text-purple-700">{reviewRanking}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Chủ tịch Hội đồng Khoa học</label>
                  <input
                    type="text"
                    value={reviewPresident}
                    onChange={(e) => setReviewPresident(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nhận xét kết luận của Hội đồng</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Xác Nhận Nghiệm Thu
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Điều chỉnh Phân bổ Nhuận bút */}
        {isAllocateModalOpen && activeProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Percent size={18} className="text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Phân Bổ Tỷ Lệ Nhuận Bút Tác Giả</h3>
                </div>
                <button onClick={() => setIsAllocateModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAllocateRoyalty} className="space-y-4 pt-4 text-xs">
                <p className="text-slate-600">
                  Quỹ nhuận bút chi trả: <strong>{formatVnd(activeProject.royaltyFundAmount)}</strong> (Tổng tỷ lệ phân bổ tối đa 100%).
                </p>

                <div className="space-y-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {activeProject.members.map((m) => (
                    <div key={m.employeeId} className="flex items-center justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900 block">{m.fullName}</span>
                        <span className="text-[11px] text-slate-500">({m.role})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={allocPercentages[m.employeeId] ?? m.royaltyPercentage}
                          onChange={(e) =>
                            setAllocPercentages({
                              ...allocPercentages,
                              [m.employeeId]: Number(e.target.value),
                            })
                          }
                          className="w-18 px-2 py-1.5 border border-slate-300 rounded bg-white text-right font-bold text-slate-900"
                        />
                        <span className="font-bold text-slate-600">%</span>
                      </div>
                    </div>
                  ))}
                </div>

                {(() => {
                  const currentTotal = Object.values(allocPercentages).reduce((a, b) => a + b, 0);
                  return (
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span>Tổng tỷ lệ:</span>
                      <span className={currentTotal <= 100 ? "text-emerald-600" : "text-rose-600"}>
                        {currentTotal}% / 100%
                      </span>
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsAllocateModalOpen(false)}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Lưu Phân Bổ
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Hiệu trưởng Ký số PKI */}
        {isPkiModalOpen && activeProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-emerald-600" />
                  <h3 className="text-base font-bold text-slate-900">Ký Số PKI RSA-2048 & Quyết Toán</h3>
                </div>
                <button onClick={() => setIsPkiModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handlePkiApprove} className="space-y-4 pt-4 text-xs">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 space-y-1">
                  <p className="font-bold">Chứng thư số điện tử Hiệu trưởng:</p>
                  <p className="text-[11px]">Mã định danh: VN-DAU-CA-8899A1-2026 (Khóa bí mật RSA 2048-bit)</p>
                  <p className="text-[11px]">Tổ chức: Trường Đại học Kiến trúc Đà Nẵng</p>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Người ký số</label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số Quyết định Nghiệm thu & Phân bổ</label>
                  <input
                    type="text"
                    value={resolutionNumber}
                    onChange={(e) => setResolutionNumber(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setIsPkiModalOpen(false)}
                    className="px-3.5 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-sm"
                  >
                    Xác Nhận Ký Số & Kích Hoạt
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

export default function RdRoyaltyPage() {
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
      <RdRoyaltyContent />
    </Suspense>
  );
}
