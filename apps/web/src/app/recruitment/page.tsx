"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Award,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  FileCheck,
  FileText,
  Filter,
  GraduationCap,
  Plus,
  Scale,
  Search,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { useAuth } from "../../context/AuthContext";
import type {
  RecruitmentCandidateDto,
  CreateCandidateApplicationInput,
  RecruitmentPositionTitle,
  RecruitmentDegree,
} from "@bahau/contracts";

const POSITION_OPENINGS: {
  positionKey: RecruitmentPositionTitle;
  title: string;
  department: string;
  quota: number;
  degreeReq: string;
  description: string;
  benefits: string[];
}[] = [
  {
    positionKey: "LECTURER_ARCHITECTURE",
    title: "Giảng viên Thiết kế Kiến trúc Công trình",
    department: "Khoa Kiến trúc",
    quota: 3,
    degreeReq: "Thạc sĩ / Tiến sĩ Kiến trúc (ưu tiên có đồ án thực tế đạt giải thưởng)",
    description: "Giảng dạy đồ án xưởng Studio Kiến trúc 1-5, hướng dẫn Đồ án tốt nghiệp KTS, tham gia NCKH và sáng tác kiến trúc.",
    benefits: [
      "Hưởng 85% bậc 1 (ThS) hoặc 100% bậc 2 (TS) theo NĐ 115/2020/NĐ-CP",
      "Giảm 50% định mức giờ giảng xưởng trong 12 tháng tập sự để bồi dưỡng sư phạm",
      "Được tài trợ tham gia các cuộc thi kiến trúc quốc gia & quốc tế",
    ],
  },
  {
    positionKey: "LECTURER_URBAN_PLANNING",
    title: "Giảng viên Quy hoạch Đô thị & Nông thôn",
    department: "Khoa Quy hoạch",
    quota: 2,
    degreeReq: "Thạc sĩ / Tiến sĩ Đô thị hoặc Quy hoạch vùng",
    description: "Giảng dạy đồ án xưởng Quy hoạch Đô thị, đồ án tái thiết đô thị sinh thái, chuyển giao công nghệ quy hoạch miền Trung.",
    benefits: [
      "Ký hợp đồng làm việc viên chức chính thức sau 12 tháng tập sự",
      "Tham gia trực tiếp các dự án quy hoạch thực tế của Viện Quy hoạch DAU",
      "Môi trường học thuật năng động, cơ sở vật chất xưởng đồ án hiện đại",
    ],
  },
  {
    positionKey: "LECTURER_CIVIL_ENG",
    title: "Giảng viên Kỹ thuật Công trình Xây dựng",
    department: "Khoa Xây dựng",
    quota: 2,
    degreeReq: "Thạc sĩ / Tiến sĩ Kỹ thuật Xây dựng / Kết cấu công trình",
    description: "Giảng dạy Kết cấu Bê tông cốt thép, Mô phỏng BIM, cơ học công trình và kiểm định an toàn kết cấu xây dựng.",
    benefits: [
      "Hưởng đầy đủ phụ cấp ưu đãi nghề nhà giáo 30% sau khi hoàn thành tập sự",
      "Thù lao vượt giờ giảng dạy và hỗ trợ công bố bài báo quốc tế WoS/Scopus",
      "Được bố trí phòng làm việc và phòng thí nghiệm kiểm định",
    ],
  },
  {
    positionKey: "LECTURER_INTERIOR_DESIGN",
    title: "Giảng viên Thiết kế Nội thất & Chiếu sáng",
    department: "Khoa Kiến trúc",
    quota: 1,
    degreeReq: "Thạc sĩ Thiết kế Nội thất / Kiến trúc",
    description: "Giảng dạy xưởng Đồ án Nội thất công cộng & nhà ở, vật liệu nội thất sinh thái và công nghệ chiếu sáng kiến trúc.",
    benefits: [
      "Chính sách đãi ngộ hấp dẫn theo Nghị định 85/2023/NĐ-CP",
      "Giảm 50% định mức giảng dạy năm đầu",
      "Phòng xưởng Studio thực nghiệm vật liệu trang bị đồng bộ",
    ],
  },
];

const SAMPLE_CANDIDATES: RecruitmentCandidateDto[] = [
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

const STATUS_BADGES: Record<string, { label: string; color: string }> = {
  SUBMITTED: { label: "Đã nộp hồ sơ", color: "bg-stone-100 text-stone-700 border-stone-300" },
  ROUND_1_REVIEW: { label: "Đang thẩm định V1", color: "bg-sky-50 text-sky-700 border-sky-300" },
  ROUND_1_PASSED: { label: "Đạt V1 (Vào Giảng thử)", color: "bg-blue-50 text-blue-700 border-blue-300" },
  ROUND_1_FAILED: { label: "Không đạt V1 (< 50đ)", color: "bg-rose-50 text-rose-700 border-rose-300" },
  ROUND_2_AUDITION: { label: "Vòng 2 Giảng thử Studio", color: "bg-amber-50 text-amber-700 border-amber-300" },
  PASSED: { label: "Trúng tuyển chính thức", color: "bg-purple-50 text-purple-700 border-purple-300" },
  FAILED: { label: "Không trúng tuyển V2", color: "bg-rose-50 text-rose-700 border-rose-300" },
  APPOINTED_PROBATION: { label: "Đã Bổ nhiệm Tập sự (PKI)", color: "bg-emerald-50 text-emerald-800 border-emerald-300" },
};

export default function RecruitmentPortalPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"openings" | "candidates">("openings");
  const [candidates, setCandidates] = useState<RecruitmentCandidateDto[]>(SAMPLE_CANDIDATES);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<RecruitmentPositionTitle>("LECTURER_ARCHITECTURE");
  const [selectedDept, setSelectedDept] = useState("Khoa Kiến trúc");

  // Form State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [birthYear, setBirthYear] = useState(1994);
  const [degree, setDegree] = useState<RecruitmentDegree>("MASTER");
  const [graduatedSchool, setGraduatedSchool] = useState("");
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [cvUrl, setCvUrl] = useState("");
  const [portfolioSummary, setPortfolioSummary] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadCandidates() {
      try {
        const res = await fetch("/api/v1/recruitment/candidates");
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.length > 0) {
            setCandidates(json.data);
          }
        }
      } catch (err) {
        console.warn("Using offline sample recruitment data", err);
      }
    }
    loadCandidates();
  }, []);

  const openApplyForPosition = (pos: typeof POSITION_OPENINGS[0]) => {
    setSelectedPosition(pos.positionKey);
    setSelectedDept(pos.department);
    setShowApplyModal(true);
  };

  const handleApplySubmit = async () => {
    if (!fullName.trim() || !email.trim() || !graduatedSchool.trim()) {
      setNotice({ type: "error", text: "Vui lòng điền đầy đủ họ tên, email và trường đào tạo." });
      return;
    }

    const payload: CreateCandidateApplicationInput = {
      fullName,
      email,
      phone: phone || "0900000000",
      birthYear,
      degree,
      graduatedSchool,
      applyingPosition: selectedPosition,
      targetDepartment: selectedDept,
      portfolioUrl: portfolioUrl || null,
      cvUrl: cvUrl || null,
      portfolioSummary: portfolioSummary || null,
    };

    try {
      const res = await fetch("/api/v1/recruitment/candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setCandidates([json.data, ...candidates]);
          setShowApplyModal(false);
          resetForm();
          setNotice({
            type: "success",
            text: `Nộp hồ sơ thành công! Mã hồ sơ của bạn là ${json.data.candidateCode}. Hội đồng sẽ thông báo lịch thẩm định e-Portfolio.`,
          });
          setActiveTab("candidates");
          return;
        }
      }
    } catch {
      // Fallback
    }

    // In-memory fallback
    const newCand: RecruitmentCandidateDto = {
      id: `cand-dau-${Date.now()}`,
      candidateCode: `TD2026-${Math.floor(100 + Math.random() * 900)}`,
      fullName,
      email,
      phone: phone || "0900000000",
      birthYear,
      degree,
      graduatedSchool,
      applyingPosition: selectedPosition,
      targetDepartment: selectedDept,
      portfolioUrl: portfolioUrl || null,
      cvUrl: cvUrl || null,
      portfolioSummary: portfolioSummary || null,
      status: "SUBMITTED",
      portfolioScore: null,
      auditionScore: null,
      appointmentResolutionNumber: null,
      probationSalaryCoeff: null,
      appointedEmployeeCode: null,
      pkiSignature: null,
      pkiSignedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setCandidates([newCand, ...candidates]);
    setShowApplyModal(false);
    resetForm();
    setNotice({
      type: "success",
      text: `Nộp hồ sơ thành công! Mã hồ sơ của bạn là ${newCand.candidateCode}.`,
    });
    setActiveTab("candidates");
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setGraduatedSchool("");
    setPortfolioUrl("");
    setCvUrl("");
    setPortfolioSummary("");
  };

  return (
    <AuthGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                <Scale size={12} />
                Nghị định 115/2020/NĐ-CP & NĐ 85/2023/NĐ-CP
              </span>
              <span className="text-xs text-stone-500">
                Tuyển dụng Viên chức & Thẩm định Giảng viên Studio
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-stone-900 font-serif">
              Cổng Tuyển Dụng Giảng Viên & Tiếp Nhận e-Portfolio Sáng Tác
            </h1>
            <p className="text-sm text-stone-600 mt-0.5">
              Quy trình tuyển chọn 2 vòng: Thẩm định e-Portfolio đồ án/công trình và Giảng thử Studio xưởng kiến trúc
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/recruitment/audition"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-stone-900 text-white hover:bg-stone-800 shadow-sm transition"
            >
              <Users size={16} />
              Hội đồng Thẩm định & Giảng thử Studio
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

        {/* Tab Controls */}
        <div className="flex border-b border-stone-200 gap-6 text-sm font-medium">
          <button
            onClick={() => setActiveTab("openings")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "openings"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            <Briefcase size={16} />
            Chỉ tiêu Tuyển dụng theo Khoa ({POSITION_OPENINGS.length})
          </button>
          <button
            onClick={() => setActiveTab("candidates")}
            className={`pb-3 border-b-2 transition flex items-center gap-2 ${
              activeTab === "candidates"
                ? "border-stone-900 text-stone-900 font-semibold"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            <Users size={16} />
            Hồ sơ Ứng viên Đã Tiếp nhận ({candidates.length})
          </button>
        </div>

        {/* TAB 1: VỊ TRÍ ĐANG TUYỂN DỤNG */}
        {activeTab === "openings" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {POSITION_OPENINGS.map((pos) => (
                <div
                  key={pos.positionKey}
                  className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-stone-300 transition"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200 mb-1">
                          {pos.department}
                        </span>
                        <h3 className="font-bold text-stone-900 text-base">{pos.title}</h3>
                      </div>
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                        Chỉ tiêu: {pos.quota} CBGV
                      </span>
                    </div>

                    <div className="text-xs text-stone-600 space-y-1">
                      <p>
                        <strong className="text-stone-800">Yêu cầu học vị:</strong> {pos.degreeReq}
                      </p>
                      <p className="text-stone-500">{pos.description}</p>
                    </div>

                    <div className="p-3 rounded-lg bg-stone-50 border border-stone-100 text-xs space-y-1.5">
                      <span className="font-semibold text-stone-700 block uppercase tracking-wider text-[10px]">
                        Chế độ & Đãi ngộ đặc thù DAU:
                      </span>
                      {pos.benefits.map((b, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-stone-600">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0 mt-0.5" />
                          <span>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100">
                    <button
                      onClick={() => openApplyForPosition(pos)}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800 transition shadow-xs"
                    >
                      <UserPlus size={14} />
                      Nộp Hồ Sơ Ứng Tuyển & e-Portfolio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: HỒ SƠ ỨNG VIÊN */}
        {activeTab === "candidates" && (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-medium border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">Mã / Ứng viên</th>
                    <th className="px-4 py-3">Vị trí & Khoa</th>
                    <th className="px-4 py-3">Học vị & Trường</th>
                    <th className="px-4 py-3 text-center">Vòng 1 (Portfolio)</th>
                    <th className="px-4 py-3 text-center">Vòng 2 (Studio)</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Tài liệu / QĐ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {candidates.map((cand) => {
                    const status = STATUS_BADGES[cand.status] || { label: cand.status, color: "bg-stone-100" };
                    return (
                      <tr key={cand.id} className="hover:bg-stone-50/60 transition">
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-stone-900">{cand.fullName}</div>
                          <div className="text-[11px] text-stone-400 font-mono">{cand.candidateCode}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-stone-800">{cand.targetDepartment}</div>
                          <div className="text-[11px] text-stone-500">{cand.applyingPosition}</div>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="font-medium text-stone-900">
                            {cand.degree === "DOCTOR" ? "Tiến sĩ (TS)" : "Thạc sĩ (ThS)"}
                          </div>
                          <div className="text-[11px] text-stone-500 truncate max-w-xs">{cand.graduatedSchool}</div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {cand.portfolioScore ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                cand.portfolioScore.isPassed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {cand.portfolioScore.totalScore}đ
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">Chưa chấm V1</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {cand.auditionScore ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                cand.auditionScore.isPassed
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {cand.auditionScore.totalScore}đ
                            </span>
                          ) : (
                            <span className="text-stone-400 text-[11px]">Chưa giảng thử</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-2">
                          {cand.portfolioUrl && (
                            <a
                              href={cand.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 rounded border border-stone-200 text-stone-600 hover:bg-stone-100 transition inline-flex items-center gap-1"
                            >
                              <ExternalLink size={12} />
                              Portfolio
                            </a>
                          )}
                          {cand.status === "APPOINTED_PROBATION" && (
                            <a
                              href={`/api/v1/recruitment/candidates/${cand.id}/resolution/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded bg-stone-900 text-white hover:bg-stone-800 transition inline-flex items-center gap-1"
                            >
                              <FileText size={12} />
                              QĐ Tuyển dụng (PDF)
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
        )}

        {/* Modal Nộp Hồ Sơ Ứng Tuyển */}
        {showApplyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="bg-white rounded-xl border border-stone-300 max-w-lg w-full p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">
                    Nộp Hồ Sơ Ứng Tuyển & e-Portfolio
                  </h3>
                  <p className="text-xs text-stone-500">
                    Vị trí: {selectedPosition} ({selectedDept})
                  </p>
                </div>
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="text-stone-400 hover:text-stone-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Họ và tên ứng viên:</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ví dụ: ThS.KTS. Nguyễn Văn Minh"
                    className="w-full p-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Email liên hệ:</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Số điện thoại:</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0905..."
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Học vị cao nhất:</label>
                    <select
                      value={degree}
                      onChange={(e) => setDegree(e.target.value as RecruitmentDegree)}
                      className="w-full p-2 rounded-lg border border-stone-300 bg-white"
                    >
                      <option value="MASTER">Thạc sĩ (Master)</option>
                      <option value="DOCTOR">Tiến sĩ (Doctor)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Năm sinh:</label>
                    <input
                      type="number"
                      value={birthYear}
                      onChange={(e) => setBirthYear(Number(e.target.value))}
                      className="w-full p-2 rounded-lg border border-stone-300"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">Cơ sở đào tạo tốt nghiệp:</label>
                  <input
                    type="text"
                    value={graduatedSchool}
                    onChange={(e) => setGraduatedSchool(e.target.value)}
                    placeholder="Ví dụ: Đại học Kiến trúc Hà Nội / ĐH Tokyo / ĐH Bách Khoa"
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Đường dẫn e-Portfolio đồ án / công trình (URL):
                  </label>
                  <input
                    type="text"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://issuu.com/... hoặc link Google Drive / Behance"
                    className="w-full p-2 rounded-lg border border-stone-300"
                  />
                </div>

                <div>
                  <label className="block text-stone-700 font-semibold mb-1">
                    Tóm tắt năng lực sáng tác & kinh nghiệm thực tế:
                  </label>
                  <textarea
                    rows={2}
                    value={portfolioSummary}
                    onChange={(e) => setPortfolioSummary(e.target.value)}
                    placeholder="Mô tả các công trình thiết kế đã chủ trì, giải thưởng, bài báo..."
                    className="w-full p-2 rounded-lg border border-stone-300 focus:outline-none focus:ring-1 focus:ring-stone-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-end gap-2">
                <button
                  onClick={() => setShowApplyModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Hủy
                </button>
                <button
                  onClick={handleApplySubmit}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-stone-900 text-white hover:bg-stone-800"
                >
                  Gửi Hồ Sơ Ứng Tuyển
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
