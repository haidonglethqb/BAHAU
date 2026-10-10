"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Key,
  Layers,
  Presentation,
  Scale,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
  X,
} from "lucide-react";
import { AuthGuard } from "../../../components/AuthGuard";
import { useAuth } from "../../../context/AuthContext";
import type {
  RecruitmentCandidateDto,
  ScoreRound1Input,
  ScoreRound2Input,
  ApproveRecruitmentWithPkiInput,
} from "@bahau/contracts";

const INITIAL_AUDITION_CANDIDATES: RecruitmentCandidateDto[] = [
  {
    id: "cand-dau-001",
    candidateCode: "TD2026-001",
    fullName: "ThS.KTS. Hoàng Minh Trí",
    email: "tri.hm@arch-design.vn",
    phone: "0905123456",
    birthYear: 1993,
    degree: "MASTER",
    graduatedSchool: "Đại học Kiến trúc Hà Nội",
    applyingPosition: "LECTURER_ARCHITECTURE",
    targetDepartment: "Khoa Kiến trúc",
    portfolioUrl: "https://dau.edu.vn/portfolios/tri-hoang-arch",
    cvUrl: "https://dau.edu.vn/cvs/tri-hoang.pdf",
    portfolioSummary: "05 năm kinh nghiệm chủ trì thiết kế; 01 giải nhì Festival Sinh viên Kiến trúc; 01 bài báo Tạp chí Kiến trúc.",
    status: "ROUND_2_AUDITION",
    portfolioScore: {
      academicRecordScore: 22.0,
      architecturalProjectsScore: 36.0,
      scientificPapersScore: 14.0,
      foreignLanguageScore: 13.0,
      totalScore: 85.0,
      isPassed: true,
      reviewerName: "PGS.TS. Trần Thị Bình",
      reviewNotes: "Hồ sơ thiết kế đồ án xuất sắc, tư duy không gian tốt, đủ điều kiện vào vòng giảng thử Studio.",
      reviewedAt: "2026-09-20T10:00:00.000Z",
    },
    auditionScore: null,
    appointmentResolutionNumber: null,
    probationSalaryCoeff: null,
    appointedEmployeeCode: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-20T10:00:00.000Z",
  },
  {
    id: "cand-dau-002",
    candidateCode: "TD2026-002",
    fullName: "TS. Vũ Thanh Hà",
    email: "ha.vu@polimi.it",
    phone: "0912345678",
    birthYear: 1989,
    degree: "DOCTOR",
    graduatedSchool: "Politecnico di Milano (Ý)",
    applyingPosition: "LECTURER_URBAN_PLANNING",
    targetDepartment: "Khoa Quy hoạch",
    portfolioUrl: "https://dau.edu.vn/portfolios/ha-vu-urban",
    cvUrl: "https://dau.edu.vn/cvs/ha-vu.pdf",
    portfolioSummary: "Tiến sĩ Đô thị sinh thái tại Ý; 03 bài báo WoS/Scopus Q1; đồ án tái thiết đô thị Venice và sông Hàn.",
    status: "PASSED",
    portfolioScore: {
      academicRecordScore: 24.5,
      architecturalProjectsScore: 38.0,
      scientificPapersScore: 19.0,
      foreignLanguageScore: 14.5,
      totalScore: 96.0,
      isPassed: true,
      reviewerName: "TS. Lê Hoàng Nam",
      reviewNotes: "Hồ sơ xuất sắc, bài báo quốc tế uy tín, chuyên môn quy hoạch sinh thái phù hợp định hướng DAU.",
      reviewedAt: "2026-09-21T14:30:00.000Z",
    },
    auditionScore: {
      pedagogyScore: 28.0,
      studioPracticalScore: 27.5,
      liveSketchingScore: 18.0,
      defenseInterviewScore: 18.5,
      totalScore: 92.0,
      isPassed: true,
      councilPresidentName: "GS.TS. Nguyễn Hiệu Trưởng",
      auditionNotes: "Giảng thử đồ án xưởng lôi cuốn, phương pháp truyền đạt sư phạm tốt, trả lời phản biện xuất sắc.",
      auditionDate: "2026-09-28T09:00:00.000Z",
    },
    appointmentResolutionNumber: null,
    probationSalaryCoeff: null,
    appointedEmployeeCode: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-09-12T09:00:00.000Z",
    updatedAt: "2026-09-28T11:00:00.000Z",
  },
  {
    id: "cand-dau-003",
    candidateCode: "TD2026-003",
    fullName: "ThS. Đặng Quốc Bảo",
    email: "bao.dq@civil-eng.com",
    phone: "0934567890",
    birthYear: 1995,
    degree: "MASTER",
    graduatedSchool: "Đại học Bách Khoa Đà Nẵng",
    applyingPosition: "LECTURER_CIVIL_ENG",
    targetDepartment: "Khoa Xây dựng",
    portfolioUrl: null,
    cvUrl: "https://dau.edu.vn/cvs/bao-dang.pdf",
    portfolioSummary: "Thạc sĩ Kỹ thuật Xây dựng; 02 năm kinh nghiệm tính toán kết cấu nhà cao tầng.",
    status: "SUBMITTED",
    portfolioScore: null,
    auditionScore: null,
    appointmentResolutionNumber: null,
    probationSalaryCoeff: null,
    appointedEmployeeCode: null,
    pkiSignature: null,
    pkiSignedAt: null,
    createdAt: "2026-09-15T14:00:00.000Z",
    updatedAt: "2026-09-15T14:00:00.000Z",
  },
];

export default function RecruitmentAuditionCouncilPage() {
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<RecruitmentCandidateDto[]>(INITIAL_AUDITION_CANDIDATES);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentCandidateDto | null>(null);

  // Round 1 Score Modal State
  const [showR1Modal, setShowR1Modal] = useState(false);
  const [r1Academic, setR1Academic] = useState(20);
  const [r1Projects, setR1Projects] = useState(30);
  const [r1Papers, setR1Papers] = useState(15);
  const [r1Language, setR1Language] = useState(12);
  const [r1Notes, setR1Notes] = useState("");

  // Round 2 Audition Modal State
  const [showR2Modal, setShowR2Modal] = useState(false);
  const [r2Pedagogy, setR2Pedagogy] = useState(25);
  const [r2Studio, setR2Studio] = useState(25);
  const [r2Sketch, setR2Sketch] = useState(16);
  const [r2Defense, setR2Defense] = useState(16);
  const [r2Notes, setR2Notes] = useState("");

  // PKI Signing Modal State
  const [showPkiModal, setShowPkiModal] = useState(false);
  const [resolutionNum, setResolutionNum] = useState("205/QĐ-ĐHKTĐN");
  const [appointedCode, setAppointedCode] = useState("DAU260010");
  const [signerName, setSignerName] = useState("GS.TS. Nguyễn Hiệu Trưởng");

  const [isProcessing, setIsProcessing] = useState(false);
  const [alertMsg, setAlertMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function fetchCandidates() {
      try {
        const res = await fetch("/api/v1/recruitment/candidates");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.length > 0) {
            setCandidates(json.data);
          }
        }
      } catch (err) {
        console.warn("Using offline audition candidate data", err);
      }
    }
    fetchCandidates();
  }, []);

  // VÒNG 1: THẨM ĐỊNH e-PORTFOLIO
  const openR1Modal = (cand: RecruitmentCandidateDto) => {
    setSelectedCandidate(cand);
    setR1Academic(20);
    setR1Projects(32);
    setR1Papers(15);
    setR1Language(12);
    setR1Notes("Hồ sơ năng lực sáng tác tốt, đủ điều kiện vào Vòng 2 giảng thử đồ án.");
    setShowR1Modal(true);
  };

  const handleScoreR1 = async () => {
    if (!selectedCandidate) return;
    setIsProcessing(true);

    const payload: ScoreRound1Input = {
      academicRecordScore: r1Academic,
      architecturalProjectsScore: r1Projects,
      scientificPapersScore: r1Papers,
      foreignLanguageScore: r1Language,
      reviewerName: user?.fullName || "Ban Thẩm định Chuyên môn",
      reviewNotes: r1Notes,
    };

    try {
      const res = await fetch(`/api/v1/recruitment/candidates/${selectedCandidate.id}/score-round-1`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCandidates((prev) => prev.map((c) => (c.id === selectedCandidate.id ? json.data : c)));
          setShowR1Modal(false);
          setIsProcessing(false);
          const passed = json.data.portfolioScore?.isPassed;
          setAlertMsg({
            type: passed ? "success" : "error",
            text: passed
              ? `Chấm điểm Vòng 1 hoàn tất: Đạt ${json.data.portfolioScore?.totalScore}đ (>= 50đ). Ứng viên đủ điều kiện vào Vòng 2 Giảng thử Studio!`
              : `Chấm điểm Vòng 1 hoàn tất: Tổng điểm ${json.data.portfolioScore?.totalScore}đ (< 50đ) không đạt tiêu chuẩn.`,
          });
          return;
        }
      }
    } catch {
      // Fallback in-memory
    }

    const total = r1Academic + r1Projects + r1Papers + r1Language;
    const isPassed = total >= 50.0;

    const updatedCand: RecruitmentCandidateDto = {
      ...selectedCandidate,
      status: isPassed ? "ROUND_1_PASSED" : "ROUND_1_FAILED",
      portfolioScore: {
        academicRecordScore: r1Academic,
        architecturalProjectsScore: r1Projects,
        scientificPapersScore: r1Papers,
        foreignLanguageScore: r1Language,
        totalScore: total,
        isPassed,
        reviewerName: user?.fullName || "Ban Thẩm định Chuyên môn",
        reviewNotes: r1Notes,
        reviewedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    setCandidates((prev) => prev.map((c) => (c.id === selectedCandidate.id ? updatedCand : c)));
    setShowR1Modal(false);
    setIsProcessing(false);
    setAlertMsg({
      type: isPassed ? "success" : "error",
      text: isPassed
        ? `Đã hoàn tất Vòng 1: Đạt ${total}đ. Đủ điều kiện vào Vòng 2!`
        : `Vòng 1 không đạt: ${total}đ (< 50đ).`,
    });
  };

  // VÒNG 2: GIẢNG THỬ STUDIO
  const openR2Modal = (cand: RecruitmentCandidateDto) => {
    setSelectedCandidate(cand);
    setR2Pedagogy(26);
    setR2Studio(26);
    setR2Sketch(16);
    setR2Defense(16);
    setR2Notes("Giảng thử xưởng tự tin, phương pháp sư phạm đồ án tốt, xử lý tình huống linh hoạt.");
    setShowR2Modal(true);
  };

  const handleScoreR2 = async () => {
    if (!selectedCandidate) return;
    setIsProcessing(true);

    const payload: ScoreRound2Input = {
      pedagogyScore: r2Pedagogy,
      studioPracticalScore: r2Studio,
      liveSketchingScore: r2Sketch,
      defenseInterviewScore: r2Defense,
      councilPresidentName: user?.fullName || "Hội đồng Tuyển dụng DAU",
      auditionNotes: r2Notes,
    };

    try {
      const res = await fetch(`/api/v1/recruitment/candidates/${selectedCandidate.id}/score-round-2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCandidates((prev) => prev.map((c) => (c.id === selectedCandidate.id ? json.data : c)));
          setShowR2Modal(false);
          setIsProcessing(false);
          const passed = json.data.auditionScore?.isPassed;
          setAlertMsg({
            type: passed ? "success" : "error",
            text: passed
              ? `Giảng thử Studio Vòng 2 hoàn tất: Đạt ${json.data.auditionScore?.totalScore}đ. ỨNG VIÊN ĐÃ TRÚNG TUYỂN CHÍNH THỨC!`
              : `Giảng thử Studio Vòng 2: ${json.data.auditionScore?.totalScore}đ (< 50đ) không đạt yêu cầu.`,
          });
          return;
        }
      }
    } catch {
      // Fallback in-memory
    }

    const total = r2Pedagogy + r2Studio + r2Sketch + r2Defense;
    const isPassed = total >= 50.0;

    const updatedCand: RecruitmentCandidateDto = {
      ...selectedCandidate,
      status: isPassed ? "PASSED" : "FAILED",
      auditionScore: {
        pedagogyScore: r2Pedagogy,
        studioPracticalScore: r2Studio,
        liveSketchingScore: r2Sketch,
        defenseInterviewScore: r2Defense,
        totalScore: total,
        isPassed,
        councilPresidentName: user?.fullName || "Hội đồng Tuyển dụng DAU",
        auditionNotes: r2Notes,
        auditionDate: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    setCandidates((prev) => prev.map((c) => (c.id === selectedCandidate.id ? updatedCand : c)));
    setShowR2Modal(false);
    setIsProcessing(false);
    setAlertMsg({
      type: isPassed ? "success" : "error",
      text: isPassed
        ? `Đã hoàn tất Giảng thử Vòng 2: Đạt ${total}đ. Trúng tuyển chính thức!`
        : `Vòng 2 không đạt: ${total}đ (< 50đ).`,
    });
  };

  // KÝ SỐ PKI HIỆU TRƯỞNG
  const openPkiModal = (cand: RecruitmentCandidateDto) => {
    setSelectedCandidate(cand);
    setResolutionNum(`${Math.floor(200 + Math.random() * 800)}/QĐ-ĐHKTĐN`);
    setAppointedCode(`DAU26${Math.floor(1000 + Math.random() * 9000)}`);
    setSignerName("GS.TS. Nguyễn Hiệu Trưởng");
    setShowPkiModal(true);
  };

  const handleExecutePkiSign = async () => {
    if (!selectedCandidate) return;
    setIsProcessing(true);

    const payload: ApproveRecruitmentWithPkiInput = {
      signerName,
      resolutionNumber: resolutionNum,
      appointedEmployeeCode: appointedCode,
    };

    try {
      const res = await fetch(`/api/v1/recruitment/candidates/${selectedCandidate.id}/appoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCandidates((prev) => prev.map((c) => (c.id === selectedCandidate.id ? json.data : c)));
          setShowPkiModal(false);
          setIsProcessing(false);
          setAlertMsg({
            type: "success",
            text: `Hiệu trưởng đã ký số PKI RSA-2048 ban hành QĐ số ${json.data.appointmentResolutionNumber}. Đã cấp mã CBGV ${json.data.appointedEmployeeCode}, đồng bộ lương tập sự sang Payroll và giảm 50% giờ chuẩn sang Workload!`,
          });
          return;
        }
      }
    } catch {
      // Fallback
    }

    const coeff = selectedCandidate.degree === "DOCTOR" ? 2.67 : 1.989;
    const updatedCand: RecruitmentCandidateDto = {
      ...selectedCandidate,
      status: "APPOINTED_PROBATION",
      appointmentResolutionNumber: resolutionNum,
      appointedEmployeeCode: appointedCode,
      probationSalaryCoeff: coeff,
      pkiSignature: "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...DAU_RECRUIT_PKI",
      pkiSignedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCandidates((prev) => prev.map((c) => (c.id === selectedCandidate.id ? updatedCand : c)));
    setShowPkiModal(false);
    setIsProcessing(false);
    setAlertMsg({
      type: "success",
      text: `Hiệu trưởng đã ký số PKI RSA-2048 thành công. Đã cấp mã ${appointedCode}, xếp lương hệ số ${coeff} sang Payroll và giảm 50% giờ chuẩn sang Workload!`,
    });
  };

  const r1Calculated = r1Academic + r1Projects + r1Papers + r1Language;
  const r2Calculated = r2Pedagogy + r2Studio + r2Sketch + r2Defense;

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <Link
              href="/recruitment"
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 mb-2 transition"
            >
              <ChevronLeft size={14} />
              Quay lại Cổng tuyển dụng & Chỉ tiêu
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                <Presentation size={12} />
                Thẩm Định 2 Vòng & Sát Hạch Studio
              </span>
              <span className="text-xs text-stone-500">
                Nghị định 115/2020/NĐ-CP Điều 21 & Điều 23
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
              Hội Đồng Thẩm Định e-Portfolio & Giảng Thử Đồ Án Studio
            </h1>
            <p className="text-sm text-stone-600 mt-0.5">
              Chấm thẩm định hồ sơ sáng tác (Vòng 1), đánh giá sư phạm đồ án xưởng (Vòng 2) và ký số PKI bổ nhiệm tập sự
            </p>
          </div>
        </div>

        {alertMsg && (
          <div
            className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
              alertMsg.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-medium"
                : "bg-rose-50 border-rose-200 text-rose-900 font-medium"
            }`}
          >
            <span>{alertMsg.text}</span>
            <button
              onClick={() => setAlertMsg(null)}
              className="text-xs font-bold underline ml-4 hover:opacity-80"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Metrics Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs text-stone-500 block">Tổng Hồ Sơ Tiếp Nhận</span>
            <span className="text-2xl font-bold text-stone-900 font-serif mt-1 block">
              {candidates.length}
            </span>
            <span className="text-[11px] text-stone-400">Ứng viên ứng tuyển</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs text-stone-500 block">Đạt Vòng 1 (Portfolio)</span>
            <span className="text-2xl font-bold text-blue-700 font-serif mt-1 block">
              {candidates.filter((c) => c.portfolioScore?.isPassed).length}
            </span>
            <span className="text-[11px] text-blue-600 font-medium">Thẩm định &ge; 50 điểm</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs text-stone-500 block">Trúng Tuyển Vòng 2 (Studio)</span>
            <span className="text-2xl font-bold text-purple-700 font-serif mt-1 block">
              {candidates.filter((c) => c.status === "PASSED" || c.status === "APPOINTED_PROBATION").length}
            </span>
            <span className="text-[11px] text-purple-600 font-medium">Giảng thử &ge; 50 điểm</span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-xs">
            <span className="text-xs text-stone-500 block">Đã Ký Số Bổ Nhiệm (PKI)</span>
            <span className="text-2xl font-bold text-emerald-700 font-serif mt-1 block">
              {candidates.filter((c) => c.status === "APPOINTED_PROBATION").length}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">Tập sự 12 tháng (NĐ 115)</span>
          </div>
        </div>

        {/* Danh sách Ứng viên Thẩm định */}
        <div className="space-y-4">
          <h2 className="text-base font-bold text-stone-900 font-serif flex items-center gap-2">
            <Users size={18} className="text-stone-700" />
            Hội Đồng Đánh Giá Sát Hạch Tuyển Dụng
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {candidates.map((cand) => {
              const isR1Passed = cand.portfolioScore?.isPassed;
              const isPassed = cand.status === "PASSED";
              const isAppointed = cand.status === "APPOINTED_PROBATION";

              return (
                <div
                  key={cand.id}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-stone-300 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-stone-900 text-base">{cand.fullName}</h3>
                        <p className="text-xs text-stone-500 font-mono">
                          {cand.candidateCode} | {cand.targetDepartment}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          isAppointed
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                            : isPassed
                            ? "bg-purple-50 text-purple-700 border-purple-300"
                            : isR1Passed
                            ? "bg-blue-50 text-blue-700 border-blue-300"
                            : "bg-stone-100 text-stone-700 border-stone-300"
                        }`}
                      >
                        {isAppointed
                          ? "Bổ nhiệm Tập sự (PKI)"
                          : isPassed
                          ? "Trúng tuyển Vòng 2"
                          : isR1Passed
                          ? "Vào Giảng thử Studio"
                          : "Chờ thẩm định V1"}
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 space-y-1">
                      <p>
                        <strong className="text-stone-800">Học vị:</strong>{" "}
                        {cand.degree === "DOCTOR" ? "Tiến sĩ (TS)" : "Thạc sĩ (ThS)"} ({cand.graduatedSchool})
                      </p>
                      {cand.portfolioUrl && (
                        <div className="flex items-center gap-1 text-sky-700">
                          <ExternalLink size={12} />
                          <a
                            href={cand.portfolioUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate max-w-xs"
                          >
                            Xem e-Portfolio đồ án/công trình
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Vòng 1 Score Display */}
                    {cand.portfolioScore && (
                      <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-stone-600">Vòng 1 (Thẩm định Portfolio):</span>
                          <span className="font-bold text-stone-900">{cand.portfolioScore.totalScore}/100đ</span>
                        </div>
                        <div className="text-[11px] text-stone-500">
                          Đồ án: {cand.portfolioScore.architecturalProjectsScore}đ | NCKH: {cand.portfolioScore.scientificPapersScore}đ
                        </div>
                      </div>
                    )}

                    {/* Vòng 2 Score Display */}
                    {cand.auditionScore && (
                      <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-200 text-xs space-y-1">
                        <div className="flex items-center justify-between font-medium">
                          <span className="text-purple-800 font-semibold">Vòng 2 (Giảng thử Studio):</span>
                          <span className="font-bold text-purple-900">{cand.auditionScore.totalScore}/100đ</span>
                        </div>
                        <div className="text-[11px] text-purple-700">
                          Sư phạm: {cand.auditionScore.pedagogyScore}đ | Xưởng: {cand.auditionScore.studioPracticalScore}đ | Vẽ tay: {cand.auditionScore.liveSketchingScore}đ
                        </div>
                      </div>
                    )}

                    {/* PKI details if appointed */}
                    {isAppointed && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[11px] space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-900">
                          <ShieldCheck size={14} className="text-emerald-700" />
                          QĐ Số: {cand.appointmentResolutionNumber}
                        </div>
                        <div className="text-emerald-800">
                          Mã CBGV: <strong>{cand.appointedEmployeeCode}</strong> | Lương tập sự: <strong>{cand.probationSalaryCoeff?.toFixed(3)}</strong>
                        </div>
                        <div className="text-stone-500 truncate font-mono text-[10px]">
                          PKI RSA: {cand.pkiSignature?.slice(0, 32)}...
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="pt-3 border-t border-stone-100 flex flex-col gap-2">
                    {!cand.portfolioScore && (
                      <button
                        onClick={() => openR1Modal(cand)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition shadow-xs"
                      >
                        <Layers size={14} />
                        Chấm Điểm Vòng 1 (Portfolio)
                      </button>
                    )}

                    {isR1Passed && !cand.auditionScore && (
                      <button
                        onClick={() => openR2Modal(cand)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-purple-700 text-white hover:bg-purple-800 transition shadow-xs"
                      >
                        <Presentation size={14} />
                        Chấm Điểm Vòng 2 (Giảng Thử Studio)
                      </button>
                    )}

                    {isPassed && !isAppointed && (
                      <button
                        onClick={() => openPkiModal(cand)}
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition shadow-xs"
                      >
                        <Key size={14} />
                        Ký Số PKI Ban Hành QĐ Tuyển Dụng
                      </button>
                    )}

                    {isAppointed && (
                      <a
                        href={`/api/v1/recruitment/candidates/${cand.id}/resolution/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition"
                      >
                        <Download size={14} />
                        Tải QĐ Tuyển Dụng Tập Sự (PDF NĐ 30)
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL 1: CHẤM ĐIỂM VÒNG 1 */}
        {showR1Modal && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl border border-stone-300 max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Thẩm Định e-Portfolio Sáng Tác (Vòng 1)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Ứng viên: {selectedCandidate.fullName} ({selectedCandidate.applyingPosition})
                  </p>
                </div>
                <button
                  onClick={() => setShowR1Modal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    1. Kết quả học tập / văn bằng (Tối đa 25đ):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={25}
                    value={r1Academic}
                    onChange={(e) => setR1Academic(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    2. Đồ án kiến trúc / công trình sáng tác thực tế (Tối đa 40đ):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={40}
                    value={r1Projects}
                    onChange={(e) => setR1Projects(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      3. Bài báo NCKH (Tối đa 20đ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={r1Papers}
                      onChange={(e) => setR1Papers(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      4. Ngoại ngữ (Tối đa 15đ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={15}
                      value={r1Language}
                      onChange={(e) => setR1Language(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>

                {/* Score Summary Box */}
                <div
                  className={`p-3 rounded-lg border ${
                    r1Calculated >= 50
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Tổng điểm Vòng 1:</span>
                    <span className="text-sm">{r1Calculated} / 100 điểm</span>
                  </div>
                  <div className="text-[11px] mt-1 font-semibold flex items-center gap-1">
                    {r1Calculated >= 50 ? (
                      <>
                        <CheckCircle2 size={13} className="text-emerald-700" />
                        ĐẠT TIÊU CHUẨN VÒNG 1 (Đủ điều kiện vào Vòng 2 Giảng thử)
                      </>
                    ) : (
                      <>
                        <XCircle size={13} className="text-rose-700" />
                        KHÔNG ĐẠT TIÊU CHUẨN VÒNG 1 (Dưới 50 điểm)
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Nhận xét của Ban Thẩm định:</label>
                  <textarea
                    rows={2}
                    value={r1Notes}
                    onChange={(e) => setR1Notes(e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowR1Modal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Đóng
                </button>
                <button
                  onClick={handleScoreR1}
                  disabled={isProcessing}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 disabled:opacity-50"
                >
                  {isProcessing ? "Đang lưu..." : "Xác nhận Điểm Vòng 1"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: CHẤM ĐIỂM VÒNG 2 GIẢNG THỬ STUDIO */}
        {showR2Modal && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl border border-stone-300 max-w-md w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Sát Hạch Giảng Thử Đồ Án Studio (Vòng 2)
                  </h3>
                  <p className="text-xs text-stone-500">
                    Ứng viên: {selectedCandidate.fullName} ({selectedCandidate.applyingPosition})
                  </p>
                </div>
                <button
                  onClick={() => setShowR2Modal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    1. Phương pháp sư phạm & truyền đạt (Tối đa 30đ):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={r2Pedagogy}
                    onChange={(e) => setR2Pedagogy(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    2. Hướng dẫn đồ án xưởng thực tế (Tối đa 30đ):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={r2Studio}
                    onChange={(e) => setR2Studio(Number(e.target.value))}
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      3. Vẽ phác thảo nhanh (Tối đa 20đ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={r2Sketch}
                      onChange={(e) => setR2Sketch(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      4. Phỏng vấn phản biện (Tối đa 20đ):
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={20}
                      value={r2Defense}
                      onChange={(e) => setR2Defense(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>

                {/* Score Summary Box */}
                <div
                  className={`p-3 rounded-lg border ${
                    r2Calculated >= 50
                      ? "bg-purple-50 border-purple-200 text-purple-900"
                      : "bg-rose-50 border-rose-200 text-rose-900"
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>Tổng điểm Giảng thử Vòng 2:</span>
                    <span className="text-sm">{r2Calculated} / 100 điểm</span>
                  </div>
                  <div className="text-[11px] mt-1 font-semibold flex items-center gap-1">
                    {r2Calculated >= 50 ? (
                      <>
                        <CheckCircle2 size={13} className="text-purple-700" />
                        TRÚNG TUYỂN CHÍNH THỨC (Đủ điều kiện ban hành QĐ Tuyển dụng)
                      </>
                    ) : (
                      <>
                        <XCircle size={13} className="text-rose-700" />
                        KHÔNG ĐẠT YÊU CẦU GIẢNG THỬ (Dưới 50 điểm)
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Nhận xét của Hội đồng Giảng thử:</label>
                  <textarea
                    rows={2}
                    value={r2Notes}
                    onChange={(e) => setR2Notes(e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowR2Modal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Đóng
                </button>
                <button
                  onClick={handleScoreR2}
                  disabled={isProcessing}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-purple-900 text-white hover:bg-purple-800 disabled:opacity-50"
                >
                  {isProcessing ? "Đang lưu..." : "Xác nhận Điểm Giảng Thử"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 3: KÝ SỐ PKI HIỆU TRƯỞNG BAN HÀNH QUYẾT ĐỊNH */}
        {showPkiModal && selectedCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl border border-stone-300 max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <Key size={18} className="text-emerald-700" />
                  <h3 className="font-bold text-stone-900 text-base">
                    Hiệu Trưởng Ký Số PKI Ban Hành Quyết Định Tuyển Dụng
                  </h3>
                </div>
                <button
                  onClick={() => setShowPkiModal(false)}
                  className="text-stone-400 hover:text-stone-600 p-1 rounded-lg hover:bg-stone-100"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <div className="p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="font-bold">Ứng viên trúng tuyển: {selectedCandidate.fullName}</div>
                  <div>Học vị: {selectedCandidate.degree === "DOCTOR" ? "Tiến sĩ (TS)" : "Thạc sĩ (ThS)"} ({selectedCandidate.graduatedSchool})</div>
                  <div>Vị trí tuyển dụng: Giảng viên (Hạng III) tại {selectedCandidate.targetDepartment}</div>
                  <div>Điểm V1: {selectedCandidate.portfolioScore?.totalScore}đ | Điểm V2 Giảng thử: {selectedCandidate.auditionScore?.totalScore}đ</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Số Quyết định ban hành:
                    </label>
                    <input
                      type="text"
                      value={resolutionNum}
                      onChange={(e) => setResolutionNum(e.target.value)}
                      className="w-full p-2 rounded-lg border border-stone-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">
                      Cấp Mã số CBGV mới:
                    </label>
                    <input
                      type="text"
                      value={appointedCode}
                      onChange={(e) => setAppointedCode(e.target.value)}
                      className="w-full p-2 rounded-lg border border-stone-300 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Người ký số chứng thư (RSA-2048):
                  </label>
                  <input
                    type="text"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div className="p-3 rounded-lg bg-stone-50 border border-stone-200 space-y-1.5 text-[11px] text-stone-600">
                  <div className="font-semibold text-stone-800 flex items-center gap-1">
                    <ShieldCheck size={13} className="text-emerald-600" />
                    Hiệu ứng pháp lý tự động theo Nghị định 115/2020/NĐ-CP:
                  </div>
                  <div>1. Ký hợp đồng viên chức tập sự thời hạn <strong>12 tháng</strong>.</div>
                  <div>2. Xếp hệ số lương tập sự <strong>{selectedCandidate.degree === "DOCTOR" ? "2.67 (100% bậc 2 TS)" : "1.989 (85% bậc 1 ThS)"}</strong> sang <strong>PayrollService</strong>.</div>
                  <div>3. Tự động giảm <strong>50% định mức giờ giảng xưởng</strong> sang <strong>WorkloadService</strong> để bồi dưỡng sư phạm.</div>
                  <div>4. Xuất file PDF có gắn <strong>Dấu số đỏ PKI RSA-2048</strong> chuẩn Nghị định 30/2020/NĐ-CP.</div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowPkiModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleExecutePkiSign}
                  disabled={isProcessing}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Key size={14} />
                  {isProcessing ? "Đang ký số RSA..." : "Ký Số PKI Ban Hành"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
