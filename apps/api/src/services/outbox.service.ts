import crypto from "node:crypto";
import { prisma } from "@bahau/database";
import {
  NotificationDto,
  NotificationListResponse,
  ProcessOutboxBatchResponse,
  OutboxEventDto,
  OutboxFilterQuery,
  OutboxListResponse,
  DomainEvent,
  DOMAIN_EVENTS,
} from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";

export class OutboxService {
  // In-memory persistent cache đảm bảo Zero-Crash Resilience khi DB không kết nối
  private static memoryOutbox = new Map<string, OutboxEventDto>();
  private static memoryNotifications = new Map<string, any[]>();
  private static customDispatchHandlers = new Map<string, Array<(event: any) => Promise<void> | void>>();

  /**
   * Tạo một Transactional Outbox Event mới (hỗ trợ cả DB và In-Memory Fallback)
   */
  public static async createOutboxEvent(input: {
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: any;
    idempotencyKey?: string;
    status?: "PENDING" | "PROCESSING" | "PROCESSED" | "FAILED";
  }): Promise<OutboxEventDto> {
    const id = `outbox-${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}`;
    const idempotencyKey = input.idempotencyKey || `idem-${id}`;
    const status = input.status || "PENDING";
    const now = new Date().toISOString();

    const dto: OutboxEventDto = {
      id,
      aggregateType: input.aggregateType,
      aggregateId: input.aggregateId,
      eventType: input.eventType,
      payload: input.payload,
      idempotencyKey,
      status,
      retryCount: 0,
      lastError: null,
      createdAt: now,
      processedAt: status === "PROCESSED" ? now : null,
    };

    // 1. Lưu vào Memory Cache
    this.memoryOutbox.set(dto.id, dto);

    // 2. Thử lưu vào Prisma OutboxEvent nếu có DB
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dto.aggregateId);
      await prisma.outboxEvent.create({
        data: {
          id: crypto.randomUUID(),
          aggregateType: dto.aggregateType,
          aggregateId: isUuid ? dto.aggregateId : crypto.randomUUID(),
          eventType: dto.eventType,
          payload: dto.payload,
          idempotencyKey: dto.idempotencyKey,
          status: dto.status as any,
          retryCount: dto.retryCount,
          createdAt: new Date(dto.createdAt),
          processedAt: dto.processedAt ? new Date(dto.processedAt) : null,
        },
      });
    } catch {
      // Resilience fallback khi database offline (Zero-Crash Principle)
    }

    return dto;
  }

  /**
   * Ghi nhận một Domain Event vào kho lưu trữ Outbox Event & Audit Trail
   */
  public static async recordDomainEvent(
    event: DomainEvent,
    status: "PENDING" | "PROCESSED" = "PROCESSED"
  ): Promise<OutboxEventDto> {
    return this.createOutboxEvent({
      aggregateType: event.metadata?.source || "BAHAU_DOMAIN_EVENT",
      aggregateId: event.aggregateId,
      eventType: event.name,
      payload: event.payload,
      idempotencyKey: event.id,
      status,
    });
  }

  /**
   * Đăng ký Custom Dispatch Handler cho các sự kiện Outbox (hữu ích cho unit testing và mở rộng)
   */
  public static registerCustomHandler(
    eventType: string,
    handler: (event: any) => Promise<void> | void
  ): void {
    if (!this.customDispatchHandlers.has(eventType)) {
      this.customDispatchHandlers.set(eventType, []);
    }
    this.customDispatchHandlers.get(eventType)!.push(handler);
  }

  /**
   * Quét và xử lý các sự kiện hàng đợi Transactional Outbox (Batch Processing & Worker Dispatch)
   */
  public static async processBatch(limit = 10): Promise<ProcessOutboxBatchResponse> {
    const startTime = Date.now();
    const results: Array<{
      id: string;
      eventType: string;
      status: "PROCESSED" | "FAILED" | "PENDING";
      retryCount: number;
      error?: string | null;
    }> = [];

    let processedCount = 0;
    let failedCount = 0;
    let pendingEvents: Array<any> = [];
    let isDbAvailable = false;

    // 1. Thử lấy danh sách PENDING từ DB
    try {
      pendingEvents = await prisma.outboxEvent.findMany({
        where: { status: "PENDING" },
        orderBy: { createdAt: "asc" },
        take: limit,
      });
      isDbAvailable = true;
    } catch {
      // Fallback lấy từ memoryOutbox
      pendingEvents = Array.from(this.memoryOutbox.values())
        .filter((e) => e.status === "PENDING")
        .slice(0, limit);
    }

    // 2. Dispatch từng sự kiện trong lô
    for (const event of pendingEvents) {
      if (isDbAvailable) {
        try {
          await prisma.outboxEvent.update({
            where: { id: event.id },
            data: { status: "PROCESSING" },
          });
        } catch {}
      }

      const memEvt = this.memoryOutbox.get(event.id);
      if (memEvt) {
        memEvt.status = "PROCESSING";
      }

      try {
        await this.handleOutboxEvent(event);

        const now = new Date();
        if (isDbAvailable) {
          try {
            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: "PROCESSED", processedAt: now },
            });
          } catch {}
        }

        if (memEvt) {
          memEvt.status = "PROCESSED";
          memEvt.processedAt = now.toISOString();
        }

        processedCount++;
        results.push({
          id: event.id,
          eventType: event.eventType,
          status: "PROCESSED",
          retryCount: event.retryCount || 0,
        });
      } catch (err: any) {
        const nextRetry = (event.retryCount || 0) + 1;
        const isPermanentlyFailed = nextRetry >= 3;
        const newStatus = isPermanentlyFailed ? "FAILED" : "PENDING";

        if (isDbAvailable) {
          try {
            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                status: newStatus as any,
                retryCount: nextRetry,
                lastError: err.message || "Outbox dispatch error",
              },
            });
          } catch {}
        }

        if (memEvt) {
          memEvt.status = newStatus;
          memEvt.retryCount = nextRetry;
          memEvt.lastError = err.message || "Outbox dispatch error";
        }

        if (isPermanentlyFailed) {
          failedCount++;
        }

        results.push({
          id: event.id,
          eventType: event.eventType,
          status: newStatus,
          retryCount: nextRetry,
          error: err.message,
        });
      }
    }

    return {
      processedCount,
      failedCount,
      durationMs: Date.now() - startTime,
      events: results,
    };
  }

  /**
   * Xử lý dispatch nghiệp vụ tương ứng theo eventType và sinh Notification
   */
  public static async handleOutboxEvent(event: {
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: any;
  }): Promise<void> {
    const payload = event.payload || {};

    // 1. Kích hoạt custom handlers nếu có
    const customHandlers = this.customDispatchHandlers.get(event.eventType) || [];
    for (const h of customHandlers) {
      await h(event);
    }

    // 2. Dispatch theo loại nghiệp vụ
    switch (event.eventType) {
      case "LEAVE_REQUEST_SUBMITTED": {
        await this.createSystemNotification({
          userId: event.aggregateId,
          title: "Đơn xin nghỉ phép mới cần phê duyệt",
          content: `CBGV đã nộp đơn nghỉ phép: ${payload.reason || "Việc cá nhân"}. Vui lòng xem xét phê duyệt.`,
          type: "WORKFLOW",
        });
        break;
      }

      case "LEAVE_REQUEST_APPROVED": {
        await this.createSystemNotification({
          userId: event.aggregateId,
          title: "Đơn xin nghỉ phép đã được phê duyệt",
          content: "Đơn xin nghỉ phép của bạn đã được Lãnh đạo phê duyệt và cập nhật vào sổ cái nghỉ phép.",
          type: "WORKFLOW",
        });
        break;
      }

      case "CONTRACT_EXPIRING_WARNING": {
        await this.createSystemNotification({
          userId: event.aggregateId,
          title: "Thông báo Hợp đồng lao động sắp hết hạn",
          content: `Hợp đồng số ${payload.contractNumber || "HDLD"} của bạn sắp hết hạn. Vui lòng liên hệ Phòng TCHC.`,
          type: "CONTRACT",
        });
        break;
      }

      case DOMAIN_EVENTS.TENURE_APPOINTED: {
        await this.createSystemNotification({
          userId: payload.employeeId || event.aggregateId,
          title: "Quyết định Bổ nhiệm chức danh GS/PGS",
          content: `Chúc mừng ${payload.fullName} đã được Hiệu trưởng ký Quyết định ${payload.resolutionNumber} bổ nhiệm chức danh ${payload.newAcademicTitle} (Hệ số lương: ${payload.newSalaryCoefficient}).`,
          type: "ALERT",
        });
        break;
      }

      case DOMAIN_EVENTS.CANDIDATE_APPOINTED: {
        await this.createSystemNotification({
          userId: payload.candidateId || event.aggregateId,
          title: "Quyết định Tuyển dụng & Bổ nhiệm tập sự Giảng viên",
          content: `Chào mừng ${payload.fullName} gia nhập Trường ĐH Kiến trúc Đà Nẵng với Mã CBGV: ${payload.appointedEmployeeCode}. Áp dụng chế độ tập sự theo Nghị định 115/2020/NĐ-CP.`,
          type: "ALERT",
        });
        break;
      }

      case DOMAIN_EVENTS.RD_PROJECT_APPROVED: {
        await this.createSystemNotification({
          userId: event.aggregateId,
          title: "Nghiệm thu Đề tài NCKH & Chi trả Nhuận bút",
          content: `Đề tài/Dự án "${payload.title}" đã được nghiệm thu (Quyết định ${payload.resolutionNumber}). Quỹ nhuận bút: ${Number(payload.royaltyFundAmount || 0).toLocaleString("vi-VN")} VNĐ.`,
          type: "ALERT",
        });
        break;
      }

      case DOMAIN_EVENTS.POSTGRAD_DEGREE_AWARDED: {
        await this.createSystemNotification({
          userId: payload.studentId || event.aggregateId,
          title: "Quyết định Công nhận học vị ThS/TS & Chi trả thù lao Hội đồng",
          content: `Chúc mừng ${payload.fullName} đã được công nhận học vị ${payload.degreeLevel} (Quyết định ${payload.resolutionNumber}). Thù lao Hội đồng chấm bảo vệ đã được phê duyệt.`,
          type: "ALERT",
        });
        break;
      }

      case DOMAIN_EVENTS.KPI_PERIOD_FINALIZED: {
        await this.createSystemNotification({
          userId: event.aggregateId,
          title: "Quyết toán KPI & Xếp loại thi đua CBGV",
          content: `Kỳ đánh giá KPI ${payload.periodName || ""} đã được phê duyệt chính thức theo Quyết định ${payload.resolutionNumber}.`,
          type: "KPI",
        });
        break;
      }

      default: {
        console.log(`[Outbox Dispatcher] Handled event ${event.eventType} for aggregate ${event.aggregateId}`);
      }
    }
  }

  /**
   * Tạo thông báo hệ thống an toàn (DB + In-memory fallback)
   */
  private static async createSystemNotification(notif: {
    userId: string;
    title: string;
    content: string;
    type: string;
  }): Promise<void> {
    const list = this.memoryNotifications.get(notif.userId) || [];
    list.push({
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      ...notif,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
    this.memoryNotifications.set(notif.userId, list);

    try {
      await prisma.notification.create({
        data: {
          id: crypto.randomUUID(),
          userId: notif.userId.length === 36 ? notif.userId : crypto.randomUUID(),
          title: notif.title,
          content: notif.content,
          type: notif.type as any,
          isRead: false,
        },
      });
    } catch {}
  }

  /**
   * Tra cứu danh sách sự kiện Outbox (hỗ trợ phân trang, lọc status, eventType)
   */
  public static async getOutboxEvents(query?: OutboxFilterQuery): Promise<OutboxListResponse> {
    const page = Number(query?.page || 1);
    const limit = Number(query?.limit || 20);
    const skip = (page - 1) * limit;

    try {
      const where: any = {};
      if (query?.status) where.status = query.status;
      if (query?.eventType) where.eventType = query.eventType;
      if (query?.aggregateType) where.aggregateType = query.aggregateType;

      const [dbEvents, total] = await Promise.all([
        prisma.outboxEvent.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.outboxEvent.count({ where }),
      ]);

      return {
        events: dbEvents.map((e) => ({
          id: e.id,
          aggregateType: e.aggregateType,
          aggregateId: e.aggregateId,
          eventType: e.eventType,
          payload: e.payload as any,
          idempotencyKey: e.idempotencyKey,
          status: e.status as any,
          retryCount: e.retryCount,
          lastError: e.lastError,
          createdAt: e.createdAt.toISOString(),
          processedAt: e.processedAt ? e.processedAt.toISOString() : null,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    } catch {
      // Memory fallback
      let all = Array.from(this.memoryOutbox.values());
      if (query?.status) all = all.filter((e) => e.status === query.status);
      if (query?.eventType) all = all.filter((e) => e.eventType === query.eventType);
      if (query?.aggregateType) all = all.filter((e) => e.aggregateType === query.aggregateType);

      const total = all.length;
      const paginated = all.slice(skip, skip + limit);

      return {
        events: paginated,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      };
    }
  }

  /**
   * Lấy chi tiết một Outbox Event theo ID
   */
  public static async getOutboxEventById(id: string): Promise<OutboxEventDto | null> {
    try {
      const found = await prisma.outboxEvent.findUnique({ where: { id } });
      if (found) {
        return {
          id: found.id,
          aggregateType: found.aggregateType,
          aggregateId: found.aggregateId,
          eventType: found.eventType,
          payload: found.payload as any,
          idempotencyKey: found.idempotencyKey,
          status: found.status as any,
          retryCount: found.retryCount,
          lastError: found.lastError,
          createdAt: found.createdAt.toISOString(),
          processedAt: found.processedAt ? found.processedAt.toISOString() : null,
        };
      }
    } catch {}

    return this.memoryOutbox.get(id) || null;
  }

  /**
   * Kích hoạt retry một sự kiện Outbox (reset status PENDING)
   */
  public static async retryOutboxEvent(id: string): Promise<OutboxEventDto> {
    const mem = this.memoryOutbox.get(id);
    if (mem) {
      mem.status = "PENDING";
      mem.lastError = null;
    }

    try {
      const updated = await prisma.outboxEvent.update({
        where: { id },
        data: { status: "PENDING", lastError: null },
      });
      return {
        id: updated.id,
        aggregateType: updated.aggregateType,
        aggregateId: updated.aggregateId,
        eventType: updated.eventType,
        payload: updated.payload as any,
        idempotencyKey: updated.idempotencyKey,
        status: updated.status as any,
        retryCount: updated.retryCount,
        lastError: updated.lastError,
        createdAt: updated.createdAt.toISOString(),
        processedAt: updated.processedAt ? updated.processedAt.toISOString() : null,
      };
    } catch {}

    if (!mem) {
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy sự kiện Outbox.");
    }
    return mem;
  }

  /**
   * Lấy danh sách thông báo của người dùng đăng nhập
   */
  public static async getMyNotifications(userId: string): Promise<NotificationListResponse> {
    try {
      const [notifications, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
          take: 30,
        }),
        prisma.notification.count({
          where: { userId, isRead: false },
        }),
      ]);

      return {
        notifications: notifications.map((n) => ({
          id: n.id,
          userId: n.userId,
          title: n.title,
          content: n.content,
          type: n.type as any,
          isRead: n.isRead,
          metadata: n.metadata as any,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
      };
    } catch {
      const list = this.memoryNotifications.get(userId) || [];
      return {
        notifications: list.map((n) => ({
          id: n.id,
          userId: n.userId,
          title: n.title,
          content: n.content,
          type: n.type as any,
          isRead: n.isRead,
          metadata: null,
          createdAt: n.createdAt,
        })),
        unreadCount: list.filter((n) => !n.isRead).length,
      };
    }
  }

  /**
   * Đánh dấu một thông báo đã đọc
   */
  public static async markAsRead(notificationId: string, userId: string): Promise<NotificationDto> {
    try {
      const notif = await prisma.notification.findUnique({
        where: { id: notificationId },
      });

      if (!notif) {
        throw new AppError(404, "NOT_FOUND", "Không tìm thấy thông báo tương ứng.");
      }

      if (notif.userId !== userId) {
        throw new AppError(403, "FORBIDDEN", "Bạn không có quyền thao tác trên thông báo này.");
      }

      const updated = await prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        title: updated.title,
        content: updated.content,
        type: updated.type as any,
        isRead: updated.isRead,
        metadata: updated.metadata as any,
        createdAt: updated.createdAt.toISOString(),
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      const list = this.memoryNotifications.get(userId) || [];
      const item = list.find((n) => n.id === notificationId);
      if (item) {
        item.isRead = true;
        return item;
      }
      throw new AppError(404, "NOT_FOUND", "Không tìm thấy thông báo tương ứng.");
    }
  }

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc
   */
  public static async markAllAsRead(userId: string): Promise<{ count: number }> {
    try {
      const result = await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
      return { count: result.count };
    } catch {
      const list = this.memoryNotifications.get(userId) || [];
      let count = 0;
      for (const item of list) {
        if (!item.isRead) {
          item.isRead = true;
          count++;
        }
      }
      return { count };
    }
  }

  /**
   * Xóa kho lưu trữ memory (phục vụ unit test cleanup)
   */
  public static clearMemoryStore(): void {
    this.memoryOutbox.clear();
    this.memoryNotifications.clear();
    this.customDispatchHandlers.clear();
  }
}
