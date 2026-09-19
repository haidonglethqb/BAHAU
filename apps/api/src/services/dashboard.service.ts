import { prisma } from "@bahau/database";
import {
  DashboardOverviewDto,
  WorkforceStatsDto,
  ExecutiveAlertsDto,
} from "@bahau/contracts";

export class DashboardService {
  /**
   * Lấy tổng quan các chỉ số vận hành nhân sự toàn trường (hoặc theo đơn vị)
   */
  static async getOverview(scope?: { role?: string; unitId?: string }): Promise<DashboardOverviewDto> {
    const whereEmployee = scope?.unitId
      ? {
          assignments: {
            some: {
              unitId: scope.unitId,
              status: "ACTIVE" as const,
            },
          },
        }
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
        where: { status: "VERIFIED" },
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
          },
        }),
        prisma.employmentContract.count({
          where: {
            status: "ACTIVE",
            expiryDate: {
              gte: now,
              lte: in60Days,
            },
          },
        }),
        prisma.leaveRequest.count({
          where: { status: "PENDING" },
        }),
        prisma.kpiEvaluation.count({
          where: {
            status: {
              in: ["SUBMITTED", "IN_REVIEW"],
            },
          },
        }),
        prisma.certificate.count({
          where: { status: "PENDING" },
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
  static async getWorkforceStats(scope?: { role?: string; unitId?: string }): Promise<WorkforceStatsDto> {
    const total = await prisma.employee.count();
    const safeTotal = total > 0 ? total : 1;

    // 1. Phân bố theo Trình độ học vị (Academic Degree)
    const degrees = ["DOCTOR", "MASTER", "BACHELOR"];
    const degreeLabels: Record<string, string> = {
      DOCTOR: "Tiến sĩ",
      MASTER: "Thạc sĩ",
      BACHELOR: "Đại học / KTS / Kỹ sư",
    };
    const byDegree = await Promise.all(
      degrees.map(async (deg) => {
        const count = await prisma.employee.count({
          where: { academicDegree: deg as any },
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
    const titles = ["PROFESSOR", "ASSOCIATE_PROFESSOR", "NONE"];
    const titleLabels: Record<string, string> = {
      PROFESSOR: "Giáo sư",
      ASSOCIATE_PROFESSOR: "Phó Giáo sư",
      NONE: "Giảng viên / Chuyên viên",
    };
    const byTitle = await Promise.all(
      titles.map(async (t) => {
        const count = await prisma.employee.count({
          where: { academicTitle: t as any },
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
    const positionTypes = ["MANAGEMENT", "ACADEMIC", "ADMINISTRATIVE"];
    const posLabels: Record<string, string> = {
      MANAGEMENT: "Cán bộ Quản lý",
      ACADEMIC: "Giảng viên Giảng dạy",
      ADMINISTRATIVE: "Chuyên viên Hành chính",
    };
    const byPositionType = await Promise.all(
      positionTypes.map(async (pt) => {
        const count = await prisma.employee.count({
          where: {
            assignments: {
              some: {
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
      where: { status: "ACTIVE" },
    });
    const safeContractTotal = totalContracts > 0 ? totalContracts : 1;
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
    const byContractType = await Promise.all(
      contractTypes.map(async (ct) => {
        const count = await prisma.employmentContract.count({
          where: { contractType: ct as any, status: "ACTIVE" },
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
  static async getExecutiveAlerts(scope?: { role?: string; unitId?: string }): Promise<ExecutiveAlertsDto> {
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
        where: { status: "PENDING" },
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
        where: { status: "PENDING" },
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
