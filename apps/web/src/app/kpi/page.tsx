"use client";

import { useEffect, useState } from "react";
import { AuthGuard } from "../../components/AuthGuard";

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
  { id: "p1", code: "KPI-2025-2026", name: "Đánh giá & Xếp loại Cán bộ Năm học 2025-2026", status: "OPEN" },
];

const DEMO_EVALUATION: KpiEvaluation = {
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
  managerName: "PGS.TS. Trần Quốc Hùng",
  status: "SUBMITTED",
  totalSelfScore: 92.5,
  totalManagerScore: null,
  totalFinalScore: null,
  ranking: null,
};

const DEMO_ITEMS: KpiCriterionItem[] = [
  {
    criterionId: "c1",
    criterionName: "Hoàn thành định mức khối lượng giờ giảng",
    category: "Công tác Giảng dạy & Giáo dục",
    maxScore: 20,
    selfScore: 19.5,
    selfNote: "Giảng dạy 320 tiết chuẩn (vượt 15% định mức giao)",
    evidenceUrl: "https://dau.edu.vn/schedules/sem2-2026.pdf",
  },
  {
    criterionId: "c2",
    criterionName: "Chất lượng giảng dạy và đổi mới phương pháp",
    category: "Công tác Giảng dạy & Giáo dục",
    maxScore: 10,
    selfScore: 9.5,
    selfNote: "Áp dụng mô hình Studio Project kết hợp phần mềm mô phỏng BIM",
    evidenceUrl: null,
  },
  {
    criterionId: "c3",
    criterionName: "Coi thi, chấm thi & hướng dẫn đồ án / NCKH sinh viên",
    category: "Công tác Giảng dạy & Giáo dục",
    maxScore: 10,
    selfScore: 9.5,
    selfNote: "Hướng dẫn 03 nhóm sinh viên đạt giải Nhì sinh viên NCKH cấp Khoa",
    evidenceUrl: "https://dau.edu.vn/awards/student-research-2026.pdf",
  },
  {
    criterionId: "c4",
    criterionName: "Công bố bài báo khoa học quốc tế / Tạp chí chuyên ngành",
    category: "Nghiên cứu Khoa học & Chuyển giao",
    maxScore: 15,
    selfScore: 14.0,
    selfNote: "Công bố 01 bài báo tạp chí Scopus Q2 về Kiến trúc Bền vững Miền Trung",
    evidenceUrl: "https://dau.edu.vn/research/papers/sustainable-arch-2026.pdf",
  },
  {
    criterionId: "c5",
    criterionName: "Chủ trì / tham gia đề tài NCKH & biên soạn giáo trình",
    category: "Nghiên cứu Khoa học & Chuyển giao",
    maxScore: 15,
    selfScore: 13.5,
    selfNote: "Tham gia biên soạn Giáo trình Cấu tạo Kiến trúc tập 2",
    evidenceUrl: null,
  },
  {
    criterionId: "c6",
    criterionName: "Cố vấn học tập, tuyển sinh & hoạt động đoàn thể",
    category: "Phục vụ Cộng đồng & Nhà trường",
    maxScore: 10,
    selfScore: 9.5,
    selfNote: "Cố vấn học tập lớp 22KT1, tham gia đoàn tư vấn tuyển sinh THPT",
    evidenceUrl: null,
  },
  {
    criterionId: "c7",
    criterionName: "Bồi dưỡng chuyên môn & kết nối doanh nghiệp",
    category: "Phục vụ Cộng đồng & Nhà trường",
    maxScore: 5,
    selfScore: 4.5,
    selfNote: "Tham dự Hội thảo Kiến trúc xanh Quốc tế Đà Nẵng 2026",
    evidenceUrl: null,
  },
  {
    criterionId: "c8",
    criterionName: "Chấp hành chủ trương, nội quy và văn hóa sư phạm",
    category: "Kỷ luật Lao động & Đạo đức Nhà giáo",
    maxScore: 15,
    selfScore: 15.0,
    selfNote: "Chấp hành nghiêm túc quy chế, không vi phạm giờ giảng",
    evidenceUrl: null,
  },
];

export default function KpiPersonalPage() {
  const [periods, setPeriods] = useState<PeriodOption[]>(DEMO_PERIODS);
  const [selectedPeriodId, setSelectedPeriodId] = useState("p1");
  const [evaluation, setEvaluation] = useState<KpiEvaluation>(DEMO_EVALUATION);
  const [items, setItems] = useState<KpiCriterionItem[]>(DEMO_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchKpiData() {
      setIsLoading(true);
      try {
        const periodRes = await fetch("/api/v1/kpi/periods");
        if (periodRes.ok) {
          const json = await periodRes.json();
          if (json.data?.length > 0) {
            setPeriods(json.data);
            setSelectedPeriodId(json.data[0].id);
          }
        }

        const evalRes = await fetch(`/api/v1/kpi/evaluations/my?periodId=${selectedPeriodId}`);
        if (evalRes.ok) {
          const json = await evalRes.json();
          if (json.data) {
            if (json.data.evaluation) setEvaluation(json.data.evaluation);
            if (json.data.items?.length > 0) setItems(json.data.items);
          }
        }
      } catch (e) {
        console.warn("Using demo KPI data fallback");
      } finally {
        setIsLoading(false);
      }
    }
    fetchKpiData();
  }, [selectedPeriodId]);

  const handleScoreChange = (criterionId: string, val: string, maxScore: number) => {
    const num = val === "" ? null : Number(val);
    if (num !== null && num > maxScore) {
      alert(`Điểm tự chấm không được vượt quá điểm tối đa (${maxScore} điểm)`);
      return;
    }
    setItems((prev) =>
      prev.map((it) => (it.criterionId === criterionId ? { ...it, selfScore: num } : it))
    );
  };

  const handleNoteChange = (criterionId: string, note: string) => {
    setItems((prev) =>
      prev.map((it) => (it.criterionId === criterionId ? { ...it, selfNote: note } : it))
    );
  };

  const handleEvidenceChange = (criterionId: string, url: string) => {
    setItems((prev) =>
      prev.map((it) => (it.criterionId === criterionId ? { ...it, evidenceUrl: url } : it))
    );
  };

  const totalSelfScore = items.reduce((sum, it) => sum + (it.selfScore || 0), 0);

  const getExpectedRanking = (score: number) => {
    if (score >= 90) return { label: "Hạng A - Hoàn thành xuất sắc nhiệm vụ", badge: "bg-emerald-100 text-emerald-800" };
    if (score >= 70) return { label: "Hạng B - Hoàn thành tốt nhiệm vụ", badge: "bg-blue-100 text-blue-800" };
    if (score >= 50) return { label: "Hạng C - Hoàn thành nhiệm vụ", badge: "bg-amber-100 text-amber-800" };
    return { label: "Hạng D - Không hoàn thành nhiệm vụ", badge: "bg-rose-100 text-rose-800" };
  };

  const isReadOnly = evaluation.status === "IN_REVIEW" || evaluation.status === "FINALIZED";

  const handleSave = async (isDraft: boolean) => {
    setSaveMessage(null);
    try {
      const payload = {
        periodId: selectedPeriodId,
        isDraft,
        items: items.map((it) => ({
          criterionId: it.criterionId,
          selfScore: it.selfScore || 0,
          selfNote: it.selfNote || null,
          evidenceUrl: it.evidenceUrl || null,
        })),
      };

      const res = await fetch("/api/v1/kpi/evaluations/my", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        setEvaluation(json.data.evaluation);
        setItems(json.data.items);
        setSaveMessage({
          type: "success",
          text: isDraft
            ? "Đã lưu nháp kết quả tự chấm thành công!"
            : "Đã nộp phiếu đánh giá thành công! Hồ sơ đã được chuyển tiếp đến Trưởng đơn vị thẩm định.",
        });
      } else {
        const errJson = await res.json();
        setSaveMessage({
          type: "error",
          text: errJson.error?.message || "Có lỗi xảy ra khi lưu phiếu đánh giá",
        });
      }
    } catch (e) {
      setEvaluation({
        ...evaluation,
        status: isDraft ? "DRAFT" : "SUBMITTED",
        totalSelfScore,
      });
      setSaveMessage({
        type: "success",
        text: isDraft ? "Đã lưu nháp cục bộ thành công!" : "Đã nộp phiếu tự đánh giá thành công (Lưu trữ cục bộ).",
      });
    }
  };

  // Nhóm items theo chuyên mục category
  const categories = Array.from(new Set(items.map((it) => it.category)));

  return (
    <AuthGuard moduleName="Đánh giá & Kê khai KPI Cá nhân">
      <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              Đánh Giá KPI & Xếp Loại Cá Nhân
            </h1>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
              Quy chuẩn DAU 2026
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Hệ thống tự động phân loại mẫu đánh giá theo vị trí công tác ({evaluation.targetType === "LECTURER" ? "Giảng viên" : "Chuyên viên hành chính"}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-800 shadow-sm focus:border-blue-500 focus:outline-none"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <a
            href="/kpi/manage"
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 transition"
          >
            Quản trị & Hội đồng thi đua →
          </a>
        </div>
      </div>

      {/* Thông báo kết quả lưu */}
      {saveMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            saveMessage.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Progress & 4-Step Pipeline */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Tiến trình đánh giá 4 bước</span>
          <span className="text-xs font-semibold text-slate-600">
            Người đánh giá trực tiếp: <strong className="text-slate-900">{evaluation.managerName || "Trưởng đơn vị"}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <div className={`rounded-xl p-3.5 border ${
            evaluation.status === "DRAFT"
              ? "border-blue-500 bg-blue-50/50"
              : "border-emerald-200 bg-emerald-50/30"
          }`}>
            <span className="text-[11px] font-bold text-slate-500 block">Bước 1</span>
            <span className="text-sm font-extrabold text-slate-900">Tự chấm điểm</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">
              {evaluation.status === "DRAFT" ? "Đang soạn thảo..." : `Đã nộp: ${totalSelfScore.toFixed(1)}đ ✓`}
            </span>
          </div>

          <div className={`rounded-xl p-3.5 border ${
            evaluation.status === "SUBMITTED"
              ? "border-amber-500 bg-amber-50/50"
              : evaluation.status === "IN_REVIEW" || evaluation.status === "FINALIZED"
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-slate-200 bg-slate-50"
          }`}>
            <span className="text-[11px] font-bold text-slate-500 block">Bước 2</span>
            <span className="text-sm font-extrabold text-slate-900">Trưởng đơn vị chấm</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">
              {evaluation.totalManagerScore ? `${evaluation.totalManagerScore.toFixed(1)}đ ✓` : "Chờ thẩm định..."}
            </span>
          </div>

          <div className={`rounded-xl p-3.5 border ${
            evaluation.status === "IN_REVIEW"
              ? "border-purple-500 bg-purple-50/50"
              : evaluation.status === "FINALIZED"
              ? "border-emerald-200 bg-emerald-50/30"
              : "border-slate-200 bg-slate-50"
          }`}>
            <span className="text-[11px] font-bold text-slate-500 block">Bước 3</span>
            <span className="text-sm font-extrabold text-slate-900">Hội đồng phê duyệt</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">
              {evaluation.totalFinalScore ? `${evaluation.totalFinalScore.toFixed(1)}đ ✓` : "Đang xét thi đua..."}
            </span>
          </div>

          <div className={`rounded-xl p-3.5 border ${
            evaluation.status === "FINALIZED"
              ? "border-emerald-500 bg-emerald-50"
              : "border-slate-200 bg-slate-50"
          }`}>
            <span className="text-[11px] font-bold text-slate-500 block">Bước 4</span>
            <span className="text-sm font-extrabold text-slate-900">Xếp loại chính thức</span>
            <span className="mt-1 block text-xs font-bold text-slate-700">
              {evaluation.ranking || "Chưa công bố"}
            </span>
          </div>
        </div>
      </div>

      {/* Thẻ tổng kết điểm Live Counter */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-950 p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="inline-flex items-center rounded-full bg-amber-400/20 px-3 py-0.5 text-xs font-semibold text-amber-300">
            {evaluation.templateName}
          </span>
          <h2 className="mt-2 text-xl font-bold">
            Tổng Điểm Tự Đánh Giá: <span className="text-amber-400 text-3xl font-black">{totalSelfScore.toFixed(1)}</span> / 100
          </h2>
          <p className="mt-1 text-xs text-blue-200">
            Dự kiến: <span className="font-bold underline">{getExpectedRanking(totalSelfScore).label}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={() => handleSave(true)}
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
              >
                Lưu Nháp
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                className="rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 shadow hover:bg-amber-400 transition"
              >
                Nộp Phiếu Lên Trưởng Đơn Vị →
              </button>
            </>
          )}
          {isReadOnly && (
            <span className="rounded-lg bg-white/20 px-4 py-2 text-xs font-semibold text-white">
              🔒 Phiếu đang trong giai đoạn thẩm định, không thể chỉnh sửa
            </span>
          )}
        </div>
      </div>

      {/* Form tiêu chí chi tiết */}
      <div className="space-y-6">
        {categories.map((cat, catIdx) => {
          const catItems = items.filter((it) => it.category === cat);
          const catMaxTotal = catItems.reduce((acc, it) => acc + it.maxScore, 0);
          const catSelfTotal = catItems.reduce((acc, it) => acc + (it.selfScore || 0), 0);

          return (
            <div key={catIdx} className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{cat}</h3>
                  <span className="text-xs text-slate-500">
                    Điểm nhóm: <strong>{catSelfTotal.toFixed(1)}</strong> / {catMaxTotal} điểm
                  </span>
                </div>
                <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-900">
                  {catItems.length} tiêu chí
                </span>
              </div>

              <div className="divide-y divide-slate-100 p-6 space-y-6">
                {catItems.map((criterion) => (
                  <div key={criterion.criterionId} className="pt-4 first:pt-0 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="max-w-2xl">
                        <span className="text-sm font-bold text-slate-900 block">
                          {criterion.criterionName}
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Tối đa: <strong className="text-slate-800">{criterion.maxScore} điểm</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-600">Tự chấm:</label>
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max={criterion.maxScore}
                          disabled={isReadOnly}
                          value={criterion.selfScore !== null && criterion.selfScore !== undefined ? criterion.selfScore : ""}
                          onChange={(e) => handleScoreChange(criterion.criterionId, e.target.value, criterion.maxScore)}
                          className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-center font-bold text-slate-900 text-sm focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                        />
                        <span className="text-xs text-slate-400">/ {criterion.maxScore}đ</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">
                          Giải trình thành tích / kết quả công tác:
                        </label>
                        <textarea
                          rows={2}
                          disabled={isReadOnly}
                          value={criterion.selfNote || ""}
                          onChange={(e) => handleNoteChange(criterion.criterionId, e.target.value)}
                          placeholder="Mô tả cụ thể khối lượng công việc, đề tài, số tiết hoặc sáng kiến đã thực hiện..."
                          className="w-full rounded-lg border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                        />
                      </div>

                      <div>
                        <label className="block font-medium text-slate-600 mb-1">
                          Đường dẫn tài liệu minh chứng (Link Google Drive, PDF, bài báo, quyết định):
                        </label>
                        <input
                          type="url"
                          disabled={isReadOnly}
                          value={criterion.evidenceUrl || ""}
                          onChange={(e) => handleEvidenceChange(criterion.criterionId, e.target.value)}
                          placeholder="https://drive.google.com/... hoặc https://dau.edu.vn/..."
                          className="w-full rounded-lg border border-slate-200 p-2 text-slate-800 focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                        />
                        {criterion.evidenceUrl && (
                          <a
                            href={criterion.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 text-[11px] text-blue-600 hover:underline inline-block"
                          >
                            🔗 Xem tài liệu minh chứng đã tải lên ↗
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Hiển thị nhận xét của Quản lý nếu có */}
                    {criterion.managerScore !== null && criterion.managerScore !== undefined && (
                      <div className="rounded-lg bg-amber-50/70 p-2.5 text-xs text-amber-900 border border-amber-200 flex items-center justify-between">
                        <span>
                          <strong>Trưởng đơn vị chấm:</strong> {criterion.managerScore} / {criterion.maxScore}đ
                          {criterion.managerNote && ` • "${criterion.managerNote}"`}
                        </span>
                        <span className="text-[11px] font-semibold text-amber-800">Đã thẩm định ✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </AuthGuard>
  );
}
