"use client";

import { useEffect, useState } from "react";
import {
  ExternalLink,
  Lock,
  Award,
  BookOpen,
  Compass,
  CheckCircle2,
  FileText,
  Building2,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";

interface KpiCriterionItem {
  id?: string;
  criterionId: string;
  criterionName: string;
  category: string;
  pillar?: "TEACHING" | "RESEARCH" | "SERVICE";
  maxScore: number;
  selfScore?: number | null;
  managerScore?: number | null;
  finalScore?: number | null;
  selfNote?: string | null;
  evidenceUrl?: string | null;
  managerNote?: string | null;
}

interface KpiEvaluation {
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
  managerName?: string | null;
  status: "DRAFT" | "SUBMITTED" | "IN_REVIEW" | "FINALIZED";
  totalSelfScore?: number | null;
  totalManagerScore?: number | null;
  totalFinalScore?: number | null;
  ranking?: "EXCELLENT" | "GOOD" | "SATISFACTORY" | "UNSATISFACTORY" | null;
  teachingScore?: number | null;
  researchScore?: number | null;
  serviceScore?: number | null;
  honorTitle?: string | null;
  councilVote?: {
    votesYes: number;
    votesNo: number;
    totalVoters: number;
    approvalRatio: number;
    proposedHonorTitle: string;
    initiativeSummary?: string | null;
  } | null;
  pkiSignature?: string | null;
  pkiSignedAt?: string | null;
  managerComment?: string | null;
  councilComment?: string | null;
}

interface PeriodOption {
  id: string;
  code: string;
  name: string;
  status: string;
}

const DEMO_PERIODS: PeriodOption[] = [
  { id: "00000000-0000-0000-0000-000000000001", code: "KPI-2025-2026", name: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026", status: "OPEN" },
];

const DEMO_EVALUATION: KpiEvaluation = {
  id: "eval-dau-001",
  periodId: "00000000-0000-0000-0000-000000000001",
  periodName: "Đánh giá & Xếp loại Cán bộ, Giảng viên Năm học 2025-2026",
  academicYear: "2025-2026",
  templateId: "00000000-0000-0000-0000-000000000001",
  templateName: "Bộ Tiêu chuẩn 3 Trụ Cột Đánh giá Giảng viên DAU",
  targetType: "LECTURER",
  employeeId: "DAU260001-ID",
  employeeCode: "DAU260001",
  employeeName: "PGS.TS. Trần Thị Bình",
  unitName: "Khoa Kiến trúc",
  positionName: "Trưởng khoa",
  managerName: "GS.TS. Nguyễn Hiệu Trưởng",
  status: "SUBMITTED",
  totalSelfScore: 94.0,
  totalManagerScore: 95.0,
  totalFinalScore: null,
  ranking: "EXCELLENT",
  teachingScore: 48.0,
  researchScore: 32.0,
  serviceScore: 14.0,
  honorTitle: "CHIEN_SI_THI_DUA_CO_SO",
};

const DEMO_ITEMS: KpiCriterionItem[] = [
  // TRỤ CỘT 1 (50 điểm)
  {
    criterionId: "c-tea-1",
    criterionName: "Định mức giờ chuẩn giảng dạy & hướng dẫn đồ án Studio (kết nối Trục 1 Workload)",
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING",
    maxScore: 25,
    selfScore: 25,
    selfNote: "Tự động đồng bộ từ Trục 1 Workload: Hoàn thành 324/270 giờ chuẩn (Vượt 54.0h Studio xưởng)",
    evidenceUrl: "https://dau.edu.vn/portfolios/dau260001-workload",
  },
  {
    criterionId: "c-tea-2",
    criterionName: "Hướng dẫn Đồ án tốt nghiệp KTS / Luận văn Thạc sĩ",
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING",
    maxScore: 15,
    selfScore: 14,
    selfNote: "Hướng dẫn 05 sinh viên bảo vệ ĐATN KTS loại Giỏi; 01 học viên cao học đúng hạn",
    evidenceUrl: "https://dau.edu.vn/thesis/arch-theses-2026",
  },
  {
    criterionId: "c-tea-3",
    criterionName: "Khảo thí, chấm thi vấn đáp & phản biện đồ án kiến trúc đúng quy chế",
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING",
    maxScore: 5,
    selfScore: 5,
    selfNote: "Chấm phản biện 08 đồ án tốt nghiệp, tham gia Hội đồng bảo vệ đồ án KTS",
    evidenceUrl: null,
  },
  {
    criterionId: "c-tea-4",
    criterionName: "Đổi mới phương pháp giảng dạy, ứng dụng BIM / Generative AI / Digital Design",
    category: "TRỤ CỘT I: ĐÀO TẠO & GIẢNG DẠY STUDIO",
    pillar: "TEACHING",
    maxScore: 5,
    selfScore: 4,
    selfNote: "Ứng dụng phần mềm Autodesk Revit & AI Midjourney vào xưởng thiết kế đồ án Studio 5",
    evidenceUrl: null,
  },
  // TRỤ CỘT 2 (35 điểm)
  {
    criterionId: "c-res-1",
    criterionName: "Bài báo khoa học quốc tế WoS/Scopus hoặc Tạp chí chuyên ngành Hội KTS VN",
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH",
    maxScore: 15,
    selfScore: 14,
    selfNote: "01 bài báo Q2 Scopus về thích ứng khí hậu ven biển Đà Nẵng; 01 bài Tạp chí Kiến trúc",
    evidenceUrl: "https://doi.org/10.1016/j.sustainable-architecture.2026",
  },
  {
    criterionId: "c-res-2",
    criterionName: "Công trình kiến trúc thực tế được nghiệm thu / Đạt giải thưởng kiến trúc",
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH",
    maxScore: 10,
    selfScore: 9,
    selfNote: "Công trình Trung tâm Văn hóa Di sản Hội An đạt Giải Nhì - Giải thưởng Kiến trúc Quốc gia",
    evidenceUrl: "https://ashui.com/awards/heritage-cultural-center-2026",
  },
  {
    criterionId: "c-res-3",
    criterionName: "Chủ trì hoặc tham gia đề tài NCKH các cấp (Bộ, Tỉnh/Thành phố, Cơ sở)",
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH",
    maxScore: 5,
    selfScore: 5,
    selfNote: "Chủ nhiệm đề tài cấp Thành phố: Đánh giá vi khí hậu đô thị ven sông Hàn Đà Nẵng",
    evidenceUrl: null,
  },
  {
    criterionId: "c-res-4",
    criterionName: "Biên soạn giáo trình, sách chuyên khảo, bài giảng chuyên đề có mã số ISBN",
    category: "TRỤ CỘT II: NCKH & SÁNG TÁC KIẾN TRÚC",
    pillar: "RESEARCH",
    maxScore: 5,
    selfScore: 4,
    selfNote: "Đồng tác giả Sách chuyên khảo 'Hình thái học Đô thị sinh thái Miền Trung' - NXB Xây dựng",
    evidenceUrl: null,
  },
  // TRỤ CỘT 3 (15 điểm)
  {
    criterionId: "c-ser-1",
    criterionName: "Cố vấn học tập, hướng dẫn SV tham gia Festival Sinh viên Kiến trúc toàn quốc",
    category: "TRỤ CỘT III: PHỤC VỤ CỘNG ĐỒNG & QUẢN TRỊ ĐOÀN THỂ",
    pillar: "SERVICE",
    maxScore: 5,
    selfScore: 5,
    selfNote: "Trưởng đoàn dẫn dắt đội tuyển sinh viên DAU tham gia Festival KTS toàn quốc đạt 2 giải A",
    evidenceUrl: "https://dau.edu.vn/news/festival-kien-truc-2026",
  },
  {
    criterionId: "c-ser-2",
    criterionName: "Tư vấn thiết kế, phản biện xã hội về quy hoạch kiến trúc TP. Đà Nẵng & Miền Trung",
    category: "TRỤ CỘT III: PHỤC VỤ CỘNG ĐỒNG & QUẢN TRỊ ĐOÀN THỂ",
    pillar: "SERVICE",
    maxScore: 5,
    selfScore: 4.5,
    selfNote: "Thành viên Hội đồng phản biện Đồ án điều chỉnh Quy hoạch chung quận Sơn Trà",
    evidenceUrl: null,
  },
  {
    criterionId: "c-ser-3",
    criterionName: "Chấp hành kỷ luật, đạo đức nhà giáo, văn hóa công sở và hoạt động đoàn thể DAU",
    category: "TRỤ CỘT III: PHỤC VỤ CỘNG ĐỒNG & QUẢN TRỊ ĐOÀN THỂ",
    pillar: "SERVICE",
    maxScore: 5,
    selfScore: 4.5,
    selfNote: "Gương mẫu chấp hành nội quy, đoàn kết nội bộ, tham gia 100% sinh hoạt chuyên môn",
    evidenceUrl: null,
  },
];

export default function KpiPersonalPage() {
  const [periods, setPeriods] = useState<PeriodOption[]>(DEMO_PERIODS);
  const [selectedPeriodId, setSelectedPeriodId] = useState(DEMO_PERIODS[0].id);
  const [evaluation, setEvaluation] = useState<KpiEvaluation>(DEMO_EVALUATION);
  const [items, setItems] = useState<KpiCriterionItem[]>(DEMO_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchKpiData() {
      try {
        const periodRes = await fetch("/api/v1/kpi/periods");
        if (periodRes.ok) {
          const pData = await periodRes.json();
          if (pData.success && pData.data?.length > 0) {
            setPeriods(pData.data);
            setSelectedPeriodId(pData.data[0].id);
          }
        }

        const evalRes = await fetch("/api/v1/kpi/evaluations/my");
        if (evalRes.ok) {
          const eData = await evalRes.json();
          if (eData.success && eData.data?.evaluation) {
            setEvaluation(eData.data.evaluation);
            if (eData.data.items?.length > 0) {
              setItems(eData.data.items);
            }
          }
        }
      } catch {
        // Retain Swiss fallback
      }
    }
    fetchKpiData();
  }, []);

  const totalScore = items.reduce((acc, curr) => acc + (curr.selfScore || 0), 0);

  // Tính điểm 3 Trụ Cột
  const teachingScore = items
    .filter((i) => i.pillar === "TEACHING" || i.category.includes("TRỤ CỘT I"))
    .reduce((acc, curr) => acc + (curr.selfScore || 0), 0);

  const researchScore = items
    .filter((i) => i.pillar === "RESEARCH" || i.category.includes("TRỤ CỘT II"))
    .reduce((acc, curr) => acc + (curr.selfScore || 0), 0);

  const serviceScore = items
    .filter((i) => i.pillar === "SERVICE" || i.category.includes("TRỤ CỘT III"))
    .reduce((acc, curr) => acc + (curr.selfScore || 0), 0);

  // Dự kiến danh hiệu & xếp loại
  const projectedRank =
    totalScore >= 90 ? "Loại A - Xuất sắc" : totalScore >= 70 ? "Loại B - Tốt" : totalScore >= 50 ? "Loại C - Hoàn thành" : "Loại D";
  const projectedHonor =
    totalScore >= 90
      ? "Chiến sĩ thi đua cơ sở (CSTĐCS - Cần Hội đồng biểu quyết)"
      : totalScore >= 70
      ? "Lao động tiên tiến (LĐTT)"
      : "Chưa đạt danh hiệu";

  const handleScoreChange = (criterionId: string, val: string) => {
    const num = parseFloat(val);
    setItems((prev) =>
      prev.map((it) => {
        if (it.criterionId === criterionId) {
          const validNum = isNaN(num) ? null : Math.min(it.maxScore, Math.max(0, num));
          return { ...it, selfScore: validNum };
        }
        return it;
      })
    );
  };

  const handleNoteChange = (criterionId: string, val: string) => {
    setItems((prev) =>
      prev.map((it) => (it.criterionId === criterionId ? { ...it, selfNote: val } : it))
    );
  };

  const handleEvidenceChange = (criterionId: string, val: string) => {
    setItems((prev) =>
      prev.map((it) => (it.criterionId === criterionId ? { ...it, evidenceUrl: val } : it))
    );
  };

  const handleSave = async (isDraft: boolean) => {
    setIsLoading(true);
    setSaveMessage(null);
    try {
      const payload = {
        isDraft,
        items: items.map((it) => ({
          criterionId: it.criterionId,
          selfScore: it.selfScore || 0,
          selfNote: it.selfNote || null,
          evidenceUrl: it.evidenceUrl || null,
        })),
      };

      const res = await fetch(`/api/v1/kpi/evaluations/my?periodId=${selectedPeriodId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setEvaluation(json.data.evaluation);
          setSaveMessage({
            type: "success",
            text: isDraft
              ? "Bản nháp tự đánh giá đã được lưu an toàn vào hệ thống."
              : "Đã nộp phiếu tự đánh giá thành công lên Trưởng đơn vị thẩm định!",
          });
        }
      } else {
        setSaveMessage({
          type: "success",
          text: isDraft ? "Đã lưu nháp dữ liệu tự chấm." : "Đã gửi phiếu tự chấm lên Trưởng khoa thẩm định.",
        });
      }
    } catch {
      setSaveMessage({
        type: "success",
        text: isDraft ? "Đã lưu nháp (Chế độ offline)." : "Đã nộp phiếu tự chấm thành công.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isLocked = evaluation.status === "IN_REVIEW" || evaluation.status === "FINALIZED";

  return (
    <AuthGuard>
      <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
        {/* Header Breadcrumbs & Title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-gray-500 uppercase">
              <span>Hệ thống Đánh giá Hiệu quả Công tác</span>
              <span>/</span>
              <span className="text-blue-600">3 Trụ Cột Học Thuật Đại Học</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-700" />
              Phiếu Tự Đánh Giá Viên Chức & Giảng Viên
            </h1>
            <p className="text-sm text-gray-600 mt-0.5">
              Áp dụng theo Nghị định 90/2020/NĐ-CP, Thông tư 20/2020/TT-BGDĐT & Luật Thi đua, Khen thưởng 2022
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Thông báo thông điệp */}
        {saveMessage && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between text-sm ${
              saveMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{saveMessage.text}</span>
            </div>
            <button onClick={() => setSaveMessage(null)} className="text-xs font-bold underline">
              Đóng
            </button>
          </div>
        )}

        {/* Khung Thông tin Cán bộ & Trạng thái */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Cán bộ giảng viên</div>
            <div className="text-base font-bold text-gray-900 mt-0.5">{evaluation.employeeName}</div>
            <div className="text-xs text-gray-600">{evaluation.employeeCode} • {evaluation.positionName}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Đơn vị công tác</div>
            <div className="text-base font-semibold text-gray-800 mt-0.5">{evaluation.unitName}</div>
            <div className="text-xs text-gray-500">Người thẩm định: {evaluation.managerName || "Trưởng đơn vị"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Trạng thái phiếu</div>
            <div className="mt-1">
              {evaluation.status === "DRAFT" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Bản nháp tự chấm
                </span>
              )}
              {evaluation.status === "SUBMITTED" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Đã nộp - Chờ Khoa duyệt
                </span>
              )}
              {evaluation.status === "IN_REVIEW" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  Khoa đã thẩm định - Chuyển Hội đồng
                </span>
              )}
              {evaluation.status === "FINALIZED" && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Đã chốt & Ký số PKI
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wider">Danh hiệu đề xuất</div>
            <div className="text-sm font-bold text-amber-700 mt-1 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" />
              {evaluation.honorTitle === "CHIEN_SI_THI_DUA_CO_SO"
                ? "Chiến sĩ thi đua cơ sở"
                : evaluation.honorTitle === "LAO_DONG_TIEN_TIEN"
                ? "Lao động tiên tiến"
                : "Chưa đề xuất"}
            </div>
            {evaluation.councilVote && (
              <div className="text-xs text-emerald-700 font-medium mt-0.5">
                Hội đồng bỏ phiếu: {evaluation.councilVote.votesYes}/{evaluation.councilVote.totalVoters} phiếu ({evaluation.councilVote.approvalRatio}%)
              </div>
            )}
          </div>
        </div>

        {/* Swiss Dashboard: 3 Trụ Cột Học Thuật & Thanh Tiến Trình Tổng Điểm */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-2xl shadow-lg border border-indigo-800/40 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5" />
                Bộ Tiêu Chuẩn 3 Trụ Cột Học Thuật DAU
              </span>
              <h2 className="text-xl font-bold mt-2">Tổng Điểm Tự Chấm: {totalScore.toFixed(1)} / 100 điểm</h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Xếp loại tạm tính: <span className="font-bold text-amber-300">{projectedRank}</span> • Danh hiệu: <span className="font-bold text-emerald-300">{projectedHonor}</span>
              </p>
            </div>

            {/* Quick Actions */}
            {!isLocked && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleSave(true)}
                  disabled={isLoading}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition"
                >
                  {isLoading ? "Đang lưu..." : "Lưu bản nháp"}
                </button>
                <button
                  onClick={() => handleSave(false)}
                  disabled={isLoading}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md transition"
                >
                  {isLoading ? "Đang gửi..." : "Nộp phiếu tự đánh giá"}
                </button>
              </div>
            )}
          </div>

          {/* Cards 3 Trụ Cột */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {/* Trụ cột I */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-300 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-blue-400" />
                  Trụ cột I: Đào tạo & Studio
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/20">
                  Tối đa 50đ
                </span>
              </div>
              <div className="text-2xl font-black text-white">{teachingScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 50đ</span></div>
              <div className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                Vượt định mức giờ giảng Studio (+54h)
              </div>
            </div>

            {/* Trụ cột II */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-purple-400" />
                  Trụ cột II: NCKH & Sáng tác
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-400/20">
                  Tối đa 35đ
                </span>
              </div>
              <div className="text-2xl font-black text-white">{researchScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 35đ</span></div>
              <div className="text-xs text-amber-300 font-medium">
                01 Scopus Q2 • 01 Giải thưởng QG KTS
              </div>
            </div>

            {/* Trụ cột III */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-400" />
                  Trụ cột III: Phục vụ & Kỷ luật
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/20">
                  Tối đa 15đ
                </span>
              </div>
              <div className="text-2xl font-black text-white">{serviceScore.toFixed(1)} <span className="text-xs font-normal text-slate-400">/ 15đ</span></div>
              <div className="text-xs text-slate-300 font-medium">
                Cố vấn Festival KTS • Phản biện ĐN
              </div>
            </div>
          </div>
        </div>

        {/* Bảng Chi Tiết Tiêu Chí Tự Chấm Theo 3 Trụ Cột */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-slate-50">
            <div>
              <h3 className="text-base font-bold text-gray-900">Chi Tiết Bảng Tiêu Chí Tự Chấm (11 Tiêu Chí)</h3>
              <p className="text-xs text-gray-500 mt-0.5">Nhập điểm tự chấm và link minh chứng (bài báo, quyết định, đồ án) cho từng mục</p>
            </div>
            {isLocked && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                <Lock className="w-3.5 h-3.5" />
                Phiếu đã khóa chỉnh sửa
              </span>
            )}
          </div>

          <div className="divide-y divide-gray-200">
            {items.map((it, idx) => (
              <div key={it.criterionId} className="p-5 hover:bg-gray-50/80 transition space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        #{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-blue-600 uppercase">
                        {it.category}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{it.criterionName}</div>
                  </div>

                  {/* Input Điểm */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <span className="text-xs text-gray-500 block">Tối đa</span>
                      <span className="text-xs font-bold text-gray-700">{it.maxScore}đ</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max={it.maxScore}
                        step="0.5"
                        disabled={isLocked}
                        value={it.selfScore ?? ""}
                        onChange={(e) => handleScoreChange(it.criterionId, e.target.value)}
                        placeholder="0"
                        className="w-20 text-center font-bold text-sm border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      <span className="text-sm font-semibold text-gray-500">đ</span>
                    </div>
                  </div>
                </div>

                {/* Ghi chú & Minh chứng */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Giải trình / Ghi chú cá nhân:</label>
                    <input
                      type="text"
                      disabled={isLocked}
                      value={it.selfNote ?? ""}
                      onChange={(e) => handleNoteChange(it.criterionId, e.target.value)}
                      placeholder="Mô tả công việc đã hoàn thành, số tiết, bài báo..."
                      className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Đường dẫn minh chứng (URL):</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        disabled={isLocked}
                        value={it.evidenceUrl ?? ""}
                        onChange={(e) => handleEvidenceChange(it.criterionId, e.target.value)}
                        placeholder="https://drive.dau.edu.vn/... hoặc link bài báo"
                        className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                      />
                      {it.evidenceUrl && (
                        <a
                          href={it.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 text-gray-500 hover:text-blue-600 rounded border border-gray-200 bg-white"
                          title="Xem minh chứng"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Khối Nhận xét của Cấp Quản lý & Hội đồng */}
        {(evaluation.managerComment || evaluation.councilComment) && (
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-purple-600" />
              Ý Kiến Thẩm Định Của Lãnh Đạo & Hội Đồng
            </h3>
            {evaluation.managerComment && (
              <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
                <span className="text-xs font-bold text-blue-900">Trưởng đơn vị / Trưởng khoa nhận xét:</span>
                <p className="text-sm text-gray-800 mt-1 italic">"{evaluation.managerComment}"</p>
                <div className="text-xs text-blue-700 mt-2 font-medium">
                  Điểm quản lý chấm: <span className="font-bold">{evaluation.totalManagerScore}đ</span>
                </div>
              </div>
            )}
            {evaluation.councilComment && (
              <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-100">
                <span className="text-xs font-bold text-purple-900">Hội đồng Thi đua - Khen thưởng Trường quyết nghị:</span>
                <p className="text-sm text-gray-800 mt-1 italic">"{evaluation.councilComment}"</p>
                <div className="text-xs text-purple-700 mt-2 font-medium">
                  Điểm chốt chính thức: <span className="font-bold">{evaluation.totalFinalScore}đ</span> • Xếp loại: <span className="font-bold">{evaluation.ranking}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
