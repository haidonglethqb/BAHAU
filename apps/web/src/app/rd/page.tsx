"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Compass,
  FileText,
  Plus,
  Search,
  Users,
  Building2,
  Calendar,
  DollarSign,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileCheck,
  Percent,
  Sparkles,
  Layers,
  ChevronRight,
  Download,
  X,
} from "lucide-react";
import { AuthGuard } from "../../components/AuthGuard";
import { useAuth } from "../../context/AuthContext";
import type {
  RdProjectDto,
  CreateRdProjectInput,
  RdProjectType,
  RdProjectLevel,
  RdProjectStatus,
  RdTeamMemberRole,
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
      councilNotes: "Đề tài có giá trị ứng dụng cao, công bố 02 bài báo uy tín, phương án kiến trúc ven biển thích ứng bão lũ miền Trung xuất sắc.",
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

export default function RdProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<RdProjectDto[]>(INITIAL_PROJECTS);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedLevel, setSelectedLevel] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Project Form State
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState<RdProjectType>("ARCHITECTURAL_DESIGN");
  const [formLevel, setFormLevel] = useState<RdProjectLevel>("COMMERCIAL_CONTRACT");
  const [formContractValue, setFormContractValue] = useState<number>(250000000);
  const [formFeePercentage, setFormFeePercentage] = useState<number>(25);
  const [formStartDate, setFormStartDate] = useState("2026-10-15");
  const [formEndDate, setFormEndDate] = useState("2027-04-15");
  const [formDepartment, setFormDepartment] = useState("Khoa Kiến trúc");

  const [formLeadName, setFormLeadName] = useState("ThS. Nguyễn Văn An");
  const [formLeadCode, setFormLeadCode] = useState("DAU260003");
  const [formLeadRole, setFormLeadRole] = useState<RdTeamMemberRole>("LEAD_ARCHITECT");
  const [formLeadPct, setFormLeadPct] = useState(60);

  const [formMember2Name, setFormMember2Name] = useState("TS. Lê Hoàng Nam");
  const [formMember2Code, setFormMember2Code] = useState("DAU260002");
  const [formMember2Role, setFormMember2Role] = useState<RdTeamMemberRole>("DESIGN_MEMBER");
  const [formMember2Pct, setFormMember2Pct] = useState(40);

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
          }
        }
      } catch {
        // Fallback to initial seed
      }
    }
    fetchProjects();
  }, []);

  const formatVnd = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  // Metrics
  const totalProjects = projects.length;
  const totalValue = projects.reduce((sum, p) => sum + p.contractValue, 0);
  const totalSchoolFund = projects.reduce((sum, p) => sum + p.institutionalFeeAmount, 0);
  const totalRoyaltyFund = projects.reduce((sum, p) => sum + p.royaltyFundAmount, 0);

  // Filtered List
  const filteredProjects = projects.filter((p) => {
    if (selectedType !== "ALL" && p.projectType !== selectedType) return false;
    if (selectedLevel !== "ALL" && p.level !== selectedLevel) return false;
    if (selectedStatus !== "ALL" && p.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchCode = p.projectCode.toLowerCase().includes(q);
      const matchLead = p.principalInvestigatorName.toLowerCase().includes(q);
      if (!matchTitle && !matchCode && !matchLead) return false;
    }
    return true;
  });

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token") || "mock-token";

    const members = [
      {
        employeeId: `${formLeadCode}-ID`,
        employeeCode: formLeadCode,
        fullName: formLeadName,
        role: formLeadRole,
        royaltyPercentage: formLeadPct,
      },
    ];

    if (formMember2Name.trim()) {
      members.push({
        employeeId: `${formMember2Code}-ID`,
        employeeCode: formMember2Code,
        fullName: formMember2Name,
        role: formMember2Role,
        royaltyPercentage: formMember2Pct,
      });
    }

    const payload: CreateRdProjectInput = {
      title: formTitle,
      projectType: formType,
      level: formLevel,
      contractValue: Number(formContractValue),
      institutionalFeePercentage: Number(formFeePercentage),
      startDate: formStartDate,
      endDate: formEndDate,
      departmentName: formDepartment,
      members,
    };

    try {
      const res = await fetch("/api/v1/rd/projects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        setProjects([json.data, ...projects]);
        setIsCreateModalOpen(false);
      } else {
        // Fallback local append
        const feeAmount = Math.round((payload.contractValue * payload.institutionalFeePercentage) / 100);
        const royaltyAmount = payload.contractValue - feeAmount;
        const newProj: RdProjectDto = {
          id: `rd-dau-${Date.now().toString(36)}`,
          projectCode: `TVTK-DAU-2026-${String(projects.length + 1).padStart(3, "0")}`,
          title: payload.title,
          projectType: payload.projectType,
          level: payload.level,
          contractValue: payload.contractValue,
          institutionalFeePercentage: payload.institutionalFeePercentage,
          institutionalFeeAmount: feeAmount,
          royaltyFundAmount: royaltyAmount,
          startDate: payload.startDate,
          endDate: payload.endDate,
          status: "PROPOSAL_SUBMITTED",
          payoutStatus: "PENDING",
          principalInvestigatorId: members[0].employeeId,
          principalInvestigatorCode: members[0].employeeCode,
          principalInvestigatorName: members[0].fullName,
          departmentName: payload.departmentName,
          members: members.map((m) => ({
            ...m,
            allocatedAmount: Math.round((royaltyAmount * m.royaltyPercentage) / 100),
            convertedResearchHours: Math.round(m.royaltyPercentage * 2.5),
          })),
          councilReview: null,
          resolutionNumber: null,
          pkiSignature: null,
          pkiSignedAt: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setProjects([newProj, ...projects]);
        setIsCreateModalOpen(false);
      }
    } catch {
      setIsCreateModalOpen(false);
    }
  };

  const getStatusBadge = (status: RdProjectStatus) => {
    switch (status) {
      case "DRAFT":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-700">Dự thảo đề cương</span>;
      case "PROPOSAL_SUBMITTED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800">Chờ thẩm định đề cương</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Đang triển khai đồ án</span>;
      case "REVIEW_COUNCIL":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">Hội đồng nghiệm thu</span>;
      case "COMPLETED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 size={12} /> Đã nghiệm thu & Quyết toán</span>;
      case "TERMINATED":
        return <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-800">Không đạt / Dừng</span>;
    }
  };

  const getTypeBadge = (type: RdProjectType) => {
    switch (type) {
      case "ACADEMIC_RESEARCH":
        return <span className="px-2 py-0.5 text-xs rounded bg-sky-50 text-sky-700 border border-sky-200">Đề tài NCKH</span>;
      case "ARCHITECTURAL_DESIGN":
        return <span className="px-2 py-0.5 text-xs rounded bg-indigo-50 text-indigo-700 border border-indigo-200">Thiết kế Kiến trúc</span>;
      case "URBAN_PLANNING":
        return <span className="px-2 py-0.5 text-xs rounded bg-teal-50 text-teal-700 border border-teal-200">Quy hoạch Đô thị</span>;
    }
  };

  const getLevelBadge = (level: RdProjectLevel) => {
    switch (level) {
      case "MINISTERIAL":
        return <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">Cấp Bộ GD&ĐT</span>;
      case "PROVINCIAL":
        return <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">Cấp TP. Đà Nẵng</span>;
      case "INSTITUTIONAL":
        return <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">Cấp Cơ sở (DAU)</span>;
      case "COMMERCIAL_CONTRACT":
        return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">Hợp đồng Tư vấn</span>;
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
                <Compass size={14} />
                <span>Nghị định 109/2022/NĐ-CP & Nghị định 99/2014/NĐ-CP</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                Quản Lý Đề Tài NCKH & Dự Án Tư Vấn Thiết Kế
              </h1>
              <p className="text-sm text-slate-300 mt-2 max-w-2xl leading-relaxed">
                Động cơ tính toán phân bổ Nhuận bút Tác giả Kiến trúc & Thù lao NCKH, tích hợp liên thông 3 phân hệ:
                <strong className="text-indigo-300"> Chi trả Lương tháng (Payroll)</strong>,
                <strong className="text-emerald-300"> Quy đổi giờ chuẩn (Workload)</strong> và
                <strong className="text-sky-300"> Tích lũy điểm KPI Trụ cột II</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95"
              >
                <Plus size={16} />
                <span>Đăng ký Đề cương / Hợp đồng</span>
              </button>

              <Link
                href="/rd/royalty"
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-semibold rounded-xl flex items-center gap-2 transition-all"
              >
                <Award size={16} className="text-amber-300" />
                <span>Hội đồng & Quyết toán Nhuận bút</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Tổng Đề tài & Dự án</span>
              <p className="text-2xl font-bold text-white mt-1">{totalProjects}</p>
              <span className="text-[11px] text-indigo-400">Đang triển khai & nghiệm thu</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Tổng Giá trị Hợp đồng KH&CN</span>
              <p className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">{formatVnd(totalValue)}</p>
              <span className="text-[11px] text-slate-400">100% nguồn thu chuyển giao</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Trích nộp Quỹ Trường DAU (20-30%)</span>
              <p className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">{formatVnd(totalSchoolFund)}</p>
              <span className="text-[11px] text-slate-400">Tái đầu tư Studio & CSVC</span>
            </div>

            <div className="bg-white/5 rounded-xl p-3.5 border border-white/5">
              <span className="text-xs text-slate-400 font-medium">Quỹ Nhuận bút Tác giả & Kỹ sư</span>
              <p className="text-xl sm:text-2xl font-bold text-sky-400 mt-1">{formatVnd(totalRoyaltyFund)}</p>
              <span className="text-[11px] text-slate-400">Chi trả trực tiếp qua Payroll</span>
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
                placeholder="Tìm tên đề tài, mã số, chủ nhiệm / chủ trì..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả loại hình</option>
                <option value="ACADEMIC_RESEARCH">Đề tài NCKH</option>
                <option value="ARCHITECTURAL_DESIGN">Thiết kế Kiến trúc</option>
                <option value="URBAN_PLANNING">Quy hoạch Đô thị</option>
              </select>

              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả cấp quản lý</option>
                <option value="MINISTERIAL">Cấp Bộ GD&ĐT</option>
                <option value="PROVINCIAL">Cấp TP. Đà Nẵng</option>
                <option value="INSTITUTIONAL">Cấp Trường DAU</option>
                <option value="COMMERCIAL_CONTRACT">Hợp đồng Doanh nghiệp</option>
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PROPOSAL_SUBMITTED">Chờ duyệt đề cương</option>
                <option value="IN_PROGRESS">Đang thực hiện</option>
                <option value="REVIEW_COUNCIL">Hội đồng nghiệm thu</option>
                <option value="COMPLETED">Đã hoàn thành</option>
              </select>
            </div>
          </div>
        </div>

        {/* Project List */}
        <div className="grid grid-cols-1 gap-5">
          {filteredProjects.map((project) => {
            const schoolFeePct = project.institutionalFeePercentage;
            const authorPct = 100 - schoolFeePct;

            return (
              <div
                key={project.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 relative overflow-hidden"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                  {/* Left Column: Info */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-slate-800 rounded-md">
                        {project.projectCode}
                      </span>
                      {getTypeBadge(project.projectType)}
                      {getLevelBadge(project.level)}
                      {getStatusBadge(project.status)}
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 leading-snug hover:text-indigo-600 transition-colors">
                      {project.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-slate-400" />
                        <span>Chủ nhiệm / Chủ trì: <strong className="text-slate-800">{project.principalInvestigatorName}</strong> ({project.principalInvestigatorCode})</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Building2 size={14} className="text-slate-400" />
                        <span>{project.departmentName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-slate-400" />
                        <span>{project.startDate} ~ {project.endDate}</span>
                      </div>
                    </div>

                    {/* Team Members List */}
                    <div className="pt-2">
                      <span className="text-xs font-semibold text-slate-500 block mb-1.5">Thành viên tham gia & Tỷ lệ nhuận bút:</span>
                      <div className="flex flex-wrap gap-2">
                        {project.members.map((m, idx) => (
                          <div
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                          >
                            <span className="font-medium text-slate-800">{m.fullName}</span>
                            <span className="text-[10px] text-slate-500">({m.role})</span>
                            <span className="font-bold text-indigo-600 ml-1">{m.royaltyPercentage}%</span>
                            <span className="text-[10px] text-emerald-600 font-medium">({m.convertedResearchHours}h NCKH)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Financial Card & Actions */}
                  <div className="lg:w-80 flex flex-col justify-between bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                    <div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Tổng kinh phí hợp đồng:</span>
                        <strong className="text-sm font-bold text-slate-900">{formatVnd(project.contractValue)}</strong>
                      </div>

                      {/* Financial Structure Bar */}
                      <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden flex my-2">
                        <div
                          style={{ width: `${schoolFeePct}%` }}
                          className="bg-amber-500 h-full"
                          title={`Quỹ trường: ${schoolFeePct}%`}
                        />
                        <div
                          style={{ width: `${authorPct}%` }}
                          className="bg-indigo-600 h-full"
                          title={`Nhuận bút tác giả: ${authorPct}%`}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-500" /> Quỹ DAU ({schoolFeePct}%): {formatVnd(project.institutionalFeeAmount)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-indigo-700">
                          <span className="w-2 h-2 rounded-full bg-indigo-600" /> Nhuận bút ({authorPct}%): {formatVnd(project.royaltyFundAmount)}
                        </span>
                      </div>
                    </div>

                    {/* Council review summary */}
                    {project.councilReview && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-2.5 text-xs text-purple-900 space-y-1">
                        <div className="flex items-center justify-between font-semibold">
                          <span>Hội đồng nghiệm thu:</span>
                          <span className="px-1.5 py-0.5 bg-purple-200 text-purple-800 rounded font-mono font-bold">
                            {project.councilReview.score} / 100đ
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-700 line-clamp-2 italic">
                          "{project.councilReview.councilNotes}"
                        </p>
                      </div>
                    )}

                    {/* Resolution signed info */}
                    {project.resolutionNumber && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-xs text-emerald-900 flex items-center gap-2">
                        <ShieldCheck size={16} className="text-emerald-600 flex-shrink-0" />
                        <div className="text-[11px]">
                          <span className="font-semibold block">{project.resolutionNumber}</span>
                          <span className="text-emerald-700">Ký số PKI RSA-2048 • Đã thanh toán lương</span>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                      <Link
                        href={`/rd/royalty?id=${project.id}`}
                        className="flex-1 text-center px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                      >
                        {project.status === "COMPLETED" ? "Xem Quyết toán Nhuận bút" : "Hội đồng & Phân bổ Nhuận bút"}
                      </Link>

                      {project.status === "COMPLETED" && (
                        <a
                          href={`/api/v1/rd/projects/${project.id}/resolution/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors"
                          title="Tải Quyết định Nghiệm thu PDF"
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

          {filteredProjects.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 text-slate-500">
              <Compass size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-base font-semibold text-slate-700">Không tìm thấy đề tài / dự án phù hợp</p>
              <p className="text-xs text-slate-500 mt-1">Vui lòng điều chỉnh lại từ khóa tìm kiếm hoặc bộ lọc.</p>
            </div>
          )}
        </div>

        {/* Modal: Đăng ký Đề cương / Hợp đồng mới */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Plus size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Đăng Ký Đề Tài NCKH / Dự Án Tư Vấn Mới</h2>
                    <p className="text-xs text-slate-500">Chuẩn quy chế tài chính Nghị định 109/2022/NĐ-CP & TT 03/2023/TT-BGDĐT</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateProject} className="space-y-4 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tên đề tài NCKH / Dự án Tư vấn Thiết kế *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Tư vấn thiết kế cảnh quan Quảng trường trung tâm..."
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Loại hình công trình</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as RdProjectType)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="ARCHITECTURAL_DESIGN">Thiết kế Kiến trúc thực tế</option>
                      <option value="ACADEMIC_RESEARCH">Đề tài NCKH Học thuật</option>
                      <option value="URBAN_PLANNING">Tư vấn Quy hoạch Đô thị</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Cấp quản lý / Nguồn kinh phí</label>
                    <select
                      value={formLevel}
                      onChange={(e) => setFormLevel(e.target.value as RdProjectLevel)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="COMMERCIAL_CONTRACT">Hợp đồng Dịch vụ KH&CN với Doanh nghiệp</option>
                      <option value="INSTITUTIONAL">Cấp Cơ sở / Trường ĐH Kiến trúc Đà Nẵng</option>
                      <option value="PROVINCIAL">Cấp Tỉnh / TP. Đà Nẵng</option>
                      <option value="MINISTERIAL">Cấp Bộ GD&ĐT / Bộ Xây dựng</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tổng kinh phí / Giá trị Hợp đồng (VNĐ) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1000000}
                      step={1000000}
                      value={formContractValue}
                      onChange={(e) => setFormContractValue(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Tỷ lệ trích nộp Quỹ trường DAU (%)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={50}
                      value={formFeePercentage}
                      onChange={(e) => setFormFeePercentage(Number(e.target.value))}
                      className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Quỹ Nhuận bút Tác giả chi trả: <strong>{100 - formFeePercentage}%</strong> = {formatVnd(Math.round(formContractValue * ((100 - formFeePercentage) / 100)))}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => setFormEndDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Đơn vị chủ trì</label>
                    <select
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="Khoa Kiến trúc">Khoa Kiến trúc</option>
                      <option value="Khoa Xây dựng">Khoa Xây dựng</option>
                      <option value="Khoa Quy hoạch">Khoa Quy hoạch</option>
                      <option value="Viện Quy hoạch & Tư vấn DAU">Viện Quy hoạch & Tư vấn DAU</option>
                    </select>
                  </div>
                </div>

                {/* Team members */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Phân bổ Thành viên Nhóm Đồ án
                  </h4>

                  {/* Lead Member */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Tên Chủ trì / Chủ nhiệm"
                      value={formLeadName}
                      onChange={(e) => setFormLeadName(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Mã CBGV"
                      value={formLeadCode}
                      onChange={(e) => setFormLeadCode(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                    <select
                      value={formLeadRole}
                      onChange={(e) => setFormLeadRole(e.target.value as RdTeamMemberRole)}
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="LEAD_ARCHITECT">Chủ trì Thiết kế</option>
                      <option value="PRINCIPAL_INVESTIGATOR">Chủ nhiệm Đề tài</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formLeadPct}
                        onChange={(e) => setFormLeadPct(Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <span>%</span>
                    </div>
                  </div>

                  {/* Member 2 */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
                    <input
                      type="text"
                      placeholder="Tên Thành viên 2"
                      value={formMember2Name}
                      onChange={(e) => setFormMember2Name(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Mã CBGV"
                      value={formMember2Code}
                      onChange={(e) => setFormMember2Code(e.target.value)}
                      className="px-2.5 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                    <select
                      value={formMember2Role}
                      onChange={(e) => setFormMember2Role(e.target.value as RdTeamMemberRole)}
                      className="px-2 py-1.5 border border-slate-300 rounded bg-white"
                    >
                      <option value="DESIGN_MEMBER">Thành viên Thiết kế</option>
                      <option value="RESEARCH_MEMBER">Thành viên Nghiên cứu</option>
                      <option value="TECHNICAL_EXPERT">Chuyên gia Kỹ thuật</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={formMember2Pct}
                        onChange={(e) => setFormMember2Pct(Number(e.target.value))}
                        className="w-16 px-2 py-1.5 border border-slate-300 rounded bg-white"
                      />
                      <span>%</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Tổng tỷ lệ phân bổ: <strong className={formLeadPct + formMember2Pct <= 100 ? "text-emerald-600" : "text-rose-600"}>{formLeadPct + formMember2Pct}%</strong> (Tối đa 100%)
                  </p>
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
