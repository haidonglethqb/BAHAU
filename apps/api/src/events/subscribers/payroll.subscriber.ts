import { DOMAIN_EVENTS } from "@bahau/contracts";
import type {
  DomainEvent,
  TenureAppointedPayload,
  CandidateAppointedPayload,
  RdProjectApprovedPayload,
  PostgradDegreeAwardedPayload,
} from "@bahau/contracts";
import { DomainEventBus } from "../domain-event-bus.js";
import { PayrollService } from "../../services/payroll.service.js";

/**
 * Subscriber phụ trách phân hệ Tiền lương & Thu nhập (Payroll Engine)
 * Lắng nghe các Domain Event phát sinh từ toàn hệ thống và đồng bộ thu nhập/ngạch bậc.
 */
export function registerPayrollSubscribers(): void {
  const bus = DomainEventBus.getInstance();

  // 1. Thăng hạng chức danh & Bổ nhiệm GS/PGS (Nghị định 115 & Thông tư 40)
  bus.subscribe<TenureAppointedPayload>(
    DOMAIN_EVENTS.TENURE_APPOINTED,
    (event: DomainEvent<TenureAppointedPayload>) => {
      const payload = event.payload;
      PayrollService.updateFacultyCareerClass(
        payload.employeeId,
        payload.newAcademicTitle as any,
        payload.newSalaryCoefficient,
        payload.academicRank
      );
      // Đồng bộ theo cả mã cán bộ nếu có
      if (payload.employeeCode) {
        PayrollService.updateFacultyCareerClass(
          payload.employeeCode,
          payload.newAcademicTitle as any,
          payload.newSalaryCoefficient,
          payload.academicRank
        );
      }
    }
  );

  // 2. Tuyển dụng & Bổ nhiệm tập sự Giảng viên (Nghị định 115, Điều 23)
  bus.subscribe<CandidateAppointedPayload>(
    DOMAIN_EVENTS.CANDIDATE_APPOINTED,
    (event: DomainEvent<CandidateAppointedPayload>) => {
      const payload = event.payload;
      PayrollService.registerProbationaryFaculty({
        employeeId: `${payload.appointedEmployeeCode}-ID`,
        employeeCode: payload.appointedEmployeeCode,
        fullName: payload.fullName,
        departmentName: payload.targetDepartment,
        degree: payload.degree as any,
        salaryCoefficient: payload.probationSalaryCoeff,
      });
    }
  );

  // 3. Đề tài NCKH, Dự án Tư vấn Thiết kế & Nhuận bút Tác giả (Nghị định 109 & 99)
  bus.subscribe<RdProjectApprovedPayload>(
    DOMAIN_EVENTS.RD_PROJECT_APPROVED,
    (event: DomainEvent<RdProjectApprovedPayload>) => {
      const payload = event.payload;
      for (const member of payload.members) {
        if (member.allocatedAmount > 0) {
          PayrollService.addRoyaltyPayment(member.employeeCode, member.allocatedAmount);
          if (member.employeeId && member.employeeId !== member.employeeCode) {
            PayrollService.addRoyaltyPayment(member.employeeId, member.allocatedAmount);
          }
        }
      }
    }
  );

  // 4. Hội đồng Bảo vệ Luận văn / Luận án & Học vị ThS/TS (Thông tư 18, 23 & QC Chi tiêu nội bộ)
  bus.subscribe<PostgradDegreeAwardedPayload>(
    DOMAIN_EVENTS.POSTGRAD_DEGREE_AWARDED,
    (event: DomainEvent<PostgradDegreeAwardedPayload>) => {
      const payload = event.payload;
      if (payload.defenseMembers && payload.defenseMembers.length > 0) {
        for (const member of payload.defenseMembers) {
          if (member.honorariumAmount > 0) {
            PayrollService.addPostgradCouncilHonorarium(member.employeeCode, member.honorariumAmount);
            if (member.employeeId && member.employeeId !== member.employeeCode) {
              PayrollService.addPostgradCouncilHonorarium(member.employeeId, member.honorariumAmount);
            }
          }
        }
      }
    }
  );
}
