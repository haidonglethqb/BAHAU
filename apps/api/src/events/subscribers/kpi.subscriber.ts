import { DOMAIN_EVENTS } from "@bahau/contracts";
import type {
  DomainEvent,
  RdProjectApprovedPayload,
  PostgradDegreeAwardedPayload,
} from "@bahau/contracts";
import { DomainEventBus } from "../domain-event-bus.js";
import { KpiService } from "../../services/kpi.service.js";

const processedResearchKpi = new Set<string>();
const processedSupervisionKpi = new Set<string>();

export function resetKpiSubscriberState(): void {
  processedResearchKpi.clear();
  processedSupervisionKpi.clear();
}

/**
 * Subscriber phụ trách phân hệ Đánh giá Hiệu quả Công việc & KPI Giảng viên (KPI Engine)
 * Lắng nghe các Domain Event để tự động tích lũy điểm KPI Trụ cột II (NCKH, Thiết kế) và Trụ cột I & II (Hướng dẫn SĐH).
 */
export function registerKpiSubscribers(): void {
  const bus = DomainEventBus.getInstance();

  // 1. Đề tài NCKH, Dự án Tư vấn Kiến trúc & Điểm KPI Trụ cột II
  bus.subscribe<RdProjectApprovedPayload>(
    DOMAIN_EVENTS.RD_PROJECT_APPROVED,
    (event: DomainEvent<RdProjectApprovedPayload>) => {
      const payload = event.payload;
      const sourceId = payload.projectId || event.aggregateId || event.id;
      for (const member of payload.members) {
        const empKey = member.employeeCode || member.employeeId;
        const dedupKey = `${sourceId}:${empKey}`;
        if (processedResearchKpi.has(dedupKey)) continue;
        processedResearchKpi.add(dedupKey);

        const isLead =
          member.role === "PRINCIPAL_INVESTIGATOR" ||
          member.role === "LEAD_ARCHITECT";
        const points = member.kpiPoints || (isLead ? 35 : 20);
        KpiService.addResearchKpiPoints(member.employeeCode, points);
        if (member.employeeId && member.employeeId !== member.employeeCode) {
          KpiService.addResearchKpiPoints(member.employeeId, points);
        }
      }
    }
  );

  // 2. Hướng dẫn Luận văn Thạc sĩ / Luận án Tiến sĩ & Điểm KPI Trụ cột I & II
  bus.subscribe<PostgradDegreeAwardedPayload>(
    DOMAIN_EVENTS.POSTGRAD_DEGREE_AWARDED,
    (event: DomainEvent<PostgradDegreeAwardedPayload>) => {
      const payload = event.payload;
      const sourceId = payload.studentId || event.aggregateId || event.id;
      for (const supervisor of payload.supervisors) {
        if (supervisor.kpiPoints > 0) {
          const empKey = supervisor.employeeCode || supervisor.employeeId;
          const dedupKey = `${sourceId}:${empKey}`;
          if (processedSupervisionKpi.has(dedupKey)) continue;
          processedSupervisionKpi.add(dedupKey);

          KpiService.addSupervisionKpiPoints(supervisor.employeeCode, supervisor.kpiPoints);
          if (supervisor.employeeId && supervisor.employeeId !== supervisor.employeeCode) {
            KpiService.addSupervisionKpiPoints(supervisor.employeeId, supervisor.kpiPoints);
          }
        }
      }
    }
  );
}
