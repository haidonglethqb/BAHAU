import crypto from "node:crypto";
import type { DomainEvent, DomainEventMetadata } from "@bahau/contracts";
import { OutboxService } from "../services/outbox.service.js";

export type DomainEventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

export class DomainEventBus {
  private static instance: DomainEventBus | null = null;
  private handlers = new Map<string, Array<DomainEventHandler>>();
  private eventStore: DomainEvent[] = [];
  private maxStoreSize = 1000;

  private constructor() {}

  public static getInstance(): DomainEventBus {
    if (!this.instance) {
      this.instance = new DomainEventBus();
    }
    return this.instance;
  }

  /**
   * Tạo một DomainEvent mới với ID và timestamp chuẩn hóa
   */
  public static createEvent<T>(
    name: string,
    aggregateId: string,
    payload: T,
    metadata?: DomainEventMetadata
  ): DomainEvent<T> {
    return {
      id: `evt-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`,
      name,
      timestamp: new Date().toISOString(),
      aggregateId,
      payload,
      metadata: {
        source: "BAHAU_HRMS_CORE",
        ...metadata,
      },
    };
  }

  /**
   * Đăng ký một Subscriber lắng nghe sự kiện
   */
  public subscribe<T = any>(eventName: string, handler: DomainEventHandler<T>): void {
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, []);
    }
    this.handlers.get(eventName)!.push(handler);
  }

  /**
   * Phát sự kiện (Publish Event) tới toàn bộ các Subscribers
   * Tự động lưu vào Event Store để phục vụ Audit Trail và Event Replay
   */
  public async publish<T = any>(event: DomainEvent<T>): Promise<void> {
    // 1. Lưu vào Event Store & Persistent Outbox Audit
    this.eventStore.push(event);
    if (this.eventStore.length > this.maxStoreSize) {
      this.eventStore.shift();
    }
    try {
      OutboxService.recordDomainEvent(event).catch(() => {});
    } catch {}

    // 2. Kích hoạt toàn bộ Subscribers đã đăng ký
    const registeredHandlers = this.handlers.get(event.name) || [];
    const asyncPromises: Promise<void>[] = [];

    for (const handler of registeredHandlers) {
      try {
        const result = handler(event);
        if (result && typeof (result as any).then === "function") {
          asyncPromises.push(
            (result as Promise<void>).catch((err) => {
              console.error(
                `[DomainEventBus] Async error in subscriber handler for event "${event.name}" (Event ID: ${event.id}):`,
                err
              );
            })
          );
        }
      } catch (err) {
        console.error(
          `[DomainEventBus] Error in subscriber handler for event "${event.name}" (Event ID: ${event.id}):`,
          err
        );
      }
    }

    if (asyncPromises.length > 0) {
      await Promise.all(asyncPromises);
    }
  }

  /**
   * Phát sự kiện đồng bộ hoàn toàn (Sync Publish)
   */
  public publishSync<T = any>(event: DomainEvent<T>): void {
    // 1. Lưu vào Event Store & Persistent Outbox Audit
    this.eventStore.push(event);
    if (this.eventStore.length > this.maxStoreSize) {
      this.eventStore.shift();
    }
    try {
      OutboxService.recordDomainEvent(event).catch(() => {});
    } catch {}

    // 2. Kích hoạt toàn bộ Subscribers đã đăng ký
    const registeredHandlers = this.handlers.get(event.name) || [];
    for (const handler of registeredHandlers) {
      try {
        const result = handler(event);
        if (result && typeof (result as any).catch === "function") {
          (result as Promise<void>).catch((err) => {
            console.error(
              `[DomainEventBus] Async error in subscriber handler for event "${event.name}" (Event ID: ${event.id}):`,
              err
            );
          });
        }
      } catch (err) {
        console.error(
          `[DomainEventBus] Error in subscriber handler for event "${event.name}" (Event ID: ${event.id}):`,
          err
        );
      }
    }
  }

  /**
   * Truy vấn lịch sử sự kiện đã phát ra trong hệ thống
   */
  public getEvents(filter?: {
    name?: string;
    aggregateId?: string;
    since?: string;
  }): DomainEvent[] {
    let result = [...this.eventStore];
    if (filter?.name) {
      result = result.filter((e) => e.name === filter.name);
    }
    if (filter?.aggregateId) {
      result = result.filter((e) => e.aggregateId === filter.aggregateId);
    }
    if (filter?.since) {
      const sinceTime = new Date(filter.since).getTime();
      result = result.filter((e) => new Date(e.timestamp).getTime() >= sinceTime);
    }
    return result;
  }

  /**
   * Phát lại các sự kiện (Replay Events) để phục hồi hoặc đồng bộ lại dữ liệu
   */
  public async replayEvents(eventName?: string): Promise<number> {
    const toReplay = eventName
      ? this.eventStore.filter((e) => e.name === eventName)
      : [...this.eventStore];

    for (const event of toReplay) {
      const registeredHandlers = this.handlers.get(event.name) || [];
      for (const handler of registeredHandlers) {
        try {
          await handler(event);
        } catch (err) {
          console.error(`[DomainEventBus] Error during replay of "${event.name}":`, err);
        }
      }
    }

    return toReplay.length;
  }

  /**
   * Xóa lịch sử Event Store (hữu ích cho unit test clean up)
   */
  public clearStore(): void {
    this.eventStore = [];
  }
}
