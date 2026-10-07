import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import fs from "node:fs";
import { prisma } from "@bahau/database";
import { AppError } from "../middlewares/error.middleware.js";
import { WorkloadService } from "./workload.service.js";
import { PkiService } from "./pki.service.js";
import type {
  PayslipDto,
  PayrollPeriodSummaryDto,
  PayrollPeriodDetailDto,
} from "@bahau/contracts";

const BASE_SALARY_RATE = 2340000; // Mức lương cơ sở hiện hành 2.340.000 VNĐ từ 01/07/2024 theo NĐ 73/2024/NĐ-CP
const BASE_KPI_FUND_PER_CAPITA = 4000000; // Định mức quỹ thu nhập tăng thêm theo KPI / người / tháng

export interface FacultyMemberRecord {
  id: string;
  employeeId: string;
  employeeCode: string;
  fullName: string;
  employeeName: string;
  departmentName: string;
  academicTitle: string;
  positionName: string;
  positionCode: string;
  salaryCoefficient: number;
  hireYear: number;
  kpiRanking: "A" | "B" | "C" | "D";
  dependentCount: number;
  standardWorkDays: number;
  actualWorkDays: number;
  unpaidLeaveDays: number;
  overtimeTeachingHours: number;
}

export const DEFAULT_FACULTY_MEMBERS: FacultyMemberRecord[] = [
  {
    id: "DAU260001-ID",
    employeeId: "DAU260001-ID",
    employeeCode: "DAU260001",
    fullName: "PGS.TS. Trần Thị Bình",
    employeeName: "PGS.TS. Trần Thị Bình",
    departmentName: "Khoa Kiến trúc",
    academicTitle: "ASSOCIATE_PROFESSOR",
    positionName: "Trưởng khoa",
    positionCode: "TRUONG_KHOA",
    salaryCoefficient: 6.78,
    hireYear: 2014,
    kpiRanking: "A",
    dependentCount: 1,
    standardWorkDays: 22,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    overtimeTeachingHours: 12.0,
  },
  {
    id: "DAU260003-ID",
    employeeId: "DAU260003-ID",
    employeeCode: "DAU260003",
    fullName: "ThS. Nguyễn Văn An",
    employeeName: "ThS. Nguyễn Văn An",
    departmentName: "Khoa Kiến trúc",
    academicTitle: "MASTER",
    positionName: "Giảng viên",
    positionCode: "GIANG_VIEN",
    salaryCoefficient: 4.98,
    hireYear: 2020,
    kpiRanking: "A" as const,
    dependentCount: 0,
    standardWorkDays: 22,
    actualWorkDays: 21,
    unpaidLeaveDays: 1,
    overtimeTeachingHours: 7.5,
  },
  {
    id: "DAU260002-ID",
    employeeId: "DAU260002-ID",
    employeeCode: "DAU260002",
    fullName: "TS. Lê Hoàng Nam",
    employeeName: "TS. Lê Hoàng Nam",
    departmentName: "Khoa Xây dựng",
    academicTitle: "DOCTOR",
    positionName: "Phó Trưởng khoa",
    positionCode: "PHO_TRUONG_KHOA",
    salaryCoefficient: 5.64,
    hireYear: 2017,
    kpiRanking: "B" as const,
    dependentCount: 2,
    standardWorkDays: 22,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    overtimeTeachingHours: 5.0,
  },
  {
    id: "DAU260004-ID",
    employeeId: "DAU260004-ID",
    employeeCode: "DAU260004",
    fullName: "ThS. Phạm Thị Mai",
    employeeName: "ThS. Phạm Thị Mai",
    departmentName: "Khoa Quy hoạch",
    academicTitle: "MASTER",
    positionName: "Giảng viên",
    positionCode: "GIANG_VIEN",
    salaryCoefficient: 4.32,
    hireYear: 2022,
    kpiRanking: "B" as const,
    dependentCount: 0,
    standardWorkDays: 22,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    overtimeTeachingHours: 0.0,
  },
  {
    id: "DAU260005-ID",
    employeeId: "DAU260005-ID",
    employeeCode: "DAU260005",
    fullName: "GS.TS. Nguyễn Hiệu Trưởng",
    employeeName: "GS.TS. Nguyễn Hiệu Trưởng",
    departmentName: "Ban Giám hiệu",
    academicTitle: "PROFESSOR",
    positionName: "Hiệu trưởng",
    positionCode: "HIEU_TRUONG",
    salaryCoefficient: 8.0,
    hireYear: 2008,
    kpiRanking: "A" as const,
    dependentCount: 1,
    standardWorkDays: 22,
    actualWorkDays: 22,
    unpaidLeaveDays: 0,
    overtimeTeachingHours: 15.0,
  },
];

export class PayrollService {
  // Kho lưu trữ các kỳ lương đã tính toán trong bộ nhớ
  private static periodsStore = new Map<string, PayrollPeriodDetailDto>();

  /**
   * Cập nhật xếp loại KPI của cán bộ từ phân hệ KPI & Thi đua
   */
  public static updateFacultyKpiRanking(
    employeeIdOrCode: string,
    ranking: "A" | "B" | "C" | "D"
  ): void {
    const member = DEFAULT_FACULTY_MEMBERS.find(
      (m) =>
        m.employeeId === employeeIdOrCode ||
        m.employeeCode === employeeIdOrCode ||
        m.id === employeeIdOrCode
    );
    if (member) {
      member.kpiRanking = ranking;
    }
  }

  /**
   * Tính toán thuế TNCN theo biểu thuế lũy tiến từng phần 7 bậc (Thông tư 111/2013/TT-BTC)
   */
  public static calculatePit(taxableIncome: number): number {
    if (taxableIncome <= 0) return 0;
    if (taxableIncome <= 5000000) {
      return Math.round(taxableIncome * 0.05);
    } else if (taxableIncome <= 10000000) {
      return Math.round(250000 + (taxableIncome - 5000000) * 0.1);
    } else if (taxableIncome <= 18000000) {
      return Math.round(750000 + (taxableIncome - 10000000) * 0.15);
    } else if (taxableIncome <= 32000000) {
      return Math.round(1950000 + (taxableIncome - 18000000) * 0.2);
    } else if (taxableIncome <= 52000000) {
      return Math.round(4750000 + (taxableIncome - 32000000) * 0.25);
    } else if (taxableIncome <= 80000000) {
      return Math.round(9750000 + (taxableIncome - 52000000) * 0.3);
    } else {
      return Math.round(18150000 + (taxableIncome - 80000000) * 0.35);
    }
  }

  /**
   * Hàm lõi tính toán chi tiết phiếu lương 2 thành phần cho 1 cán bộ
   */
  public static computeSinglePayslip(params: {
    employeeId: string;
    employeeName: string;
    employeeCode: string;
    departmentName: string;
    academicTitle?: string;
    positionName?: string;
    positionCode?: string;
    month: number;
    year: number;
    salaryCoefficient: number;
    hireYear: number;
    kpiRanking: "A" | "B" | "C" | "D";
    dependentCount: number;
    standardWorkDays?: number;
    actualWorkDays?: number;
    unpaidLeaveDays?: number;
    overtimeTeachingHours?: number;
  }): PayslipDto {
    const {
      employeeId,
      employeeName,
      employeeCode,
      departmentName,
      academicTitle,
      positionName,
      positionCode,
      month,
      year,
      salaryCoefficient,
      hireYear,
      kpiRanking,
      dependentCount,
      standardWorkDays = 22,
      actualWorkDays = 22,
      unpaidLeaveDays = 0,
      overtimeTeachingHours = 0,
    } = params;

    // 1. Thành phần Cố định: Lương ngạch bậc
    const baseSalary = Math.round(salaryCoefficient * BASE_SALARY_RATE);

    // 2. Phụ cấp chức vụ lãnh đạo
    let leadershipCoefficient = 0;
    if (positionCode === "HIEU_TRUONG") leadershipCoefficient = 1.0;
    else if (positionCode === "PHO_HIEU_TRUONG") leadershipCoefficient = 0.8;
    else if (positionCode === "TRUONG_KHOA") leadershipCoefficient = 0.6;
    else if (positionCode === "PHO_TRUONG_KHOA" || positionCode === "TRUONG_BO_MON") leadershipCoefficient = 0.4;
    else if (positionCode === "PHO_TRUONG_BO_MON") leadershipCoefficient = 0.25;

    const leadershipAllowance = Math.round(leadershipCoefficient * BASE_SALARY_RATE);

    // 3. Phụ cấp thâm niên nhà giáo (>= 5 năm: mỗi năm 1%)
    const seniorityYears = Math.max(0, year - hireYear);
    const seniorityRate = seniorityYears >= 5 ? seniorityYears / 100 : 0;
    const seniorityAllowance = Math.round(baseSalary * seniorityRate);

    // 4. Phụ cấp ưu đãi nhà giáo (30% lương ngạch bậc + phụ cấp chức vụ)
    const pedagogicalAllowance = Math.round((baseSalary + leadershipAllowance) * 0.3);

    // 5. Khấu trừ ngày nghỉ không phép / nghỉ không lương theo Bảng công
    const workDaysDeduction = unpaidLeaveDays > 0
      ? Math.round((baseSalary / standardWorkDays) * unpaidLeaveDays)
      : 0;

    // 6. Thu nhập tăng thêm theo KPI tháng
    const kpiBonusMap: Record<string, number> = { A: 1.3, B: 1.0, C: 0.7, D: 0.0 };
    const kpiBonusCoefficient = kpiBonusMap[kpiRanking] ?? 1.0;
    const kpiExtraIncome = Math.round(BASE_KPI_FUND_PER_CAPITA * kpiBonusCoefficient);

    // 7. Thù lao vượt giờ giảng dạy / Đồ án Studio Kiến trúc
    const isSeniorOrProf =
      academicTitle === "PROFESSOR" ||
      academicTitle === "ASSOCIATE_PROFESSOR" ||
      positionCode === "GIANG_VIEN_CHINH";
    const hourlyRate = isSeniorOrProf ? 200000 : 160000;
    const overtimeTeachingPay = Math.round(overtimeTeachingHours * hourlyRate);

    // 8. Tổng thu nhập trước thuế & bảo hiểm (Gross Income)
    const grossIncome =
      Math.max(0, baseSalary - workDaysDeduction) +
      leadershipAllowance +
      seniorityAllowance +
      pedagogicalAllowance +
      kpiExtraIncome +
      overtimeTeachingPay;

    // 9. Khấu trừ bảo hiểm pháp định (10.5%: BHXH 8%, BHYT 1.5%, BHTN 1%)
    const insurableBase = baseSalary + leadershipAllowance + seniorityAllowance;
    const socialInsurance = Math.round(insurableBase * 0.08);
    const healthInsurance = Math.round(insurableBase * 0.015);
    const unemploymentInsurance = Math.round(baseSalary * 0.01);
    const totalInsurance = socialInsurance + healthInsurance + unemploymentInsurance;

    // 10. Giảm trừ gia cảnh & Thuế TNCN lũy tiến 7 bậc
    const personalDeduction = 11000000;
    const dependentDeduction = dependentCount * 4400000;
    const taxableIncome = Math.max(
      0,
      grossIncome - totalInsurance - personalDeduction - dependentDeduction
    );
    const personalIncomeTax = this.calculatePit(taxableIncome);

    // 11. Thực lĩnh (Net Salary)
    const netSalary = grossIncome - totalInsurance - personalIncomeTax;

    return {
      employeeId,
      employeeName,
      employeeCode,
      departmentName,
      academicTitle,
      positionName,
      month,
      year,
      baseSalaryRate: BASE_SALARY_RATE,
      salaryCoefficient,
      baseSalary,
      leadershipAllowance,
      seniorityAllowance,
      pedagogicalAllowance,
      standardWorkDays,
      actualWorkDays,
      unpaidLeaveDays,
      workDaysDeduction,
      kpiRanking,
      kpiBonusCoefficient,
      kpiExtraIncome,
      overtimeTeachingHours,
      overtimeTeachingPay,
      grossIncome,
      insurableBase,
      socialInsurance,
      healthInsurance,
      unemploymentInsurance,
      totalInsurance,
      personalDeduction,
      dependentCount,
      dependentDeduction,
      taxableIncome,
      personalIncomeTax,
      netSalary,
      status: "APPROVED",
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Tính toán phiếu lương cho 1 cán bộ (tự động truy vấn DB hoặc dùng danh bạ cơ hữu)
   */
  public static async calculateEmployeePayslip(
    employeeId: string,
    month = 9,
    year = 2026
  ): Promise<PayslipDto> {
    try {
      const employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            include: { position: true, unit: true },
          },
          contracts: {
            where: { status: "ACTIVE" },
            orderBy: { effectiveDate: "desc" },
            take: 1,
          },
        },
      }) as any;

      if (employee) {
        const activeContract = employee.contracts?.[0];
        const salaryCoefficient = activeContract?.salaryCoefficient
          ? Number(activeContract.salaryCoefficient)
          : 4.98;
        const activeAssignment = employee.assignments?.[0];
        const hireYear = employee.hireDate ? new Date(employee.hireDate).getFullYear() : 2020;

        let overtimeHours = 0;
        try {
          const quota = await WorkloadService.getEmployeeQuota(employee.id, `${year - 1}-${year}`);
          if (quota && quota.overtimeHours > 0) {
            overtimeHours = Math.round(quota.overtimeHours * 10) / 10;
          }
        } catch {
          overtimeHours = 0;
        }

        return this.computeSinglePayslip({
          employeeId: employee.id,
          employeeName: employee.fullName,
          employeeCode: employee.employeeCode,
          departmentName: activeAssignment?.unit?.name || "Khoa Kiến trúc",
          academicTitle: employee.academicTitle,
          positionName: activeAssignment?.position?.name || "Giảng viên",
          positionCode: activeAssignment?.position?.code || "GIANG_VIEN",
          month,
          year,
          salaryCoefficient,
          hireYear,
          kpiRanking: "A",
          dependentCount: 0,
          standardWorkDays: 22,
          actualWorkDays: 22,
          unpaidLeaveDays: 0,
          overtimeTeachingHours: overtimeHours,
        });
      }
    } catch {
      // Fallback
    }

    // Tra cứu danh sách mẫu nếu DB không có bản ghi
    const found = DEFAULT_FACULTY_MEMBERS.find(
      (m) => m.id === employeeId || m.employeeCode === employeeId
    ) || DEFAULT_FACULTY_MEMBERS[1]!;

    return this.computeSinglePayslip({
      ...found,
      month,
      year,
    });
  }

  /**
   * Tính toán toàn bộ kỳ lương cho tất cả cán bộ giảng viên (Full Period Calculation)
   */
  public static async calculateFullPeriod(
    month = 9,
    year = 2026,
    recalculate = false
  ): Promise<PayrollPeriodDetailDto> {
    const periodKey = `${month}-${year}`;

    if (!recalculate && this.periodsStore.has(periodKey)) {
      return this.periodsStore.get(periodKey)!;
    }

    let items: PayslipDto[] = [];

    try {
      const activeEmployees = await prisma.employee.findMany({
        where: { employmentStatus: "ACTIVE" },
        include: {
          assignments: {
            where: { status: "ACTIVE" },
            include: { position: true, unit: true },
          },
          contracts: {
            where: { status: "ACTIVE" },
            orderBy: { effectiveDate: "desc" },
            take: 1,
          },
        },
      }) as any[];

      if (activeEmployees && activeEmployees.length > 0) {
        items = activeEmployees.map((emp) => {
          const contract = emp.contracts?.[0];
          const assignment = emp.assignments?.[0];
          const salaryCoefficient = contract?.salaryCoefficient
            ? Number(contract.salaryCoefficient)
            : 4.98;
          const hireYear = emp.hireDate ? new Date(emp.hireDate).getFullYear() : 2020;

          return this.computeSinglePayslip({
            employeeId: emp.id,
            employeeName: emp.fullName,
            employeeCode: emp.employeeCode,
            departmentName: assignment?.unit?.name || "Khoa Kiến trúc",
            academicTitle: emp.academicTitle,
            positionName: assignment?.position?.name || "Giảng viên",
            positionCode: assignment?.position?.code || "GIANG_VIEN",
            month,
            year,
            salaryCoefficient,
            hireYear,
            kpiRanking: "A",
            dependentCount: 0,
            standardWorkDays: 22,
            actualWorkDays: 22,
            unpaidLeaveDays: 0,
            overtimeTeachingHours: 6.0,
          });
        });
      }
    } catch {
      // Fallback to standard faculty
    }

    if (items.length === 0) {
      items = DEFAULT_FACULTY_MEMBERS.map((member) =>
        this.computeSinglePayslip({
          ...member,
          month,
          year,
        })
      );
    }

    const totalGrossPayout = items.reduce((sum, item) => sum + item.grossIncome, 0);
    const totalNetPayout = items.reduce((sum, item) => sum + item.netSalary, 0);
    const totalInsurancePayout = items.reduce((sum, item) => sum + item.totalInsurance, 0);
    const totalTaxWithheld = items.reduce((sum, item) => sum + item.personalIncomeTax, 0);

    const periodDetail: PayrollPeriodDetailDto = {
      id: `PAYROLL-${year}-${month.toString().padStart(2, "0")}`,
      month,
      year,
      totalEmployees: items.length,
      totalGrossPayout,
      totalNetPayout,
      totalInsurancePayout,
      totalTaxWithheld,
      status: "DRAFT",
      items,
    };

    this.periodsStore.set(periodKey, periodDetail);
    return periodDetail;
  }

  /**
   * Lấy chi tiết kỳ lương (tự động tính toán nếu chưa có)
   */
  public static async getPeriodDetail(
    month = 9,
    year = 2026
  ): Promise<PayrollPeriodDetailDto> {
    const periodKey = `${month}-${year}`;
    if (!this.periodsStore.has(periodKey)) {
      return await this.calculateFullPeriod(month, year, false);
    }
    return this.periodsStore.get(periodKey)!;
  }

  /**
   * Tổng hợp kỳ lương phục vụ Dashboard hoặc Ban Giám hiệu
   */
  public static async getPeriodSummary(
    month = 9,
    year = 2026
  ): Promise<PayrollPeriodSummaryDto> {
    const detail = await this.getPeriodDetail(month, year);
    return {
      id: detail.id,
      month: detail.month,
      year: detail.year,
      totalEmployees: detail.totalEmployees,
      totalGrossPayout: detail.totalGrossPayout,
      totalNetPayout: detail.totalNetPayout,
      totalInsurancePayout: detail.totalInsurancePayout,
      totalTaxWithheld: detail.totalTaxWithheld,
      status: detail.status,
      submittedBy: detail.submittedBy,
      submittedAt: detail.submittedAt,
      approvedBy: detail.approvedBy,
      approvedAt: detail.approvedAt,
      pkiSignature: detail.pkiSignature,
    };
  }

  /**
   * Lấy bảng lương chi tiết có hỗ trợ lọc theo đơn vị và tìm kiếm
   */
  public static async getPayrollTable(params: {
    month?: number;
    year?: number;
    unitName?: string;
    search?: string;
  }): Promise<{ period: PayrollPeriodSummaryDto; items: PayslipDto[] }> {
    const month = params.month || 9;
    const year = params.year || 2026;
    const detail = await this.getPeriodDetail(month, year);

    let filteredItems = detail.items;

    if (params.unitName && params.unitName !== "ALL") {
      filteredItems = filteredItems.filter((i) => i.departmentName === params.unitName);
    }

    if (params.search) {
      const q = params.search.toLowerCase();
      filteredItems = filteredItems.filter(
        (i) =>
          i.employeeName.toLowerCase().includes(q) ||
          i.employeeCode.toLowerCase().includes(q) ||
          (i.positionName && i.positionName.toLowerCase().includes(q))
      );
    }

    return {
      period: {
        id: detail.id,
        month: detail.month,
        year: detail.year,
        totalEmployees: detail.totalEmployees,
        totalGrossPayout: detail.totalGrossPayout,
        totalNetPayout: detail.totalNetPayout,
        totalInsurancePayout: detail.totalInsurancePayout,
        totalTaxWithheld: detail.totalTaxWithheld,
        status: detail.status,
        submittedBy: detail.submittedBy,
        submittedAt: detail.submittedAt,
        approvedBy: detail.approvedBy,
        approvedAt: detail.approvedAt,
        pkiSignature: detail.pkiSignature,
      },
      items: filteredItems,
    };
  }

  /**
   * Trình duyệt bảng lương (DRAFT -> SUBMITTED)
   */
  public static async submitPeriod(
    month: number,
    year: number,
    submitterName = "Kế toán viên KHTC"
  ): Promise<PayrollPeriodDetailDto> {
    const detail = await this.getPeriodDetail(month, year);
    if (detail.status === "LOCKED" || detail.status === "PAID") {
      throw new AppError(400, "BAD_REQUEST", "Kỳ lương đã được khóa hoặc chi trả, không thể chỉnh sửa.");
    }
    detail.status = "SUBMITTED";
    detail.submittedBy = submitterName;
    detail.submittedAt = new Date().toISOString();
    this.periodsStore.set(`${month}-${year}`, detail);
    return detail;
  }

  /**
   * Phê duyệt & Ký số PKI bảng lương (SUBMITTED -> APPROVED)
   */
  public static async approvePeriod(
    month: number,
    year: number,
    approverName = "GS.TS. Nguyễn Hiệu Trưởng",
    customSignature?: string
  ): Promise<PayrollPeriodDetailDto> {
    const detail = await this.getPeriodDetail(month, year);
    if (detail.status === "LOCKED" || detail.status === "PAID") {
      throw new AppError(400, "BAD_REQUEST", "Kỳ lương đã được khóa hoặc chi trả.");
    }

    detail.status = "APPROVED";
    detail.approvedBy = approverName;
    detail.approvedAt = new Date().toISOString();

    if (customSignature) {
      detail.pkiSignature = customSignature;
    } else {
      const summaryPayload = `DAU-PAYROLL##${year}##${month}##GROSS:${detail.totalGrossPayout}##NET:${detail.totalNetPayout}##EMP:${detail.totalEmployees}`;
      const signed = PkiService.signData(summaryPayload);
      detail.pkiSignature = signed.signatureValue;
    }

    this.periodsStore.set(`${month}-${year}`, detail);
    return detail;
  }

  /**
   * Khóa kỳ lương (APPROVED -> LOCKED)
   */
  public static async lockPeriod(
    month: number,
    year: number
  ): Promise<PayrollPeriodDetailDto> {
    const detail = await this.getPeriodDetail(month, year);
    detail.status = "LOCKED";
    this.periodsStore.set(`${month}-${year}`, detail);
    return detail;
  }

  /**
   * Xuất phiếu lương điện tử cá nhân ra file PDF chuẩn bảo mật A4
   */
  public static async exportPayslipPdf(payslip: PayslipDto): Promise<Uint8Array> {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);

    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    let fontRegular: any;
    let fontBold: any;
    let isUnicode = false;

    try {
      const candidates = [
        "C:/Windows/Fonts/times.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      ];
      for (const fontPath of candidates) {
        if (fs.existsSync(fontPath)) {
          const fontBytes = fs.readFileSync(fontPath);
          fontRegular = await pdfDoc.embedFont(fontBytes);
          fontBold = fontRegular;
          isUnicode = true;
          break;
        }
      }
    } catch {
      isUnicode = false;
    }

    if (!fontRegular) {
      fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
      fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    }

    const sanitize = (text: string) => {
      if (isUnicode) return text;
      return text
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D");
    };

    const formatVnd = (num: number) => num.toLocaleString("vi-VN") + " d";

    // Header Trường
    page.drawText(sanitize("BỘ GIÁO DỤC VÀ ĐÀO TẠO"), {
      x: 50,
      y: height - 50,
      size: 10,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(sanitize("TRƯỜNG ĐẠI HỌC KIẾN TRÚC ĐÀ NẴNG"), {
      x: 50,
      y: height - 66,
      size: 11,
      font: fontBold,
      color: rgb(0.1, 0.2, 0.4),
    });

    // Tiêu đề Phiếu Lương
    const titleText = sanitize(`PHIẾU LƯƠNG & THU NHẬP ĐIỆN TỬ - THÁNG ${payslip.month}/${payslip.year}`);
    page.drawText(titleText, {
      x: 100,
      y: height - 110,
      size: 15,
      font: fontBold,
      color: rgb(0.08, 0.2, 0.45),
    });

    // Thông tin cán bộ
    let y = height - 145;
    const drawRow = (label: string, val: string, isHeader = false) => {
      page.drawText(sanitize(label), {
        x: 60,
        y,
        size: 10,
        font: isHeader ? fontBold : fontRegular,
        color: isHeader ? rgb(0.1, 0.1, 0.1) : rgb(0.35, 0.35, 0.35),
      });
      page.drawText(sanitize(val), {
        x: 360,
        y,
        size: 10,
        font: isHeader ? fontBold : fontRegular,
        color: isHeader ? rgb(0.05, 0.35, 0.15) : rgb(0.1, 0.1, 0.1),
      });
      y -= 20;
    };

    drawRow("Họ và tên cán bộ:", payslip.employeeName, true);
    drawRow("Mã số CBGV:", payslip.employeeCode);
    drawRow("Đơn vị công tác:", payslip.departmentName);
    drawRow("Hệ số lương ngạch bậc:", payslip.salaryCoefficient.toString());
    drawRow("Mức lương cơ sở áp dụng:", formatVnd(payslip.baseSalaryRate));
    y -= 8;

    // Phân mục 1: Lương cố định
    page.drawRectangle({
      x: 50,
      y: y + 8,
      width: width - 100,
      height: 18,
      color: rgb(0.93, 0.95, 0.98),
    });
    page.drawText(sanitize("I. THU NHẬP THEO NGẠCH BẬC & PHỤ CẤP NHÀ NƯỚC"), {
      x: 60,
      y: y + 12,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.5),
    });
    y -= 14;

    drawRow("1. Lương ngạch bậc (Hệ số x Lương cơ sở):", formatVnd(payslip.baseSalary));
    drawRow("2. Phụ cấp chức vụ lãnh đạo:", formatVnd(payslip.leadershipAllowance));
    drawRow("3. Phụ cấp thâm niên nghề giáo:", formatVnd(payslip.seniorityAllowance));
    drawRow("4. Phụ cấp ưu đãi đứng lớp (30%):", formatVnd(payslip.pedagogicalAllowance));
    if (payslip.workDaysDeduction > 0) {
      drawRow(`5. Giảm trừ nghỉ không lương (${payslip.unpaidLeaveDays} ngày):`, `-${formatVnd(payslip.workDaysDeduction)}`);
    }
    y -= 8;

    // Phân mục 2: Thu nhập tăng thêm
    page.drawRectangle({
      x: 50,
      y: y + 8,
      width: width - 100,
      height: 18,
      color: rgb(0.93, 0.95, 0.98),
    });
    page.drawText(sanitize("II. THU NHẬP TĂNG THÊM & KẾT QUẢ CÔNG TÁC (QUỸ TỰ CHỦ)"), {
      x: 60,
      y: y + 12,
      size: 9.5,
      font: fontBold,
      color: rgb(0.1, 0.25, 0.5),
    });
    y -= 14;

    drawRow(`1. Thưởng hiệu quả công việc KPI (Loại ${payslip.kpiRanking} - ${payslip.kpiBonusCoefficient}x):`, formatVnd(payslip.kpiExtraIncome));
    drawRow(`2. Thù lao vượt giờ Studio Kiến trúc (${payslip.overtimeTeachingHours} giờ):`, formatVnd(payslip.overtimeTeachingPay));
    drawRow("TỔNG THU NHẬP TRƯỚC THUẾ (GROSS INCOME):", formatVnd(payslip.grossIncome), true);
    y -= 8;

    // Phân mục 3: Khấu trừ
    page.drawRectangle({
      x: 50,
      y: y + 8,
      width: width - 100,
      height: 18,
      color: rgb(0.98, 0.94, 0.94),
    });
    page.drawText(sanitize("III. CÁC KHOẢN TRÍCH NỘP & THUẾ THU NHẬP CÁ NHÂN"), {
      x: 60,
      y: y + 12,
      size: 9.5,
      font: fontBold,
      color: rgb(0.6, 0.1, 0.1),
    });
    y -= 14;

    drawRow("1. Bảo hiểm xã hội bắt buộc (8%):", formatVnd(payslip.socialInsurance));
    drawRow("2. Bảo hiểm y tế (1.5%):", formatVnd(payslip.healthInsurance));
    drawRow("3. Bảo hiểm thất nghiệp (1%):", formatVnd(payslip.unemploymentInsurance));
    drawRow("4. Thuế thu nhập cá nhân (Biểu lũy tiến 7 bậc):", formatVnd(payslip.personalIncomeTax));
    y -= 12;

    // Tổng thực lĩnh Box
    page.drawRectangle({
      x: 50,
      y: y - 10,
      width: width - 100,
      height: 38,
      color: rgb(0.08, 0.45, 0.25),
    });
    page.drawText(sanitize("THỰC LĨNH CHUYỂN KHOẢN (NET SALARY):"), {
      x: 65,
      y: y + 10,
      size: 11,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText(formatVnd(payslip.netSalary), {
      x: 360,
      y: y + 8,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    // Dấu xác nhận Kế toán
    y -= 60;
    page.drawText(sanitize("Đà Nẵng, ngày cuối tháng quyết toán"), {
      x: 360,
      y,
      size: 9.5,
      font: fontRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(sanitize("PHÒNG KẾ HOẠCH - TÀI CHÍNH"), {
      x: 360,
      y: y - 16,
      size: 10,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    return await pdfDoc.save();
  }
}
