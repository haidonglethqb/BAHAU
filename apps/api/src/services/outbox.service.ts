import { prisma } from "@bahau/database";
import {
  NotificationDto,
  NotificationListResponse,
  ProcessOutboxBatchResponse,
} from "@bahau/contracts";
import { AppError } from "../middlewares/error.middleware.js";

export class OutboxService {
  /**
   * Quét và xử lý các sự kiện hàng đợi Transactional Outbox (Batch Processing)
   */
  static async processBatch(limit = 10): Promise<ProcessOutboxBatchResponse> {
    const startTime = Date.now();

    // 1. Lấy danh sách các sự kiện PENDING
    const pendingEvents = await prisma.outboxEvent.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: limit,
    });

    const results: Array<{
      id: string;
      eventType: string;
      status: "PROCESSED" | "FAILED" | "PENDING";
      retryCount: number;
      error?: string | null;
    }> = [];

    let processedCount = 0;
    let failedCount = 0;

    for (const event of pendingEvents) {
      // 2. Chuyển sang PROCESSING
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "PROCESSING" },
      });

      try {
        // 3. Dispatch handler theo eventType
        await this.handleOutboxEvent(event);

        // 4. Đánh dấu PROCESSED thành công
        const updated = await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: "PROCESSED",
            processedAt: new Date(),
          },
        });

        processedCount++;
        results.push({
          id: updated.id,
          eventType: updated.eventType,
          status: "PROCESSED",
          retryCount: updated.retryCount,
        });
      } catch (err: any) {
        const nextRetry = event.retryCount + 1;
        const isPermanentlyFailed = nextRetry >= 3;
        const newStatus = isPermanentlyFailed ? "FAILED" : "PENDING";

        const updated = await prisma.outboxEvent.update({
          where: { id: event.id },
          data: {
            status: newStatus,
            retryCount: nextRetry,
            lastError: err.message || "Unknown error during outbox event dispatch",
          },
        });

        if (isPermanentlyFailed) {
          failedCount++;
        }
        results.push({
          id: updated.id,
          eventType: updated.eventType,
          status: newStatus,
          retryCount: updated.retryCount,
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
   * Xử lý dispatch sự kiện và sinh Notification tương ứng
   */
  private static async handleOutboxEvent(event: {
    id: string;
    aggregateType: string;
    aggregateId: string;
    eventType: string;
    payload: any;
  }): Promise<void> {
    const payload = event.payload || {};

    switch (event.eventType) {
      case "LEAVE_REQUEST_SUBMITTED": {
        // Tìm user nhận thông báo (người nộp hoặc người quản lý)
        const recipient =
          (await prisma.user.findFirst({
            where: {
              OR: [
                { id: event.aggregateId },
                { email: payload.employeeEmail },
                { employee: { id: event.aggregateId } },
              ],
            },
          })) || (await prisma.user.findFirst({ where: { email: "unithead@dau.edu.vn" } }));

        if (recipient) {
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title: "Đơn xin nghỉ phép mới cần phê duyệt",
              content: `CBGV đã nộp đơn nghỉ phép: ${payload.reason || "Việc cá nhân"}. Vui lòng xem xét phê duyệt.`,
              type: "WORKFLOW",
              isRead: false,
              metadata: { aggregateId: event.aggregateId, eventType: event.eventType },
            },
          });
        }
        break;
      }

      case "LEAVE_REQUEST_APPROVED": {
        const recipient = await prisma.user.findFirst({
          where: {
            OR: [
              { id: event.aggregateId },
              { employee: { id: event.aggregateId } },
              { email: payload.employeeEmail },
            ],
          },
        });

        if (recipient) {
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title: "Đơn xin nghỉ phép đã được phê duyệt",
              content: `Đơn xin nghỉ phép của bạn đã được Lãnh đạo phê duyệt và cập nhật vào sổ cái nghỉ phép.`,
              type: "WORKFLOW",
              isRead: false,
              metadata: { aggregateId: event.aggregateId },
            },
          });
        }
        break;
      }

      case "CONTRACT_EXPIRING_WARNING": {
        const recipient = await prisma.user.findFirst({
          where: {
            OR: [
              { id: event.aggregateId },
              { employee: { id: event.aggregateId } },
              { email: payload.employeeEmail },
            ],
          },
        });

        if (recipient) {
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title: "Thông báo Hợp đồng lao động sắp hết hạn",
              content: `Hợp đồng số ${payload.contractNumber || "HDLD"} của bạn sắp hết hạn trong ${payload.daysRemaining || 30} ngày. Vui lòng liên hệ Phòng TCHC để tiến hành thủ tục gia hạn.`,
              type: "CONTRACT",
              isRead: false,
              metadata: { contractId: event.aggregateId },
            },
          });
        }
        break;
      }

      case "CERTIFICATE_EXPIRING_WARNING": {
        const recipient = await prisma.user.findFirst({
          where: {
            OR: [
              { id: event.aggregateId },
              { employee: { id: event.aggregateId } },
              { email: payload.employeeEmail },
            ],
          },
        });

        if (recipient) {
          await prisma.notification.create({
            data: {
              userId: recipient.id,
              title: "Cảnh báo Chứng chỉ sắp hết hạn",
              content: `Chứng chỉ ${payload.certificateName || "chuyên môn"} của bạn sắp hết hạn. Vui lòng cập nhật hồ sơ gia hạn lên hệ thống BAHAU.`,
              type: "CERTIFICATE",
              isRead: false,
              metadata: { certId: event.aggregateId },
            },
          });
        }
        break;
      }

      default: {
        // Fallback: ghi log mô phỏng email dispatch
        console.log(`[Outbox Dispatcher] Processed event ${event.eventType} for aggregate ${event.aggregateId}`);
      }
    }
  }

  /**
   * Lấy danh sách thông báo của người dùng đăng nhập
   */
  static async getMyNotifications(userId: string): Promise<NotificationListResponse> {
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
  }

  /**
   * Đánh dấu một thông báo đã đọc
   */
  static async markAsRead(notificationId: string, userId: string): Promise<NotificationDto> {
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
  }

  /**
   * Đánh dấu toàn bộ thông báo của người dùng là đã đọc
   */
  static async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { count: result.count };
  }
}
