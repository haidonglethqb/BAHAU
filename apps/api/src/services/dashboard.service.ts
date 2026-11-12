import { prisma } from "@bahau/database";
import {
  DashboardOverviewDto,
  WorkforceStatsDto,
  ExecutiveAlertsDto,
} from "@bahau/contracts";
import { UnitService } from "./unit.service.js";

export interface DashboardScope {
  role?: string;
  unitId?: string;
  roles?: string[];
  unitsManaged?: string[];
  employeeId?: string | null;
}

export class DashboardService {
  /**
   * Mở rộng phạm vi cây đơn vị cho ROLE_UNIT_HEAD; trả về isEmptyScope=true nếu không có quyền xem đơn vị nào.
   */
  private static async resolveUnitScope(scope?: DashboardScope): Promise<{
    isEmptyScope: boolean;
    allowedUnitIds: string[] | null;
  }> {
    if (!scope) {
      return { isEmptyScope: false, allowedUnitIds: null };
    }

    const roles = scope.roles ?? (scope.role ? [scope.role] : []);
    const isGlobal = roles.some((r) =>
      ["ROLE_HR_OFFICER", "ROLE_RECTOR", "ROLE_SYSADMIN"].includes(r)
    );

    if (scope.unitId) {
      const expanded = await UnitService.getDescendantUnitIds(scope.unitId);
      return { isEmptyScope: expanded.length === 0, allowedUnitIds: expanded };
    }

    if (isGlobal || roles.length === 0) {
      return { isEmptyScope: false, allowedUnitIds: null };
    }

    const managed = scope.unitsManaged ?? [];
    if (managed.length === 0) {
      return { isEmptyScope: true, allowedUnitIds: [] };
    }

    const unitSet = new Set<string>();
    for (const rootUnitId of managed) {
      const descendants = await UnitService.getDescendantUnitIds(rootUnitId);
      for (const id of descendants) {
        unitSet.add(id);
      }
    }

    const allowedUnitIds = Array.from(unitSet);
    return {
      isEmptyScope: allowedUnitIds.length === 0,
      allowedUnitIds,
    };
  }

  /**
   * Lấy tổng quan các chỉ số vận hành nhân sự toàn trường (hoặc theo đơn vị)
   */
  static async getOverview(scope?: DashboardScope): Promise<DashboardOverviewDto> {
    const { isEmptyScope, allowedUnitIds } = await this.resolveUnitScope(scope);
    if (isEmptyScope) {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        onLeaveEmployees: 0,
        probationEmployees: 0,
        doctorCount: 0,
        masterCount: 0,
        bachelorCount: 0,
        professorCount: 0,
        associateProfessorCount: 0,
        verifiedCertificatesCount: 0,
        expiringCertificatesCount: 0,
        expiringContractsCount: 0,
        pendingRequestsCount: 0,
      };
    }

    const whereEmployee = allowedUnitIds
      ? {
          assignments: {
            some: {
              unitId: { in: allowedUnitIds },
              status: "ACTIVE" as const,
            },
          },
        }
      : {};

    const whereEmployeeRelation = allowedUnitIds
      ? { employee: whereEmployee }
      : {};

    const [
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      probationEmployees,
      doctorCount,
      masterCount,
      bachelorCount,
      professorCount,
      associateProfessorCount,
      verifiedCertificatesCount,
    ] = await Promise.all([
      prisma.employee.count({ where: whereEmployee }),
      prisma.employee.count({
        where: { ...whereEmployee, employmentStatus: "ACTIVE" },
      }),
      prisma.employee.count({
        where: { ...whereEmployee, employmentStatus: "ON_LEAVE" },
      }),
      prisma.employee.count({
        where: { ...whereEmployee, employmentStatus: "PROBATION" },
      }),
      prisma.employee.count({
        where: { ...whereEmployee, academicDegree: "DOCTOR" },
      }),
      prisma.employee.count({
        where: { ...whereEmployee, academicDegree: "MASTER" },
      }),
      prisma.employee.count({
        where: { ...whereEmployee, academicDegree: "BACHELOR" },
      }),
      prisma.employee.count({
        where: { ...whereEmployee, academicTitle: "PROFESSOR" },
      }),
      prisma.employee.count({
        where: { ...whereEmployee, academicTitle: "ASSOCIATE_PROFESSOR" },
      }),
      prisma.certificate.count({
        where: { status: "VERIFIED", ...whereEmployeeRelation },
      }),
    ]);

    const now = new Date();
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const [expiringCertificatesCount, expiringContractsCount, pendingLeaves, pendingKpi, pendingCerts] =
      await Promise.all([
        prisma.certificate.count({
          where: {
            status: "VERIFIED",
            expiryDate: {
              gte: now,
              lte: in90Days,
            },
            ...whereEmployeeRelation,
          },
        }),
        prisma.employmentContract.count({
          where: {
            status: "ACTIVE",
            expiryDate: {
              gte: now,
              lte: in60Days,
            },
            ...whereEmployeeRelation,
          },
        }),
        prisma.leaveRequest.count({
          where: { status: "PENDING", ...whereEmployeeRelation },
        }),
        prisma.kpiEvaluation.count({
          where: {
            status: {
              in: ["SUBMITTED", "IN_REVIEW"],
            },
            ...whereEmployeeRelation,
          },
        }),
        prisma.certificate.count({
          where: { status: "PENDING", ...whereEmployeeRelation },
        }),
      ]);

    return {
      totalEmployees,
      activeEmployees,
      onLeaveEmployees,
      probationEmployees,
      doctorCount,
      masterCount,
      bachelorCount,
      professorCount,
      associateProfessorCount,
      verifiedCertificatesCount,
      expiringCertificatesCount,
      expiringContractsCount,
      pendingRequestsCount: pendingLeaves + pendingKpi + pendingCerts,
    };
  }

  /**
   * Thống kê cơ cấu nhân sự: Học vị, Chức danh, Vị trí việc làm, Hợp đồng và Biến động
   */
  static async getWorkforceStats(scope?: DashboardScope): Promise<WorkforceStatsDto> {
    const { isEmptyScope, allowedUnitIds } = await this.resolveUnitScope(scope);

    const degrees = ["DOCTOR", "MASTER", "BACHELOR"];
    const degreeLabels: Record<string, string> = {
      DOCTOR: "Tiến sĩ",
      MASTER: "Thạc sĩ",
      BACHELOR: "Đại học / KTS / Kỹ sư",
    };
    const titles = ["PROFESSOR", "ASSOCIATE_PROFESSOR", "NONE"];
    const titleLabels: Record<string, string> = {
      PROFESSOR: "Giáo sư",
      ASSOCIATE_PROFESSOR: "Phó Giáo sư",
      NONE: "Giảng viên / Chuyên viên",
    };
    const positionTypes = ["MANAGEMENT", "ACADEMIC", "ADMINISTRATIVE"];
    const posLabels: Record<string, string> = {
      MANAGEMENT: "Cán bộ Quản lý",
      ACADEMIC: "Giảng viên Giảng dạy",
      ADMINISTRATIVE: "Chuyên viên Hành chính",
    };
    const contractTypes = [
      "INDEFINITE_TERM",
      "DEFINITE_TERM_36M",
      "DEFINITE_TERM_12M",
      "VISITING_LECTURER",
      "PROBATION",
    ];
    const contractLabels: Record<string, string> = {
      INDEFINITE_TERM: "Không xác định thời hạn",
      DEFINITE_TERM_36M: "Xác định thời hạn 36 tháng",
      DEFINITE_TERM_12M: "Xác định thời hạn 12 tháng",
      VISITING_LECTURER: "Giảng viên Thỉnh giảng",
      PROBATION: "Hợp đồng Thử việc",
    };

    if (isEmptyScope) {
      return {
        byDegree: degrees.map((key) => ({ key, label: degreeLabels[key] || key, count: 0, percentage: 0 })),
        byTitle: titles.map((key) => ({ key, label: titleLabels[key] || key, count: 0, percentage: 0 })),
        byPositionType: positionTypes.map((key) => ({ key, label: posLabels[key] || key, count: 0, percentage: 0 })),
        byContractType: contractTypes.map((key) => ({ key, label: contractLabels[key] || key, count: 0, percentage: 0 })),
        recentTurnover: [],
      };
    }

    const whereEmployee = allowedUnitIds
      ? {
          assignments: {
            some: {
              unitId: { in: allowedUnitIds },
              status: "ACTIVE" as const,
            },
          },
        }
      : {};
    const whereEmployeeRelation = allowedUnitIds
      ? { employee: whereEmployee }
      : {};

    const total = await prisma.employee.count({ where: whereEmployee });
    const safeTotal = total > 0 ? total : 1;

    // 1. Phân bố theo Trình độ học vị (Academic Degree)
    const byDegree = await Promise.all(
      degrees.map(async (deg) => {
        const count = await prisma.employee.count({
          where: { ...whereEmployee, academicDegree: deg as any },
        });
        return {
          key: deg,
          label: degreeLabels[deg] || deg,
          count,
          percentage: Number(((count / safeTotal) * 100).toFixed(1)),
        };
      })
    );

    // 2. Phân bố theo Chức danh học thuật (Academic Title)
    const byTitle = await Promise.all(
      titles.map(async (t) => {
        const count = await prisma.employee.count({
          where: { ...whereEmployee, academicTitle: t as any },
        });
        return {
          key: t,
          label: titleLabels[t] || t,
          count,
          percentage: Number(((count / safeTotal) * 100).toFixed(1)),
        };
      })
    );

    // 3. Phân bố theo Vị trí việc làm (Position Type)
    const byPositionType = await Promise.all(
      positionTypes.map(async (pt) => {
        const count = await prisma.employee.count({
          where: {
            assignments: {
              some: {
                ...(allowedUnitIds ? { unitId: { in: allowedUnitIds } } : {}),
                position: { positionType: pt as any },
                status: "ACTIVE",
              },
            },
          },
        });
        return {
          key: pt,
          label: posLabels[pt] || pt,
          count,
          percentage: Number(((count / safeTotal) * 100).toFixed(1)),
        };
      })
    );

    // 4. Phân bố theo Loại Hợp đồng (Contract Type)
    const totalContracts = await prisma.employmentContract.count({
      where: { status: "ACTIVE", ...whereEmployeeRelation },
    });
    const safeContractTotal = totalContracts > 0 ? totalContracts : 1;
    const byContractType = await Promise.all(
      contractTypes.map(async (ct) => {
        const count = await prisma.employmentContract.count({
          where: { contractType: ct as any, status: "ACTIVE", ...whereEmployeeRelation },
        });
        return {
          key: ct,
          label: contractLabels[ct] || ct,
          count,
          percentage: Number(((count / safeContractTotal) * 100).toFixed(1)),
        };
      })
    );

    // 5. Nhật ký Biến động nhân sự gần nhất (Recent Turnover Events)
    const recentEvents = await prisma.employmentEvent.findMany({
      where: whereEmployeeRelation,
      take: 6,
      orderBy: { effectiveDate: "desc" },
      include: {
        employee: true,
      },
    });

    const recentTurnover = recentEvents.map((ev) => ({
      id: ev.id,
      employeeCode: ev.employee.employeeCode,
      fullName: ev.employee.fullName,
      eventType: ev.eventType,
      decisionNumber: ev.decisionNumber,
      effectiveDate: ev.effectiveDate.toISOString().split("T")[0],
      note: ev.note,
    }));

    return {
      byDegree,
      byTitle,
      byPositionType,
      byContractType,
      recentTurnover,
    };
  }

  /**
   * Danh sách cảnh báo điều hành tập trung (Hợp đồng, Chứng chỉ, Việc chờ duyệt)
   */
  static async getExecutiveAlerts(scope?: DashboardScope): Promise<ExecutiveAlertsDto> {
    const { isEmptyScope, allowedUnitIds } = await this.resolveUnitScope(scope);
    if (isEmptyScope) {
      return {
        expiringContracts: [],
        expiringCertificates: [],
        pendingApprovals: [],
      };
    }

    const whereEmployeeRelation = allowedUnitIds
      ? {
          employee: {
            assignments: {
              some: {
                unitId: { in: allowedUnitIds },
                status: "ACTIVE" as const,
              },
            },
          },
        }
      : {};

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // 1. Cảnh báo Hợp đồng sắp hết hạn trong 60 ngày
    const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const contracts = await prisma.employmentContract.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: {
          gte: now,
          lte: in60Days,
        },
        ...whereEmployeeRelation,
      },
      include: {
        employee: {
          include: {
            assignments: {
              where: { status: "ACTIVE" },
              include: { unit: true },
            },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 10,
    });

    const expiringContracts = contracts.map((c) => {
      const exp = new Date(c.expiryDate!);
      exp.setHours(0, 0, 0, 0);
      const daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const primaryUnit = c.employee.assignments[0]?.unit?.name;

      return {
        id: c.id,
        employeeCode: c.employee.employeeCode,
        fullName: c.employee.fullName,
        unitName: primaryUnit,
        contractNumber: c.contractNumber,
        contractType: c.contractType,
        expiryDate: exp.toISOString().split("T")[0],
        daysRemaining,
      };
    });

    // 2. Cảnh báo Chứng chỉ sắp hết hạn trong 90 ngày hoặc đã hết hạn
    const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    const certificates = await prisma.certificate.findMany({
      where: {
        status: "VERIFIED",
        expiryDate: {
          lte: in90Days,
        },
        ...whereEmployeeRelation,
      },
      include: {
        employee: {
          include: {
            assignments: {
              where: { status: "ACTIVE" },
              include: { unit: true },
            },
          },
        },
      },
      orderBy: { expiryDate: "asc" },
      take: 10,
    });

    const expiringCertificates = certificates.map((cert) => {
      let daysRemaining = 0;
      let alertLevel = "VALID";

      if (cert.expiryDate) {
        const exp = new Date(cert.expiryDate);
        exp.setHours(0, 0, 0, 0);
        daysRemaining = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
          alertLevel = "EXPIRED";
        } else if (daysRemaining <= 30) {
          alertLevel = "CRITICAL_30";
        } else if (daysRemaining <= 60) {
          alertLevel = "WARNING_60";
        } else if (daysRemaining <= 90) {
          alertLevel = "WARNING_90";
        }
      }

      const primaryUnit = cert.employee.assignments[0]?.unit?.name;

      return {
        id: cert.id,
        employeeCode: cert.employee.employeeCode,
        fullName: cert.employee.fullName,
        unitName: primaryUnit,
        certificateName: cert.name,
        certificateType: cert.certificateType,
        expiryDate: cert.expiryDate ? cert.expiryDate.toISOString().split("T")[0] : "",
        daysRemaining,
        alertLevel,
      };
    });

    // 3. Hồ sơ chờ phê duyệt (Leave, KPI, Certificate)
    const [pendingLeaves, pendingKpis, pendingCerts] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: { status: "PENDING", ...whereEmployeeRelation },
        include: {
          employee: {
            include: {
              assignments: { where: { status: "ACTIVE" }, include: { unit: true } },
            },
          },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.kpiEvaluation.findMany({
        where: {
          status: { in: ["SUBMITTED", "IN_REVIEW"] },
          ...whereEmployeeRelation,
        },
        include: {
          employee: {
            include: {
              assignments: { where: { status: "ACTIVE" }, include: { unit: true } },
            },
          },
          period: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.certificate.findMany({
        where: { status: "PENDING", ...whereEmployeeRelation },
        include: {
          employee: {
            include: {
              assignments: { where: { status: "ACTIVE" }, include: { unit: true } },
            },
          },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const pendingApprovals = [
      ...pendingLeaves.map((l) => ({
        id: l.id,
        type: "LEAVE" as const,
        title: `Đơn xin nghỉ phép (${l.leaveType}) - ${l.reason || "Việc cá nhân"}`,
        submittedBy: l.employee.fullName,
        unitName: l.employee.assignments[0]?.unit?.name,
        submittedAt: l.createdAt.toISOString(),
      })),
      ...pendingKpis.map((k) => ({
        id: k.id,
        type: "KPI" as const,
        title: `Đánh giá KPI ${k.period.name} - Tự chấm ${k.totalSelfScore ?? 0}đ`,
        submittedBy: k.employee.fullName,
        unitName: k.employee.assignments[0]?.unit?.name,
        submittedAt: k.updatedAt.toISOString(),
      })),
      ...pendingCerts.map((c) => ({
        id: c.id,
        type: "CERTIFICATE" as const,
        title: `Thẩm định chứng chỉ: ${c.name} (${c.certificateType})`,
        submittedBy: c.employee.fullName,
        unitName: c.employee.assignments[0]?.unit?.name,
        submittedAt: c.createdAt.toISOString(),
      })),
    ].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return {
      expiringContracts,
      expiringCertificates,
      pendingApprovals,
    };
  }
}
