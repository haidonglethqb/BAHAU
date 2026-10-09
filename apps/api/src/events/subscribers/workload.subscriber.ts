import { DOMAIN_EVENTS } from "@bahau/contracts";
import type {
  DomainEvent,
  TenureAppointedPayload,
  CandidateAppointedPayload,
  RdProjectApprovedPayload,
  PostgradDegreeAwardedPayload,
} from "@bahau/contracts";
import { DomainEventBus } from "../domain-event-bus.js";
import { WorkloadService } from "../../services/workload.service.js";

/**
 * Subscriber phụ trách phân hệ Định mức Giờ chuẩn & Khối lượng Công tác Giảng dạy (Workload Engine)
 * Lắng nghe các Domain Event để tự động điều chỉnh định mức giờ chuẩn (216h, 50% tập sự, giờ NCKH, giờ hướng dẫn SĐH).
 */
export function registerWorkloadSubscribers(): void {
  const bus = DomainEventBus.getInstance();

  // 1. Thăng hạng chức danh GS/PGS (Định mức 216h, vượt giờ 200.000đ/h)
  bus.subscribe<TenureAppointedPayload>(
    DOMAIN_EVENTS.TENURE_APPOINTED,
    (event: DomainEvent<TenureAppointedPayload>) => {
      const payload = event.payload;
      WorkloadService.markAsSeniorOrProf(payload.employeeId);
      if (payload.employeeCode) {
        WorkloadService.markAsSeniorOrProf(payload.employeeCode);
      }
    }
  );

  // 2. Tuyển dụng & Bổ nhiệm tập sự Giảng viên (Giảm 50% định mức giờ giảng theo TT 20/2020)
  bus.subscribe<CandidateAppointedPayload>(
    DOMAIN_EVENTS.CANDIDATE_APPOINTED,
    (event: DomainEvent<CandidateAppointedPayload>) => {
      const payload = event.payload;
      WorkloadService.registerProbationaryFaculty(`${payload.appointedEmployeeCode}-ID`);
      WorkloadService.registerProbationaryFaculty(payload.appointedEmployeeCode);
    }
  );

  // 3. Đề tài NCKH, Dự án Tư vấn Kiến trúc & Quy đổi giờ NCKH bù trừ định mức (Nghị định 109 & 99)
  bus.subscribe<RdProjectApprovedPayload>(
    DOMAIN_EVENTS.RD_PROJECT_APPROVED,
    (event: DomainEvent<RdProjectApprovedPayload>) => {
      const payload = event.payload;
      for (const member of payload.members) {
        if (member.convertedResearchHours > 0) {
          WorkloadService.addResearchHours(member.employeeCode, member.convertedResearchHours);
          WorkloadService.addResearchHours(member.employeeId, member.convertedResearchHours);
        }
      }
    }
  );

  // 4. Hướng dẫn Luận văn Thạc sĩ / Luận án Tiến sĩ quy đổi giờ giảng dạy Sau đại học
  bus.subscribe<PostgradDegreeAwardedPayload>(
    DOMAIN_EVENTS.POSTGRAD_DEGREE_AWARDED,
    (event: DomainEvent<PostgradDegreeAwardedPayload>) => {
      const payload = event.payload;
      for (const supervisor of payload.supervisors) {
        if (supervisor.convertedHours > 0) {
          WorkloadService.addSupervisionHours(supervisor.employeeCode, supervisor.convertedHours);
          WorkloadService.addSupervisionHours(supervisor.employeeId, supervisor.convertedHours);
        }
      }
    }
  );
}
