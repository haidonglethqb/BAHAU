import { DomainEventBus } from "./domain-event-bus.js";
import { registerPayrollSubscribers } from "./subscribers/payroll.subscriber.js";
import { registerWorkloadSubscribers } from "./subscribers/workload.subscriber.js";
import { registerKpiSubscribers } from "./subscribers/kpi.subscriber.js";

export * from "./domain-event-bus.js";

let subscribersInitialized = false;

/**
 * Khởi tạo toàn bộ các Domain Event Subscribers trong hệ thống HRMS DAU
 * Đảm bảo chỉ đăng ký một lần duy nhất (Idempotent initialization)
 */
export function initEventSubscribers(): void {
  if (subscribersInitialized) {
    return;
  }

  registerPayrollSubscribers();
  registerWorkloadSubscribers();
  registerKpiSubscribers();

  subscribersInitialized = true;
  console.log("[DomainEventBus] All domain event subscribers registered successfully (Decoupled Engine Active)");
}

/**
 * Reset trạng thái đăng ký subscribers (hữu ích cho Unit Tests)
 */
export function resetEventSubscribers(): void {
  subscribersInitialized = false;
}
