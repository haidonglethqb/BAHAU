"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "../../../components/AuthGuard";

interface KpiCriterionItem {
  id?: string;
  criterionId: string;
  criterionName: string;
  category: string;
  maxScore: number;
  selfScore?: number | null;
  managerScore?: number | null;
  finalScore?: number | null;
  selfNote?: string | null;
  evidenceUrl?: string | null;
  managerNote?: string | null;
}

interface KpiEvaluationSummary {
  id: string;
  periodId: string;
  periodName: string;
  academicYear: string;
  templateId: string;
  templateName: string;
  targetType: "LECTURER" | "STAFF";
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  unitName: string;
  positionName: string;
  managerId?: string | null;
  managerName?: string | null;
  status: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "FINALIZED";
  totalSelfScore?: number | null;
  totalManagerScore?: number | null;
  totalFinalScore?: number | null;
  ranking?: "EXCELLENT" | "GOOD" | "SATISFACTORY" | "UNSATISFACTORY" | null;
  managerComment?: string | null;
  councilComment?: string | null;
  items: KpiCriterionItem[];
}

interface PeriodOption {
  id: string;
  code: string;
  name: string;
  academicYear: string;
  status: string;
}

const DEMO_PERIODS: PeriodOption[] = [
  { id: "p1", code: "KPI-2025-2026", name: "Đánh giá & Xếp loại Cán bộ Năm học 2025-2026", academicYear: "2025-2026", status: "OPEN" },
  { id: "p2", code: "KPI-2024-2025", name: "Đánh giá & Xếp loại Cán bộ Năm học 2024-2025", academicYear: "2024-2025", status: "CLOSED" },
];

const DEMO_EVALUATIONS: KpiEvaluationSummary[] = [
  {
    id: "eval-1",
    periodId: "p1",
    periodName: "Đánh giá & Xếp loại Cán bộ Năm học 2025-2026",
    academicYear: "2025-2026",
    templateId: "tmpl-lecturer",
    templateName: "Tiêu chuẩn Đánh giá & Xếp loại Giảng viên DAU",
    targetType: "LECTURER",
    employeeId: "emp-1",
    employeeCode: "DAU240001",
    employeeName: "ThS. Đỗ Tuấn Kiệt",
    unitName: "Khoa Kiến trúc",
    positionName: "Giảng viên",
    managerId: "emp-manager-1",
    managerName: "PGS.TS. Trần Quốc Hùng",
    status: "SUBMITTED",
    totalSelfScore: 92.5,
    totalManagerScore: null,
    totalFinalScore: null,
    ranking: null,
    managerComment: null,
    councilComment: null,
    items: [
      {
        criterionId: "c1",
        criterionName: "Khối lượng & Chất lượng Giảng dạy (vượt/đạt định mức, phản hồi SV >= 80%)",
        category: "GIẢNG DẠY & ĐÀO TẠO",
        maxScore: 40,
        selfScore: 38,
        managerScore: null,
        selfNote: "Hoàn thành 420 giờ chuẩn, điểm SV đánh giá 4.6/5.0",
        evidenceUrl: "https://drive.dau.edu.vn/giang-day-kietdt-2526",
      },
      {
        criterionId: "c2",
        criterionName: "Nghiên cứu khoa học (Bài báo Scopus/WoS, đề tài cấp Trường/Bộ/Tỉnh)",
        category: "NGHIÊN CỨU KHOA HỌC",
        maxScore: 30,
        selfScore: 28.5,
        managerScore: null,
        selfNote: "1 bài Q2 Scopus, 1 đề tài cấp Trường đã nghiệm thu loại Tốt",
        evidenceUrl: "https://doi.org/10.1016/j.arch.2025.04.012",
      },
      {
        criterionId: "c3",
        criterionName: "Phục vụ cộng đồng & Hoạt động Khoa/Trường (Cố vấn học tập, tuyển sinh)",
        category: "PHỤC VỤ CỘNG ĐỒNG",
        maxScore: 15,
        selfScore: 13,
        managerScore: null,
        selfNote: "Cố vấn lớp 22KT1, tham gia ban tư vấn tuyển sinh 2025",
        evidenceUrl: "https://drive.dau.edu.vn/minh-chung-phuc-vu-2025",
      },
      {
        criterionId: "c4",
        criterionName: "Chấp hành kỷ luật, đạo đức nhà giáo & Văn hóa công sở DAU",
        category: "KỶ LUẬT & ĐẠO ĐỨC",
        maxScore: 15,
        selfScore: 13,
        managerScore: null,
        selfNote: "Đi làm đúng giờ, không vi phạm quy chế đào tạo",
        evidenceUrl: null,
      },
    ],
  },
  {
    id: "eval-2",
    periodId: "p1",
    periodName: "Đánh giá & Xếp loại Cán bộ Năm học 2025-2026",
    academicYear: "2025-2026",
    templateId: "tmpl-lecturer",
    templateName: "Tiêu chuẩn Đánh giá & Xếp loại Giảng viên DAU",
    targetType: "LECTURER",
    employeeId: "emp-2",
    employeeCode: "DAU230015",
    employeeName: "TS. Nguyễn Hoàng Nam",
    unitName: "Khoa Xây dựng",
    positionName: "Phó Trưởng khoa",
    managerId: "emp-manager-2",
    managerName: "GS.TS. Lê Văn Minh",
    status: "IN_REVIEW",
    totalSelfScore: 94,
    totalManagerScore: 91,
    totalFinalScore: null,
    ranking: null,
    managerComment: "Đồng chí Nam hoàn thành xuất sắc nhiệm vụ NCKH và quản lý bộ môn.",
    councilComment: null,
    items: [
      {
        criterionId: "c1",
        criterionName: "Khối lượng & Chất lượng Giảng dạy",
        category: "GIẢNG DẠY & ĐÀO TẠO",
        maxScore: 40,
        selfScore: 37,
        managerScore: 36,
        selfNote: "Đạt định mức giờ giảng theo quy định",
        evidenceUrl: "https://drive.dau.edu.vn/namnh-gd",
      },
      {
        criterionId: "c2",
        criterionName: "Nghiên cứu khoa học",
        category: "NGHIÊN CỨU KHOA HỌC",
        maxScore: 30,
        selfScore: 29,
        managerScore: 28,
        selfNote: "2 bài báo Scopus Q1",
        evidenceUrl: "https://doi.org/10.1016/j.eng.2025.01.005",
      },
      {
        criterionId: "c3",
        criterionName: "Phục vụ cộng đồng & Hoạt động Khoa/Trường",
        category: "PHỤC VỤ CỘNG ĐỒNG",
        maxScore: 15,
        selfScore: 14,
        managerScore: 13.5,
        selfNote: "Trưởng ban tổ chức Hội thảo quốc tế CEE-2025",
        evidenceUrl: "https://dau.edu.vn/cee-2025",
      },
      {
        criterionId: "c4",
        criterionName: "Chấp hành kỷ luật, đạo đức nhà giáo",
        category: "KỶ LUẬT & ĐẠO ĐỨC",
        maxScore: 15,
        selfScore: 14,
        managerScore: 13.5,
        selfNote: "Gương mẫu trong các phong trào thi đua",
        evidenceUrl: null,
      },
    ],
  },
  {
    id: "eval-3",
    periodId: "p1",
    periodName: "Đánh giá & Xếp loại Cán bộ Năm học 2025-2026",
    academicYear: "2025-2026",
    templateId: "tmpl-staff",
    templateName: "Tiêu chuẩn Đánh giá & Xếp loại Chuyên viên/Nhân viên DAU",
    targetType: "STAFF",
    employeeId: "emp-3",
    employeeCode: "DAU240088",
    employeeName: "CN. Lê Thị Mai",
    unitName: "Phòng Tổ chức - Hành chính",
    positionName: "Chuyên viên nhân sự",
    managerId: "emp-manager-3",
    managerName: "ThS. Phạm Thanh Sơn",
    status: "FINALIZED",
    totalSelfScore: 88,
    totalManagerScore: 86.5,
    totalFinalScore: 87,
    ranking: "GOOD",
    managerComment: "Nhiệt tình, xử lý hồ sơ kịp thời không chậm trễ.",
    councilComment: "Hội đồng thống nhất xếp loại Hoàn thành tốt nhiệm vụ (Loại B).",
    items: [],
  },
];

export default function KpiManagePage() {
  const [periods, setPeriods] = useState<PeriodOption[]>(DEMO_PERIODS);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>("p1");
  const [evaluations, setEvaluations] = useState<KpiEvaluationSummary[]>(DEMO_EVALUATIONS);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [filterUnit, setFilterUnit] = useState<string>("ALL");
  const [filterRanking, setFilterRanking] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Modal Manager Scoring
  const [selectedEvalForManager, setSelectedEvalForManager] = useState<KpiEvaluationSummary | null>(null);
  const [managerScores, setManagerScores] = useState<Record<string, number>>({});
  const [managerNotes, setManagerNotes] = useState<Record<string, string>>({});
  const [managerComment, setManagerComment] = useState<string>("");

  // Modal Council Finalize
  const [selectedEvalForCouncil, setSelectedEvalForCouncil] = useState<KpiEvaluationSummary | null>(null);
  const [finalScoreInput, setFinalScoreInput] = useState<number>(0);
  const [councilRankingInput, setCouncilRankingInput] = useState<string>("EXCELLENT");
  const [councilCommentInput, setCouncilCommentInput] = useState<string>("");

  // Notification
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto calculate total manager score
  const computedTotalManagerScore = Object.values(managerScores).reduce((acc, s) => acc + (Number(s) || 0), 0);

  // Filter evaluations
  const filteredEvaluations = evaluations.filter((ev) => {
    if (filterUnit !== "ALL" && ev.unitName !== filterUnit) return false;
    if (filterStatus !== "ALL" && ev.status !== filterStatus) return false;
    if (filterRanking !== "ALL" && ev.ranking !== filterRanking) return false;
    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      const matchName = ev.employeeName.toLowerCase().includes(term);
      const matchCode = ev.employeeCode.toLowerCase().includes(term);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  // Calculate statistics
  const totalCount = evaluations.length;
  const submittedCount = evaluations.filter((e) => e.status === "SUBMITTED").length;
  const inReviewCount = evaluations.filter((e) => e.status === "IN_REVIEW").length;
  const finalizedCount = evaluations.filter((e) => e.status === "FINALIZED").length;

  const countA = evaluations.filter((e) => e.ranking === "EXCELLENT").length;
  const countB = evaluations.filter((e) => e.ranking === "GOOD").length;
  const countC = evaluations.filter((e) => e.ranking === "SATISFACTORY").length;
  const countD = evaluations.filter((e) => e.ranking === "UNSATISFACTORY").length;
  const percentA = finalizedCount > 0 ? ((countA / finalizedCount) * 100).toFixed(1) : "0.0";

  // Open Manager Scoring Modal
  const openManagerScoringModal = (evaluation: KpiEvaluationSummary) => {
    setSelectedEvalForManager(evaluation);
    const initialScores: Record<string, number> = {};
    const initialNotes: Record<string, string> = {};
    evaluation.items.forEach((item) => {
      initialScores[item.criterionId] = item.managerScore ?? item.selfScore ?? item.maxScore;
      initialNotes[item.criterionId] = item.managerNote || "";
    });
    setManagerScores(initialScores);
    setManagerNotes(initialNotes);
    setManagerComment(evaluation.managerComment || "");
  };

  // Open Council Modal
  const openCouncilModal = (evaluation: KpiEvaluationSummary) => {
    setSelectedEvalForCouncil(evaluation);
    const defaultScore = evaluation.totalManagerScore ?? evaluation.totalSelfScore ?? 85;
    setFinalScoreInput(defaultScore);
    setCouncilRankingInput(getRankFromScore(defaultScore));
    setCouncilCommentInput(evaluation.councilComment || "Hội đồng Thi đua thống nhất kết quả đánh giá.");
  };

  const getRankFromScore = (score: number): "EXCELLENT" | "GOOD" | "SATISFACTORY" | "UNSATISFACTORY" => {
    if (score >= 90) return "EXCELLENT";
    if (score >= 70) return "GOOD";
    if (score >= 50) return "SATISFACTORY";
    return "UNSATISFACTORY";
  };

  // Handle submit manager scoring
  const handleSubmitManagerScore = async () => {
    if (!selectedEvalForManager) return;
    try {
      // Mock API update
      setEvaluations((prev) =>
        prev.map((e) => {
          if (e.id === selectedEvalForManager.id) {
            return {
              ...e,
              status: "IN_REVIEW",
              totalManagerScore: computedTotalManagerScore,
              managerComment: managerComment,
              items: e.items.map((item) => ({
                ...item,
                managerScore: Number(managerScores[item.criterionId] || 0),
                managerNote: managerNotes[item.criterionId] || "",
              })),
            };
          }
          return e;
        })
      );

      setMessage({ type: "success", text: `Đã lưu điểm chấm quản lý cho ${selectedEvalForManager.employeeName} thành công!` });
      setSelectedEvalForManager(null);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Lỗi khi lưu điểm chấm quản lý" });
    }
  };

  // Handle submit council finalization
  const handleSubmitCouncilFinalize = async () => {
    if (!selectedEvalForCouncil) return;
    try {
      const score = Number(finalScoreInput);
      const rank = councilRankingInput as "EXCELLENT" | "GOOD" | "SATISFACTORY" | "UNSATISFACTORY";

      setEvaluations((prev) =>
        prev.map((e) => {
          if (e.id === selectedEvalForCouncil.id) {
            return {
              ...e,
              status: "FINALIZED",
              totalFinalScore: score,
              ranking: rank,
              councilComment: councilCommentInput,
            };
          }
          return e;
        })
      );

      setMessage({ type: "success", text: `Hội đồng đã chốt xếp loại [${getRankingBadge(rank).label}] cho ${selectedEvalForCouncil.employeeName}!` });
      setSelectedEvalForCouncil(null);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Lỗi khi chốt xếp loại thi đua" });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Lưu nháp</span>;
      case "SUBMITTED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">Đã nộp tự chấm</span>;
      case "IN_REVIEW":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">Trưởng đơn vị đã chấm</span>;
      case "FINALIZED":
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Đã chốt kết quả</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
    }
  };

  const getRankingBadge = (rank?: string | null) => {
    switch (rank) {
      case "EXCELLENT":
        return { label: "Loại A - Xuất sắc (>= 90đ)", color: "bg-purple-100 text-purple-800 border-purple-200" };
      case "GOOD":
        return { label: "Loại B - Hoàn thành Tốt (70-89đ)", color: "bg-blue-100 text-blue-800 border-blue-200" };
      case "SATISFACTORY":
        return { label: "Loại C - Hoàn thành (50-69đ)", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
      case "UNSATISFACTORY":
        return { label: "Loại D - Không hoàn thành (< 50đ)", color: "bg-red-100 text-red-800 border-red-200" };
      default:
        return { label: "Chưa xếp loại", color: "bg-gray-100 text-gray-500 border-gray-200" };
    }
  };

  return (
    <AuthGuard moduleName="Hội đồng Thi đua & Quản lý KPI">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-5 border-b border-gray-200 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-700">Hội đồng Thi đua & Quản lý KPI</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Quản lý Đánh giá & Xếp loại Cán bộ</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Dành cho Trưởng đơn vị chấm điểm quản lý và Hội đồng Thi đua/BGH chốt xếp loại theo chuẩn ĐH Kiến trúc Đà Nẵng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/kpi"
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition shadow-sm"
          >
            ← Xem Phiếu Cá nhân
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between border ${
            message.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">{message.type === "success" ? "✓" : "⚠️"}</span>
            <p className="text-sm font-medium">{message.text}</p>
          </div>
          <button onClick={() => setMessage(null)} className="text-sm text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Tổng hồ sơ đánh giá</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-900">{totalCount}</span>
            <span className="text-xs text-gray-500">cán bộ/giảng viên</span>
          </div>
          <div className="mt-2 text-xs text-gray-500 flex gap-2">
            <span>Đã nộp: <strong className="text-amber-600">{submittedCount}</strong></span>
            <span>•</span>
            <span>Đã chấm: <strong className="text-blue-600">{inReviewCount}</strong></span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-purple-700 uppercase tracking-wide">Loại A - Xuất sắc (&gt;= 90đ)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-purple-700">{countA}</span>
            <span className="text-xs text-purple-600 font-medium">({percentA}% / max 20%)</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {Number(percentA) > 20 ? (
              <span className="text-red-600 font-medium">⚠️ Vượt định mức khống chế 20%</span>
            ) : (
              <span className="text-emerald-600 font-medium">✓ Đạt chuẩn khống chế DAU</span>
            )}
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-blue-700 uppercase tracking-wide">Loại B - Hoàn thành Tốt (70-89đ)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-700">{countB}</span>
            <span className="text-xs text-gray-500">cán bộ</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Lực lượng nòng cốt hoàn thành chỉ tiêu</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Loại C & D (Dưới 70đ)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-800">{countC + countD}</span>
            <span className="text-xs text-gray-500">(C: {countC}, D: {countD})</span>
          </div>
          <p className="mt-2 text-xs text-gray-500">Cần có kế hoạch bồi dưỡng, chấn chỉnh</p>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Select Period */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Kỳ đánh giá:</label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Unit */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Đơn vị (Khoa/Phòng):</label>
            <select
              value={filterUnit}
              onChange={(e) => setFilterUnit(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả đơn vị</option>
              <option value="Khoa Kiến trúc">Khoa Kiến trúc</option>
              <option value="Khoa Xây dựng">Khoa Xây dựng</option>
              <option value="Phòng Tổ chức - Hành chính">Phòng Tổ chức - Hành chính</option>
            </select>
          </div>

          {/* Filter Ranking */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Xếp loại thi đua:</label>
            <select
              value={filterRanking}
              onChange={(e) => setFilterRanking(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả loại</option>
              <option value="EXCELLENT">Loại A - Xuất sắc</option>
              <option value="GOOD">Loại B - Tốt</option>
              <option value="SATISFACTORY">Loại C - Hoàn thành</option>
              <option value="UNSATISFACTORY">Loại D - Không hoàn thành</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <label className="block text-xs font-medium text-gray-500 mb-1">Tìm kiếm cán bộ:</label>
          <input
            type="text"
            placeholder="Nhập tên hoặc mã DAU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">
            Danh sách Phiếu đánh giá ({filteredEvaluations.length} cán bộ)
          </h2>
          <span className="text-xs text-gray-500">Quy tắc Anti-Self-Approval được kích hoạt</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium">
              <tr>
                <th className="px-6 py-3">Cán bộ / Giảng viên</th>
                <th className="px-4 py-3">Đơn vị & Vị trí</th>
                <th className="px-4 py-3 text-center">Tự chấm</th>
                <th className="px-4 py-3 text-center">QL Chấm</th>
                <th className="px-4 py-3 text-center">Hội đồng Chốt</th>
                <th className="px-4 py-3 text-center">Xếp loại</th>
                <th className="px-4 py-3 text-center">Trạng thái</th>
                <th className="px-6 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredEvaluations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Không tìm thấy hồ sơ nào phù hợp với bộ lọc
                  </td>
                </tr>
              ) : (
                filteredEvaluations.map((ev) => {
                  const rankInfo = getRankingBadge(ev.ranking);
                  return (
                    <tr key={ev.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{ev.employeeName}</div>
                        <div className="text-xs text-gray-500">{ev.employeeCode} • {ev.targetType === "LECTURER" ? "Mẫu Giảng viên" : "Mẫu Chuyên viên"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-gray-800">{ev.unitName}</div>
                        <div className="text-xs text-gray-500">{ev.positionName}</div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-gray-900">
                          {ev.totalSelfScore !== null ? `${ev.totalSelfScore}đ` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-semibold text-blue-700">
                          {ev.totalManagerScore !== null ? `${ev.totalManagerScore}đ` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-bold text-purple-700">
                          {ev.totalFinalScore !== null ? `${ev.totalFinalScore}đ` : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${rankInfo.color}`}>
                          {ev.ranking ? ev.ranking : "Chưa có"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">{getStatusBadge(ev.status)}</td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {/* Nút Trưởng đơn vị chấm điểm */}
                        {ev.status === "SUBMITTED" || ev.status === "IN_REVIEW" ? (
                          <button
                            onClick={() => openManagerScoringModal(ev)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition"
                          >
                            Chấm điểm QL
                          </button>
                        ) : null}

                        {/* Nút Hội đồng chốt kết quả */}
                        {ev.status === "IN_REVIEW" || ev.status === "FINALIZED" ? (
                          <button
                            onClick={() => openCouncilModal(ev)}
                            className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 shadow-sm transition"
                          >
                            Hội đồng Chốt
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Trưởng đơn vị chấm điểm quản lý */}
      {selectedEvalForManager && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Trưởng đơn vị Đánh giá & Chấm điểm</span>
                <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                  Chấm điểm KPI: {selectedEvalForManager.employeeName} ({selectedEvalForManager.employeeCode})
                </h2>
                <p className="text-xs text-gray-500">
                  {selectedEvalForManager.unitName} • {selectedEvalForManager.templateName}
                </p>
              </div>
              <button
                onClick={() => setSelectedEvalForManager(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
              >
                ✕
              </button>
            </div>

            {/* Banner Anti-Self-Approval Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
              <span className="text-base">ℹ️</span>
              <div>
                <strong>Lưu ý nghiệp vụ:</strong> Trưởng đơn vị đối chiếu minh chứng đính kèm và điểm tự chấm trước khi cho điểm. Quy tắc <em>Anti-Self-Approval</em> ngăn chặn tự duyệt phiếu của chính mình.
              </div>
            </div>

            {/* Criteria list for scoring */}
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border text-sm">
                <span className="font-medium text-gray-700">Tổng điểm Tự chấm của CBGV: <strong className="text-indigo-600">{selectedEvalForManager.totalSelfScore}đ</strong> / 100đ</span>
                <span className="font-bold text-blue-700">Tổng điểm QL hiện tại: {computedTotalManagerScore}đ / 100đ</span>
              </div>

              {selectedEvalForManager.items.map((item, idx) => (
                <div key={item.criterionId || idx} className="border border-gray-200 rounded-xl p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="inline-block px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded mr-2">
                        {item.category}
                      </span>
                      <h3 className="text-sm font-semibold text-gray-900 inline">{item.criterionName}</h3>
                    </div>
                    <span className="text-xs font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded border">
                      Tối đa: {item.maxScore}đ
                    </span>
                  </div>

                  <div className="bg-gray-50 p-2.5 rounded-lg text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Điểm tự chấm của CBGV: <strong className="text-gray-900">{item.selfScore ?? 0}đ</strong></span>
                      {item.evidenceUrl && (
                        <a
                          href={item.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 font-medium underline flex items-center gap-1"
                        >
                          🔗 Xem minh chứng đính kèm
                        </a>
                      )}
                    </div>
                    {item.selfNote && <div className="text-gray-500 italic">"Ghi chú: {item.selfNote}"</div>}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center pt-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Điểm quản lý chấm (Tối đa {item.maxScore}đ):
                      </label>
                      <input
                        type="number"
                        min="0"
                        max={item.maxScore}
                        step="0.5"
                        value={managerScores[item.criterionId] ?? ""}
                        onChange={(e) => {
                          const val = Math.min(item.maxScore, Math.max(0, Number(e.target.value) || 0));
                          setManagerScores({ ...managerScores, [item.criterionId]: val });
                        }}
                        className="w-full text-sm font-bold border border-blue-300 rounded-lg px-3 py-1.5 text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Nhận xét của Trưởng đơn vị:</label>
                      <input
                        type="text"
                        placeholder="Nhập nhận xét / lý do tăng hoặc giảm điểm..."
                        value={managerNotes[item.criterionId] ?? ""}
                        onChange={(e) => setManagerNotes({ ...managerNotes, [item.criterionId]: e.target.value })}
                        className="w-full text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {/* General Comment */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-1">
                  Đánh giá chung của Trưởng đơn vị:
                </label>
                <textarea
                  rows={3}
                  value={managerComment}
                  onChange={(e) => setManagerComment(e.target.value)}
                  placeholder="Nhập kết luận chung về phẩm chất, năng lực và mức độ hoàn thành nhiệm vụ của cán bộ trong năm học..."
                  className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setSelectedEvalForManager(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmitManagerScore}
                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition"
              >
                Hoàn tất Chấm Điểm Quản Lý ({computedTotalManagerScore}đ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Hội đồng Thi đua & BGH Chốt Xếp Loại */}
      {selectedEvalForCouncil && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Hội đồng Thi đua & Ban Giám hiệu</span>
                <h2 className="text-xl font-bold text-gray-900 mt-0.5">
                  Chốt Xếp loại: {selectedEvalForCouncil.employeeName}
                </h2>
                <p className="text-xs text-gray-500">{selectedEvalForCouncil.unitName} • {selectedEvalForCouncil.employeeCode}</p>
              </div>
              <button
                onClick={() => setSelectedEvalForCouncil(null)}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold p-2"
              >
                ✕
              </button>
            </div>

            {/* Points Comparison */}
            <div className="grid grid-cols-2 gap-4 bg-purple-50 p-4 rounded-xl border border-purple-100 text-center">
              <div>
                <div className="text-xs text-gray-500 uppercase">Điểm CBGV tự chấm</div>
                <div className="text-2xl font-bold text-gray-800 mt-1">{selectedEvalForCouncil.totalSelfScore ?? "—"}đ</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 uppercase">Điểm Quản lý chấm</div>
                <div className="text-2xl font-bold text-blue-700 mt-1">{selectedEvalForCouncil.totalManagerScore ?? "—"}đ</div>
              </div>
            </div>

            {/* Council Inputs */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Điểm Hội đồng chốt cuối cùng (/100):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={finalScoreInput}
                  onChange={(e) => {
                    const score = Number(e.target.value) || 0;
                    setFinalScoreInput(score);
                    setCouncilRankingInput(getRankFromScore(score));
                  }}
                  className="w-full text-base font-bold border border-purple-300 rounded-lg px-3 py-2 text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Xếp loại thi đua ban hành:
                </label>
                <select
                  value={councilRankingInput}
                  onChange={(e) => setCouncilRankingInput(e.target.value)}
                  className="w-full text-sm font-semibold border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="EXCELLENT">Loại A - Hoàn thành Xuất sắc nhiệm vụ (&gt;= 90đ, khống chế 20%)</option>
                  <option value="GOOD">Loại B - Hoàn thành Tốt nhiệm vụ (70 - 89đ)</option>
                  <option value="SATISFACTORY">Loại C - Hoàn thành nhiệm vụ (50 - 69đ)</option>
                  <option value="UNSATISFACTORY">Loại D - Không hoàn thành nhiệm vụ (&lt; 50đ)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Kết luận & Nhận xét của Hội đồng Thi đua:
                </label>
                <textarea
                  rows={3}
                  value={councilCommentInput}
                  onChange={(e) => setCouncilCommentInput(e.target.value)}
                  placeholder="Ghi nhận xét của Hội đồng thi đua cấp Trường..."
                  className="w-full text-sm border border-gray-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => setSelectedEvalForCouncil(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                Đóng
              </button>
              <button
                onClick={handleSubmitCouncilFinalize}
                className="px-5 py-2 text-sm font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-sm transition"
              >
                Ban Hành Kết Quả Xếp Loại
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </AuthGuard>
  );
}
